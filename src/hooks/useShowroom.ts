import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSessionInfo } from '@/utils/sessionCache';

export interface Showroom {
  id: string;
  name: string;
  subdomain: string;
  brand_id?: string;
  created_at: string;
}

export const useShowroom = () => {
  return useQuery({
    queryKey: ['current-showroom'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get showroom_id from user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('showroom_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.showroom_id) {
        console.error('Error fetching showroom:', profileError);
        return null;
      }

      // Get showroom details
      const { data: showroom, error: showroomError } = await supabase
        .from('showrooms')
        .select('*')
        .eq('id', profile.showroom_id)
        .single();

      if (showroomError) {
        console.error('Error fetching showroom details:', showroomError);
        return null;
      }

      return showroom as Showroom;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

// Helper function to get showroom_id for use in mutations
// Now uses the session cache — resolves instantly after first call.
export const getShowroomId = async (): Promise<string | null> => {
  const session = await getSessionInfo();
  return session.showroomId;
};

// Helper function to get brand_id for brand-level tile/product filtering
// Now uses the session cache — resolves instantly after first call.
export const getBrandId = async (): Promise<string | null> => {
  const session = await getSessionInfo();
  return session.brandId;
};
