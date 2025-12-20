
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getShowroomId } from './useShowroom';

export interface Product {
    id: string;
    code?: string;
    name: string;
    category: string;
    dimensions: Record<string, any>;
    price: number;
    image_url?: string;
    is_active: boolean;
    showroom_id?: string;
    created_at?: string;
    updated_at?: string;
}

export const useProducts = (includeInactive = false) => {
    return useQuery({
        queryKey: ['products', includeInactive],
        queryFn: async () => {
            console.log('🔄 Fetching products...');
            const showroom_id = await getShowroomId();

            // Check if user is super_admin (reusing logic from useTiles if possible, or just duplicate for now)
            const { data: { user } } = await supabase.auth.getUser();
            let isSuperAdmin = false;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role === 'super_admin') {
                    isSuperAdmin = true;
                }
            }

            let query = supabase
                .from('products' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (showroom_id && !isSuperAdmin) {
                query = query.eq('showroom_id', showroom_id);
            }

            if (!includeInactive) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Error fetching products:', error);
                throw error;
            }

            console.log(`✅ Fetched ${data?.length} products`);
            return data as unknown as Product[];
        },
    });
};

export const useAddProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
            const showroom_id = await getShowroomId();

            const { data, error } = await supabase
                .from('products' as any)
                .insert([{ ...newProduct, showroom_id }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Product added successfully');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            console.error('Error adding product:', error);
            toast.error('Failed to add product');
        }
    });
};

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('products' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Product deleted');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        }
    });
};
