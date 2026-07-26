import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, FieldValue, getFirestore, type CollectionReference, type DocumentData, type DocumentReference, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

initializeApp();
setGlobalOptions({
  region: "us-central1",
  serviceAccount: "cargomv-d41f8@appspot.gserviceaccount.com",
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 20,
});

const db = getFirestore();
const backfillPageSize = 500;

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

type PlatformStatus = "pending" | "active" | "suspended" | "blocked";
type PlatformCallRequest = {
  auth?: { uid: string; token: Record<string, unknown> };
  data?: unknown;
};

function platformInput(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? data as Record<string, unknown> : {};
}

function assertPlatformAdmin(request: PlatformCallRequest): { uid: string; name: string } {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before using platform administration.");
  if (request.auth.token.platformAdmin !== true || request.auth.token.platformAdminActive === false) {
    throw new HttpsError("permission-denied", "This account is not authorized for platform administration.");
  }
  return {
    uid: request.auth.uid,
    name: str(request.auth.token.name) || str(request.auth.token.email) || request.auth.uid,
  };
}

function requiredString(input: Record<string, unknown>, key: string, maxLength = 160): string {
  const value = str(input[key]).trim();
  if (!value || value.length > maxLength) throw new HttpsError("invalid-argument", `${key} is required.`);
  return value;
}

function platformStatus(value: unknown): PlatformStatus {
  if (value === "pending" || value === "active" || value === "suspended" || value === "blocked") return value;
  throw new HttpsError("invalid-argument", "Invalid tenant status.");
}

async function appendPlatformAudit(actor: { uid: string; name: string }, action: string, target: string, description: string, tone: "neutral" | "success" | "warning" | "danger") {
  await db.collection("platform_audit_logs").add({
    actorUid: actor.uid,
    actor: actor.name,
    action,
    target,
    description,
    tone,
    timestamp: FieldValue.serverTimestamp(),
  });
}

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

