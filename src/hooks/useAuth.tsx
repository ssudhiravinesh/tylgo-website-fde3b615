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
  
  // Track the current session token for this specific browser tab
  const currentSessionToken = useRef<string | null>(null);

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear local session tracking
      sessionStorage.removeItem('anuj_session_token');
      currentSessionToken.current = null;

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

  // Session validation removed - will be reimplemented after types are regenerated

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');
    
    // 1. Listen for Supabase Auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed -', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
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

    // Realtime subscription removed - will be reimplemented with proper single-session

    // 3. Initial Load Check
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
    };
  }, [user?.id]); // Re-subscribe if the user ID changes

  const fetchProfile = async (userId: string) => {
    try {
      // It is safe to fetch from 'profiles' for UI display purposes
      // The real security is handled by RLS on table access
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile fetch fails, we don't block the app, but user details might be missing
        console.error("Profile fetch error", error);
        return;
      }

      if (data) {
        // Cast the string role from DB to our specific union type
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      // Single session logic will be reimplemented after database migration
      
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