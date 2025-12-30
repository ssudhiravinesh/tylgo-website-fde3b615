
import { useState, createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker' | 'super_admin';
  showroom_id?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'worker' | 'super_admin', showroomId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session management utilities
const SESSION_TOKEN_KEY = 'tylgo-session-token';
const SESSION_DURATION_HOURS = 24;
const SESSION_POLL_INTERVAL = 30 * 1000; // 30 seconds - check if session is still valid

const generateSessionToken = (): string => {
  return `${Date.now()}-${crypto.randomUUID()}`;
};

const getDeviceInfo = () => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  timestamp: new Date().toISOString(),
});


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed -', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth: User signed out');
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        console.log('Auth: No session found');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Auth: Initializing auth');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth: Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Auth: Found existing session for user:', session.user.id);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('Auth: No existing session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth: Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Auth: Fetching profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Auth: Error fetching profile:', error);
        if (error.code === 'PGRST116') {
          console.log('Auth: Profile not found for user:', userId);
          toast.error('Profile not found. Please contact your administrator.');
        } else {
          toast.error('Error loading profile');
        }
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Auth: Profile loaded successfully for user:', userId);
        setProfile(data);
      }
    } catch (error) {
      console.error('Auth: Exception while fetching profile:', error);
      toast.error('Error loading user profile');
    } finally {
      console.log('Auth: Profile fetch completed, setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'worker' | 'super_admin', showroomId?: string) => {
    try {
      setLoading(true);

      const showroom_id = showroomId || '00000000-0000-0000-0000-000000000001';

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            role,
            showroom_id
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

      // Clear any existing session token before new login
      sessionStorage.removeItem(SESSION_TOKEN_KEY);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // toast.success('Signed in successfully!'); // Moved to component level for better control
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
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.message?.includes('session') && error.message?.includes('missing')) {
          setUser(null);
          setProfile(null);
          return;
        }
        throw error;
      }
      setUser(null);
      setProfile(null);
      // toast.success('Signed out successfully!'); // Moved to component level
    } catch (error: any) {
      console.error('Sign out error:', error);
      if (!error.message?.includes('session') || !error.message?.includes('missing')) {
        toast.error(error.message || 'Error signing out');
      }
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
