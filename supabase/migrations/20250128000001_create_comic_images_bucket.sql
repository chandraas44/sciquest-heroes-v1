/*
  # Create comic-images Storage Bucket for Avatar Story Generation

  1. Storage Bucket
    - comic-images: Public bucket for storing generated comic panel images
      - Path structure: avatar-stories/{user_id}/{story_id}/{panel_id}.png
      - Public read access for displaying comics in the app

  2. Storage Policies
    - Public SELECT: Anyone can view comic images (for displaying in app)
    - Authenticated INSERT: Users can upload their own comic images (via Edge Function with service role)
    - Authenticated UPDATE: Users can update their own comic images
    - Authenticated DELETE: Users can delete their own comic images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comic-images',
  'comic-images',
  true, -- Public bucket for easy access
  52428800, -- 50MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- Enable RLS on storage.objects (should already be enabled, but ensure it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access to comic images
DROP POLICY IF EXISTS "Public Access to Comic Images" ON storage.objects;

CREATE POLICY "Public Access to Comic Images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'comic-images' );

-- Policy: Authenticated users can upload their own comic images
-- Path must match: avatar-stories/{user_id}/...
DROP POLICY IF EXISTS "Users can upload their own comic images" ON storage.objects;

CREATE POLICY "Users can upload their own comic images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comic-images' AND
  (storage.foldername(name))[1] = 'avatar-stories' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Authenticated users can update their own comic images
DROP POLICY IF EXISTS "Users can update their own comic images" ON storage.objects;

CREATE POLICY "Users can update their own comic images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comic-images' AND
  (storage.foldername(name))[1] = 'avatar-stories' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Authenticated users can delete their own comic images
DROP POLICY IF EXISTS "Users can delete their own comic images" ON storage.objects;

CREATE POLICY "Users can delete their own comic images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comic-images' AND
  (storage.foldername(name))[1] = 'avatar-stories' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

