-- Enable Realtime for specific tables
begin;
  -- Remove existing if any (to avoid duplicates)
  -- alter publication supabase_realtime drop table audit_log, attendance_capec, attendance_itecpec, tasks_capec, tasks_itecpec;
  
  -- Add to publication
  alter publication supabase_realtime add table audit_log;
  alter publication supabase_realtime add table attendance_capec;
  alter publication supabase_realtime add table attendance_itecpec;
  alter publication supabase_realtime add table tasks_capec;
  alter publication supabase_realtime add table tasks_itecpec;
commit;
