import type { Trip } from "../types";

const unfinishedTripStatuses: Trip["status"][] = ["draft", "open", "loading", "sailing", "offloading"];

export function isUnfinishedTrip(trip: Trip) {
  return unfinishedTripStatuses.includes(trip.status);
}
