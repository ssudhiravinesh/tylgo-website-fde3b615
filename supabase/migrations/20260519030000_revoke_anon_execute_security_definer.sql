-- =============================================
-- REVOKE ANON EXECUTE ON INTERNAL SECURITY DEFINER FUNCTIONS
-- =============================================
-- These functions are used internally by RLS policies and triggers.
-- They must NOT be callable via the public REST API (/rest/v1/rpc/*)
-- by unauthenticated (anon) users.
-- =============================================

-- Internal RLS helper functions — never need anon access
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_brand_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_showroom_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Trigger function — should never be callable via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Quotation counter — only authenticated users creating quotations need this
REVOKE EXECUTE ON FUNCTION public.get_next_quotation_number(text) FROM anon;

-- Also revoke from 'public' role to close the inherited grant path
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_brand_id(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_showroom_id(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_next_quotation_number(text) FROM public;

-- Login-flow functions: keep anon access for now (needed for pre-auth showroom discovery)
-- TODO: Move these to an Edge Function to eliminate the anon RPC surface:
-- - get_all_brands_with_showrooms()
-- - get_brand_details_by_email(text)
-- - get_showroom_details_by_email(text)
-- - get_showroom_subdomain_by_email(text)
-- - check_brand_email_association(text, uuid)
