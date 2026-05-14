import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TallySyncStatus = 'pending' | 'queued' | 'synced' | 'failed' | 'ignored';

export interface TallySyncInfo {
  tally_sync_status: TallySyncStatus;
  tally_voucher_number: string | null;
  tally_sync_error: string | null;
  tally_synced_at: string | null;
}

export interface TallySyncLogEntry {
  id: string;
  brand_id: string;
  sync_type: 'stock_pull' | 'voucher_push';
  status: 'success' | 'failure';
  records_processed: number;
  error_message: string | null;
  created_at: string;
}

// ── Queue a quotation for Tally sync ───────────────────────────────────────────

export const useTallySync = () => {
  const queryClient = useQueryClient();

  /** Queue a quotation to be synced to Tally */
  const queueForTallyMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({
          tally_sync_status: 'queued',
          tally_sync_error: null, // Clear any previous error
        })
        .eq('id', quotationId)
        .select('id, quotation_number, tally_sync_status')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" queued for Tally sync`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to queue for Tally sync'));
    },
  });

  /** Mark a quotation as ignored (won't be synced to Tally) */
  const ignoreForTallyMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({ tally_sync_status: 'ignored' })
        .eq('id', quotationId)
        .select('id, quotation_number')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.info(`Quotation "${data.quotation_number}" excluded from Tally sync`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update Tally sync status'));
    },
  });

  /** Retry a failed sync */
  const retryTallySyncMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({
          tally_sync_status: 'queued',
          tally_sync_error: null,
        })
        .eq('id', quotationId)
        .select('id, quotation_number')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Retrying Tally sync for "${data.quotation_number}"`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to retry Tally sync'));
    },
  });

  return {
    queueForTally: queueForTallyMutation.mutateAsync,
    ignoreForTally: ignoreForTallyMutation.mutateAsync,
    retryTallySync: retryTallySyncMutation.mutateAsync,
    isQueuing: queueForTallyMutation.isPending,
    isIgnoring: ignoreForTallyMutation.isPending,
    isRetrying: retryTallySyncMutation.isPending,
  };
};

// ── Query: Get quotations pending Tally sync ───────────────────────────────────

export const useTallyPendingQuotations = () => {
  return useQuery({
    queryKey: ['tally-pending-quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          total_cost,
          tally_sync_status,
          tally_sync_error,
          tally_synced_at,
          created_at,
          customers!quotations_customer_id_fkey (
            id, name, mobile
          )
        `)
        .in('tally_sync_status', ['queued', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Poll every 10s to see relay updates
  });
};

// ── Query: Get Tally sync log ──────────────────────────────────────────────────

export const useTallySyncLog = (limit = 50) => {
  return useQuery({
    queryKey: ['tally-sync-log', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tally_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as TallySyncLogEntry[];
    },
  });
};

// ── Query: Get Tally stock mappings ────────────────────────────────────────────

export interface TallyStockMapping {
  id: string;
  tile_id: string;
  tally_stock_item_name: string;
  created_at: string;
  updated_at: string;
}

export const useTallyStockMappings = () => {
  return useQuery({
    queryKey: ['tally-stock-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tally_stock_mappings')
        .select(`
          *,
          tiles!tally_stock_mappings_tile_id_fkey (
            id, code, size_length, size_breadth, category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// ── Mutation: Create/update stock mapping ──────────────────────────────────────

export const useUpsertStockMapping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: { tile_id: string; tally_stock_item_name: string }) => {
      const { data, error } = await supabase
        .from('tally_stock_mappings')
        .upsert(mapping, { onConflict: 'tile_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tally-stock-mappings'] });
      toast.success('Stock mapping saved');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to save stock mapping'));
    },
  });
};

// ── Query: Last stock sync status ──────────────────────────────────────────────

export interface LastStockSync {
  id: string;
  status: 'success' | 'failure';
  records_processed: number;
  error_message: string | null;
  created_at: string;
}

/**
 * Returns the most recent stock_pull sync log entry.
 * Used to show "Last synced: 5 min ago" in the admin panel and tile catalogue.
 */
export const useLastStockSync = () => {
  return useQuery({
    queryKey: ['last-stock-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tally_sync_log')
        .select('id, status, records_processed, error_message, created_at')
        .eq('sync_type', 'stock_pull')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LastStockSync | null;
    },
    refetchInterval: 30000, // Poll every 30s
  });
};

// ── Mutation: Trigger manual stock sync ────────────────────────────────────────

/**
 * Inserts a 'stock_pull' request into tally_sync_log with status 'pending'.
 * The Node.js relay polls for these and performs the actual Tally → Supabase sync.
 * 
 * This is the manual "Refresh Stock" trigger — the automatic trigger happens
 * inside the relay after every successful voucher push.
 */
export const useTriggerStockSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const { data, error } = await supabase
        .from('tally_sync_log')
        .insert({
          brand_id: brandId,
          sync_type: 'stock_pull',
          status: 'pending',
          records_processed: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['last-stock-sync'] });
      queryClient.invalidateQueries({ queryKey: ['tally-sync-log'] });
      toast.success('Stock sync requested — the relay will process this shortly');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to trigger stock sync'));
    },
  });
};

