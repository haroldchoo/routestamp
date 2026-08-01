import { describe, expect, it } from "vitest";
import { resolveCountryCode } from "@/lib/country-resolver";
import { resolveUSRegion } from "@/lib/region-resolver";
import { usRegions } from "@/lib/regions";

describe("country resolver", () => {
  it("resolves representative land coordinates locally", () => {
    expect(resolveCountryCode([37.5665, 126.978])).toBe("KR");
    expect(resolveCountryCode([37.7749, -122.4194])).toBe("US");
    expect(resolveCountryCode([48.8566, 2.3522])).toBe("FR");
  });

  it("leaves missing and open-ocean points unresolved", () => {
    expect(resolveCountryCode(null)).toBeNull();
    expect(resolveCountryCode([0, -140])).toBeNull();
  });

  it("resolves representative US states and DC", () => {
    expect(usRegions).toHaveLength(51);
    expect(resolveUSRegion([37.7749, -122.4194], "US")).toEqual({ code: "US-CA", status: "resolved" });
    expect(resolveUSRegion([40.7128, -74.006], "US")).toEqual({ code: "US-NY", status: "resolved" });
    expect(resolveUSRegion([61.2181, -149.9003], "US")).toEqual({ code: "US-AK", status: "resolved" });
    expect(resolveUSRegion([21.3069, -157.8583], "US")).toEqual({ code: "US-HI", status: "resolved" });
    expect(resolveUSRegion([38.9072, -77.0365], "US")).toEqual({ code: "US-DC", status: "resolved" });
  });

  it("does not assign US regions to unsupported countries or missing points", () => {
    expect(resolveUSRegion([37.5665, 126.978], "KR")).toEqual({ code: null, status: "not_supported" });
    expect(resolveUSRegion(null, "US")).toEqual({ code: null, status: "unresolved" });
  });
});
