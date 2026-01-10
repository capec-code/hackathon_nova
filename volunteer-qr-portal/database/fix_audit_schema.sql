-- Comprehensive Audit Log Fix (Run this in SQL Editor)
DO $$ 
BEGIN
    -- Add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='org') THEN
        ALTER TABLE audit_log ADD COLUMN org text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='target_type') THEN
        ALTER TABLE audit_log ADD COLUMN target_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='target_id') THEN
        ALTER TABLE audit_log ADD COLUMN target_id uuid;
    END IF;
END $$;

-- Ensure RLS is active and policy exists
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins Read Log" ON audit_log;
CREATE POLICY "Admins Read Log" ON audit_log FOR SELECT TO authenticated USING (true);

-- Refresh Supabase cache
NOTIFY pgrst, 'reload schema';
