
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/auth';

export const fetchProfile = async (
  userId: string,
  setProfile: (profile: Profile | null) => void,
  setLoading: (loading: boolean) => void
) => {
  try {
    console.log("Fetching profile for user:", userId);
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      
      // If profile doesn't exist, create one from user metadata
      if (error.code === 'PGRST116') {
        console.log("Profile not found, attempting to create from user metadata");
        await createProfileFromUser(userId, setProfile, setLoading);
        return;
      }
      
      toast.error('Error loading profile');
      // Always set loading to false on error
      setLoading(false);
    } else if (data) {
      console.log("Profile fetched successfully:", data.name);
      setProfile(data);
      setLoading(false);
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    // Ensure loading is always set to false on error
    setLoading(false);
  }
};

export const createProfileFromUser = async (
  userId: string,
  setProfile: (profile: Profile | null) => void,
  setLoading: (loading: boolean) => void
) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (user && user.user_metadata) {
      console.log("Creating profile from user metadata:", user.user_metadata);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: user.user_metadata.role || 'worker'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        toast.error('Error creating profile');
      } else {
        console.log("Profile created successfully:", data.name);
        setProfile(data);
      }
    } else {
      console.error("No user metadata available for profile creation");
      // Force sign out if we can't create a profile
      await signOutUser(setProfile, () => {}, setLoading);
    }
  } catch (error) {
    console.error('Error creating profile from user:', error);
  } finally {
    // Always set loading to false regardless of success or failure
    setLoading(false);
  }
};

export const signUpUser = async (
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'worker',
  setLoading: (loading: boolean) => void
) => {
  try {
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
    toast.error(error.message || 'Error creating account');
    throw error;
  } finally {
    setLoading(false);
  }
};

export const signInUser = async (
  email: string,
  password: string,
  setLoading: (loading: boolean) => void
) => {
  try {
    setLoading(true);
    
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
    toast.error(error.message || 'Error signing in');
    throw error;
  } finally {
    setLoading(false);
  }
};

export const signOutUser = async (
  setUser: (user: any) => void,
  setProfile: (profile: Profile | null) => void,
  setLoading: (loading: boolean) => void
) => {
  console.log("Sign out initiated");
  try {
    // Clear state immediately
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign out error:', error);
      // Even if there's an error, we've cleared the local state
    }
    
    console.log("Sign out completed");
    toast.success('Signed out successfully!');
  } catch (error: any) {
    console.error('Sign out error:', error);
    // Still clear local state even if there's an error
    setUser(null);
    setProfile(null);
    setLoading(false);
  }
};
