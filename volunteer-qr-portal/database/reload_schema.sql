-- Refresh Supabase API Cache
-- Run this if you are getting 400 errors after updating schemas
NOTIFY pgrst, 'reload schema';
