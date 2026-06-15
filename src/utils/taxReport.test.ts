import assert from "node:assert/strict";
import test from "node:test";
import { buildQuarterTaxBillRows, quarterPeriod } from "./taxReport.js";
import type { Bill, Customer, Trip } from "../types.js";

const trips: Trip[] = [
  {
    id: "trip_b",
    businessProfileId: "bp_1",
    tripNumber: "TRIP-2026-000002",
    vesselName: "MV Ocean Star",
    originDestinationId: "d_1",
    plannedDepartureAt: "2026-01-20T00:00:00.000Z",
    plannedArrivalAt: "2026-01-21T00:00:00.000Z",
    status: "closed",
    openedBy: "u_1",
    notes: "Second trip",
    createdAt: "2026-01-20T00:00:00.000Z",
  },
  {
    id: "trip_a",
    businessProfileId: "bp_1",
    tripNumber: "TRIP-2026-000001",
    vesselName: "MV Ocean Star",
    originDestinationId: "d_1",
    plannedDepartureAt: "2026-01-10T00:00:00.000Z",
    plannedArrivalAt: "2026-01-11T00:00:00.000Z",
    status: "closed",
    openedBy: "u_1",
    notes: "First trip",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
];

const customers: Customer[] = [
  {
    id: "customer_1",
    businessProfileId: "bp_1",
    customerType: "business",
    displayName: "Atoll Traders",
    legalName: "Atoll Traders Pvt Ltd",
    phone: "+960 700 0000",
    nationalIdOrRegNo: "BR-1",
    defaultDestinationId: "d_1",
    defaultPriceLevelId: "business",
    creditAllowed: true,
    creditLimit: 1000,
    outstandingBalance: 0,
    activeStatus: true,
  },
];

const bills: Bill[] = [
  {
    id: "bill_2",
    businessProfileId: "bp_1",
    tripId: "trip_b",
    destinationId: "d_1",
    customerId: "customer_1",
    billNumber: "BILL-002",
    billType: "credit",
    billStatus: "cancelled",
    subtotalTaxInclusive: 200,
    taxTotal: 14.81,
    grandTotal: 200,
    paymentStatus: "unpaid",
    paidAmount: 0,
    createdBy: "u_1",
    createdAt: "2026-02-01T00:00:00.000Z",
    itemCount: 1,
  },
  {
    id: "bill_1",
    businessProfileId: "bp_1",
    tripId: "trip_a",
    destinationId: "d_1",
    customerId: "customer_1",
    billNumber: "BILL-001",
    billType: "credit",
    billStatus: "paid",
    subtotalTaxInclusive: 100,
    taxTotal: 7.41,
    grandTotal: 100,
    paymentStatus: "paid",
    paidAmount: 100,
    createdBy: "u_1",
    createdAt: "2026-01-15T00:00:00.000Z",
    itemCount: 1,
  },
  {
    id: "bill_3",
    businessProfileId: "bp_1",
    tripId: "trip_a",
    destinationId: "d_1",
    customerId: "customer_1",
    billNumber: "BILL-003",
    billType: "credit",
    billStatus: "paid",
    subtotalTaxInclusive: 300,
    taxTotal: 22.22,
    grandTotal: 300,
    paymentStatus: "paid",
    paidAmount: 300,
    createdBy: "u_1",
    createdAt: "2026-04-01T00:00:00.000Z",
    itemCount: 1,
  },
];

test("quarterPeriod returns the exact Q1 date range", () => {
  assert.deepEqual(quarterPeriod("2026-Q1"), {
    id: "2026-Q1",
    label: "Q1 2026",
    rangeLabel: "01 Jan 2026 - 31 Mar 2026",
    start: new Date("2026-01-01T00:00:00.000Z"),
    end: new Date("2026-03-31T23:59:59.999Z"),
  });
});

test("buildQuarterTaxBillRows includes cancelled bills and sorts by trip name then number", () => {
  const rows = buildQuarterTaxBillRows(bills, trips, customers, quarterPeriod("2026-Q1"));

  assert.deepEqual(rows.map(row => row.billNumber), ["BILL-001", "BILL-002"]);
  assert.equal(rows[1].billStatus, "cancelled");
});
