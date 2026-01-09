-- Add show_name column to sponsors table
-- This migration adds the ability to show/hide sponsor names on the homepage

-- Add the show_name column if it doesn't exist
ALTER TABLE sponsors 
ADD COLUMN IF NOT EXISTS show_name BOOLEAN DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN sponsors.show_name IS 'When true, displays the sponsor name below the logo on the homepage';
