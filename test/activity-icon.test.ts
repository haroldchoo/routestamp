import { describe, expect, it } from "vitest";
import { Trophy } from "lucide-react";
import { activityIconFor } from "@/components/activity-icon";

const STRAVA_ACTIVITY_TYPES = [
  "AlpineSki", "BackcountrySki", "Badminton", "Canoeing", "Crossfit", "EBikeRide",
  "Elliptical", "EMountainBikeRide", "Golf", "GravelRide", "Handcycle",
  "HighIntensityIntervalTraining", "Hike", "IceSkate", "InlineSkate", "Kayaking",
  "Kitesurf", "MountainBikeRide", "NordicSki", "Pickleball", "Pilates", "Racquetball",
  "Ride", "RockClimbing", "RollerSki", "Rowing", "Run", "Sail", "Skateboard",
  "Snowboard", "Snowshoe", "Soccer", "Squash", "StairStepper", "StandUpPaddling",
  "Surfing", "Swim", "TableTennis", "Tennis", "TrailRun", "Velomobile", "VirtualRide",
  "VirtualRow", "VirtualRun", "Walk", "WeightTraining", "Wheelchair", "Windsurf",
  "Workout", "Yoga",
];

describe("Strava activity icons", () => {
  it.each(STRAVA_ACTIVITY_TYPES)("maps %s to a specific Lucide icon", (sportType) => {
    expect(activityIconFor(sportType)).not.toBe(Trophy);
  });

  it("uses a stable fallback for future activity types", () => {
    expect(activityIconFor("FutureSport")).toBe(Trophy);
  });

  it("normalizes separators and casing", () => {
    expect(activityIconFor("mountain_bike_ride")).toBe(activityIconFor("MountainBikeRide"));
  });
});
