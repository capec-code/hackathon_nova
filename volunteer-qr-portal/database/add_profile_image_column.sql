-- ADD PROFILE IMAGE COLUMN
-- Run in Supabase SQL Editor

ALTER TABLE volunteers_capec ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE volunteers_itecpec ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Reload schema to reflect changes in API
NOTIFY pgrst, 'reload schema';
