import type { Bill } from "../types.js";

export function getBillBalance(bill: Bill): number {
  if (bill.billStatus === "cancelled") return 0;
  return Math.max(0, Number((Number(bill.grandTotal || 0) - Number(bill.paidAmount || 0)).toFixed(2)));
}

export function buildCustomerOutstandingMap(bills: Bill[]): Map<string, number> {
  const outstanding = new Map<string, number>();
  for (const bill of bills) {
    const balance = getBillBalance(bill);
    if (balance <= 0) continue;
    outstanding.set(bill.customerId, Number(((outstanding.get(bill.customerId) || 0) + balance).toFixed(2)));
  }
  return outstanding;
}

export function getCustomerOutstanding(bills: Bill[], customerId: string): number {
  return buildCustomerOutstandingMap(bills).get(customerId) || 0;
}

export function getTotalOutstanding(bills: Bill[]): number {
  return Number(Array.from(buildCustomerOutstandingMap(bills).values()).reduce((sum, amount) => sum + amount, 0).toFixed(2));
}

export function getOutstandingCustomerCount(bills: Bill[]): number {
  return buildCustomerOutstandingMap(bills).size;
}
