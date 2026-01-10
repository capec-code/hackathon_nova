-- FIX TASK SCHEMA
-- Run in Supabase SQL Editor

-- Add missing columns to ITEC-PEC tasks
ALTER TABLE tasks_itecpec 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Add missing columns to CAPEC tasks
ALTER TABLE tasks_capec 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
