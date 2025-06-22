
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'worker') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
