import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotification } from '@/contexts/NotificationContext';

const getFinancialYear = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const year = date.getFullYear();
  
  if (month >= 4) { // April to December
    return `${year}-${String(year + 1).slice(2)}`;
  } else { // January to March
    return `${year - 1}-${String(year).slice(2)}`;
  }
};

const getFinancialYearDateRange = (financialYear?: string) => {
  const fy = financialYear || getFinancialYear();
  const startYear = parseInt(fy.split('-')[0]);
  
  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st
  
  return { startDate, endDate };
};

export const getNextQuotationNumber = async (): Promise<string> => {
  try {
    const currentFY = getFinancialYear();
    const { startDate, endDate } = getFinancialYearDateRange(currentFY);
    
    // Query database for quotations in current financial year
    const { data: existingQuotations, error } = await supabase
      .from('quotations')
      .select('quotation_number')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .like('quotation_number', `%/${currentFY}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching quotations for numbering:', error);
      throw error;
    }

    // Calculate next sequential number
    const nextNumber = (existingQuotations?.length || 0) + 1;
    const formattedNumber = String(nextNumber).padStart(5, '0');
    
    return `${formattedNumber}/${currentFY}`;
  } catch (error) {
    console.error('Error generating quotation number:', error);
    // Fallback to timestamp-based if database query fails
    const timestamp = Date.now().toString();
    return `${timestamp}/${getFinancialYear()}`;
  }
};

export const useQuotationNumber = () => {
  const [quotationNumber, setQuotationNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateNumber = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const number = await getNextQuotationNumber();
      setQuotationNumber(number);
    } catch (err) {
      setError('Failed to generate quotation number');
      console.error('Error generating quotation number:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNumber = () => {
    generateNumber();
  };

  useEffect(() => {
    generateNumber();
  }, []);

  return {
    quotationNumber,
    isLoading,
    error,
    refreshNumber
  };
};

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
  wastage_percentage?: number;
  discount_percentage?: number; // New field
  discount_amount?: number; // New field
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    address?: string;
    area?: string;
    state?: string;
    pincode?: string;
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
  wastage_percentage?: number;
  discount_percentage?: number; // New field
  discount_amount?: number; // New field
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
      
      
      try {
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

        // Optimize query by fetching quotations first, then items separately for better performance
        let baseQuery = supabase
          .from('quotations')
          .select(`
            *,
            customers!quotations_customer_id_fkey (
              id,
              name,
              mobile,
              address,
              area,
              state,
              pincode
            ),
            profiles!quotations_worker_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        // Filter by worker_id if user is a worker (not admin)
        if (profile?.role === 'worker') {
          
          baseQuery = baseQuery.eq('worker_id', user.id);
        } else {
          
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
              baseQuery = baseQuery.gte('created_at', startDate).lte('created_at', endDate);
              break;
            case 'yesterday':
              const yesterday = new Date(now);
              yesterday.setDate(now.getDate() - 1);
              startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
              endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();
              baseQuery = baseQuery.gte('created_at', startDate).lte('created_at', endDate);
              break;
            case 'this_week':
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString();
              baseQuery = baseQuery.gte('created_at', startDate);
              break;
            case 'last_week':
              const lastWeekStart = new Date(now);
              lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
              const lastWeekEnd = new Date(lastWeekStart);
              lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
              startDate = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate()).toISOString();
              endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59).toISOString();
              baseQuery = baseQuery.gte('created_at', startDate).lte('created_at', endDate);
              break;
            case 'this_month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              baseQuery = baseQuery.gte('created_at', startDate);
              break;
            case 'last_month':
              const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
              baseQuery = baseQuery.gte('created_at', lastMonth.toISOString())
                          .lte('created_at', new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate(), 23, 59, 59).toISOString());
              break;
            case 'this_year':
              startDate = new Date(now.getFullYear(), 0, 1).toISOString();
              baseQuery = baseQuery.gte('created_at', startDate);
              break;
          }
        }

        // Apply precise year/month filters
        if (filters?.year && filters.year > 0) {
          const yearStart = new Date(filters.year, 0, 1).toISOString();
          const yearEnd = new Date(filters.year, 11, 31, 23, 59, 59).toISOString();
          baseQuery = baseQuery.gte('created_at', yearStart).lte('created_at', yearEnd);
          
          if (filters.month && filters.month > 0 && filters.month <= 12) {
            const monthStart = new Date(filters.year, filters.month - 1, 1).toISOString();
            const monthEnd = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
            baseQuery = baseQuery.gte('created_at', monthStart).lte('created_at', monthEnd);
          }
        } else if (filters?.month && filters.month > 0 && filters.month <= 12) {
          // If only month is selected, use current year
          const currentYear = new Date().getFullYear();
          const monthStart = new Date(currentYear, filters.month - 1, 1).toISOString();
          const monthEnd = new Date(currentYear, filters.month, 0, 23, 59, 59).toISOString();
          baseQuery = baseQuery.gte('created_at', monthStart).lte('created_at', monthEnd);
        }

        const { data: quotationsData, error: quotationError } = await baseQuery;

        if (quotationError) {
          
          throw quotationError;
        }

        if (!quotationsData || quotationsData.length === 0) {
          
          return [];
        }

        // Fetch quotation items separately for better performance
        const quotationIds = quotationsData.map(q => q.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('quotation_items')
          .select(`
            *,
            tiles!quotation_items_tile_id_fkey (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            rooms!quotation_items_room_id_fkey (
              id,
              name,
              length,
              width,
              unit
            )
          `)
          .in('quotation_id', quotationIds);

        if (itemsError) {
          
          // Don't throw error for items, just log and continue with quotations without items
        }

        // Combine quotations with their items and map field names
        const quotationsWithItems = quotationsData.map(quotation => ({
          ...quotation,
          // Map profiles to worker to match interface
          worker: quotation.profiles,
          // Map customers to customer and ensure it includes address fields
          customer: quotation.customers,
          quotation_items: itemsData?.filter(item => item.quotation_id === quotation.id) || []
        }));

        
        return quotationsWithItems as Quotation[];
      } catch (error) {
        
        throw error;
      }
    },
  });

  const { playNotificationSound, showSuccessAnimation } = useNotification();

