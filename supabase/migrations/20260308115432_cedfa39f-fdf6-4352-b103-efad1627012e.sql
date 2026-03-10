ALTER TABLE public.daily_recommendations 
ADD COLUMN IF NOT EXISTS workout_plan jsonb,
ADD COLUMN IF NOT EXISTS refresh_count integer NOT NULL DEFAULT 0;