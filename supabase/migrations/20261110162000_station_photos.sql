-- Add public station photos with authenticated owner-managed uploads.
ALTER TABLE public.community_stations
  ADD COLUMN photo_paths TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'station-photos',
  'station-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Anyone can view station photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'station-photos');

CREATE POLICY "Owners can upload station photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'station-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Owners can delete their station photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'station-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
