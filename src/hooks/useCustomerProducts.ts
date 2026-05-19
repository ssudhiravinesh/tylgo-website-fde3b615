
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getShowroomId } from './useShowroom';

export interface CustomerProduct {
    id: string;
    customer_id: string;
    product_id: string;
    quantity: number;
    showroom_id?: string;
    created_at: string;
    product?: {
        id: string;
        name: string;
        code?: string;
        category: string;
        price: number;
        image_url?: string;
    };
}

export const useCustomerProducts = (customerId: string) => {
    return useQuery({
        queryKey: ['customer-products', customerId],
        queryFn: async () => {
            if (!customerId) return [];

            const { data, error } = await supabase
                .from('customer_products' as any)
                .select(`
          *,
          product:products (
            id,
            name,
            code,
            category,
            price,
            image_url
          )
        `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching customer products:', error);
                throw error;
            }

            return data as unknown as CustomerProduct[];
        },
        enabled: !!customerId,
        staleTime: 1000 * 60 * 2, // 2 min
    });
};

export const useAddCustomerProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ customer_id, product_id, quantity }: { customer_id: string; product_id: string; quantity: number }) => {
            const showroom_id = await getShowroomId();

            const { data, error } = await supabase
                .from('customer_products' as any)
                .insert([{
                    customer_id,
                    product_id,
                    quantity,
                    showroom_id
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customer-products', variables.customer_id] });
            toast.success('Product added to customer!');
        },
        onError: (error) => {
            console.error('Error adding customer product:', error);
            toast.error('Failed to add product');
        }
    });
};

export const useDeleteCustomerProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('customer_products' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-products'] });
            toast.success('Product removed');
        },
        onError: (error) => {
            console.error('Error removing customer product:', error);
            toast.error('Failed to remove product');
        }
    });
};
