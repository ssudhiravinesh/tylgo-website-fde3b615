import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'worker' | 'super_admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  showroom_id?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole, showroomId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
}
