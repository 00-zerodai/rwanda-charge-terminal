import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { TerminalButton } from "./TerminalButton";
import { X, MapPin, Locate, Car, Bike, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const AddStationDialog = ({
  onClose,
  userId,
  allowPhotoUpload = false,
}: {
  onClose: () => void;
  userId: string;
  allowPhotoUpload?: boolean;
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [kind, setKind] = useState<"ev-car" | "swap-moto">("ev-car");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  );

  useEffect(
    () => () => photoPreviews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [photoPreviews],
  );

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (photos.length + selected.length > MAX_PHOTOS) {
      setErr(t("Choose up to 5 photos."));
      return;
    }
    const invalidType = selected.find((file) => !ALLOWED_PHOTO_TYPES.includes(file.type));
    if (invalidType) {
      setErr(t("Photos must be JPG, PNG, or WebP images."));
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_PHOTO_SIZE);
    if (oversized) {
      setErr(t("Each photo must be 5 MB or smaller."));
      return;
    }
    setErr(null);
    setPhotos((current) => [...current, ...selected]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const la = Number(lat);
    const ln = Number(lng);
    const parsedPrice = Number(price);
    if (!name.trim()) return setErr(t("Name is required"));
    if (
      !lat.trim() ||
      !lng.trim() ||
      !Number.isFinite(la) ||
      la < -90 ||
      la > 90 ||
      !Number.isFinite(ln) ||
      ln < -180 ||
      ln > 180
    ) {
      return setErr(t("Enter valid latitude and longitude coordinates"));
    }
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      return setErr(t("Enter a price greater than zero in RWF"));
    }

    setSaving(true);
    setErr(null);
    const stationId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    try {
      if (allowPhotoUpload) {
        for (const photo of photos) {
          const path = `${userId}/${stationId}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.type]}`;
          const { error: uploadError } = await supabase.storage
            .from("station-photos")
            .upload(path, photo, { contentType: photo.type, upsert: false });
          if (uploadError) throw uploadError;
          uploadedPaths.push(path);
        }
      }

      const { error } = await supabase.from("community_stations").insert({
        id: stationId,
        owner_id: userId,
        name: name.trim(),
        address: address.trim(),
        lat: la,
        lng: ln,
        kind,
        price_per_kwh: kind === "ev-car" ? parsedPrice : null,
        swap_price: kind === "swap-moto" ? parsedPrice : null,
        photo_paths: uploadedPaths,
      });
      if (error) throw error;
      onClose();
    } catch (error) {
      let message = error instanceof Error ? error.message : "Please try again.";
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from("station-photos")
          .remove(uploadedPaths);
        if (cleanupError) {
          message += ` Uploaded photos also couldn't be cleaned up: ${cleanupError.message}`;
        }
      }
      setErr(`${t("Couldn't save station:")} ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setErr("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setErr(null);
      },
      (error) => setErr(error.message || "Couldn't get your current location"),
    );
  };

  const inputCls =
    "w-full bg-input border border-border px-3 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-elevated animate-[boot_0.25s_ease-out]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t("Add a station")}</h2>
          </div>
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t("Station name")}
            </span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={t("e.g. Kigali Heights EV Hub")}
            />
          </label>
          {allowPhotoUpload && (
            <section className="space-y-2">
              <div>
                <span className="block text-xs font-medium text-muted-foreground">
                  {t("Station photos")}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t("Add up to 5 JPG, PNG, or WebP photos (5 MB each).")}
                </span>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-foreground hover:bg-muted/40">
                <ImagePlus size={16} className="text-primary" />
                {t("Choose photos")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={saving || photos.length >= MAX_PHOTOS}
                  onChange={addPhotos}
                />
              </label>
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviews.map(({ file, url }, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="relative">
                      <img
                        src={url}
                        alt={`Preview of ${file.name}`}
                        className="h-20 w-full rounded-lg border border-border object-cover"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Type")}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setKind("ev-car");
                  setPrice("");
                }}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (kind === "ev-car"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Car size={16} /> {t("EV charger")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKind("swap-moto");
                  setPrice("");
                }}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (kind === "swap-moto"
                    ? "border-[hsl(24_95%_53%)] bg-[hsl(24_95%_53%/0.1)] text-[hsl(24_95%_53%)]"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Bike size={16} /> {t("Battery swap")}
              </button>
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t(kind === "ev-car" ? "Price per kWh (RWF)" : "Price per battery swap (RWF)")}
            </span>
            <input
              className={inputCls}
              type="number"
              min="1"
              step="1"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={kind === "ev-car" ? "e.g. 350" : "e.g. 1800"}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Address")}</span>
            <input
              className={inputCls}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={120}
              placeholder={t("Street, neighborhood")}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Latitude")}</span>
              <input
                className={inputCls}
                type="number"
                step="any"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-1.9501"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Longitude")}</span>
              <input
                className={inputCls}
                type="number"
                step="any"
                min="-180"
                max="180"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="30.0588"
              />
            </label>
          </div>
          {err && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <TerminalButton type="submit" variant="green" size="lg" className="flex-1" disabled={saving}>
              {saving ? t("Saving...") : t("Save station")}
            </TerminalButton>
            <TerminalButton type="button" variant="ghost" size="lg" onClick={useMyLocation}>
              <Locate size={16} /> {t("GPS")}
            </TerminalButton>
          </div>
        </form>
      </div>
    </div>
  );
};
