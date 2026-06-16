import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOffloadAvailability,
  billTypeForOperationType,
  hasActiveBillForOperation,
  hasLockedBillForOperation,
  isBillEditableBeforeFinalize,
  isOperationBillable,
  validatePaymentRequest,
} from "./operationFlow.js";
import { SYSTEM_OTHER_ITEM_ID } from "../data/systemCatalogItems.js";
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

test("offload availability subtracts bill offloaded items without adding them to bill items", () => {
  const availability = buildOffloadAvailability([], "trip_1", "dest_1", "customer_1", [
    bill({
      billType: "loading_bill",
      items: [item({ id: "loaded_1", itemId: "rice", quantity: 10 })],
      offloadedItems: [item({ id: "offloaded_1", itemId: "rice", quantity: 4 })],
    }),
  ]);

  assert.equal(availability.rice?.loadedQuantity, 10);
  assert.equal(availability.rice?.offloadedQuantity, 4);
  assert.equal(availability.rice?.remaining, 6);
});

test("system others entries remain isolated by source operation line", () => {
  const availability = buildOffloadAvailability([
    operation({
      items: [
        item({
          id: "other_loaded_1",
          itemId: SYSTEM_OTHER_ITEM_ID,
          itemNameSnapshot: "Others",
          lineDescription: "Blue box",
          quantity: 2,
          lineTotalTaxInclusive: 200,
        }),
        item({
          id: "other_loaded_2",
          itemId: SYSTEM_OTHER_ITEM_ID,
          itemNameSnapshot: "Others",
          lineDescription: "Loose parts",
          quantity: 3,
          lineTotalTaxInclusive: 300,
        }),
      ],
    }),
    operation({
      id: "op_offloading",
      operationType: "offloading",
      items: [
        item({
          id: "other_offloaded_1",
          itemId: SYSTEM_OTHER_ITEM_ID,
          sourceOperationItemId: "other_loaded_1",
          itemNameSnapshot: "Others",
          lineDescription: "Blue box",
          quantity: 1,
        }),
      ],
    }),
  ], "trip_1", "dest_1", "customer_1");

  assert.equal(availability.other_loaded_1?.remaining, 1);
  assert.equal(availability.other_loaded_1?.source.lineDescription, "Blue box");
  assert.equal(availability.other_loaded_2?.remaining, 3);
  assert.equal(availability.other_loaded_2?.source.lineDescription, "Loose parts");
});

test("offload availability uses only the newest loaded manifest for the selected customer and destination", () => {
  const availability = buildOffloadAvailability([
    operation({
      id: "older_loading",
      createdAt: "2026-06-15T08:00:00.000Z",
      items: [
        item({
          id: "old_other_1",
          itemId: SYSTEM_OTHER_ITEM_ID,
          itemNameSnapshot: "Others",
          lineDescription: "Old box",
          quantity: 1,
        }),
      ],
    }),
    operation({
      id: "latest_loading",
      createdAt: "2026-06-16T08:00:00.000Z",
      items: [
        item({ id: "latest_carton", itemId: "general_carton", itemNameSnapshot: "General Cargo Carton", quantity: 1 }),
        item({
          id: "latest_other_1",
          itemId: SYSTEM_OTHER_ITEM_ID,
          itemNameSnapshot: "Others",
          lineDescription: "1 noodle case huskuri foshi",
          quantity: 1,
        }),
      ],
    }),
  ], "trip_1", "dest_1", "customer_1");

  assert.deepEqual(Object.keys(availability), ["general_carton", "latest_other_1"]);
  assert.equal(availability.general_carton?.remaining, 1);
  assert.equal(availability.latest_other_1?.source.lineDescription, "1 noodle case huskuri foshi");
  assert.equal(availability.old_other_1, undefined);
});

test("bill generation remains available when a draft bill can be updated before finalize", () => {
  const loadingOperation = operation({ items: [item({})] });
  assert.equal(
    isOperationBillable(loadingOperation, [trip], [bill({ billType: billTypeForOperationType(loadingOperation.operationType) })]),
    true
  );
});

test("only loading operations are billable", () => {
  const offloadingOperation = operation({ operationType: "offloading", items: [item({})] });
  const handlingOperation = operation({ operationType: "cargo_handling", items: [item({})] });

  assert.equal(isOperationBillable(offloadingOperation, [trip], []), false);
  assert.equal(isOperationBillable(offloadingOperation, [trip], [bill({ billType: "loading_bill" })]), false);
  assert.equal(isOperationBillable(handlingOperation, [trip], []), false);
});

test("draft bill matching destination and customer can be updated even when bill type differs", () => {
  const loadingOperation = operation({ items: [item({})] });
  const existingCreditBill = bill({ billType: "credit", billStatus: "draft" });

  assert.equal(hasActiveBillForOperation(loadingOperation, [existingCreditBill]), true);
  assert.equal(hasLockedBillForOperation(loadingOperation, [existingCreditBill]), false);
  assert.equal(isOperationBillable(loadingOperation, [trip], [existingCreditBill]), true);
});

test("legacy unfinalized bills remain editable before finalize", () => {
  const legacyBill = bill({ billStatus: "credit", paymentStatus: "unpaid", finalizedAt: undefined });
  assert.equal(isBillEditableBeforeFinalize(legacyBill), true);
});

test("bill generation is blocked when a finalized bill already exists for the operation", () => {
  const loadingOperation = operation({ items: [item({})] });
  assert.equal(
    isOperationBillable(loadingOperation, [trip], [bill({
      billType: billTypeForOperationType(loadingOperation.operationType),
      billStatus: "finalized",
    })]),
    false
  );
});

test("finalized bill matching destination and customer blocks updates even when bill type differs", () => {
  const loadingOperation = operation({ items: [item({})] });
  const finalizedCreditBill = bill({ billType: "credit", billStatus: "finalized" });

  assert.equal(hasActiveBillForOperation(loadingOperation, [finalizedCreditBill]), true);
  assert.equal(hasLockedBillForOperation(loadingOperation, [finalizedCreditBill]), true);
  assert.equal(isOperationBillable(loadingOperation, [trip], [finalizedCreditBill]), false);
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
