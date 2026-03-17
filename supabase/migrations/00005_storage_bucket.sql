-- Create storage bucket for org logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read logos (public bucket)
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- Allow authenticated users to upload logos
CREATE POLICY "logos_auth_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "logos_auth_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'logos');
