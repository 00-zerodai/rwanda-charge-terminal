/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps, KIGALI_CENTER, GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

export const SearchBar = ({
  onPick,
}: {
  onPick: (loc: { lat: number; lng: number; name: string }) => void;
}) => {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const acRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Lazy-init Google Places services
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY).then((g) => {
      if (cancelled) return;
      acRef.current = new g.maps.places.AutocompleteService();
      // PlacesService needs a DOM node; an off-screen div is fine.
      const div = document.createElement("div");
      placesRef.current = new g.maps.places.PlacesService(div);
      sessionRef.current = new g.maps.places.AutocompleteSessionToken();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      const ac = acRef.current;
      if (!ac) return;
      ac.getPlacePredictions(
        {
          input: value,
          sessionToken: sessionRef.current!,
          // Bias to Rwanda but allow anywhere
          componentRestrictions: { country: "rw" },
          locationBias: {
            center: KIGALI_CENTER,
            radius: 50_000, // 50km
          } as google.maps.places.LocationBias,
        },
        (preds, status) => {
          setLoading(false);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
            setSuggestions([]);
            return;
          }
          setSuggestions(
            preds.slice(0, 6).map((p) => ({
              placeId: p.place_id,
              primary: p.structured_formatting?.main_text ?? p.description,
              secondary: p.structured_formatting?.secondary_text ?? "",
            })),
          );
          setOpen(true);
        },
      );
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const choose = (sug: Suggestion) => {
    const svc = placesRef.current;
    if (!svc) return;
    setOpen(false);
    setValue(sug.primary);
    svc.getDetails(
      {
        placeId: sug.placeId,
        fields: ["geometry", "name"],
        sessionToken: sessionRef.current!,
      },
      (place, status) => {
        // Refresh the session token after selection (Google billing best practice)
        sessionRef.current = new google.maps.places.AutocompleteSessionToken();
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;
        onPick({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name ?? sug.primary,
        });
      },
    );
  };

  const clear = () => {
    setValue("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md"
    >
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder="Search places, landmarks, or addresses…"
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-card/95 backdrop-blur border border-border text-sm text-foreground placeholder:text-muted-foreground shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Search for a place"
        />
        {value && (
          <button
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="mt-1.5 rounded-xl bg-card/95 backdrop-blur border border-border shadow-soft overflow-hidden">
          <ul className="max-h-72 overflow-auto py-1">
            {suggestions.map((sug) => (
              <li key={sug.placeId}>
                <button
                  onClick={() => choose(sug)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/70 transition flex items-start gap-2.5"
                >
                  <MapPin size={14} className="mt-1 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{sug.primary}</div>
                    {sug.secondary && (
                      <div className="text-xs text-muted-foreground truncate">{sug.secondary}</div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 border-t border-border bg-muted/30">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
};