async function* pagedCollection(collectionRef: CollectionReference): AsyncGenerator<QueryDocumentSnapshot> {
  let lastSnapshot: QueryDocumentSnapshot | undefined;
  for (;;) {
    let pageQuery = collectionRef
      .orderBy(FieldPath.documentId())
      .limit(backfillPageSize);
    if (lastSnapshot) {
      pageQuery = pageQuery.startAfter(lastSnapshot);
    }
    const page = await pageQuery.get();
    if (page.empty) return;
    for (const document of page.docs) {
      yield document;
    }
    lastSnapshot = page.docs[page.docs.length - 1];
    if (page.size < backfillPageSize) return;
  }
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

export const backfillTenantSummaries = onCall({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 540,
  maxInstances: 1,
}, async request => {
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
    tripStatusCounts: {} as Record<string, number>,
    activeTripId: null as string | null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const destinations = new Map<string, Record<string, unknown>>();
  const customers = new Map<string, number>();
  const cashierDays = new Map<string, Record<string, unknown>>();
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

  for await (const document of pagedCollection(tenantRef.collection("payments"))) {
    paymentCount += 1;
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

  for await (const document of pagedCollection(tenantRef.collection("trips"))) {
    tripCount += 1;
    const trip = asTrip(document.data(), document.id);
    if (!trip?.status) continue;
    dashboard.tripStatusCounts[trip.status] = (dashboard.tripStatusCounts[trip.status] || 0) + 1;
    if (activeTripStatuses.has(trip.status)) dashboard.activeTripId = trip.id || null;
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
      updatedAt: FieldValue.serverTimestamp(),
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

export const platformAdminBootstrap = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdminBootstrapRequest(request);
  const auth = getAuth();
  const user = await auth.getUser(actor.uid);
  const existingClaims = user.customClaims || {};
  await auth.setCustomUserClaims(actor.uid, {
    ...existingClaims,
    platformAdmin: true,
    platformAdminActive: true,
    platformRole: "platform_owner",
  });
  await db.collection("platform_admins").doc(actor.uid).set({
    uid: actor.uid,
    name: user.displayName || user.email || actor.uid,
    email: user.email || "",
    role: "platform_owner",
    status: "active",
    lastActiveAt: FieldValue.serverTimestamp(),
    twoFactorEnabled: false,
  }, { merge: true });
  await appendPlatformAudit({ uid: actor.uid, name: user.displayName || user.email || actor.uid }, "Bootstrapped platform admin", user.email || actor.uid, "Platform-admin claim issued through the configured bootstrap boundary.", "success");
  return { ok: true, uid: actor.uid };
});

function assertPlatformAdminBootstrapRequest(request: PlatformCallRequest): { uid: string } {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before bootstrapping platform administration.");
  const email = str(request.auth.token.email).toLowerCase();
  const allowedEmail = str(process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL).toLowerCase();
  const allowedUids = str(process.env.PLATFORM_ADMIN_BOOTSTRAP_UIDS).split(",").map(value => value.trim()).filter(Boolean);
  if ((!allowedEmail || email !== allowedEmail) && !allowedUids.includes(request.auth.uid)) {
    throw new HttpsError("permission-denied", "This account is not configured for platform-admin bootstrap.");
  }
  return { uid: request.auth.uid };
}

export const platformAdminUpdateTenantStatus = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const tenantId = requiredString(input, "tenantId", 80);
  const status = platformStatus(input.status);
  const tenantRef = db.collection("business_profiles").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();
  if (!tenantSnapshot.exists) throw new HttpsError("not-found", "Tenant business profile not found.");
  const tenantName = str(tenantSnapshot.data()?.businessName) || tenantId;
  await tenantRef.set({
    platformStatus: status,
    activeStatus: status === "active",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await appendPlatformAudit(actor, `${status === "active" ? "Approved or reactivated" : titleForPlatformStatus(status)} tenant`, tenantName, `Tenant ${tenantId} changed to ${status}.`, status === "blocked" ? "danger" : status === "suspended" ? "warning" : "success");
  return { tenantId, status };
});

export const platformAdminAssignPlan = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const tenantId = requiredString(input, "tenantId", 80);
  const planId = requiredString(input, "planId", 80);
  const planSnapshot = await db.collection("platform_plans").doc(planId).get();
  if (!planSnapshot.exists) throw new HttpsError("not-found", "Subscription plan not found.");
  const tenantRef = db.collection("business_profiles").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();
  if (!tenantSnapshot.exists) throw new HttpsError("not-found", "Tenant business profile not found.");
  const plan = planSnapshot.data() || {};
  const existingSubscription = await db.collection("platform_subscriptions").doc(tenantId).get();
  await db.runTransaction(async transaction => {
    transaction.set(tenantRef, {
      subscriptionPlanId: planId,
      mrr: num(plan.price),
      subscriptionStatus: "active",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(db.collection("platform_subscriptions").doc(tenantId), {
      id: tenantId,
      tenantId,
      planId,
      status: "active",
      amount: num(plan.price),
      startedAt: existingSubscription.data()?.startedAt || FieldValue.serverTimestamp(),
      renewalDate: existingSubscription.data()?.renewalDate || FieldValue.serverTimestamp(),
      paymentMethod: existingSubscription.data()?.paymentMethod || "Not added",
      lastPayment: existingSubscription.data()?.lastPayment || "Pending",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await appendPlatformAudit(actor, "Changed subscription", str(tenantSnapshot.data()?.businessName) || tenantId, `Assigned the ${str(plan.name) || planId} plan.`, "neutral");
  return { tenantId, planId };
});

export const platformAdminUpdateModuleEntitlement = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const tenantId = requiredString(input, "tenantId", 80);
  const moduleId = requiredString(input, "moduleId", 80);
  if (typeof input.enabled !== "boolean") throw new HttpsError("invalid-argument", "enabled must be boolean.");
  const tenantRef = db.collection("business_profiles").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();
  if (!tenantSnapshot.exists) throw new HttpsError("not-found", "Tenant business profile not found.");
  const rawModules = tenantSnapshot.data()?.enabledModules;
  const currentModules: string[] = Array.isArray(rawModules) ? rawModules.filter((value: unknown): value is string => typeof value === "string") : [];
  const enabledModules = input.enabled ? Array.from(new Set([...currentModules, moduleId])) : currentModules.filter((value: string) => value !== moduleId);
  await tenantRef.set({ enabledModules, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const moduleSnapshot = await db.collection("platform_modules").doc(moduleId).get();
  await appendPlatformAudit(actor, input.enabled ? "Enabled module" : "Disabled module", str(tenantSnapshot.data()?.businessName) || tenantId, `${str(moduleSnapshot.data()?.name) || moduleId} ${input.enabled ? "enabled" : "disabled"}.`, input.enabled ? "success" : "warning");
  return { tenantId, moduleId, enabled: input.enabled };
});

export const platformAdminCreatePlan = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const name = requiredString(input, "name", 80);
  const description = requiredString(input, "description", 240);
  const price = num(input.price);
  if (price < 0) throw new HttpsError("invalid-argument", "price must be zero or greater.");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
  const planId = `plan_${slug}_${Date.now()}`;
  await db.collection("platform_plans").doc(planId).set({ id: planId, name, description, price, billingPeriod: input.billingPeriod === "annual" ? "annual" : "monthly", trialDays: Math.max(0, num(input.trialDays)), features: Array.isArray(input.features) ? input.features.filter((value): value is string => typeof value === "string").slice(0, 20) : [], active: input.active !== false, subscribers: 0, accent: input.accent === "mint" || input.accent === "amber" ? input.accent : "blue", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await appendPlatformAudit(actor, "Created plan", name, "A new subscription plan was created.", "success");
  return { id: planId, name, description, price, billingPeriod: input.billingPeriod === "annual" ? "annual" : "monthly", trialDays: Math.max(0, num(input.trialDays)), features: [], active: input.active !== false, subscribers: 0, accent: input.accent === "mint" || input.accent === "amber" ? input.accent : "blue" };
});

export const platformAdminInviteAdmin = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const name = requiredString(input, "name", 120);
  const email = requiredString(input, "email", 160).toLowerCase();
  const role = ["platform_admin", "support", "billing"].includes(str(input.role)) ? str(input.role) : "support";
  const id = `invite_${Date.now()}`;
  await db.collection("platform_admins").doc(id).set({ id, name, email, role, status: "invited", lastActiveAt: FieldValue.serverTimestamp(), twoFactorEnabled: false, invitedBy: actor.uid, createdAt: FieldValue.serverTimestamp() });
  await appendPlatformAudit(actor, "Invited admin", name, "A platform administrator invitation was recorded.", "neutral");
  return { id, name, email, role, status: "invited", lastActiveAt: new Date().toISOString(), twoFactorEnabled: false };
});

export const platformAdminUpdateAdminStatus = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const adminId = requiredString(input, "adminId", 120);
  const status = ["active", "invited", "suspended"].includes(str(input.status)) ? str(input.status) : "suspended";
  const adminRef = db.collection("platform_admins").doc(adminId);
  const adminSnapshot = await adminRef.get();
  if (!adminSnapshot.exists) throw new HttpsError("not-found", "Platform admin not found.");
  await adminRef.set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (adminId !== actor.uid) {
    try {
      const target = await getAuth().getUser(adminId);
      const claims = target.customClaims || {};
      await getAuth().setCustomUserClaims(adminId, { ...claims, platformAdmin: status === "active", platformAdminActive: status === "active" });
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }
  }
  await appendPlatformAudit(actor, "Updated admin status", str(adminSnapshot.data()?.name) || adminId, `Admin status changed to ${status}.`, status === "suspended" ? "warning" : "success");
  return { ...adminSnapshot.data(), id: adminId, status };
});

export const platformAdminUpdateSettings = onCall({ region: "us-central1" }, async request => {
  const actor = assertPlatformAdmin(request);
  const input = platformInput(request.data);
  const settings = { requireApproval: input.requireApproval === true, allowTrials: input.allowTrials !== false, requireTwoFactor: input.requireTwoFactor !== false, maintenanceMode: input.maintenanceMode === true, defaultTrialDays: Math.max(0, num(input.defaultTrialDays)), supportEmail: requiredString(input, "supportEmail", 160) };
  await db.collection("platform_settings").doc("config").set({ ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
  await appendPlatformAudit(actor, "Updated platform settings", "Platform settings", "Approval and security settings were updated.", "neutral");
  return settings;
});

function titleForPlatformStatus(status: PlatformStatus): string {
  return status === "suspended" ? "Suspended" : status === "blocked" ? "Blocked" : "Updated";
}
