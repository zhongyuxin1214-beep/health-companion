
CREATE TABLE public.daily_body_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_body_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body logs" ON public.daily_body_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body logs" ON public.daily_body_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
