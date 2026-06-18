import type { Bill, BillStatus, Operation, OperationItem, OperationType, Trip } from "../types.js";
import { SYSTEM_OTHER_ITEM_ID } from "../data/systemCatalogItems.js";

export interface OffloadAvailability {
  key: string;
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

export function operationIdsForActiveCart(
  operations: Operation[],
  tripId: string | null | undefined,
  operationType: OperationType,
  destinationId: string | null | undefined,
  customerId: string | null | undefined,
): string[] {
  if (!tripId || !destinationId || !customerId) return [];
  return operations
    .filter(operation =>
      operation.tripId === tripId &&
      operation.operationType === operationType &&
      operation.destinationId === destinationId &&
      operation.customerId === customerId &&
      operation.items.length > 0
    )
    .map(operation => operation.id);
}

export function operationIdsForTripCarts(operations: Operation[], tripId: string | null | undefined): string[] {
  if (!tripId) return [];
  return operations
    .filter(operation => operation.tripId === tripId && operation.items.length > 0)
    .map(operation => operation.id);
}

function offloadAvailabilityKey(item: Pick<OperationItem, "id" | "itemId" | "sourceOperationItemId">): string {
  return item.itemId === SYSTEM_OTHER_ITEM_ID
    ? item.sourceOperationItemId || item.id
    : item.itemId;
}

type LoadedManifestSource = {
  createdAt: string;
  items: OperationItem[];
};

function newestLoadedManifestSource(sources: LoadedManifestSource[]): LoadedManifestSource | null {
  return sources
    .filter(source => source.items.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
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
  const loadedSources: LoadedManifestSource[] = [];
  const offloadedSources: LoadedManifestSource[] = [];

  const addLoadedItem = (item: OperationItem) => {
    if (loadedLineIds.has(item.id)) return;
    loadedLineIds.add(item.id);
    const key = offloadAvailabilityKey(item);
    const existing = loaded.get(key);
    if (existing) {
      loaded.set(key, {
        ...existing,
        quantity: Number((existing.quantity + item.quantity).toFixed(2)),
        lineTotalTaxInclusive: Number((existing.lineTotalTaxInclusive + item.lineTotalTaxInclusive).toFixed(2)),
        taxAmount: Number((existing.taxAmount + item.taxAmount).toFixed(2)),
      });
    } else {
      loaded.set(key, item);
    }
  };

  const addOffloadedItem = (item: OperationItem) => {
    if (offloadedLineIds.has(item.id)) return;
    offloadedLineIds.add(item.id);
    const key = offloadAvailabilityKey(item);
    offloadedQty.set(key, Number(((offloadedQty.get(key) || 0) + item.quantity).toFixed(2)));
  };

  for (const operation of operations) {
    if (!sameSelection(operation, tripId, destinationId, customerId)) continue;

    if (operation.operationType === "offloading") {
      offloadedSources.push({ createdAt: operation.createdAt, items: operation.items });
    }
  }

  for (const bill of bills) {
    if (!sameBillSelection(bill, tripId, destinationId, customerId)) continue;
    const items = bill.items || [];
    if (bill.billType === "loading_bill") {
      loadedSources.push({ createdAt: bill.createdAt, items });
    }
    if (bill.offloadedItems?.length) {
      offloadedSources.push({ createdAt: bill.createdAt, items: bill.offloadedItems });
    }
    if (bill.billType === "offloading_bill") {
      offloadedSources.push({ createdAt: bill.createdAt, items });
    }
  }

  const loadedSource = newestLoadedManifestSource(loadedSources);
  for (const item of loadedSource?.items || []) {
    addLoadedItem(item);
  }
  for (const source of offloadedSources.filter(source => !loadedSource || source.createdAt >= loadedSource.createdAt)) {
    for (const item of source.items) addOffloadedItem(item);
  }

  return Array.from(loaded.values()).reduce<Record<string, OffloadAvailability>>((acc, item) => {
    const key = offloadAvailabilityKey(item);
    const offloadedQuantity = offloadedQty.get(key) || 0;
    const remaining = Number((item.quantity - offloadedQuantity).toFixed(2));
    if (remaining > 0) {
      acc[key] = {
        key,
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
  return bills.some(bill =>
    sameBillSelection(bill, operation.tripId, operation.destinationId, operation.customerId)
  );
}

export function isBillEditableBeforeFinalize(bill: Bill): boolean {
  return !bill.finalizedAt &&
    bill.billStatus !== "cancelled" &&
    bill.billStatus !== "finalized" &&
    bill.billStatus !== "partially_paid" &&
    bill.billStatus !== "paid" &&
    bill.billStatus !== "adjusted" &&
    bill.paymentStatus !== "partial" &&
    bill.paymentStatus !== "paid";
}

export function hasLockedBillForOperation(_operation: Operation, _bills: Bill[]): boolean {
  return false;
}

export function isOperationBillable(operation: Operation, trips: Trip[], bills: Bill[]): boolean {
  const trip = trips.find(item => item.id === operation.tripId);
  return operation.operationType === "loading" &&
    operation.items.length > 0 &&
    Boolean(trip) &&
    !["ended", "closed"].includes(trip!.status) &&
    !hasLockedBillForOperation(operation, bills);
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
