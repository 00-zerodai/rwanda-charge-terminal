CREATE TABLE public.volta_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.volta_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visitor count"
  ON public.volta_visitors FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register a visit"
  ON public.volta_visitors FOR INSERT
  WITH CHECK (true);