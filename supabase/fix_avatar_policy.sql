-- Fix for "No avatars found" issue
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. Ensure the bucket is set to public
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- 2. Allow public access to list/view files in the 'avatars' bucket
-- We drop the policy first in case it exists with different permissions
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;

CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );

COMMIT;
