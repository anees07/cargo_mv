import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

type BillSnapshot = {
  id?: string;
  businessProfileId?: string;
  destinationId?: string;
  customerId?: string;
  billStatus?: string;
  paymentStatus?: string;
  grandTotal?: number;
  taxTotal?: number;
  paidAmount?: number;
  itemCount?: number;
};

type PaymentSnapshot = {
  id?: string;
  businessProfileId?: string;
  method?: string;
  amount?: number;
  collectedAt?: string;
};

type TripSnapshot = {
  id?: string;
  businessProfileId?: string;
  status?: string;
};

const activeTripStatuses = new Set(["open", "loading", "sailing", "offloading"]);

const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const str = (value: unknown) => typeof value === "string" ? value : "";

function asBill(data: DocumentData | undefined, id: string): BillSnapshot | null {
  if (!data) return null;
  return {
    id,
    businessProfileId: str(data.businessProfileId),
    destinationId: str(data.destinationId),
    customerId: str(data.customerId),
    billStatus: str(data.billStatus),
    paymentStatus: str(data.paymentStatus),
    grandTotal: num(data.grandTotal),
    taxTotal: num(data.taxTotal),
    paidAmount: num(data.paidAmount),
    itemCount: num(data.itemCount),
  };
}

function asPayment(data: DocumentData | undefined, id: string): PaymentSnapshot | null {
  if (!data) return null;
  return {
    id,
    businessProfileId: str(data.businessProfileId),
    method: str(data.method) || "other",
    amount: num(data.amount),
    collectedAt: str(data.collectedAt),
  };
}

function asTrip(data: DocumentData | undefined, id: string): TripSnapshot | null {
  if (!data) return null;
  return {
    id,
    businessProfileId: str(data.businessProfileId),
    status: str(data.status),
  };
}

function activeBillValue(bill: BillSnapshot | null) {
  if (!bill || bill.billStatus === "cancelled") {
    return { count: 0, billed: 0, tax: 0, paid: 0, outstanding: 0, itemCount: 0, paidCount: 0 };
  }
  const outstanding = Math.max(0, num(bill.grandTotal) - num(bill.paidAmount));
  return {
    count: 1,
    billed: num(bill.grandTotal),
    tax: num(bill.taxTotal),
    paid: num(bill.paidAmount),
    outstanding,
    itemCount: num(bill.itemCount),
    paidCount: bill.paymentStatus === "paid" ? 1 : 0,
  };
}

function paymentValue(payment: PaymentSnapshot | null) {
  if (!payment) return { count: 0, total: 0, method: "other", day: "" };
  return {
    count: 1,
    total: num(payment.amount),
    method: payment.method || "other",
    day: (payment.collectedAt || "").slice(0, 10),
  };
}

function tripStatusKey(status: string | undefined) {
  return status && /^[A-Za-z0-9_-]+$/.test(status) ? `tripStatusCounts.${status}` : "";
}

async function applyAggregateEvent(eventId: string, businessProfileId: string, apply: (transaction: Transaction) => Promise<void> | void) {
  if (!eventId || !businessProfileId) return;
  const eventRef = db
    .collection("business_profiles")
    .doc(businessProfileId)
    .collection("aggregate_events")
    .doc(eventId.replace(/\//g, "_"));

  await db.runTransaction(async transaction => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) return;
    await apply(transaction);
    transaction.set(eventRef, {
      businessProfileId,
      processedAt: FieldValue.serverTimestamp(),
    });
  });
}

function touchSummary(transaction: Transaction, businessProfileId: string, updates: Record<string, unknown>) {
  const summaryRef = db
    .collection("business_profiles")
    .doc(businessProfileId)
    .collection("summary_reports")
    .doc("dashboard");
  transaction.set(summaryRef, {
    businessProfileId,
    updatedAt: FieldValue.serverTimestamp(),
    ...updates,
  }, { merge: true });
}

