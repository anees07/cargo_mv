import assert from "node:assert/strict";
import test from "node:test";

import { moveDraftBillDestination } from "./billDestination.js";
import type { Bill, Destination, OperationItem } from "../types.js";

const item = (overrides: Partial<OperationItem>): OperationItem => ({
  id: "item_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  operationId: "op_1",
  destinationId: "muli",
  customerId: "customer_1",
  itemId: "catalog_1",
  itemNameSnapshot: "Rice Sack",
  unitType: "sack",
  quantity: 1,
  unitPriceTaxInclusive: 300,
  taxRate: 8,
  taxAmount: 22.22,
  lineTotalTaxInclusive: 300,
  createdBy: "user_1",
  createdAt: "2026-07-06T08:00:00.000Z",
  ...overrides,
});

const bill = (overrides: Partial<Bill>): Bill => ({
  id: "bill_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  destinationId: "muli",
  customerId: "customer_1",
  billNumber: "BILL-MUL-000084",
  billType: "loading_bill",
  billStatus: "draft",
  subtotalTaxInclusive: 300,
  taxTotal: 22.22,
  grandTotal: 300,
  paymentStatus: "unpaid",
  paidAmount: 0,
  createdBy: "user_1",
  createdAt: "2026-07-06T08:00:00.000Z",
  itemCount: 1,
  ...overrides,
});

const gan: Destination = {
  id: "gan",
  businessProfileId: "bp_1",
  islandName: "Gan",
  atoll: "Laamu",
  destinationCode: "GAN",
  activeStatus: true,
  sortOrder: 2,
};

test("moveDraftBillDestination updates bill, line items, offloaded items and visible bill number", () => {
  const updated = moveDraftBillDestination(
    bill({
      items: [item({ id: "loaded" })],
      offloadedItems: [item({ id: "offloaded" })],
    }),
    gan,
    "2026-07-06T09:00:00.000Z",
  );

  assert.equal(updated.destinationId, "gan");
  assert.equal(updated.billNumber, "BILL-GAN-000084");
  assert.equal(updated.items?.[0]?.destinationId, "gan");
  assert.equal(updated.offloadedItems?.[0]?.destinationId, "gan");
  assert.equal(updated.updatedAt, "2026-07-06T09:00:00.000Z");
});
