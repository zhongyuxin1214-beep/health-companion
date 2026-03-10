
CREATE POLICY "Users can update own body logs" ON public.daily_body_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
