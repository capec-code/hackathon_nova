-- RLS Policies

-- CAPEC
alter table volunteers_capec enable row level security;
alter table attendance_capec enable row level security;
alter table tasks_capec enable row level security;

-- ITECPEC
alter table volunteers_itecpec enable row level security;
alter table attendance_itecpec enable row level security;
alter table tasks_itecpec enable row level security;

-- SHARED
alter table audit_log enable row level security;

-- POLICIES: Allow Authenticated Users (Admins) Full Access
-- Only Admins log in via Supabase Auth. Volunteers use Edge Functions (Service Role).

-- CAPEC
create policy "Admins All CAPEC Vol" on volunteers_capec for all to authenticated using (true);
create policy "Admins All CAPEC Att" on attendance_capec for all to authenticated using (true);
create policy "Admins All CAPEC Task" on tasks_capec for all to authenticated using (true);

-- ITECPEC
create policy "Admins All ITEC Vol" on volunteers_itecpec for all to authenticated using (true);
create policy "Admins All ITEC Att" on attendance_itecpec for all to authenticated using (true);
create policy "Admins All ITEC Task" on tasks_itecpec for all to authenticated using (true);

-- Audit
create policy "Admins Read Log" on audit_log for select to authenticated using (true);
