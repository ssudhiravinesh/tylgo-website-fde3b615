-- =============================================
-- DROP STALE QUOTATION DELETE POLICY
-- =============================================
-- The policy "Admins/workers can delete quotations " (note trailing space)
-- was left over from an earlier migration and has NO showroom filter.
-- It allows any admin or worker to delete quotations from ANY showroom.
-- The correct showroom-scoped policies already exist:
--   - "Admins can manage showroom quotations" (FOR ALL with showroom filter)
--   - "Workers can delete their quotations" (with worker_id + showroom filter)
-- =============================================

DROP POLICY IF EXISTS "Admins/workers can delete quotations " ON public.quotations;
