
import { useState, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'worker') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'worker') => {
    try {
      setLoading(true);
      
      // Simulate user creation
      const newUser = { id: '1', email };
      const newProfile = { id: '1', name, email, role };
      
      setUser(newUser);
      setProfile(newProfile);
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error('Error creating account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Simulate sign in
      const mockUser = { id: '1', email };
      const mockProfile = { id: '1', name: 'Demo User', email, role: 'admin' as const };
      
      setUser(mockUser);
      setProfile(mockProfile);
      
      toast.success('Signed in successfully!');
    } catch (error: any) {
      toast.error('Error signing in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setProfile(null);
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.error('Error signing out');
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
