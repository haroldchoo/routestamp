import "server-only";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import usAtlas from "us-atlas/states-10m.json";
import { regionCodeForFips } from "@/lib/regions";
import type { RegionResolutionStatus } from "@/lib/types";

type RegionResolution = { code: string | null; status: RegionResolutionStatus };
type AtlasFeature = { id?: string | number; geometry: unknown; properties?: Record<string, unknown> | null };

const states = feature(
  usAtlas as never,
  (usAtlas as { objects: { states: unknown } }).objects.states as never,
) as unknown as { features: AtlasFeature[] };

export function resolveUSRegion(startLatLng: [number, number] | null | undefined, countryCode: string | null): RegionResolution {
  if (!startLatLng || startLatLng.length !== 2) return { code: null, status: "unresolved" };
  const [latitude, longitude] = startLatLng;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { code: null, status: "unresolved" };
  if (countryCode !== "US") return { code: null, status: "not_supported" };

  const point: [number, number] = [longitude, latitude];
  const match = states.features.find((state) => geoContains(state as never, point));
  const code = match?.id == null ? null : regionCodeForFips(match.id);
  return code ? { code, status: "resolved" } : { code: null, status: "unresolved" };
}
