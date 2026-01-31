-- Drop existing stricter insert policy
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- Create new relaxed insert policy as requested
CREATE POLICY "Users can upload their own documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documents');
