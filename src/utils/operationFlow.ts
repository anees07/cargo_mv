import type { Bill, BillStatus, Operation, OperationItem, OperationType, Trip } from "../types.js";

export interface OffloadAvailability {
  remaining: number;
  loadedQuantity: number;
  offloadedQuantity: number;
  source: OperationItem;
}

export interface PaymentValidationOk {
  ok: true;
  outstanding: number;
  nextPaidAmount: number;
  nextPaymentStatus: Bill["paymentStatus"];
  nextBillStatus: BillStatus;
}

export interface PaymentValidationError {
  ok: false;
  reason: string;
}

export type PaymentValidation = PaymentValidationOk | PaymentValidationError;

function sameSelection(operation: Operation, tripId: string | null | undefined, destinationId: string | null | undefined, customerId: string | null | undefined) {
  return operation.tripId === tripId &&
    operation.destinationId === destinationId &&
    operation.customerId === customerId;
}

function sameBillSelection(bill: Bill, tripId: string | null | undefined, destinationId: string | null | undefined, customerId: string | null | undefined) {
  return bill.tripId === tripId &&
    bill.destinationId === destinationId &&
    bill.customerId === customerId &&
    bill.billStatus !== "cancelled";
}

export function billTypeForOperationType(operationType: OperationType): Bill["billType"] {
  return operationType === "offloading" ? "offloading_bill" : "loading_bill";
}

export function buildOffloadAvailability(
  operations: Operation[],
  tripId: string | null | undefined,
  destinationId: string | null | undefined,
  customerId: string | null | undefined,
  bills: Bill[] = []
): Record<string, OffloadAvailability> {
  if (!tripId || !destinationId || !customerId) return {};

  const loaded = new Map<string, OperationItem>();
  const offloadedQty = new Map<string, number>();
  const loadedLineIds = new Set<string>();
  const offloadedLineIds = new Set<string>();

  const addLoadedItem = (item: OperationItem) => {
    if (loadedLineIds.has(item.id)) return;
    loadedLineIds.add(item.id);
    const existing = loaded.get(item.itemId);
    if (existing) {
      loaded.set(item.itemId, {
        ...existing,
        quantity: Number((existing.quantity + item.quantity).toFixed(2)),
        lineTotalTaxInclusive: Number((existing.lineTotalTaxInclusive + item.lineTotalTaxInclusive).toFixed(2)),
        taxAmount: Number((existing.taxAmount + item.taxAmount).toFixed(2)),
      });
    } else {
      loaded.set(item.itemId, item);
    }
  };

  const addOffloadedItem = (item: OperationItem) => {
    if (offloadedLineIds.has(item.id)) return;
    offloadedLineIds.add(item.id);
    offloadedQty.set(item.itemId, Number(((offloadedQty.get(item.itemId) || 0) + item.quantity).toFixed(2)));
  };

  for (const operation of operations) {
    if (!sameSelection(operation, tripId, destinationId, customerId)) continue;

    if (operation.operationType === "loading") {
      for (const item of operation.items) {
        addLoadedItem(item);
      }
      continue;
    }

    if (operation.operationType === "offloading") {
      for (const item of operation.items) {
        addOffloadedItem(item);
      }
    }
  }

  for (const bill of bills) {
    if (!sameBillSelection(bill, tripId, destinationId, customerId)) continue;
    const items = bill.items || [];
    if (bill.billType === "loading_bill") {
      for (const item of items) addLoadedItem(item);
    }
    if (bill.billType === "offloading_bill") {
      for (const item of items) addOffloadedItem(item);
    }
  }

  return Array.from(loaded.values()).reduce<Record<string, OffloadAvailability>>((acc, item) => {
    const offloadedQuantity = offloadedQty.get(item.itemId) || 0;
    const remaining = Number((item.quantity - offloadedQuantity).toFixed(2));
    if (remaining > 0) {
      acc[item.itemId] = {
        remaining,
        loadedQuantity: item.quantity,
        offloadedQuantity,
        source: item,
      };
    }
    return acc;
  }, {});
}

export function hasActiveBillForOperation(operation: Operation, bills: Bill[]): boolean {
  const billType = billTypeForOperationType(operation.operationType);
  return bills.some(bill =>
    bill.tripId === operation.tripId &&
    bill.destinationId === operation.destinationId &&
    bill.customerId === operation.customerId &&
    bill.billType === billType &&
    bill.billStatus !== "cancelled"
  );
}

export function isOperationBillable(operation: Operation, trips: Trip[], bills: Bill[]): boolean {
  const trip = trips.find(item => item.id === operation.tripId);
  return operation.items.length > 0 &&
    Boolean(trip) &&
    !["ended", "closed"].includes(trip!.status) &&
    !hasActiveBillForOperation(operation, bills);
}

export function validatePaymentRequest(bill: Bill | undefined | null, amount: number): PaymentValidation {
  if (!bill) return { ok: false, reason: "Bill not found." };
  if (amount <= 0) return { ok: false, reason: "Payment amount must be greater than zero." };
  if (bill.billStatus === "draft") return { ok: false, reason: "Finalize bill before collecting payment." };
  if (bill.billStatus === "cancelled") return { ok: false, reason: "Cancelled bills cannot be paid." };

  const outstanding = Number((bill.grandTotal - Number(bill.paidAmount || 0)).toFixed(2));
  if (bill.paymentStatus === "paid" || bill.billStatus === "paid" || outstanding <= 0) {
    return { ok: false, reason: "Bill is already fully paid." };
  }
  if (amount > outstanding) {
    return { ok: false, reason: "Payment exceeds outstanding balance." };
  }

  const nextPaidAmount = Number((Number(bill.paidAmount || 0) + amount).toFixed(2));
  const isPaid = nextPaidAmount >= bill.grandTotal;
  return {
    ok: true,
    outstanding,
    nextPaidAmount,
    nextPaymentStatus: isPaid ? "paid" : "partial",
    nextBillStatus: isPaid ? "paid" : "partially_paid",
  };
}
