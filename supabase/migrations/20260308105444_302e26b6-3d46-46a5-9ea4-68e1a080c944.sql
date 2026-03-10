
-- Create meal_logs table
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  oil_multiplier REAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- RLS for meal_logs
CREATE POLICY "Users can view own meal logs" ON public.meal_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs" ON public.meal_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON public.meal_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs" ON public.meal_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RLS for daily_recommendations
CREATE POLICY "Users can view own recommendations" ON public.daily_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON public.daily_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON public.daily_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for workout_shots (public read, auth write)
CREATE POLICY "Anyone can view workout shots" ON public.workout_shots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own workout shots" ON public.workout_shots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout shots" ON public.workout_shots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage policies for workouts bucket
CREATE POLICY "Users can upload workout photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'workouts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view workout photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'workouts');
CREATE POLICY "Users can delete own workout photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'workouts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for meal_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_logs;
