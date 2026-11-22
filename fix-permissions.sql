-- Run this in Supabase Dashboard → SQL Editor → New Query

-- Grant schema usage and table permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.transactions TO anon;

-- Also grant sequence permissions (for auto-incrementing id)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'transactions' AND grantee = 'anon';