import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomProductSelection {
    id: string;
    room_id: string;
    product_id: string;
    customer_id: string;
    quantity: number;
    showroom_id?: string;
    product?: {
        code: string;
        name: string;
        price: number;
        image_url?: string;
        category?: string;
    };
}

export const useRoomProductSelections = (customerId: string) => {
    return useQuery({
        queryKey: ['room-product-selections', customerId],
        queryFn: async () => {
            if (!customerId) return [];

            // @ts-ignore
            const { data, error } = await supabase
                .from('room_product_selections')
                .select(`
          *,
          product:products(code, name, price, image_url, category)
        `)
                .eq('customer_id', customerId);

            if (error) {
                console.error('Error fetching product selections:', error);
                throw error;
            }

            return data as RoomProductSelection[];
        },
        enabled: !!customerId
    });
};

export const useSaveRoomProductSelection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (selection: {
            room_id: string;
            product_id: string;
            customer_id: string;
            quantity?: number;
        }) => {
            // Check if already exists to update quantity vs insert
            // @ts-ignore
            const { data: existing } = await supabase
                .from('room_product_selections')
                .select('id, quantity')
                .eq('room_id', selection.room_id)
                .eq('product_id', selection.product_id)
                .single();

            if (existing) {
                // @ts-ignore
                const { error } = await supabase
                    .from('room_product_selections')
                    .update({ quantity: (existing.quantity || 0) + (selection.quantity || 1) })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                // @ts-ignore
                const { error } = await supabase
                    .from('room_product_selections')
                    .insert([{ ...selection, quantity: selection.quantity || 1 }]);
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['room-product-selections', variables.customer_id] });
            toast.success("Product selection saved");
        },
        onError: (error) => {
            console.error('Error saving product selection:', error);
            toast.error("Failed to save product selection");
        }
    });
};

export const useDeleteRoomProductSelection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
            // @ts-ignore
            const { error } = await supabase
                .from('room_product_selections')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['room-product-selections', variables.customerId] });
            toast.success("Product selection removed");
        },
        onError: (error) => {
            console.error('Error deleting product selection:', error);
            toast.error("Failed to remove product");
        }
    });
};
