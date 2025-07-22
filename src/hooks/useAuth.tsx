import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useSingleDeviceAuth } from './useSingleDeviceAuth';

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
  const { checkCanLogin, createSession, clearSession } = useSingleDeviceAuth();

  useEffect(() => {
    console.log('AuthProvider: Initializing single device auth state');
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        
        // Create single device session
        try {
          console.log('User signed in, creating single device session...');
          const sessionToken = await createSession(session.user.id);
          if (!sessionToken) {
            // Login denied - user already logged in elsewhere
            await supabase.auth.signOut();
            return;
          }
        } catch (error) {
          console.error('Failed to create session:', error);
          await supabase.auth.signOut();
          return;
        }
      } else if (event === 'SIGNED_OUT') {
        if (user) {
          try {
            console.log('User signing out, clearing session...');
            await clearSession(user.id);
          } catch (error) {
            console.error('Failed to clear session:', error);
          }
        }
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Initialize session from stored session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check if this device has a valid session
        const storedToken = localStorage.getItem('device_session_token');
        if (storedToken) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          // No valid device session, sign out
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [checkCanLogin, createSession, clearSession]);

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
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Single device check will be handled in the auth state change listener
      // Profile and session will be handled by the auth state change listener
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Error signing in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear session first
      if (user) {
        await clearSession(user.id);
      }

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