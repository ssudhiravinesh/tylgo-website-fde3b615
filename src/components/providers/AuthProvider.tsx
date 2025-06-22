
import { useState, ReactNode, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile, AuthContextType } from '@/types/auth';
import { fetchProfile, signUpUser, signInUser, signOutUser } from '@/utils/authUtils';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Auth provider initializing...");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session?.user ? "User found" : "No user");
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, setProfile, setLoading);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user ? "User present" : "No user");
      
      if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing state");
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, setProfile, setLoading);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'worker') => {
    await signUpUser(email, password, name, role, setLoading);
  };

  const signIn = async (email: string, password: string) => {
    await signInUser(email, password, setLoading);
  };

  const signOut = async () => {
    await signOutUser(setUser, setProfile, setLoading);
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
