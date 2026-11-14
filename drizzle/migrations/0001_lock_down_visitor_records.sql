DROP POLICY "Anyone can read visitor count" ON public.volta_visitors;
DROP POLICY "Anyone can register a visit" ON public.volta_visitors;
REVOKE SELECT ON public.volta_visitors FROM anon, authenticated;
CREATE POLICY "Anyone can register a visit" ON public.volta_visitors FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(session_id) BETWEEN 8 AND 100);
CREATE OR REPLACE FUNCTION public.get_visitor_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*) FROM public.volta_visitors $$;
REVOKE ALL ON FUNCTION public.get_visitor_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visitor_count() TO anon, authenticated;