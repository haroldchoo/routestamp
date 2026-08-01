import type { Region } from "@/lib/types";

type RegionSeed = [string, string, string, string];

const usStateSeeds: RegionSeed[] = [
  ["01", "AL", "Alabama", "US"], ["02", "AK", "Alaska", "US"], ["04", "AZ", "Arizona", "US"],
  ["05", "AR", "Arkansas", "US"], ["06", "CA", "California", "US"], ["08", "CO", "Colorado", "US"],
  ["09", "CT", "Connecticut", "US"], ["10", "DE", "Delaware", "US"], ["11", "DC", "District of Columbia", "US"],
  ["12", "FL", "Florida", "US"], ["13", "GA", "Georgia", "US"], ["15", "HI", "Hawaii", "US"],
  ["16", "ID", "Idaho", "US"], ["17", "IL", "Illinois", "US"], ["18", "IN", "Indiana", "US"],
  ["19", "IA", "Iowa", "US"], ["20", "KS", "Kansas", "US"], ["21", "KY", "Kentucky", "US"],
  ["22", "LA", "Louisiana", "US"], ["23", "ME", "Maine", "US"], ["24", "MD", "Maryland", "US"],
  ["25", "MA", "Massachusetts", "US"], ["26", "MI", "Michigan", "US"], ["27", "MN", "Minnesota", "US"],
  ["28", "MS", "Mississippi", "US"], ["29", "MO", "Missouri", "US"], ["30", "MT", "Montana", "US"],
  ["31", "NE", "Nebraska", "US"], ["32", "NV", "Nevada", "US"], ["33", "NH", "New Hampshire", "US"],
  ["34", "NJ", "New Jersey", "US"], ["35", "NM", "New Mexico", "US"], ["36", "NY", "New York", "US"],
  ["37", "NC", "North Carolina", "US"], ["38", "ND", "North Dakota", "US"], ["39", "OH", "Ohio", "US"],
  ["40", "OK", "Oklahoma", "US"], ["41", "OR", "Oregon", "US"], ["42", "PA", "Pennsylvania", "US"],
  ["44", "RI", "Rhode Island", "US"], ["45", "SC", "South Carolina", "US"], ["46", "SD", "South Dakota", "US"],
  ["47", "TN", "Tennessee", "US"], ["48", "TX", "Texas", "US"], ["49", "UT", "Utah", "US"],
  ["50", "VT", "Vermont", "US"], ["51", "VA", "Virginia", "US"], ["53", "WA", "Washington", "US"],
  ["54", "WV", "West Virginia", "US"], ["55", "WI", "Wisconsin", "US"], ["56", "WY", "Wyoming", "US"],
];

export const usRegions: Region[] = usStateSeeds.map(([, shortCode, name, countryCode]) => ({
  code: `${countryCode}-${shortCode}`,
  countryCode,
  name,
  shortCode,
}));

export const regionsByCode = new Map(usRegions.map((region) => [region.code, region]));
const fipsToRegionCode = new Map(usStateSeeds.map(([fips, shortCode, , countryCode]) => [fips, `${countryCode}-${shortCode}`]));

export function regionCodeForFips(fips: string | number) {
  return fipsToRegionCode.get(String(fips).padStart(2, "0")) ?? null;
}
