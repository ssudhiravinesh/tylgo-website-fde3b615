import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  tile_id: string;
  room_id: string;
  area: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
  custom_boxes?: number;
  tile?: {
    id: string;
    code: string;
    name: string;
    size_length: number;
    size_breadth: number;
    price_per_box: number;
    pieces_per_box: number;
  };
  room?: {
    id: string;
    name: string;
    length: number;
    width: number;
    unit: string;
  };
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status: string;
  notes?: string;
  wastage_percentage?: number; // Add wastage percentage field
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    address?: string;
  };
  worker?: {
    id: string;
    name: string;
    email: string;
  };
  quotation_items?: QuotationItem[];
}

export interface CreateQuotationData {
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status?: string;
  notes?: string;
  wastage_percentage?: number; // Add wastage percentage field
  items: Omit<QuotationItem, 'id' | 'quotation_id'>[];
}

interface QuotationFilters {
  quickSort?: string;
  year?: number | null;
  month?: number | null;
}

export const useQuotations = (filters?: QuotationFilters) => {
  const queryClient = useQueryClient();

  const {
    data: quotations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quotations', filters],
    queryFn: async () => {
      console.log('Fetching quotations with filters:', filters);
      
      // Get current user to determine filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('quotations')
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          ),
          quotation_items (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            custom_boxes,
            tile:tiles!tile_id (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            room:rooms!room_id (
              id,
              name,
              length,
              width,
              unit
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by worker_id if user is a worker (not admin)
      if (profile?.role === 'worker') {
        console.log('Filtering quotations for worker:', user.id);
        query = query.eq('worker_id', user.id);
      } else {
        console.log('Admin user - showing all quotations');
      }

      // Apply date filters
      if (filters?.quickSort && filters.quickSort !== 'all') {
        const now = new Date();
        let startDate: string;
        let endDate: string;
        
        switch (filters.quickSort) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
            endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'this_week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString();
            query = query.gte('created_at', startDate);
            break;
          case 'last_week':
            const lastWeekStart = new Date(now);
            lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            startDate = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate()).toISOString();
            endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('created_at', startDate);
            break;
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query.gte('created_at', lastMonth.toISOString())
                        .lte('created_at', new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate(), 23, 59, 59).toISOString());
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString();
            query = query.gte('created_at', startDate);
            break;
        }
      }

      // Apply precise year/month filters
      if (filters?.year && filters.year > 0) {
        const yearStart = new Date(filters.year, 0, 1).toISOString();
        const yearEnd = new Date(filters.year, 11, 31, 23, 59, 59).toISOString();
        query = query.gte('created_at', yearStart).lte('created_at', yearEnd);
        
        if (filters.month && filters.month > 0 && filters.month <= 12) {
          const monthStart = new Date(filters.year, filters.month - 1, 1).toISOString();
          const monthEnd = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
          query = query.gte('created_at', monthStart).lte('created_at', monthEnd);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quotations:', error);
        throw error;
      }

      console.log('Quotations fetched:', data?.length || 0);
      return data as Quotation[];
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: async (quotationData: CreateQuotationData) => {
      console.log('Creating quotation with items:', quotationData);
      
      const { items, ...quotationFields } = quotationData;
      
      // First, create the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationFields])
        .select('*')
        .single();

      if (quotationError) {
        console.error('Error creating quotation:', quotationError);
        throw quotationError;
      }

      console.log('Quotation created:', quotation);

      // Then, create the quotation items
      if (items && items.length > 0) {
        const quotationItems = items.map(item => ({
          ...item,
          quotation_id: quotation.id,
        }));

        const { data: createdItems, error: itemsError } = await supabase
          .from('quotation_items')
          .insert(quotationItems)
          .select(`
            *,
            tile:tiles!tile_id (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            room:rooms!room_id (
              id,
              name,
              length,
              width,
              unit
            )
          `);

        if (itemsError) {
          console.error('Error creating quotation items:', itemsError);
          // If items creation fails, we should delete the quotation to maintain consistency
          await supabase.from('quotations').delete().eq('id', quotation.id);
          throw itemsError;
        }

        console.log('Quotation items created:', createdItems);
      }

      // Fetch the complete quotation with items
      const { data: completeQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          ),
           quotation_items (
             id,
             tile_id,
             room_id,
             area,
             price_per_box,
             total_price,
             layer_number,
             custom_boxes,
             tile:tiles!tile_id (
               id,
               code,
               name,
               size_length,
               size_breadth,
               price_per_box,
               pieces_per_box
             ),
             room:rooms!room_id (
               id,
               name,
               length,
               width,
               unit
             )
           )
        `)
        .eq('id', quotation.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete quotation:', fetchError);
        throw fetchError;
      }

      console.log('Complete quotation with items:', completeQuotation);
      return completeQuotation as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" created successfully with ${data.quotation_items?.length || 0} items!`);
    },
    onError: (error: any) => {
      console.error('Quotation creation failed:', error);
      toast.error(error.message || 'Failed to create quotation');
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async ({ id, items, ...quotationData }: Partial<Quotation> & { id: string; items?: Omit<QuotationItem, 'quotation_id'>[] }) => {
      console.log('Updating quotation:', id, quotationData);
      
      // Update the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .update(quotationData)
        .eq('id', id)
        .select('*')
        .single();

      if (quotationError) {
        console.error('Error updating quotation:', quotationError);
        throw quotationError;
      }

      // If items are provided, update them
      if (items) {
        // Delete existing items
        await supabase
          .from('quotation_items')
          .delete()
          .eq('quotation_id', id);

        // Insert new items
        if (items.length > 0) {
          const quotationItems = items.map(item => ({
            ...item,
            quotation_id: id,
          }));

          const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(quotationItems);

          if (itemsError) {
            console.error('Error updating quotation items:', itemsError);
            throw itemsError;
          }
        }
      }

      // Fetch the complete updated quotation
      const { data: completeQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          ),
          quotation_items (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            tile:tiles!tile_id (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            room:rooms!room_id (
              id,
              name,
              length,
              width,
              unit
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching updated quotation:', fetchError);
        throw fetchError;
      }

      console.log('Quotation updated:', completeQuotation);
      return completeQuotation as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" updated successfully!`);
    },
    onError: (error: any) => {
      console.error('Quotation update failed:', error);
      toast.error(error.message || 'Failed to update quotation');
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting quotation:', id);
      
      // Delete quotation items first (due to foreign key constraint)
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      // Then delete the quotation
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quotation:', error);
        throw error;
      }

      console.log('Quotation deleted:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Quotation deletion failed:', error);
      toast.error(error.message || 'Failed to delete quotation');
    },
  });

  return {
    data: quotations, // Keep both for backward compatibility
    quotations,
    isLoading,
    error,
    refetch,
    createQuotation: createQuotationMutation.mutateAsync,
    updateQuotation: updateQuotationMutation.mutateAsync,
    deleteQuotation: deleteQuotationMutation.mutateAsync,
    isCreating: createQuotationMutation.isPending,
    isUpdating: updateQuotationMutation.isPending,
    isDeleting: deleteQuotationMutation.isPending,
  };
};

// Individual mutation hooks
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quotationData: CreateQuotationData) => {
      console.log('Creating quotation with items:', quotationData);
      
      const { items, ...quotationFields } = quotationData;
      
      // First, create the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationFields])
        .select('*')
        .single();

      if (quotationError) {
        console.error('Error creating quotation:', quotationError);
        throw quotationError;
      }

      // Then, create the quotation items
      if (items && items.length > 0) {
        const quotationItems = items.map(item => ({
          ...item,
          quotation_id: quotation.id,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(quotationItems);

        if (itemsError) {
          console.error('Error creating quotation items:', itemsError);
          // Clean up: delete the quotation if items creation fails
          await supabase.from('quotations').delete().eq('id', quotation.id);
          throw itemsError;
        }
      }

      // Fetch the complete quotation with items
      const { data: completeQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          ),
          quotation_items (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            tile:tiles!tile_id (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            room:rooms!room_id (
              id,
              name,
              length,
              width,
              unit
            )
          )
        `)
        .eq('id', quotation.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete quotation:', fetchError);
        throw fetchError;
      }

      return completeQuotation as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" created successfully with ${data.quotation_items?.length || 0} items!`);
    },
    onError: (error: any) => {
      console.error('Quotation creation failed:', error);
      toast.error(error.message || 'Failed to create quotation');
    },
  });
};

// Hook to get quotation items for a specific quotation
export const useQuotationItems = (quotationId?: string) => {
  return useQuery({
    queryKey: ['quotation-items', quotationId],
    queryFn: async () => {
      if (!quotationId) return [];
      
      const { data, error } = await supabase
        .from('quotation_items')
        .select(`
          *,
          tile:tiles!tile_id (
            id,
            code,
            name,
            size_length,
            size_breadth,
            price_per_box,
            pieces_per_box
          ),
          room:rooms!room_id (
            id,
            name,
            length,
            width,
            unit
          )
        `)
        .eq('quotation_id', quotationId);

      if (error) {
        console.error('Error fetching quotation items:', error);
        throw error;
      }

      return data as QuotationItem[];
    },
    enabled: !!quotationId,
  });
};
