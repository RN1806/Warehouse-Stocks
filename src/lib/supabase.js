import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/*
=================================================================
  KAWA SAMPLE DELIVERY v5 — SUPABASE SQL SCHEMA
  SQL Editor → New query → paste everything below → Run
=================================================================

-- 1. Sales reps
create table if not exists sales_reps (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text check (role in ('staff','manager','admin')) default 'staff',
  created_at timestamptz default now()
);

-- 2. Customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_email text,
  address text,
  contact_person text,
  contact_phone text,
  department text,
  industry text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. Suppliers
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text,
  created_at timestamptz default now()
);

-- 4. Products (linked to supplier)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier_id uuid references suppliers(id) on delete set null,
  supplier_name text,
  industry text,
  default_amount numeric,
  default_unit text default 'g',
  current_qty integer not null default 0,
  created_at timestamptz default now()
);

-- 5. Stock updates (warehouse stock log)
create table if not exists stock_updates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  product_name text not null,
  supplier_name text,
  lot_number text,
  pack_size_amount numeric,
  pack_size_unit text,
  number_of_packs integer,
  total_amount numeric,
  total_unit text,
  expiry_date date,
  storage_location text,
  action text check (action in ('in','out','adjust')) not null default 'in',
  status text check (status in ('pending','confirmed')) default 'pending',
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  notes text,
  created_at timestamptz default now()
);

-- 6. Delivery forms
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  form_number text unique not null,
  delivery_date date not null default current_date,
  sales_rep_id uuid references sales_reps(id) on delete set null,
  sales_rep_name text not null,
  sales_rep_phone text,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_address text,
  contact_person text,
  contact_phone text,
  department text,
  provided_by text,
  remark text,
  status text check (status in ('draft','sent','received')) default 'draft',
  created_at timestamptz default now()
);

-- 7. Delivery items
create table if not exists delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references deliveries(id) on delete cascade,
  item_order integer not null,
  product_name text not null,
  amount numeric,
  unit text,
  packaging_description text,
  lot_no text,
  remark text
);

-- 8. RLS
alter table sales_reps enable row level security;
alter table customers enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table stock_updates enable row level security;
alter table deliveries enable row level security;
alter table delivery_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='sales_reps' and policyname='v5 sales_reps select') then
    create policy "v5 sales_reps select" on sales_reps for select using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='sales_reps' and policyname='v5 sales_reps insert') then
    create policy "v5 sales_reps insert" on sales_reps for insert with check (auth.uid()=id);
  end if;
  if not exists (select 1 from pg_policies where tablename='sales_reps' and policyname='v5 sales_reps update') then
    create policy "v5 sales_reps update" on sales_reps for update using (auth.uid()=id);
  end if;
  if not exists (select 1 from pg_policies where tablename='customers' and policyname='v5 customers all') then
    create policy "v5 customers all" on customers for all using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='suppliers' and policyname='v5 suppliers all') then
    create policy "v5 suppliers all" on suppliers for all using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='products' and policyname='v5 products all') then
    create policy "v5 products all" on products for all using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='stock_updates' and policyname='v5 stock_updates all') then
    create policy "v5 stock_updates all" on stock_updates for all using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='deliveries' and policyname='v5 deliveries all') then
    create policy "v5 deliveries all" on deliveries for all using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='delivery_items' and policyname='v5 items all') then
    create policy "v5 items all" on delivery_items for all using (auth.role()='authenticated');
  end if;
end $$;

-- 9. Realtime
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table stock_updates;
alter publication supabase_realtime add table deliveries;

-- 10. Seed suppliers
insert into suppliers (name, category) values
  ('Anhui Black Cat','Paint & Construction'),('Baxsn','Paint & Construction'),
  ('CDI','Paint & Construction'),('Celotech','Paint & Construction'),
  ('Celanese','Paint & Construction'),('Hebei Yicheng','Paint & Construction'),
  ('Indian Chemical','Paint & Construction'),('Indofill','Paint & Construction'),
  ('Innovative Polymer','Paint & Construction'),('Lingwe','Paint & Construction'),
  ('LOCA','Paint & Construction'),('Louis T','Paint & Construction'),
  ('Momentive','Paint & Construction'),('Nouryon','Paint & Construction'),
  ('Phomera','Paint & Construction'),('Poly Coat','Paint & Construction'),
  ('Ruisil','Paint & Construction'),('Siam Luck','Paint & Construction'),
  ('Shinetsu','Paint & Construction'),('Sudarshan','Paint & Construction'),
  ('Vencorex','Paint & Construction'),('Zhejiang Camp','Paint & Construction'),
  ('Aati','S Plus'),('Bifrost','S Plus'),('Calibre','S Plus'),
  ('Cosmeplus','S Plus'),('Derypol','S Plus'),
  ('Dongying Hi-Tech Spring Chemical Industry','S Plus'),
  ('Environ Chem','S Plus'),('I plus','S Plus'),('JC Chem','S Plus'),
  ('Silox India','S Plus'),('Startec','S Plus'),('Thai Food','S Plus'),
  ('Utika','S Plus'),('Velhoki','S Plus'),('WC','S Plus'),
  ('YFZ','S Plus'),('Yunfu','S Plus'),('Zhechem','S Plus'),
  ('ABP','Personal Care & Home Care'),('ALL PLUS','Personal Care & Home Care'),
  ('Amhwa','Personal Care & Home Care'),('Apical','Personal Care & Home Care'),
  ('Bronson','Personal Care & Home Care'),('Chesir','Personal Care & Home Care'),
  ('DKSH','Personal Care & Home Care'),('EOC','Personal Care & Home Care'),
  ('Evonik','Personal Care & Home Care'),('GVD','Personal Care & Home Care'),
  ('Green Phamahol','Personal Care & Home Care'),
  ('Infinita','Personal Care & Home Care'),('JINKE','Personal Care & Home Care'),
  ('Lapox','Personal Care & Home Care'),('Munzing','Personal Care & Home Care'),
  ('Natura','Personal Care & Home Care'),('Royal','Personal Care & Home Care'),
  ('Runhe','Personal Care & Home Care'),('Sharon','Personal Care & Home Care'),
  ('Shinehigh','Personal Care & Home Care'),('Soho Aneco','Personal Care & Home Care'),
  ('Sojuvant','Personal Care & Home Care'),('Sydney','Personal Care & Home Care'),
  ('Tanatex','Personal Care & Home Care'),('Thai Sanguanwat','Personal Care & Home Care'),
  ('Union','Personal Care & Home Care'),('Vogele','Personal Care & Home Care'),
  ('Goldstab','Plastics'),('HCA','Plastics'),('Mitsubishi','Plastics'),
  ('Ajanta','Agriculture'),('GGC','Agriculture'),('Jackhem','Agriculture'),
  ('Chorus','Lubricant'),('DL Chemical','Lubricant'),('Environ','Lubricant'),
  ('Italmatch','Lubricant'),('Mohini','Lubricant'),
  ('Sakpiroon','Lubricant'),('SFC','Lubricant'),('Shijiazhuang','Lubricant'),
  ('Syner','Lubricant'),('TBIO','Lubricant'),('Work lube','Lubricant')
on conflict (name) do nothing;

=================================================================
*/