const createQuotationMutation = useMutation({
  mutationFn: async (quotationData: CreateQuotationData) => {
    console.log('Creating quotation with data:', quotationData);
    const { items, ...quotationFields } = quotationData;
      
      // First, create the quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert([quotationFields]) // This now includes discount_percentage and discount_amount
      .select('*')
      .single();

    if (quotationError) {
      throw quotationError;
    }

      

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
            tiles!quotation_items_tile_id_fkey (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            rooms!quotation_items_room_id_fkey (
              id,
              name,
              length,
              width,
              unit
            )
          `);

        if (itemsError) {
          // If items creation fails, we should delete the quotation to maintain consistency
          await supabase.from('quotations').delete().eq('id', quotation.id);
          throw itemsError;
        }

        
      }

      // Fetch the complete quotation with items
      const { data: completeQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customers!quotations_customer_id_fkey (
            id,
            name,
            mobile,
            address,
            area,
            state,
            pincode
          ),
          profiles!quotations_worker_id_fkey (
            id,
            name,
            email
          ),
          quotation_items!quotation_items_quotation_id_fkey (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            custom_boxes,
            tiles!quotation_items_tile_id_fkey (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            rooms!quotation_items_room_id_fkey (
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
        throw fetchError;
      }

      // Map the data structure to match interface
      const mappedQuotation = {
        ...completeQuotation,
        worker: completeQuotation.profiles,
        customer: completeQuotation.customers,
        quotation_items: completeQuotation.quotation_items || []
      };

      
      return mappedQuotation as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      
      // Play sound and show animation
      playNotificationSound('quotationCreated');
      showSuccessAnimation(`Quotation "${data.quotation_number}" created successfully!`, 'quotation');
      
      toast.success(`Quotation "${data.quotation_number}" created successfully with ${data.quotation_items?.length || 0} items!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quotation');
    },
  });

const updateQuotationMutation = useMutation({
  mutationFn: async ({ id, items, ...quotationData }: Partial<Quotation> & { id: string; items?: Omit<QuotationItem, 'quotation_id'>[] }) => {
    console.log('Updating quotation with discount data:', quotationData);
    
    // Store the previous status to check for changes
    const { data: previousQuotation } = await supabase
      .from('quotations')
      .select('status, quotation_number')
      .eq('id', id)
      .single();
      
      // Update the quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .update(quotationData) // This now includes discount_percentage and discount_amount
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
            
            throw itemsError;
          }
        }
      }

      // Fetch the complete updated quotation
      const { data: completeQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customers!quotations_customer_id_fkey (
            id,
            name,
            mobile,
            address,
            area,
            state,
            pincode
          ),
          profiles!quotations_worker_id_fkey (
            id,
            name,
            email
          ),
          quotation_items!quotation_items_quotation_id_fkey (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            tiles!quotation_items_tile_id_fkey (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            rooms!quotation_items_room_id_fkey (
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
        
        throw fetchError;
      }

      // Map the data structure to match interface
      const mappedQuotation = {
        ...completeQuotation,
        worker: completeQuotation.profiles,
        customer: completeQuotation.customers,
        quotation_items: completeQuotation.quotation_items || []
      };

      
      return { quotation: mappedQuotation as Quotation, previousStatus: previousQuotation?.status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      
      // Check if status changed to closed
      if (data.previousStatus !== 'closed' && data.quotation.status === 'closed') {
        playNotificationSound('quotationClosed');
        showSuccessAnimation(`Quotation "${data.quotation.quotation_number}" successfully closed!`, 'success');
      }
      
      toast.success(`Quotation "${data.quotation.quotation_number}" updated successfully!`);
    },
    onError: (error: any) => {
      
      toast.error(error.message || 'Failed to update quotation');
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => {
      
      
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
        
        throw error;
      }

      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully!');
    },
    onError: (error: any) => {
      
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
      
      
      const { items, ...quotationFields } = quotationData;
      
      // First, create the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationFields])
        .select('*')
        .single();

      if (quotationError) {
        
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
          customers!quotations_customer_id_fkey (
            id,
            name,
            mobile,
            address,
            area,
            state,
            pincode
          ),
          profiles!quotations_worker_id_fkey (
            id,
            name,
            email
          ),
          quotation_items!quotation_items_quotation_id_fkey (
            id,
            tile_id,
            room_id,
            area,
            price_per_box,
            total_price,
            layer_number,
            tiles!quotation_items_tile_id_fkey (
              id,
              code,
              name,
              size_length,
              size_breadth,
              price_per_box,
              pieces_per_box
            ),
            rooms!quotation_items_room_id_fkey (
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
        
        throw fetchError;
      }

      // Map the data structure to match interface
      const mappedQuotation = {
        ...completeQuotation,
        worker: completeQuotation.profiles,
        customer: completeQuotation.customers,
        quotation_items: completeQuotation.quotation_items || []
      };

      return mappedQuotation as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" created successfully with ${data.quotation_items?.length || 0} items!`);
    },
    onError: (error: any) => {
      
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
          tiles!quotation_items_tile_id_fkey (
            id,
            code,
            name,
            size_length,
            size_breadth,
            price_per_box,
            pieces_per_box
          ),
          rooms!quotation_items_room_id_fkey (
            id,
            name,
            length,
            width,
            unit
          )
        `)
        .eq('quotation_id', quotationId);

      if (error) {
        
        throw error;
      }

      return data as QuotationItem[];
    },
    enabled: !!quotationId,
  });
};
