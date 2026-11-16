import { describe, expect, it } from "vitest";
import { buildGoogleMapsNavigationUrl } from "@/lib/platform";

describe("Google Maps navigation links", () => {
  it("requests turn-by-turn navigation for the destination", () => {
    expect(buildGoogleMapsNavigationUrl(-1.95, 30.06)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-1.95,30.06&travelmode=driving&dir_action=navigate",
    );
  });
});
