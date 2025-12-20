-- Create a function to lookup showroom details by email
CREATE OR REPLACE FUNCTION public.get_showroom_details_by_email(lookup_email TEXT)
RETURNS TABLE (
  showroom_name TEXT,
  showroom_subdomain TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_showroom_id UUID;
BEGIN
  -- 1. Find the user's profile and get their showroom_id
  SELECT showroom_id INTO found_showroom_id
  FROM public.profiles
  WHERE email = lookup_email;

  -- 2. If no profile or showroom found, return nothing
  IF found_showroom_id IS NULL THEN
    RETURN;
  END IF;

  -- 3. Return the showroom details
  RETURN QUERY
  SELECT name, subdomain
  FROM public.showrooms
  WHERE id = found_showroom_id;
END;
$$;
