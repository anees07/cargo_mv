import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerOutstandingMap, getBillBalance, getCustomerOutstanding, getOutstandingCustomerCount, getTotalOutstanding, } from "./billingSummary.js";
const bill = (overrides) => ({
    id: "bill_1",
    businessProfileId: "bp_1",
    tripId: "trip_1",
    destinationId: "dest_1",
    customerId: "customer_1",
    billNumber: "BILL-1",
    billType: "loading_bill",
    billStatus: "finalized",
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
test("bill balance uses grand total minus paid amount", () => {
    assert.equal(getBillBalance(bill({ grandTotal: 100, paidAmount: 25 })), 75);
});
test("bill balance never goes below zero and ignores cancelled bills", () => {
    assert.equal(getBillBalance(bill({ grandTotal: 100, paidAmount: 120 })), 0);
    assert.equal(getBillBalance(bill({ billStatus: "cancelled", grandTotal: 100, paidAmount: 0 })), 0);
});
test("customer outstanding is derived from active bills instead of stale customer balances", () => {
    const bills = [
        bill({ id: "bill_1", customerId: "customer_1", grandTotal: 100, paidAmount: 25 }),
        bill({ id: "bill_2", customerId: "customer_1", grandTotal: 50, paidAmount: 0 }),
        bill({ id: "bill_3", customerId: "customer_2", grandTotal: 70, paidAmount: 70 }),
        bill({ id: "bill_4", customerId: "customer_3", billStatus: "cancelled", grandTotal: 90, paidAmount: 0 }),
    ];
    assert.equal(getCustomerOutstanding(bills, "customer_1"), 125);
    assert.equal(getTotalOutstanding(bills), 125);
    assert.equal(getOutstandingCustomerCount(bills), 1);
    assert.deepEqual(Array.from(buildCustomerOutstandingMap(bills).entries()), [["customer_1", 125]]);
});
