import assert from "node:assert/strict";
import test from "node:test";
import { describeCompleteTripRoute, getDefaultCompleteTripDestinationIds } from "./tripRoute.js";
import type { Destination, Trip } from "../types.js";

const male: Destination = {
  id: "d_male",
  businessProfileId: "bp_1",
  islandName: "Male'",
  atoll: "Kaafu",
  destinationCode: "MLE",
  activeStatus: true,
  sortOrder: 1,
};

const addu: Destination = {
  id: "d_addu",
  businessProfileId: "bp_1",
  islandName: "Addu City",
  atoll: "Addu",
  destinationCode: "ADD",
  activeStatus: true,
  sortOrder: 2,
};

const baseTrip: Trip = {
  id: "t_1",
  businessProfileId: "bp_1",
  tripNumber: "TRIP-2026-000001",
  vesselName: "MV Ocean Star",
  originDestinationId: "d_addu",
  returnDestinationId: "d_male",
  plannedDepartureAt: "2026-06-15T08:00:00.000Z",
  plannedArrivalAt: "2026-06-15T16:00:00.000Z",
  status: "loading",
  openedBy: "u_1",
  notes: "Round trip cargo",
  createdAt: "2026-06-15T08:00:00.000Z",
};

test("describes complete trip as outbound and return legs", () => {
  assert.equal(
    describeCompleteTripRoute(baseTrip, [male, addu]),
    "Addu City -> Male' | Male' -> Addu City",
  );
});

test("falls back to Male return destination for existing trips without returnDestinationId", () => {
  const legacyTrip: Trip = {
    ...baseTrip,
    originDestinationId: "d_male",
    returnDestinationId: undefined,
  };

  assert.equal(
    describeCompleteTripRoute(legacyTrip, [male, addu]),
    "Addu City -> Male' | Male' -> Addu City",
  );
});

test("chooses Addu as default origin and Male as default return when destinations load", () => {
  assert.deepEqual(
    getDefaultCompleteTripDestinationIds([male, addu]),
    { originDestinationId: "d_addu", returnDestinationId: "d_male" },
  );
});

test("returns empty defaults until destinations are available", () => {
  assert.deepEqual(
    getDefaultCompleteTripDestinationIds([]),
    { originDestinationId: "", returnDestinationId: "" },
  );
});
