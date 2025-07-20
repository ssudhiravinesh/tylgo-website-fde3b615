
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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { createSession, invalidateSession, enforceSessionValidation } = useStrictSessionManagement();

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state');
    
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Create new session (this will invalidate any existing sessions)
        setTimeout(async () => {
          try {
            console.log('Creating session for newly signed in user - this will invalidate any existing sessions');
            await createSession(session.user.id);
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error('Error creating session:', error);
            // If session creation fails, sign out
            await supabase.auth.signOut();
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        if (user) {
          // Invalidate session on sign out
          setTimeout(async () => {
            try {
              await invalidateSession(user.id);
            } catch (error) {
              console.error('Error invalidating session:', error);
            }
          }, 0);
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user) {
        // Check if session was invalidated to prevent loops
        const sessionInvalidated = localStorage.getItem('session_invalidated');
        if (sessionInvalidated) {
          console.log('Session was invalidated, preventing validation loop');
          localStorage.removeItem('session_invalidated');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setUser(session.user);
        // For existing sessions, validate session
        setTimeout(async () => {
          const isValid = await enforceSessionValidation(session.user.id);
          if (isValid) {
            await fetchProfile(session.user.id);
          }
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session:', session?.user?.email, error);
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check if session was invalidated to prevent loops
          const sessionInvalidated = localStorage.getItem('session_invalidated');
          if (sessionInvalidated) {
            console.log('Session was invalidated, skipping validation to prevent loop');
            localStorage.removeItem('session_invalidated');
            setLoading(false);
            return;
          }
          
          setUser(session.user);
          // Validate existing session
          console.log('Validating existing session for single session enforcement');
          const isValid = await enforceSessionValidation(session.user.id);
          if (isValid) {
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

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
      } else if (data) {
        console.log('Profile loaded:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading user profile');
    } finally {
      setLoading(false);
    }
  };

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
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message || 'Error signing in');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setProfile(null);
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Error signing out');
    } finally {
      setLoading(false);
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
