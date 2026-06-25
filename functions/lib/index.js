"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillTenantSummaries = exports.aggregateTripSummary = exports.aggregatePaymentSummary = exports.aggregateBillSummary = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
(0, app_1.initializeApp)();
(0, options_1.setGlobalOptions)({
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 20,
});
const db = (0, firestore_1.getFirestore)();
const backfillPageSize = 500;
const activeTripStatuses = new Set(["open", "loading", "sailing", "offloading"]);
const num = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const str = (value) => typeof value === "string" ? value : "";
function asBill(data, id) {
    if (!data)
        return null;
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
function asPayment(data, id) {
    if (!data)
        return null;
    return {
        id,
        businessProfileId: str(data.businessProfileId),
        method: str(data.method) || "other",
        amount: num(data.amount),
        collectedAt: str(data.collectedAt),
    };
}
function asTrip(data, id) {
    if (!data)
        return null;
    return {
        id,
        businessProfileId: str(data.businessProfileId),
        status: str(data.status),
    };
}
function activeBillValue(bill) {
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
function paymentValue(payment) {
    if (!payment)
        return { count: 0, total: 0, method: "other", day: "" };
    return {
        count: 1,
        total: num(payment.amount),
        method: payment.method || "other",
        day: (payment.collectedAt || "").slice(0, 10),
    };
}
function tripStatusKey(status) {
    return status && /^[A-Za-z0-9_-]+$/.test(status) ? `tripStatusCounts.${status}` : "";
}
async function applyAggregateEvent(eventId, businessProfileId, apply) {
    if (!eventId || !businessProfileId)
        return;
    const eventRef = db
        .collection("business_profiles")
        .doc(businessProfileId)
        .collection("aggregate_events")
        .doc(eventId.replace(/\//g, "_"));
    await db.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventRef);
        if (eventSnapshot.exists)
            return;
        await apply(transaction);
        transaction.set(eventRef, {
            businessProfileId,
            processedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
}
function touchSummary(transaction, businessProfileId, updates) {
    const summaryRef = db
        .collection("business_profiles")
        .doc(businessProfileId)
        .collection("summary_reports")
        .doc("dashboard");
    transaction.set(summaryRef, {
        businessProfileId,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...updates,
    }, { merge: true });
}
async function* pagedCollection(collectionRef) {
    let lastSnapshot;
    for (;;) {
        let pageQuery = collectionRef
            .orderBy(firestore_1.FieldPath.documentId())
            .limit(backfillPageSize);
        if (lastSnapshot) {
            pageQuery = pageQuery.startAfter(lastSnapshot);
        }
        const page = await pageQuery.get();
        if (page.empty)
            return;
        for (const document of page.docs) {
            yield document;
        }
        lastSnapshot = page.docs[page.docs.length - 1];
        if (page.size < backfillPageSize)
            return;
    }
}
exports.aggregateBillSummary = (0, firestore_2.onDocumentWritten)("business_profiles/{businessProfileId}/bills/{billId}", async (event) => {
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
    await applyAggregateEvent(event.id, businessProfileId, async (transaction) => {
        const customerIds = new Set([before?.customerId, after?.customerId].filter(Boolean));
        const customerSummaries = new Map();
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
            activeBillCount: firestore_1.FieldValue.increment(billDelta.count),
            totalBilled: firestore_1.FieldValue.increment(billDelta.billed),
            totalTax: firestore_1.FieldValue.increment(billDelta.tax),
            totalPaidOnBills: firestore_1.FieldValue.increment(billDelta.paid),
            totalOutstanding: firestore_1.FieldValue.increment(billDelta.outstanding),
            itemCount: firestore_1.FieldValue.increment(billDelta.itemCount),
            paidBillCount: firestore_1.FieldValue.increment(billDelta.paidCount),
        });
        for (const bill of [before, after]) {
            if (!bill?.destinationId)
                continue;
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
                billCount: firestore_1.FieldValue.increment(sign * value.count),
                revenue: firestore_1.FieldValue.increment(sign * value.billed),
                taxTotal: firestore_1.FieldValue.increment(sign * value.tax),
                outstanding: firestore_1.FieldValue.increment(sign * value.outstanding),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        for (const customerId of customerIds) {
            const customerSummary = customerSummaries.get(customerId);
            if (!customerSummary)
                continue;
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
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            if (outstandingCustomerDelta !== 0) {
                touchSummary(transaction, businessProfileId, {
                    outstandingCustomerCount: firestore_1.FieldValue.increment(outstandingCustomerDelta),
                });
            }
        }
    });
});
exports.aggregatePaymentSummary = (0, firestore_2.onDocumentWritten)("business_profiles/{businessProfileId}/payments/{paymentId}", async (event) => {
    const businessProfileId = event.params.businessProfileId;
    const before = paymentValue(asPayment(event.data?.before.data(), event.params.paymentId));
    const after = paymentValue(asPayment(event.data?.after.data(), event.params.paymentId));
    await applyAggregateEvent(event.id, businessProfileId, transaction => {
        touchSummary(transaction, businessProfileId, {
            receiptCount: firestore_1.FieldValue.increment(after.count - before.count),
            totalCollected: firestore_1.FieldValue.increment(after.total - before.total),
        });
        for (const value of [before, after]) {
            if (!value.day)
                continue;
            const sign = value === before ? -1 : 1;
            const cashierRef = db
                .collection("business_profiles")
                .doc(businessProfileId)
                .collection("summary_reports")
                .doc(`cashier_${value.day}`);
            transaction.set(cashierRef, {
                businessProfileId,
                day: value.day,
                [`methods.${value.method}.count`]: firestore_1.FieldValue.increment(sign * value.count),
                [`methods.${value.method}.total`]: firestore_1.FieldValue.increment(sign * value.total),
                receiptCount: firestore_1.FieldValue.increment(sign * value.count),
                total: firestore_1.FieldValue.increment(sign * value.total),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    });
});
exports.aggregateTripSummary = (0, firestore_2.onDocumentWritten)("business_profiles/{businessProfileId}/trips/{tripId}", async (event) => {
    const businessProfileId = event.params.businessProfileId;
    const before = asTrip(event.data?.before.data(), event.params.tripId);
    const after = asTrip(event.data?.after.data(), event.params.tripId);
    await applyAggregateEvent(event.id, businessProfileId, async (transaction) => {
        const updates = {
            tripCount: firestore_1.FieldValue.increment((after ? 1 : 0) - (before ? 1 : 0)),
        };
        const beforeKey = tripStatusKey(before?.status);
        const afterKey = tripStatusKey(after?.status);
        if (beforeKey)
            updates[beforeKey] = firestore_1.FieldValue.increment(-1);
        if (afterKey)
            updates[afterKey] = firestore_1.FieldValue.increment(1);
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            ...updates,
        }, { merge: true });
    });
});
exports.backfillTenantSummaries = (0, https_1.onCall)({
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    maxInstances: 1,
}, async (request) => {
    const uid = request.auth?.uid;
    const businessProfileId = str(request.data?.businessProfileId);
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in before running summary backfill.");
    }
    if (!businessProfileId) {
        throw new https_1.HttpsError("invalid-argument", "businessProfileId is required.");
    }
    const userSnapshot = await db.collection("business_users").doc(uid).get();
    const user = userSnapshot.data();
    if (!user || user.businessProfileId !== businessProfileId || !["owner", "admin"].includes(str(user.role))) {
        throw new https_1.HttpsError("permission-denied", "Only an owner or admin can backfill summaries.");
    }
    const tenantRef = db.collection("business_profiles").doc(businessProfileId);
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
        tripCount: 0,
        tripStatusCounts: {},
        activeTripId: null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const destinations = new Map();
    const customers = new Map();
    const cashierDays = new Map();
    let billCount = 0;
    let paymentCount = 0;
    let tripCount = 0;
    for await (const document of pagedCollection(tenantRef.collection("bills"))) {
        billCount += 1;
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
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
        if (outstanding > 0)
            dashboard.outstandingCustomerCount += 1;
    }
    for await (const document of pagedCollection(tenantRef.collection("payments"))) {
        paymentCount += 1;
        const payment = paymentValue(asPayment(document.data(), document.id));
        dashboard.receiptCount += payment.count;
        dashboard.totalCollected += payment.total;
        if (!payment.day)
            continue;
        const daySummary = cashierDays.get(payment.day) || {
            businessProfileId,
            day: payment.day,
            receiptCount: 0,
            total: 0,
            methods: {},
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        daySummary.receiptCount = num(daySummary.receiptCount) + payment.count;
        daySummary.total = num(daySummary.total) + payment.total;
        const methods = daySummary.methods;
        methods[payment.method] = methods[payment.method] || { count: 0, total: 0 };
        methods[payment.method].count += payment.count;
        methods[payment.method].total += payment.total;
        cashierDays.set(payment.day, daySummary);
    }
    for await (const document of pagedCollection(tenantRef.collection("trips"))) {
        tripCount += 1;
        const trip = asTrip(document.data(), document.id);
        if (!trip?.status)
            continue;
        dashboard.tripStatusCounts[trip.status] = (dashboard.tripStatusCounts[trip.status] || 0) + 1;
        if (activeTripStatuses.has(trip.status))
            dashboard.activeTripId = trip.id || null;
    }
    dashboard.tripCount = tripCount;
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: false });
    }
    for (const [day, summary] of cashierDays) {
        writer.set(tenantRef.collection("summary_reports").doc(`cashier_${day}`), summary, { merge: false });
    }
    await writer.close();
    return {
        businessProfileId,
        bills: billCount,
        payments: paymentCount,
        trips: tripCount,
        destinations: destinations.size,
        customers: customers.size,
        cashierDays: cashierDays.size,
    };
});
