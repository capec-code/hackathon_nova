-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- ==========================================
-- CAPEC TABLES
-- ==========================================

-- 1. VOLUNTEERS_CAPEC
create table volunteers_capec (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    email text,
    role text default 'volunteer',
    unique_code text not null unique,
    active boolean default true,
    created_at timestamptz default now()
);

-- 2. ATTENDANCE_CAPEC
create table attendance_capec (
    id uuid primary key default gen_random_uuid(),
    volunteer_id uuid references volunteers_capec(id) on delete cascade,
    unique_code text not null,
    device_id text,
    entry_time timestamptz not null,
    exit_time timestamptz,
    duration_minutes integer,
    status text default 'pending', -- pending, approved, declined
    location_hint jsonb,
    created_at timestamptz default now()
);

-- 3. TASKS_CAPEC
create table tasks_capec (
    id uuid primary key default gen_random_uuid(),
    volunteer_id uuid references volunteers_capec(id) on delete cascade,
    unique_code text not null,
    title text not null,
    description text,
    status text default 'pending',
    created_at timestamptz default now()
);

-- ==========================================
-- ITECPEC TABLES
-- ==========================================

-- 1. VOLUNTEERS_ITECPEC
create table volunteers_itecpec (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    email text,
    role text default 'volunteer',
    unique_code text not null unique,
    active boolean default true,
    created_at timestamptz default now()
);

-- 2. ATTENDANCE_ITECPEC
create table attendance_itecpec (
    id uuid primary key default gen_random_uuid(),
    volunteer_id uuid references volunteers_itecpec(id) on delete cascade,
    unique_code text not null,
    device_id text,
    entry_time timestamptz not null,
    exit_time timestamptz,
    duration_minutes integer,
    status text default 'pending',
    location_hint jsonb,
    created_at timestamptz default now()
);

-- 3. TASKS_ITECPEC
create table tasks_itecpec (
    id uuid primary key default gen_random_uuid(),
    volunteer_id uuid references volunteers_itecpec(id) on delete cascade,
    unique_code text not null,
    title text not null,
    description text,
    status text default 'pending',
    created_at timestamptz default now()
);

-- ==========================================
-- SHARED / SYSTEM TABLES
-- ==========================================

create table audit_log (
    id uuid primary key default gen_random_uuid(),
    org text, -- 'CAPEC' or 'ITECPEC'
    actor text,
    action text, 
    details jsonb,
    created_at timestamptz default now()
);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Generator
create or replace function generate_unique_code()
returns text as $$
declare
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
begin
    result := '';
    for i in 1..8 loop
      result := result || chars[1+floor(random()*array_length(chars, 1))::integer];
    end loop;
    return result;
end;
$$ language plpgsql;

-- Set defaults
alter table volunteers_capec alter column unique_code set default generate_unique_code();
alter table volunteers_itecpec alter column unique_code set default generate_unique_code();

-- SEED ADMINS
insert into volunteers_capec (name, role, unique_code) values ('Admin CAPEC', 'admin', 'ADM-CAPEC');
insert into volunteers_itecpec (name, role, unique_code) values ('Admin ITEC', 'admin', 'ADM-ITEC');
