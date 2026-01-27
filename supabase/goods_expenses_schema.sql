-- Create tables for Goods and Expenses management

-- 1. Secret Codes Table
create table secret_codes (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  assigned_to text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Goods Table
create table goods (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  quantity integer not null default 1,
  category text,
  status text check (status in ('Bought', 'To Be Bought')) default 'To Be Bought',
  estimated_cost decimal(10,2) default 0,
  actual_cost decimal(10,2) default 0,
  vendor text,
  purchase_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Expenses Table
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  amount decimal(10,2) not null,
  category text,
  description text,
  date date default current_date,
  proof_url text,
  issued_by_code text references secret_codes(code),
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Secret Codes: Only Admins can see/manage
alter table secret_codes enable row level security;
create policy "Admins can manage secret codes"
  on secret_codes for all
  using ( auth.role() = 'authenticated' );

-- Goods: Everyone can view, Admins can manage
alter table goods enable row level security;
create policy "Anyone can view goods"
  on goods for select
  using ( true );
create policy "Admins can manage goods"
  on goods for all
  using ( auth.role() = 'authenticated' );

-- Expenses: 
-- Anyone with a valid code can insert (we'll check this in the app logic or via a trigger/function, 
-- but for RLS we can restrict insert based on code existence if we want to be fancy).
-- For now, let's keep it simple and allow public insert but admin-only read for privacy.
alter table expenses enable row level security;
create policy "Public can insert expenses"
  on expenses for insert
  with check ( true ); -- We will validate the code in the application layer
create policy "Admins can view and manage expenses"
  on expenses for all
  using ( auth.role() = 'authenticated' );

-- Storage for Expense Proofs
-- Note: This usually needs to be done via the Supabase UI or a separate script.
-- Here is the SQL to create the bucket if using the storage extension.
insert into storage.buckets (id, name, public) values ('expense-proofs', 'expense-proofs', true);

create policy "Public can upload expense proofs"
  on storage.objects for insert
  with check ( bucket_id = 'expense-proofs' );

create policy "Anyone can view expense proofs"
  on storage.objects for select
  using ( bucket_id = 'expense-proofs' );
