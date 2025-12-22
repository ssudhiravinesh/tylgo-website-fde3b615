-- Create a function to check association between brand, showroom, and email
CREATE OR REPLACE FUNCTION public.check_brand_email_association(lookup_email TEXT, brand_id UUID)
RETURNS TABLE (
  subdomain TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_subdomain TEXT;
BEGIN
  -- We need to check if:
  -- 1. Example: A profile with 'lookup_email' exists
  -- 2. That profile belongs to a showroom
  -- 3. That showroom belongs to the 'brand_id'
  
  SELECT s.subdomain
  INTO found_subdomain
  FROM public.profiles p
  JOIN public.showrooms s ON p.showroom_id = s.id
  WHERE p.email = lookup_email
  AND s.brand_id = check_brand_email_association.brand_id;

  -- If found, return it
  IF found_subdomain IS NOT NULL THEN
    RETURN QUERY SELECT found_subdomain;
  ELSE
    RETURN;
  END IF;
END;
$$;
