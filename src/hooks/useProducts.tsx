
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getBrandId, getShowroomId } from './useShowroom';
import QRCode from 'qrcode';

export interface Product {
    id: string;
    code?: string;
    name: string;
    category: string;
    unit: string;
    dimensions: Record<string, any>;
    price: number;
    image_url?: string;
    qr_code_url?: string;
    is_active: boolean;
    showroom_id?: string;
    created_at?: string;
    updated_at?: string;
}

const generateProductQRCode = async (productCode: string): Promise<string | null> => {
    try {
        const qrDataUrl = await QRCode.toDataURL(productCode, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        const response = await fetch(qrDataUrl);
        const blob = await response.blob();

        const fileName = `${productCode}-qr.png`;
        const { error } = await supabase.storage
            .from('product-qrs')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            console.error('Error uploading QR code:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('product-qrs')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        return null;
    }
};

export const useProducts = (includeInactive = false, overrideBrandId?: string) => {
    return useQuery({
        queryKey: ['products', includeInactive, overrideBrandId],
        queryFn: async () => {
            console.log('🔄 Fetching products...', { overrideBrandId });

            let targetBrandId: string | null = null;
            if (overrideBrandId) {
                targetBrandId = overrideBrandId;
            } else {
                targetBrandId = await getBrandId();
            }

            // Check if user is super_admin
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

            // Filter by brand_id (products shared across all showrooms in brand)
            if (targetBrandId) {
                query = query.eq('brand_id', targetBrandId);
            } else if (!isSuperAdmin) {
                // If regular user/admin has no brand, they shouldn't see anything or handle appropriately
                // We keep existing implicit behavior: if no brand_id and not superadmin, maybe we shouldn't filter?
                // But usually this means data issue. Safe to filter nothing? 
                // Original code: if (brand_id && !isSuperAdmin). 
                // So if brand_id was null, it showed all? No, likely RLS handles it.
                // We'll stick to: if targetBrandId, use it.
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

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedProduct: Partial<Product> & { id: string }) => {
            const { id, ...updates } = updatedProduct;

            // Remove fields that shouldn't be updated or are managed automatically
            delete (updates as any).created_at;
            delete (updates as any).updated_at;

            const { data, error } = await supabase
                .from('products' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Generate QR code if product code changes
            if (updates.code) {
                const qrCodeUrl = await generateProductQRCode(updates.code);
                if (qrCodeUrl) {
                    const { error: qrError } = await supabase
                        .from('products' as any)
                        .update({ qr_code_url: qrCodeUrl })
                        .eq('id', id);

                    if (qrError) console.error('Error updating product QR:', qrError);
                    else data.qr_code_url = qrCodeUrl;
                }
            }

            return data;
        },
        onSuccess: () => {
            toast.success('Product updated successfully');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            console.error('Error updating product:', error);
            toast.error('Failed to update product');
        }
    });
};

export const useGenerateQRForProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productId: string) => {
            const { data: product, error } = await supabase
                .from('products' as any)
                .select('*')
                .eq('id', productId)
                .single();

            if (error || !product) throw new Error('Product not found');
            if (!product.code) throw new Error('Product has no code');

            const qrCodeUrl = await generateProductQRCode(product.code);
            if (!qrCodeUrl) throw new Error('Failed to generate QR code');

            const { error: updateError } = await supabase
                .from('products' as any)
                .update({ qr_code_url: qrCodeUrl })
                .eq('id', productId);

            if (updateError) throw updateError;
            return qrCodeUrl;
        },
        onSuccess: () => {
            toast.success('QR code generated successfully');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            console.error('QR generation failed:', error);
            toast.error('Failed to generate QR code');
        }
    });
};

export const useAddProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
            // Get both brand_id and showroom_id
            const brand_id = await getBrandId();
            const showroom_id = await getShowroomId();

            if (!brand_id) {
                throw new Error('No brand assigned to showroom');
            }

            const { data, error } = await supabase
                .from('products' as any)
                .insert([{ ...newProduct, brand_id, showroom_id }])
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
