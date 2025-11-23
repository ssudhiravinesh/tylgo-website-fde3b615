import { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// We define Profile based on your schema
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
  
  // Ref to track the current session ID locally without triggering re-renders
  const currentSessionToken = useRef<string | null>(null);

  // === CRITICAL FIX: THE LOGIN LOCK ===
  // This prevents the auth listener from kicking you out while 
  // the signIn function is still setting up your session.
  const isLoggingIn = useRef(false);

  const signOut = async () => {
    try {
      setLoading(true);
      // 1. Clear local session tracking immediately
      sessionStorage.removeItem('anuj_session_token');
      currentSessionToken.current = null;

      // 2. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Ignore "session missing" errors as we are signing out anyway
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

  // --- SINGLE SESSION ENFORCEMENT LOGIC ---
  const validateSession = async (userId: string) => {
    // FIX 1: If we are actively logging in, SKIP validation.
    if (isLoggingIn.current) {
      console.log('Auth: Skipping validation during active login process');
      return;
    }

    try {
      const localToken = sessionStorage.getItem('anuj_session_token');
      
      // FIX 2: FAIL-SAFE MODE
      // If we are logged in but have NO local token, it means the initial DB write failed.
      // In this case, we should NOT logout. We just accept that Single Session is 
      // disabled for this tab to prevent infinite loops.
      if (!localToken) {
        console.log('Auth: No local session token found. Skipping single-session check to prevent loops.');
        return;
      }

      const { data, error } = await supabase
        .from('user_sessions')
        .select('session_token')
        .eq('user_id', userId)
        .maybeSingle(); 

      if (error) {
        console.error('Error validating session:', error);
        return;
      }

      // Logic:
      // 1. If DB has a token (data exists)
      // 2. AND that token does NOT match our local storage token
      // 3. THEN -> We are the "old" tab. Logout.
      if (data && data.session_token && data.session_token !== localToken) {
        console.log('Session invalid: DB token mismatch. Logging out this tab.');
        await signOut();
        toast.error('You have been logged out because you signed in on another device/tab.');
      }
    } catch (err) {
      console.error('Session validation check failed:', err);
    }
  };

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');
    
    // 1. Listen for Supabase Auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed -', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Immediately check if this session is valid (Skipped if isLoggingIn is true)
        validateSession(session.user.id);
        
        // Fetch profile details
        fetchProfile(session.user.id);
        
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        sessionStorage.removeItem('anuj_session_token');
      } else if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Realtime Subscription
    const channel = supabase.channel('session_enforcement')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for inserts/updates
          schema: 'public',
          table: 'user_sessions',
        },
        (payload) => {
          // Only care if the update is for the currently logged-in user
          if (user && payload.new && (payload.new as any).user_id === user.id) {
            const newDbToken = (payload.new as any).session_token;
            const localToken = sessionStorage.getItem('anuj_session_token');
            
            // FIX: If *I* am the one logging in, ignore this event.
            if (isLoggingIn.current) return;
            
            // FIX: If I don't have a local token (Fail-Safe Mode), ignore mismatches.
            if (!localToken) return;

            if (newDbToken && newDbToken !== localToken) {
              console.log('Realtime: Another tab took over the session.');
              signOut(); 
              toast.error('Session expired. You logged in from another location.');
            }
          }
        }
      )
      .subscribe();

    // 3. Initial Load Check & Self-Healing
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

          // === SELF HEALING ===
          // If we have a user but NO local token (e.g. hard refresh), try to claim session.
          let localToken = sessionStorage.getItem('anuj_session_token');
          if (!localToken) {
             console.log("Auth: Restoring lost session token...");
             const newToken = crypto.randomUUID();
             
             // Attempt to claim the session in DB
             const { error: upsertError } = await supabase.from('user_sessions').upsert({
                user_id: session.user.id,
                session_token: newToken,
                last_active: new Date().toISOString()
             });

             // Only set local token if DB write succeeded
             if (!upsertError) {
               sessionStorage.setItem('anuj_session_token', newToken);
               currentSessionToken.current = newToken;
             } else {
               console.error("Auth: Failed to restore session token in DB", upsertError);
             }
          }

          // Check session validity
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
  }, [user?.id]); 

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Profile fetch error", error);
        return;
      }

      if (data) {
        const typedProfile: Profile = {
          ...data,
          role: (data.role === 'admin' || data.role === 'worker') ? data.role : 'worker'
        };
        setProfile(typedProfile);
      }
    } catch (error) {
      console.error('Auth: Exception while fetching profile:', error);
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
      
      // 1. LOCK: Tell the system we are performing a login
      isLoggingIn.current = true;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      if (data.user) {
        // --- SINGLE SESSION IMPLEMENTATION ---
        const newSessionToken = crypto.randomUUID();
        
        // 4. Update the database FIRST.
        // We prioritize the DB write. If this fails, we don't claim the session locally.
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .upsert({ 
            user_id: data.user.id, 
            session_token: newSessionToken,
            last_active: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (sessionError) {
          console.error('Failed to register session token:', sessionError);
          // CRITICAL: If DB write failed, DO NOT set local token.
          // This ensures validateSession() sees (null vs null) or (null vs OldToken)
          // and skips the check (due to "Fail-Safe Mode" above), allowing login to proceed.
          sessionStorage.removeItem('anuj_session_token');
        } else {
          // Success! Claim the session locally.
          sessionStorage.setItem('anuj_session_token', newSessionToken);
          currentSessionToken.current = newSessionToken;
        }
      }
      
      toast.success('Signed in successfully!');
      return { user: data.user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Error signing in');
      throw error;
    } finally {
      // 5. UNLOCK: Login complete
      setTimeout(() => {
        isLoggingIn.current = false;
        setLoading(false);
      }, 500);
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
