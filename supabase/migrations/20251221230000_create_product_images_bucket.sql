-- Create a new bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Policy to allow public read access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Policy to allow authenticated users to upload
create policy "Authenticated Users can upload"
on storage.objects for insert
with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete
create policy "Authenticated Users can delete"
on storage.objects for delete
using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update
create policy "Authenticated Users can update"
on storage.objects for update
using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
