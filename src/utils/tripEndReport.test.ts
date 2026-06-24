import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTripEndBillSummary,
  buildTripEndBillSummaryA4Document,
  buildTripEndDestinationBillSummaryA4Document,
} from "./tripEndReport.js";
import type { Bill, BusinessProfile, Customer, Destination, Trip } from "../types.js";

const trip: Trip = {
  id: "trip_1",
  businessProfileId: "bp_1",
  tripNumber: "TRIP-2026-000001",
  vesselName: "MV Atoll Star",
  originDestinationId: "male",
  plannedDepartureAt: "2026-06-20T08:00:00.000Z",
  plannedArrivalAt: "2026-06-20T18:00:00.000Z",
  actualArrivalAt: "2026-06-20T18:30:00.000Z",
  status: "ended",
  openedBy: "user_1",
  endedBy: "user_1",
  endedAt: "2026-06-20T19:00:00.000Z",
  notes: "Cargo run",
  createdAt: "2026-06-20T07:00:00.000Z",
};

const destinations: Destination[] = [
  {
    id: "hithadhoo",
    businessProfileId: "bp_1",
    islandName: "Hithadhoo",
    atoll: "Seenu",
    destinationCode: "HIT",
    activeStatus: true,
    sortOrder: 1,
  },
  {
    id: "kulhudhuffushi",
    businessProfileId: "bp_1",
    islandName: "Kulhudhuffushi",
    atoll: "Haa Dhaalu",
    destinationCode: "KUL",
    activeStatus: true,
    sortOrder: 2,
  },
];

const bill = (overrides: Partial<Bill>): Bill => ({
  id: "bill_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  destinationId: "hithadhoo",
  customerId: "customer_1",
  billNumber: "BILL-HIT-0001",
  billType: "loading_bill",
  billStatus: "finalized",
  subtotalTaxInclusive: 100,
  taxTotal: 7.41,
  grandTotal: 100,
  paymentStatus: "unpaid",
  paidAmount: 0,
  createdBy: "user_1",
  createdAt: "2026-06-20T10:00:00.000Z",
  itemCount: 2,
  ...overrides,
});

const customers: Customer[] = [
  {
    id: "customer_1",
    businessProfileId: "bp_1",
    customerType: "business",
    displayName: "Atoll Traders",
    legalName: "Atoll Traders Pvt Ltd",
    phone: "7770000",
    nationalIdOrRegNo: "BR-1",
    defaultDestinationId: "hithadhoo",
    defaultPriceLevelId: "business",
    creditAllowed: true,
    creditLimit: 1000,
    outstandingBalance: 0,
    activeStatus: true,
  },
];

const businessProfile: BusinessProfile = {
  id: "bp_1",
  ownerUserId: "user_1",
  businessName: "CargoMV",
  vesselName: "MV Atoll Star",
  vesselRegistrationNumber: "REG-1",
  companyName: "CargoMV Pvt Ltd",
  companyRegistrationNumber: "C-1",
  gstNumber: "GST-1",
  taxRegistrationStatus: "registered",
  phone: "3330000",
  email: "accounts@cargo.mv",
  address: "Male'",
  logoEmoji: "CM",
  defaultCurrency: "MVR",
  defaultTaxRate: 8,
  taxInclusivePricingEnabled: true,
  activeStatus: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("trip end bill summary groups active bills by destination and excludes cancelled bills", () => {
  const summary = buildTripEndBillSummary(trip, [
    bill({ id: "bill_1", grandTotal: 100, paidAmount: 40 }),
    bill({ id: "bill_2", billNumber: "BILL-HIT-0002", grandTotal: 50, paidAmount: 50, taxTotal: 3.7, subtotalTaxInclusive: 50, itemCount: 1 }),
    bill({ id: "bill_3", destinationId: "kulhudhuffushi", billNumber: "BILL-KUL-0001", grandTotal: 200, paidAmount: 0, taxTotal: 14.81, subtotalTaxInclusive: 200, itemCount: 3 }),
    bill({ id: "bill_4", billStatus: "cancelled", grandTotal: 500, paidAmount: 0 }),
  ], destinations);

  assert.equal(summary.billCount, 3);
  assert.equal(summary.itemCount, 6);
  assert.equal(summary.grandTotal, 350);
  assert.equal(summary.paidAmount, 90);
  assert.equal(summary.balanceDue, 260);
  assert.deepEqual(summary.destinations.map(group => group.destinationCode), ["HIT", "KUL"]);
  assert.deepEqual(summary.destinations.map(group => group.billCount), [2, 1]);
});

test("trip end A4 document contains destination rows and accounting totals", () => {
  const summary = buildTripEndBillSummary(trip, [
    bill({ id: "bill_1", grandTotal: 100, paidAmount: 40 }),
  ], destinations);
  const document = buildTripEndBillSummaryA4Document({ trip, summary, businessProfile, customers });

  assert.equal(document.title, "TRIP END BILL SUMMARY");
  assert.equal(document.documentNumber, "TRIP-2026-000001-BILL-SUMMARY");
  assert.equal(document.items[0].name, "Hithadhoo (HIT)");
  assert.match(document.items[1].description || "", /Atoll Traders/);
  assert.deepEqual(document.totals.map(total => total.label), ["Total billed", "GST included", "Paid", "Balance due"]);
});

test("destination bill summary A4 document contains one destination's bills and totals", () => {
  const summary = buildTripEndBillSummary(trip, [
    bill({ id: "bill_1", grandTotal: 100, paidAmount: 40 }),
    bill({ id: "bill_2", billNumber: "BILL-HIT-0002", grandTotal: 50, paidAmount: 50, taxTotal: 3.7, subtotalTaxInclusive: 50, itemCount: 1 }),
    bill({ id: "bill_3", destinationId: "kulhudhuffushi", billNumber: "BILL-KUL-0001", grandTotal: 200, paidAmount: 0, taxTotal: 14.81, subtotalTaxInclusive: 200, itemCount: 3 }),
  ], destinations);
  const document = buildTripEndDestinationBillSummaryA4Document({
    trip,
    destinationSummary: summary.destinations[0],
    businessProfile,
    customers,
  });

  assert.equal(document.title, "DESTINATION BILL SUMMARY");
  assert.equal(document.documentNumber, "TRIP-2026-000001-HIT-BILL-SUMMARY");
  assert.deepEqual(document.items.map(item => item.name), ["BILL-HIT-0001", "BILL-HIT-0002"]);
  assert.equal(document.totals[0].value, "MVR 150.00");
  assert.deepEqual(document.destinationDetails?.slice(0, 3), ["Hithadhoo", "Seenu Atoll", "HIT"]);
});
