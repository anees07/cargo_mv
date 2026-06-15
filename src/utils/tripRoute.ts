import type { Destination, Trip } from "../types.js";

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/['’]/g, "");

const findMaleDestination = (destinations: Destination[]) =>
  destinations.find(destination => normalizeName(destination.islandName) === "male");

const findAdduDestination = (destinations: Destination[]) =>
  destinations.find(destination => normalizeName(destination.islandName) === "addu city");

const findFallbackReturnDestination = (trip: Trip, destinations: Destination[]) => {
  const origin = destinations.find(destination => destination.id === trip.originDestinationId);
  const male = findMaleDestination(destinations);
  if (origin && male && origin.id !== male.id) return male;

  const addu = findAdduDestination(destinations);
  if (origin && addu && origin.id !== addu.id) return addu;

  return destinations.find(destination => destination.id !== trip.originDestinationId);
};

export function describeCompleteTripRoute(trip: Trip, destinations: Destination[]) {
  const origin = destinations.find(destination => destination.id === trip.originDestinationId);
  const savedReturn = destinations.find(destination => destination.id === trip.returnDestinationId);
  const fallbackReturn = savedReturn ? undefined : findFallbackReturnDestination(trip, destinations);
  const returnDestination = savedReturn || fallbackReturn;
  const legacyMaleOrigin = !savedReturn && origin && normalizeName(origin.islandName) === "male" && fallbackReturn;

  const originName = legacyMaleOrigin ? fallbackReturn.islandName : origin?.islandName || "Origin";
  const returnName = legacyMaleOrigin ? origin.islandName : returnDestination?.islandName || "Return";

  return `${originName} -> ${returnName} | ${returnName} -> ${originName}`;
}

export function getDefaultCompleteTripDestinationIds(destinations: Destination[]) {
  const male = findMaleDestination(destinations);
  const addu = findAdduDestination(destinations);
  const origin = addu || destinations.find(destination => destination.id !== male?.id) || destinations[0];
  const returnDestination = male || destinations.find(destination => destination.id !== origin?.id) || destinations[0];

  return {
    originDestinationId: origin?.id || "",
    returnDestinationId: returnDestination?.id || "",
  };
}
