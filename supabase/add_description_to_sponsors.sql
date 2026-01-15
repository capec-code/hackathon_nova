-- Add 'description' column to sponsors table
-- This allows for custom descriptions for sponsors, especially Founders

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sponsors' AND column_name = 'description') THEN
        ALTER TABLE sponsors ADD COLUMN description TEXT;
    END IF;
END $$;
