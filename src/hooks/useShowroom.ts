import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
export const getShowroomId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('showroom_id')
    .eq('id', user.id)
    .single();

  return profile?.showroom_id || null;
};

// Helper function to get brand_id for brand-level tile/product filtering
export const getBrandId = async (): Promise<string | null> => {
  const showroomId = await getShowroomId();
  if (!showroomId) return null;

  const { data: showroom } = await supabase
    .from('showrooms')
    .select('brand_id')
    .eq('id', showroomId)
    .single();

  return showroom?.brand_id || null;
};
