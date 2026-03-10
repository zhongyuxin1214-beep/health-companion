
INSERT INTO storage.buckets (id, name, public)
VALUES ('workouts', 'workouts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view workout images"
ON storage.objects FOR SELECT
USING (bucket_id = 'workouts');

CREATE POLICY "Authenticated users can upload workout images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workouts');

CREATE POLICY "Users can delete own workout images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workouts' AND (storage.foldername(name))[1] = auth.uid()::text);
