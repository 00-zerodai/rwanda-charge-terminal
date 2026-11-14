CREATE TABLE public.community_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  address TEXT NOT NULL DEFAULT '' CHECK (char_length(address) <= 120),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  kind TEXT NOT NULL CHECK (kind IN ('ev-car', 'swap-moto')),
  price_per_kwh INTEGER,
  swap_price INTEGER,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_stations_price_matches_kind CHECK (
    (kind = 'ev-car' AND price_per_kwh IS NOT NULL AND price_per_kwh > 0 AND swap_price IS NULL)
    OR (kind = 'swap-moto' AND swap_price IS NOT NULL AND swap_price > 0 AND price_per_kwh IS NULL)
  )
);
GRANT SELECT ON public.community_stations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_stations TO authenticated;
GRANT ALL ON public.community_stations TO service_role;
ALTER TABLE public.community_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view community stations" ON public.community_stations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add their own stations" ON public.community_stations FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY "Owners can update their own stations" ON public.community_stations FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY "Owners can delete their own stations" ON public.community_stations FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Anyone can view station photos" ON storage.objects FOR SELECT USING (bucket_id = 'station-photos');
CREATE POLICY "Owners can upload station photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'station-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Owners can delete their station photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'station-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);