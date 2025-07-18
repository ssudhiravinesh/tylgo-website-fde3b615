-- Update the quotations status check constraint to include 'closed'
ALTER TABLE public.quotations 
DROP CONSTRAINT quotations_status_check;

ALTER TABLE public.quotations 
ADD CONSTRAINT quotations_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'closed'::text]));