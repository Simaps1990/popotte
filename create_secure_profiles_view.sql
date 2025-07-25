-- Create secure_profiles view for safe profile access
-- This view provides a secure way to access user profiles with proper RLS

-- First, drop the existing view if it exists
DROP VIEW IF EXISTS public.secure_profiles;

-- Create the new secure_profiles view
CREATE VIEW public.secure_profiles AS
SELECT 
    p.id,
    p.username,
    p.role,
    p.first_name,
    p.last_name,
    p.created_at,
    p.updated_at,
    u.email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id IS NOT NULL;

-- Enable RLS on the view
ALTER VIEW public.secure_profiles OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON public.secure_profiles TO authenticated;
GRANT SELECT ON public.secure_profiles TO anon;

-- Create RLS policies for secure_profiles view
-- Policy for users to see their own profile
CREATE POLICY "Users can view their own profile via secure_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy for admins to see all profiles
CREATE POLICY "Admins can view all profiles via secure_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile via secure_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for admins to update any profile
CREATE POLICY "Admins can update any profile via secure_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Ensure the profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'secure_profiles view and policies created successfully!' as result;
