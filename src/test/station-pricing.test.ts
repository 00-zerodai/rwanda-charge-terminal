import { describe, expect, it } from "vitest";
import { publicChargingPriceFor } from "@/lib/stations";

describe("public charging prices", () => {
  it("uses 500 RWF/kWh for EVP stations regardless of capitalization", () => {
    expect(publicChargingPriceFor("EVP Kigali")).toBe(500);
    expect(publicChargingPriceFor("evp charging point")).toBe(500);
  });

  it("uses 600 RWF/kWh for Kabisa stations", () => {
    expect(publicChargingPriceFor("Kabisa Kigali Heights")).toBe(600);
    expect(publicChargingPriceFor("KABISA charging station")).toBe(600);
  });

  it("uses 500 RWF/kWh for other public charging stations", () => {
    expect(publicChargingPriceFor("Kigali public charger")).toBe(500);
  });
});
