import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useStrictSessionManagement } from './useStrictSessionManagement';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'worker') => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { createSession, invalidateSession, validateSession } = useStrictSessionManagement();

  const clearAuthState = () => {
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        if (error.code === 'PGRST116') {
          console.log('Profile not found for user:', userId);
          toast.error('Profile not found. Please contact your administrator.');
        } else {
          toast.error('Error loading profile');
        }
        console.log('Setting loading to false due to profile error');
        return false;
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
        console.log('Setting loading to false after successful profile load');
        return true;
      }
      console.log('Setting loading to false - no data returned');
      return false;
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading user profile');
      console.log('Setting loading to false due to catch block');
      return false;
    } finally {
      console.log('Finally block: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state');
    let isInitializing = true;
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      // Prevent processing during initialization
      if (isInitializing && event === 'INITIAL_SESSION') {
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, creating session');
        setUser(session.user);
        setLoading(true);
        
        try {
          // Create session first (this invalidates other sessions)
          await createSession(session.user.id);
          
          // Then fetch profile
          const profileLoaded = await fetchProfile(session.user.id);
          if (!profileLoaded) {
            // If profile loading fails, sign out
            await supabase.auth.signOut();
            return;
          }
        } catch (error) {
          console.error('Error setting up user session:', error);
          await supabase.auth.signOut();
        }
      } 
      else if (event === 'SIGNED_OUT') {
        console.log('User signed out, cleaning up');
        
        // Clear session invalidated flag
        localStorage.removeItem('session_invalidated');
        
        // Cleanup session if we have a user
        if (user?.id) {
          try {
            await invalidateSession(user.id);
          } catch (error) {
            console.error('Error invalidating session on signout:', error);
          }
        }
        
        clearAuthState();
      }
      else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed, validating session');
        // On token refresh, validate our session is still active
        const isValid = await validateSession(session.user.id);
        if (!isValid) {
          console.log('Session invalid after token refresh');
          // validateSession handles signout
        }
      }
    });

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.email, error);
        
        if (error) {
          console.error('Error getting initial session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check if session was previously invalidated
          const sessionInvalidated = localStorage.getItem('session_invalidated');
          if (sessionInvalidated) {
            console.log('Session was invalidated, clearing state');
            localStorage.removeItem('session_invalidated');
            clearAuthState();
            return;
          }
          
          console.log('Found existing session, validating...');
          setUser(session.user);
          
          // Validate the session
          const isValid = await validateSession(session.user.id);
          if (isValid) {
            console.log('Session is valid, loading profile');
            await fetchProfile(session.user.id);
          } else {
            console.log('Session is invalid, will be signed out');
            // validateSession handles the signout
          }
        } else {
          console.log('No initial session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      } finally {
        isInitializing = false;
      }
    };

    initializeAuth();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []); // Remove dependencies to prevent re-initialization

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'worker') => {
    try {
      setLoading(true);
      console.log('Signing up user:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            role
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Account created successfully! Please check your email to verify your account.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please try signing in instead.');
      } else {
        toast.error(error.message || 'Error creating account');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Signing in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Sign in successful, session will be created via auth state change');
      toast.success('Signed in successfully!');
      return { user: data.user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message || 'Error signing in');
      }
      throw error;
    } finally {
      console.log('SignIn finally block: Setting loading to false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      
      // Clear session invalidated flag first
      localStorage.removeItem('session_invalidated');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Handle specific case where session is already invalid
        if (error.message?.includes('session') && error.message?.includes('missing')) {
          console.log('Session already invalidated, clearing local state');
          clearAuthState();
          return;
        }
        throw error;
      }
      
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Don't show error toast for already invalidated sessions
      if (!error.message?.includes('session') || !error.message?.includes('missing')) {
        toast.error(error.message || 'Error signing out');
      }
      // Clear state anyway
      clearAuthState();
    }
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};