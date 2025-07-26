-- Fix RLS policies for categories table to allow admin operations
-- This script fixes the Row Level Security policies for the categories table

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'categories';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Create comprehensive policies for categories table

-- Allow all users to SELECT categories (needed for public menu display)
CREATE POLICY "categories_select_policy" ON categories
    FOR SELECT
    USING (true);

-- Allow admins to INSERT categories
CREATE POLICY "categories_insert_policy" ON categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
                OR auth.users.app_metadata->>'roles' @> '["admin"]'
                OR auth.users.user_metadata->>'role' = 'admin'
            )
        )
    );

-- Allow admins to UPDATE categories
CREATE POLICY "categories_update_policy" ON categories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
                OR auth.users.app_metadata->>'roles' @> '["admin"]'
                OR auth.users.user_metadata->>'role' = 'admin'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
                OR auth.users.app_metadata->>'roles' @> '["admin"]'
                OR auth.users.user_metadata->>'role' = 'admin'
            )
        )
    );

-- Allow admins to DELETE categories
CREATE POLICY "categories_delete_policy" ON categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
                OR auth.users.app_metadata->>'roles' @> '["admin"]'
                OR auth.users.user_metadata->>'role' = 'admin'
            )
        )
    );

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'categories';

-- Test query to verify admin access
SELECT 
    auth.uid() as current_user_id,
    auth.users.raw_app_meta_data,
    auth.users.raw_user_meta_data,
    auth.users.app_metadata,
    auth.users.user_metadata
FROM auth.users 
WHERE auth.users.id = auth.uid();
