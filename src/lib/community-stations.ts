import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inferChargingSpec, Station, StationKind } from "@/lib/stations";

type CommunityStationRow = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: string;
  price_per_kwh: number | null;
  swap_price: number | null;
  owner_id: string;
  photo_paths: string[];
}

function toStation(row: CommunityStationRow): Station {
  const kind = row.kind as StationKind;
  const spec = inferChargingSpec(row.name, kind);
  const photoUrls = (row.photo_paths ?? []).map((path) =>
    supabase.storage.from("station-photos").getPublicUrl(path).data.publicUrl,
  );
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    custom: true,
    kind,
    source: "custom",
    status: "online",
    connectors: spec?.connectors,
    speed: spec?.speed,
    kw: spec?.kw,
    pricePerKwh: row.price_per_kwh ?? undefined,
    swapPrice: row.swap_price ?? undefined,
    ownerId: row.owner_id,
    photoUrls,
  };
}

export function useCommunityStations() {
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    let active = true;
    const loadStations = async () => {
      const { data, error } = await supabase
        .from("community_stations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (active) toast.error("Couldn't load community stations", { description: error.message });
        return;
      }
      if (active) setStations((data ?? []).map(toStation));
    };

    void loadStations();
    const channel = supabase
      .channel("community-stations")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_stations" }, () => {
        void loadStations();
      })
      .subscribe((status) => {
        if (active && status === "CHANNEL_ERROR") {
          toast.error("Live station updates are unavailable");
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return stations;
}

export async function deleteCommunityStation(id: string): Promise<string | null> {
  const { data: station, error: fetchError } = await supabase
    .from("community_stations")
    .select("photo_paths")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from("community_stations").delete().eq("id", id);
  if (error) throw error;

  if (station.photo_paths.length) {
    const { error: storageError } = await supabase.storage
      .from("station-photos")
      .remove(station.photo_paths);
    if (storageError) {
      return storageError.message;
    }
  }
  return null;
}
