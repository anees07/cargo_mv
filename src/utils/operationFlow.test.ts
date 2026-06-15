import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOffloadAvailability,
  billTypeForOperationType,
  isOperationBillable,
  validatePaymentRequest,
} from "./operationFlow.js";
import type { Bill, Operation, OperationItem, Trip } from "../types.js";

const item = (overrides: Partial<OperationItem>): OperationItem => ({
  id: "item_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  operationId: "op_loading",
  destinationId: "dest_1",
  customerId: "customer_1",
  itemId: "catalog_1",
  itemNameSnapshot: "Rice sack",
  unitType: "sack",
  quantity: 5,
  unitPriceTaxInclusive: 10,
  taxRate: 8,
  taxAmount: 3.7,
  lineTotalTaxInclusive: 50,
  createdBy: "user_1",
  createdAt: "2026-06-15T08:00:00.000Z",
  ...overrides,
});

const operation = (overrides: Partial<Operation>): Operation => ({
  id: "op_loading",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  operationType: "loading",
  destinationId: "dest_1",
  customerId: "customer_1",
  items: [],
  totalTaxInclusive: 0,
  totalTax: 0,
  createdBy: "user_1",
  createdAt: "2026-06-15T08:00:00.000Z",
  synced: true,
  ...overrides,
});

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
  createdAt: "2026-06-15T08:00:00.000Z",
  itemCount: 1,
  ...overrides,
});

const trip: Trip = {
  id: "trip_1",
  businessProfileId: "bp_1",
  tripNumber: "TRIP-1",
  vesselName: "MV Test",
  originDestinationId: "dest_1",
  returnDestinationId: "dest_2",
  plannedDepartureAt: "2026-06-15T08:00:00.000Z",
  plannedArrivalAt: "2026-06-15T18:00:00.000Z",
  status: "loading",
  openedBy: "user_1",
  notes: "",
  createdAt: "2026-06-15T08:00:00.000Z",
};

test("offload availability is scoped to selected destination and customer", () => {
  const availability = buildOffloadAvailability([
    operation({ items: [item({ itemId: "rice", quantity: 10, destinationId: "dest_1", customerId: "customer_1" })] }),
    operation({ id: "other_dest", destinationId: "dest_2", items: [item({ itemId: "rice", quantity: 8, destinationId: "dest_2", customerId: "customer_1" })] }),
    operation({ id: "other_customer", customerId: "customer_2", items: [item({ itemId: "rice", quantity: 7, customerId: "customer_2" })] }),
  ], "trip_1", "dest_1", "customer_1");

  assert.equal(availability.rice.remaining, 10);
});

test("offload availability subtracts quantities already offloaded for the same customer and destination", () => {
  const availability = buildOffloadAvailability([
    operation({ items: [item({ itemId: "rice", quantity: 10 })] }),
    operation({ id: "op_offloading", operationType: "offloading", items: [item({ itemId: "rice", quantity: 4 })] }),
  ], "trip_1", "dest_1", "customer_1");

  assert.equal(availability.rice.remaining, 6);
});

test("offload availability includes loading bill items after the loading operation is billed", () => {
  const availability = buildOffloadAvailability([], "trip_1", "dest_1", "customer_1", [
    bill({ billType: "loading_bill", items: [item({ itemId: "rice", quantity: 10 })] }),
  ]);

  assert.equal(availability.rice?.remaining, 10);
});

test("offload availability subtracts offloading bill items after offloading is billed", () => {
  const availability = buildOffloadAvailability([], "trip_1", "dest_1", "customer_1", [
    bill({ billType: "loading_bill", items: [item({ itemId: "rice", quantity: 10 })] }),
    bill({ id: "bill_2", billType: "offloading_bill", items: [item({ itemId: "rice", quantity: 4 })] }),
  ]);

  assert.equal(availability.rice?.remaining, 6);
});

test("bill generation is blocked when an active draft bill already exists for the operation", () => {
  const loadingOperation = operation({ items: [item({})] });
  assert.equal(
    isOperationBillable(loadingOperation, [trip], [bill({ billType: billTypeForOperationType(loadingOperation.operationType) })]),
    false
  );
});

test("cancelled bills do not block rebilling the same operation", () => {
  const loadingOperation = operation({ items: [item({})] });
  assert.equal(
    isOperationBillable(loadingOperation, [trip], [bill({ billStatus: "cancelled" })]),
    true
  );
});

test("payment validation rejects posting more than the remaining balance", () => {
  const result = validatePaymentRequest(bill({ billStatus: "partially_paid", paymentStatus: "partial", paidAmount: 80 }), 30);
  assert.deepEqual(result, { ok: false, reason: "Payment exceeds outstanding balance." });
});

test("payment validation rejects already paid bills", () => {
  const result = validatePaymentRequest(bill({ billStatus: "paid", paymentStatus: "paid", paidAmount: 100 }), 1);
  assert.deepEqual(result, { ok: false, reason: "Bill is already fully paid." });
});
