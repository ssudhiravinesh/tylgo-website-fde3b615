create table if not exists public.customer_products (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1,
  showroom_id uuid references public.showrooms (id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint customer_products_pkey primary key (id)
);

-- Enable RLS
alter table public.customer_products enable row level security;

-- Policies
create policy "Enable read access for authenticated users" on public.customer_products
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on public.customer_products
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on public.customer_products
  for update using (auth.role() = 'authenticated');

create policy "Enable delete access for authenticated users" on public.customer_products
  for delete using (auth.role() = 'authenticated');
