-- =============================================
-- FIX tally_sync_log STATUS CHECK CONSTRAINT
-- =============================================
-- The original CHECK only allowed ('success', 'failure') but
-- useTriggerStockSync inserts with status = 'pending'.
-- This caused the "Refresh Stock" button to silently fail.
-- =============================================

ALTER TABLE public.tally_sync_log DROP CONSTRAINT IF EXISTS tally_sync_log_status_check;
ALTER TABLE public.tally_sync_log ADD CONSTRAINT tally_sync_log_status_check 
  CHECK (status IN ('pending', 'success', 'failure'));
