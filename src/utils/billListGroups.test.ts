import assert from "node:assert/strict";
import test from "node:test";

import { filterBillsForListCategory, groupBillsForList } from "./billListGroups.js";
import type { Bill } from "../types.js";

const bill = (overrides: Partial<Bill>): Bill => ({
  id: "bill_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  destinationId: "dest_1",
  customerId: "customer_1",
  billNumber: "BILL-1",
  billType: "loading_bill",
  billStatus: "draft",
  subtotalTaxInclusive: 100,
  taxTotal: 7.41,
  grandTotal: 100,
  paymentStatus: "unpaid",
  paidAmount: 0,
  createdBy: "user_1",
  createdAt: "2026-06-18T08:00:00.000Z",
  itemCount: 1,
  ...overrides,
});

test("bill list groups separate current, unpaid, partial, and paid bills", () => {
  const groups = groupBillsForList([
    bill({ id: "paid", billStatus: "paid", paymentStatus: "paid" }),
    bill({ id: "draft", billStatus: "draft", paymentStatus: "unpaid" }),
    bill({ id: "partial", billStatus: "partially_paid", paymentStatus: "partial" }),
    bill({ id: "unpaid", billStatus: "finalized", paymentStatus: "unpaid" }),
  ]);

  assert.deepEqual(groups.map(group => ({ id: group.id, bills: group.bills.map(item => item.id) })), [
    { id: "current", bills: ["draft"] },
    { id: "unpaid", bills: ["unpaid"] },
    { id: "partial", bills: ["partial"] },
    { id: "paid", bills: ["paid"] },
  ]);
});

test("bill list groups hide empty sections", () => {
  const groups = groupBillsForList([
    bill({ id: "paid", billStatus: "paid", paymentStatus: "paid" }),
  ]);

  assert.deepEqual(groups.map(group => group.id), ["paid"]);
});

test("bill list category filter returns only one selected category", () => {
  const bills = [
    bill({ id: "draft", billStatus: "draft", paymentStatus: "unpaid" }),
    bill({ id: "unpaid", billStatus: "finalized", paymentStatus: "unpaid" }),
    bill({ id: "partial", billStatus: "partially_paid", paymentStatus: "partial" }),
    bill({ id: "paid", billStatus: "paid", paymentStatus: "paid" }),
  ];

  assert.deepEqual(filterBillsForListCategory(bills, "current").map(item => item.id), ["draft"]);
  assert.deepEqual(filterBillsForListCategory(bills, "unpaid").map(item => item.id), ["unpaid"]);
  assert.deepEqual(filterBillsForListCategory(bills, "partial").map(item => item.id), ["partial"]);
  assert.deepEqual(filterBillsForListCategory(bills, "paid").map(item => item.id), ["paid"]);
});
