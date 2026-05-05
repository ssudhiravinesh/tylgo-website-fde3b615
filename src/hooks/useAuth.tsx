
import { useState, createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/utils/errorUtils';
import type { User } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'admin' | 'worker' | 'super_admin';
  showroom_id?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'worker' | 'super_admin', showroomId?: string) => Promise<void>;
  signIn: (emailOrUsername: string, password: string) => Promise<{ user: User | null }>;
  signInWithGoogle: () => Promise<void>;
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

  // Guard: prevent concurrent/duplicate fetchProfile calls (OAuth fires multiple events)
  const fetchingForUserRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed -', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth: User signed out');
        fetchingForUserRef.current = null;
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
    // Skip if we're already fetching/fetched for this user
    if (fetchingForUserRef.current === userId) {
      console.log('Auth: Already fetching/fetched profile for:', userId, '— skipping');
      return;
    }
    fetchingForUserRef.current = userId;

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
          // Profile not found — this happens when a Google OAuth user signs in
          // but was never created by an admin. We must reject them.
          console.log('Auth: Profile not found for user:', userId, '— signing out (unauthorized)');
          toast.error('Account not found. Please contact your showroom administrator to get access.', { id: 'no-profile' });
          fetchingForUserRef.current = null; // Reset before sign out so the SIGNED_OUT handler works
          await supabase.auth.signOut();
        } else if (error.message !== 'Failed to fetch') {
          toast.error('Error loading profile: ' + error.message, { id: 'profile-error' });
          fetchingForUserRef.current = null;
        }
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Auth: Profile loaded successfully for user:', userId);
        setProfile(data);
      }
    } catch (error: unknown) {
      console.error('Auth: Exception while fetching profile:', error);
      if (getErrorMessage(error) !== 'Failed to fetch') {
        toast.error('Error loading user profile', { id: 'profile-error' });
      }
      fetchingForUserRef.current = null;
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
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const msg = getErrorMessage(error, 'Error creating account');
      if (msg.includes('already registered')) {
        toast.error('This email is already registered. Please try signing in instead.');
      } else {
        toast.error(msg);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with username or email + password.
   * If the input doesn't contain '@', we treat it as a username and
   * resolve the associated email first.
   */
  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      setLoading(true);

      // Clear any existing session token before new login
      sessionStorage.removeItem(SESSION_TOKEN_KEY);

      let email = emailOrUsername;

      // If input doesn't look like an email, resolve username → email
      if (!emailOrUsername.includes('@')) {
        console.log('Auth: Resolving username to email:', emailOrUsername);
        const { data: profileData, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', emailOrUsername)
          .maybeSingle();

        if (lookupError || !profileData) {
          throw new Error('Invalid username or password. Please try again.');
        }

        email = profileData.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return { user: data.user };
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      const msg = getErrorMessage(error, 'Error signing in');
      if (msg.includes('Invalid login credentials') || msg.includes('Invalid username or password')) {
        toast.error('Invalid username/email or password. Please try again.');
      } else {
        toast.error(msg);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google OAuth.
   * After redirect, the auth state listener picks up the session.
   * If the user doesn't have a profile (wasn't admin-created), fetchProfile
   * will sign them out automatically.
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // Preserve the full URL (including ?showroom= param) so the user
      // lands back on the login page — not the landing page — after OAuth.
      // This ensures error toasts ("Account not found") are visible.
      const redirectUrl = window.location.origin + window.location.pathname + window.location.search;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        throw error;
      }

      // Browser will redirect to Google — loading state is intentional
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      const msg = getErrorMessage(error, 'Error signing in with Google');
      toast.error(msg);
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
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      const msg = getErrorMessage(error, 'Error signing out');
      if (!msg.includes('session') || !msg.includes('missing')) {
        toast.error(msg);
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
    signInWithGoogle,
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