export const aggregateBillSummary = onDocumentWritten(
  "business_profiles/{businessProfileId}/bills/{billId}",
  async event => {
    const businessProfileId = event.params.businessProfileId;
    const before = asBill(event.data?.before.data(), event.params.billId);
    const after = asBill(event.data?.after.data(), event.params.billId);
    const beforeValue = activeBillValue(before);
    const afterValue = activeBillValue(after);
    const billDelta = {
      count: afterValue.count - beforeValue.count,
      billed: afterValue.billed - beforeValue.billed,
      tax: afterValue.tax - beforeValue.tax,
      paid: afterValue.paid - beforeValue.paid,
      outstanding: afterValue.outstanding - beforeValue.outstanding,
      itemCount: afterValue.itemCount - beforeValue.itemCount,
      paidCount: afterValue.paidCount - beforeValue.paidCount,
    };

    await applyAggregateEvent(event.id, businessProfileId, async transaction => {
      const customerIds = new Set([before?.customerId, after?.customerId].filter(Boolean) as string[]);
      const customerSummaries = new Map<string, { ref: DocumentReference; currentOutstanding: number }>();
      for (const customerId of customerIds) {
        const customerRef = db
          .collection("business_profiles")
          .doc(businessProfileId)
          .collection("summary_reports")
          .doc(`customer_${customerId}`);
        const customerSnapshot = await transaction.get(customerRef);
        customerSummaries.set(customerId, {
          ref: customerRef,
          currentOutstanding: num(customerSnapshot.data()?.outstanding),
        });
      }

      touchSummary(transaction, businessProfileId, {
        activeBillCount: FieldValue.increment(billDelta.count),
        totalBilled: FieldValue.increment(billDelta.billed),
        totalTax: FieldValue.increment(billDelta.tax),
        totalPaidOnBills: FieldValue.increment(billDelta.paid),
        totalOutstanding: FieldValue.increment(billDelta.outstanding),
        itemCount: FieldValue.increment(billDelta.itemCount),
        paidBillCount: FieldValue.increment(billDelta.paidCount),
      });

      for (const bill of [before, after]) {
        if (!bill?.destinationId) continue;
        const value = bill === before ? beforeValue : afterValue;
        const sign = bill === before ? -1 : 1;
        const destinationRef = db
          .collection("business_profiles")
          .doc(businessProfileId)
          .collection("summary_reports")
          .doc(`destination_${bill.destinationId}`);
        transaction.set(destinationRef, {
          businessProfileId,
          destinationId: bill.destinationId,
          billCount: FieldValue.increment(sign * value.count),
          revenue: FieldValue.increment(sign * value.billed),
          taxTotal: FieldValue.increment(sign * value.tax),
          outstanding: FieldValue.increment(sign * value.outstanding),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      for (const customerId of customerIds) {
        const customerSummary = customerSummaries.get(customerId);
        if (!customerSummary) continue;
        const beforeOutstanding = before?.customerId === customerId ? beforeValue.outstanding : 0;
        const afterOutstanding = after?.customerId === customerId ? afterValue.outstanding : 0;
        const currentOutstanding = customerSummary.currentOutstanding;
        const nextOutstanding = Math.max(0, currentOutstanding + afterOutstanding - beforeOutstanding);
        const outstandingCustomerDelta = (currentOutstanding > 0 ? 1 : 0) === (nextOutstanding > 0 ? 1 : 0)
          ? 0
          : nextOutstanding > 0 ? 1 : -1;
        transaction.set(customerSummary.ref, {
          businessProfileId,
          customerId,
          outstanding: nextOutstanding,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        if (outstandingCustomerDelta !== 0) {
          touchSummary(transaction, businessProfileId, {
            outstandingCustomerCount: FieldValue.increment(outstandingCustomerDelta),
          });
        }
      }
    });
  }
);

export const aggregatePaymentSummary = onDocumentWritten(
  "business_profiles/{businessProfileId}/payments/{paymentId}",
  async event => {
    const businessProfileId = event.params.businessProfileId;
    const before = paymentValue(asPayment(event.data?.before.data(), event.params.paymentId));
    const after = paymentValue(asPayment(event.data?.after.data(), event.params.paymentId));

    await applyAggregateEvent(event.id, businessProfileId, transaction => {
      touchSummary(transaction, businessProfileId, {
        receiptCount: FieldValue.increment(after.count - before.count),
        totalCollected: FieldValue.increment(after.total - before.total),
      });

      for (const value of [before, after]) {
        if (!value.day) continue;
        const sign = value === before ? -1 : 1;
        const cashierRef = db
          .collection("business_profiles")
          .doc(businessProfileId)
          .collection("summary_reports")
          .doc(`cashier_${value.day}`);
        transaction.set(cashierRef, {
          businessProfileId,
          day: value.day,
          [`methods.${value.method}.count`]: FieldValue.increment(sign * value.count),
          [`methods.${value.method}.total`]: FieldValue.increment(sign * value.total),
          receiptCount: FieldValue.increment(sign * value.count),
          total: FieldValue.increment(sign * value.total),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });
  }
);

export const aggregateTripSummary = onDocumentWritten(
  "business_profiles/{businessProfileId}/trips/{tripId}",
  async event => {
    const businessProfileId = event.params.businessProfileId;
    const before = asTrip(event.data?.before.data(), event.params.tripId);
    const after = asTrip(event.data?.after.data(), event.params.tripId);

    await applyAggregateEvent(event.id, businessProfileId, async transaction => {
      const updates: Record<string, unknown> = {
        tripCount: FieldValue.increment((after ? 1 : 0) - (before ? 1 : 0)),
      };
      const beforeKey = tripStatusKey(before?.status);
      const afterKey = tripStatusKey(after?.status);
      if (beforeKey) updates[beforeKey] = FieldValue.increment(-1);
      if (afterKey) updates[afterKey] = FieldValue.increment(1);
      if (after && activeTripStatuses.has(after.status || "")) {
        updates.activeTripId = after.id;
      }

      const summaryRef = db
        .collection("business_profiles")
        .doc(businessProfileId)
        .collection("summary_reports")
        .doc("dashboard");
      if (before && activeTripStatuses.has(before.status || "") && (!after || !activeTripStatuses.has(after.status || ""))) {
        const summarySnapshot = await transaction.get(summaryRef);
        if (summarySnapshot.data()?.activeTripId === before.id) {
          updates.activeTripId = null;
        }
      }
      transaction.set(summaryRef, {
        businessProfileId,
        updatedAt: FieldValue.serverTimestamp(),
        ...updates,
      }, { merge: true });
    });
  }
);

export const backfillTenantSummaries = onCall(async request => {
  const uid = request.auth?.uid;
  const businessProfileId = str(request.data?.businessProfileId);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before running summary backfill.");
  }
  if (!businessProfileId) {
    throw new HttpsError("invalid-argument", "businessProfileId is required.");
  }

  const userSnapshot = await db.collection("business_users").doc(uid).get();
  const user = userSnapshot.data();
  if (!user || user.businessProfileId !== businessProfileId || !["owner", "admin"].includes(str(user.role))) {
    throw new HttpsError("permission-denied", "Only an owner or admin can backfill summaries.");
  }

  const tenantRef = db.collection("business_profiles").doc(businessProfileId);
  const [billsSnapshot, paymentsSnapshot, tripsSnapshot] = await Promise.all([
    tenantRef.collection("bills").get(),
    tenantRef.collection("payments").get(),
    tenantRef.collection("trips").get(),
  ]);

  const dashboard = {
    businessProfileId,
    activeBillCount: 0,
    paidBillCount: 0,
    receiptCount: 0,
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    outstandingCustomerCount: 0,
    totalTax: 0,
    itemCount: 0,
    tripCount: tripsSnapshot.size,
    tripStatusCounts: {} as Record<string, number>,
    activeTripId: null as string | null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const destinations = new Map<string, Record<string, unknown>>();
  const customers = new Map<string, number>();
  const cashierDays = new Map<string, Record<string, unknown>>();

  for (const document of billsSnapshot.docs) {
    const bill = asBill(document.data(), document.id);
    const value = activeBillValue(bill);
    dashboard.activeBillCount += value.count;
    dashboard.paidBillCount += value.paidCount;
    dashboard.totalBilled += value.billed;
    dashboard.totalTax += value.tax;
    dashboard.totalOutstanding += value.outstanding;
    dashboard.itemCount += value.itemCount;
    if (bill?.destinationId) {
      const current = destinations.get(bill.destinationId) || {
        businessProfileId,
        destinationId: bill.destinationId,
        billCount: 0,
        revenue: 0,
        taxTotal: 0,
        outstanding: 0,
        updatedAt: FieldValue.serverTimestamp(),
      };
      current.billCount = num(current.billCount) + value.count;
      current.revenue = num(current.revenue) + value.billed;
      current.taxTotal = num(current.taxTotal) + value.tax;
      current.outstanding = num(current.outstanding) + value.outstanding;
      destinations.set(bill.destinationId, current);
    }
    if (bill?.customerId) {
      customers.set(bill.customerId, Math.max(0, (customers.get(bill.customerId) || 0) + value.outstanding));
    }
  }

  for (const outstanding of customers.values()) {
    if (outstanding > 0) dashboard.outstandingCustomerCount += 1;
  }

  for (const document of paymentsSnapshot.docs) {
    const payment = paymentValue(asPayment(document.data(), document.id));
    dashboard.receiptCount += payment.count;
    dashboard.totalCollected += payment.total;
    if (!payment.day) continue;
    const daySummary = cashierDays.get(payment.day) || {
      businessProfileId,
      day: payment.day,
      receiptCount: 0,
      total: 0,
      methods: {},
      updatedAt: FieldValue.serverTimestamp(),
    };
    daySummary.receiptCount = num(daySummary.receiptCount) + payment.count;
    daySummary.total = num(daySummary.total) + payment.total;
    const methods = daySummary.methods as Record<string, { count: number; total: number }>;
    methods[payment.method] = methods[payment.method] || { count: 0, total: 0 };
    methods[payment.method].count += payment.count;
    methods[payment.method].total += payment.total;
    cashierDays.set(payment.day, daySummary);
  }

  for (const document of tripsSnapshot.docs) {
    const trip = asTrip(document.data(), document.id);
    if (!trip?.status) continue;
    dashboard.tripStatusCounts[trip.status] = (dashboard.tripStatusCounts[trip.status] || 0) + 1;
    if (activeTripStatuses.has(trip.status)) dashboard.activeTripId = trip.id || null;
  }

  const writer = db.bulkWriter();
  writer.set(tenantRef.collection("summary_reports").doc("dashboard"), dashboard, { merge: false });
  for (const [destinationId, summary] of destinations) {
    writer.set(tenantRef.collection("summary_reports").doc(`destination_${destinationId}`), summary, { merge: false });
  }
  for (const [customerId, outstanding] of customers) {
    writer.set(tenantRef.collection("summary_reports").doc(`customer_${customerId}`), {
      businessProfileId,
      customerId,
      outstanding,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  }
  for (const [day, summary] of cashierDays) {
    writer.set(tenantRef.collection("summary_reports").doc(`cashier_${day}`), summary, { merge: false });
  }
  await writer.close();

  return {
    businessProfileId,
    bills: billsSnapshot.size,
    payments: paymentsSnapshot.size,
    trips: tripsSnapshot.size,
    destinations: destinations.size,
    customers: customers.size,
    cashierDays: cashierDays.size,
  };
});
