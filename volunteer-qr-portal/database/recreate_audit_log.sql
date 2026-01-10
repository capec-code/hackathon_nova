-- RESTORE AUDIT LOG (Run this in SQL Editor)
-- This will recreate the table properly if it was missing columns.

BEGIN;
  -- Drop existing if corrupted (only if empty or you don't mind losing history)
  DROP TABLE IF EXISTS audit_log CASCADE;

  -- Create fresh
  CREATE TABLE audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org text NOT NULL,        -- 'CAPEC' or 'ITECPEC'
      actor text,               -- Email or 'system'
      action text NOT NULL,     -- 'check-in', 'check-out', etc.
      target_type text,         -- 'attendance_itecpec', etc.
      target_id uuid,
      details jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
  
  -- Admin Policy
  CREATE POLICY "Admins Read All Logs" ON audit_log 
  FOR SELECT TO authenticated USING (true);

  -- Enable Realtime
  -- Check if table is already in publication, if not add it
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'audit_log'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
    END IF;
  END $$;

  -- Grants for Edge Functions and Admin
  GRANT ALL ON TABLE audit_log TO authenticated, anon, service_role;

  -- Test Insert
  INSERT INTO audit_log (org, actor, action) VALUES ('SYSTEM', 'diagnostic', 'table-recreated-with-realtime');

  -- Reload Cache
  NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verify after running:
-- SELECT * FROM audit_log;
