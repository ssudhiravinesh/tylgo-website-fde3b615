import { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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
  
  // Ref to track the current session ID without triggering re-renders
  const currentSessionToken = useRef<string | null>(null);

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear local session tracking
      sessionStorage.removeItem('anuj_session_token');
      currentSessionToken.current = null;

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
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      if (!error.message?.includes('session') || !error.message?.includes('missing')) {
        toast.error(error.message || 'Error signing out');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to enforce single session
  const validateSession = async (userId: string) => {
    try {
      const localToken = sessionStorage.getItem('anuj_session_token');
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('session_token')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error validating session:', error);
        return;
      }

      // If DB has a token but it doesn't match our local one, we are invalid
      if (data && data.session_token !== localToken) {
        console.log('Session invalid: DB token mismatch. Logging out.');
        await signOut();
        toast.error('You have been logged out because a new session was started in another tab or device.');
      }
    } catch (err) {
      console.error('Session validation check failed:', err);
    }
  };

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');
    
    // 1. Listen for Supabase Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed -', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 0);
        
        // Check if we have a valid session token in DB matching ours
        validateSession(session.user.id);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth: User signed out');
        setUser(null);
        setProfile(null);
        setLoading(false);
        sessionStorage.removeItem('anuj_session_token');
      } else if (session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Realtime Subscription for Single Session Enforcement
    const channel = supabase.channel('session_enforcement')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
        },
        (payload) => {
          // Only care about updates for the CURRENT user
          if (user && payload.new && (payload.new as any).user_id === user.id) {
            const newDbToken = (payload.new as any).session_token;
            const localToken = sessionStorage.getItem('anuj_session_token');
            
            // If the token in DB changed to something that isn't what we have, we are old.
            if (newDbToken && newDbToken !== localToken) {
              console.log('Realtime: Session token changed in DB. We are now invalid.');
              signOut();
              toast.error('Session expired. You logged in from another location.');
            }
          }
        }
      )
      .subscribe();

    // 3. Initial Auth Check
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          await validateSession(session.user.id);
        } else {
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
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Re-run subscription setup when user changes

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Auth: Exception while fetching profile:', error);
      toast.error('Error loading user profile');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'worker') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name, role }
        }
      });
      
      if (error) throw error;
      toast.success('Account created successfully! Please check your email to verify your account.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Error creating account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      // --- Single Session Logic Start ---
      if (data.user) {
        // 1. Generate a new unique session token for this tab/login instance
        const newSessionToken = crypto.randomUUID();
        
        // 2. Save to sessionStorage (specific to this tab)
        sessionStorage.setItem('anuj_session_token', newSessionToken);
        currentSessionToken.current = newSessionToken;

        // 3. Update the database to say "This is the only valid token now"
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .upsert({ 
            user_id: data.user.id, 
            session_token: newSessionToken,
            last_active: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (sessionError) {
          console.error('Failed to register session:', sessionError);
          // We don't block login, but single session might be flaky if this fails
        }
      }
      // --- Single Session Logic End ---
      
      toast.success('Signed in successfully!');
      return { user: data.user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Error signing in');
      throw error;
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