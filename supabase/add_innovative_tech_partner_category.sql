-- Add 'innovative_tech_partner' category to sponsors table
-- This migration adds support for Innovative Tech Partners category with professional hierarchy

-- Drop existing category check constraint if it exists
DO $$ 
DECLARE
    constraint_record record;
BEGIN
    -- Find and drop any existing CHECK constraint on the category column
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'sponsors'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%category%'
    LOOP
        EXECUTE format('ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

-- Create or replace the constraint to include 'innovative_tech_partner'
-- Includes all previously supported categories + the new one
ALTER TABLE sponsors 
DROP CONSTRAINT IF EXISTS sponsors_category_check;

ALTER TABLE sponsors 
ADD CONSTRAINT sponsors_category_check 
CHECK (category IN ('title', 'gold', 'silver', 'tech', 'internet', 'printing', 'strategic', 'community', 'media', 'founder', 'innovative_tech_partner'));

-- Note: You may need to manually run this in Supabase SQL Editor if it doesn't auto-apply.
-- Dashboard -> Database -> SQL Editor
