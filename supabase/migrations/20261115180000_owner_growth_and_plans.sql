ALTER TABLE public.community_stations
  ADD COLUMN total_slots INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN available_slots INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT community_stations_slot_counts_valid
    CHECK (total_slots >= 1 AND available_slots BETWEEN 0 AND total_slots);

CREATE TABLE public.station_direction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.community_stations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT station_direction_events_once_per_driver
    UNIQUE (station_id, driver_id)
);

ALTER TABLE public.station_direction_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.station_direction_events FROM anon, authenticated;
GRANT ALL ON public.station_direction_events TO service_role;

CREATE TABLE public.station_owner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.community_stations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type = 'first_direction_request'),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT station_owner_notifications_once_per_event
    UNIQUE (station_id, event_type)
);

ALTER TABLE public.station_owner_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.station_owner_notifications TO authenticated;
CREATE POLICY "Owners can read their station notifications"
  ON public.station_owner_notifications FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE TABLE public.station_plan_selections (
  station_id UUID PRIMARY KEY REFERENCES public.community_stations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro_host', 'network')),
  payment_status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status = 'pending_payment'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.station_plan_selections ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.station_plan_selections TO authenticated;
CREATE POLICY "Owners can read their station plan selections"
  ON public.station_plan_selections FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.record_station_direction_request(p_station_id UUID)
RETURNS TABLE (event_recorded BOOLEAN, owner_notified BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  station_owner_id UUID;
  station_name TEXT;
  new_event_id UUID;
  new_notification_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT s.owner_id, s.name
    INTO station_owner_id, station_name
    FROM public.community_stations AS s
    WHERE s.id = p_station_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Station not found';
  END IF;

  IF station_owner_id = current_user_id THEN
    RETURN QUERY SELECT FALSE, FALSE;
    RETURN;
  END IF;

  INSERT INTO public.station_direction_events (station_id, driver_id)
    VALUES (p_station_id, current_user_id)
    ON CONFLICT (station_id, driver_id) DO NOTHING
    RETURNING id INTO new_event_id;

  IF new_event_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE;
    RETURN;
  END IF;

  INSERT INTO public.station_owner_notifications (
    owner_id, station_id, event_type, title, body
  )
    VALUES (
      station_owner_id,
      p_station_id,
      'first_direction_request',
      'A driver found your station',
      'A Volta user requested directions to ' || station_name ||
        '. This shows interest, but does not confirm arrival or charging.'
    )
    ON CONFLICT (station_id, event_type) DO NOTHING
    RETURNING id INTO new_notification_id;

  RETURN QUERY SELECT TRUE, new_notification_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.select_station_plan(
  p_station_id UUID,
  p_plan TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_plan NOT IN ('starter', 'pro_host', 'network') THEN
    RAISE EXCEPTION 'Invalid station plan';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.community_stations AS s
      WHERE s.id = p_station_id AND s.owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Station not found or not owned by current user';
  END IF;

  INSERT INTO public.station_plan_selections (station_id, owner_id, plan)
    VALUES (p_station_id, current_user_id, p_plan)
    ON CONFLICT (station_id) DO UPDATE
      SET plan = EXCLUDED.plan,
          payment_status = 'pending_payment',
          updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_station_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  UPDATE public.station_owner_notifications
    SET read_at = COALESCE(read_at, now())
    WHERE id = p_notification_id AND owner_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.record_station_direction_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.select_station_plan(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_station_notification_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_station_direction_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_station_plan(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_station_notification_read(UUID) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'station_owner_notifications'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.station_owner_notifications;
  END IF;
END;
$$;
