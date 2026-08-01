import type { StravaActivity } from "@/lib/strava";
import type { ActivitySummary } from "@/lib/types";
import { resolveCountryCode } from "@/lib/country-resolver";
import { resolveUSRegion } from "@/lib/region-resolver";

export function normalizeStravaActivity(activity: StravaActivity): ActivitySummary {
  const countryCode = resolveCountryCode(activity.start_latlng);
  const region = resolveUSRegion(activity.start_latlng, countryCode);
  return {
    id: String(activity.id),
    provider: "strava",
    countryCode,
    regionCode: region.code,
    regionResolutionStatus: region.status,
    sportType: activity.sport_type || activity.type || "Other",
    name: activity.name || "Untitled activity",
    startTime: activity.start_date,
    distanceMeters: activity.distance ?? 0,
    movingTimeSeconds: activity.moving_time ?? 0,
    elapsedTimeSeconds: activity.elapsed_time ?? 0,
    elevationGainMeters: activity.total_elevation_gain ?? 0,
    flags: {
      manual: activity.manual ?? false,
      commute: activity.commute ?? false,
      trainer: activity.trainer ?? false,
    },
    geographicResolutionStatus: countryCode ? "resolved" : "unresolved",
  };
}
