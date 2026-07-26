import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut, type Auth } from "firebase/auth";
import { collection, collectionGroup, doc, getDoc, getDocs, getFirestore, onSnapshot, type DocumentData, type DocumentReference, type DocumentSnapshot, type Firestore, type Query, type QuerySnapshot, type Unsubscribe } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { fixtureSnapshot } from "../data/fixtures";
import type { PlatformAdminService } from "./contracts";
import type { AdminStatus, PlatformAdminSession, PlatformAdminUser, PlatformModule, PlatformSettings, PlatformSnapshot, Subscription, SubscriptionPlan, Tenant, TenantStatus } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!Object.values(firebaseConfig).every(Boolean)) throw new Error("Firebase configuration is missing. Add VITE_FIREBASE_* values to live mode.");
  app ??= getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

function getFirebaseAuth(): Auth {
  auth ??= getAuth(getFirebaseApp());
  return auth;
}

function getFirebaseDb(): Firestore {
  db ??= getFirestore(getFirebaseApp());
  return db;
}

function getFunctionsClient(): Functions {
  functions ??= getFunctions(getFirebaseApp(), "us-central1");
  return functions;
}

function asString(value: unknown): string { return typeof value === "string" ? value : ""; }
function asNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function asStringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function asIso(value: unknown): string { if (typeof value === "string") return value; if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString(); return new Date().toISOString(); }

interface LiveState {
  profiles: Array<{ id: string; data: DocumentData }>;
  users: Array<{ id: string; data: DocumentData }>;
  summaries: Array<{ id: string; data: DocumentData }>;
  plans: Array<{ id: string; data: DocumentData }>;
  subscriptions: Array<{ id: string; data: DocumentData }>;
  modules: Array<{ id: string; data: DocumentData }>;
  admins: Array<{ id: string; data: DocumentData }>;
  auditEvents: Array<{ id: string; data: DocumentData }>;
  settings: DocumentData;
}

const emptyState = (): LiveState => ({ profiles: [], users: [], summaries: [], plans: [], subscriptions: [], modules: [], admins: [], auditEvents: [], settings: {} });
const entries = (snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) => snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));

function mapTenant(profile: { id: string; data: DocumentData }, state: LiveState): Tenant {
  const data = profile.data;
  const subscription = state.subscriptions.map((item) => mapSubscription(item)).find((item) => item.tenantId === profile.id);
  const summary = state.summaries.find((item) => asString(item.data.businessProfileId) === profile.id && item.id === "dashboard")?.data;
  const statusValue = asString(data.platformStatus);
  const status: TenantStatus = ["pending", "active", "suspended", "blocked"].includes(statusValue) ? statusValue as TenantStatus : data.activeStatus === false ? "pending" : "active";
  const userCount = state.users.filter((user) => asString(user.data.businessProfileId) === profile.id).length;
  const planId = asString(data.subscriptionPlanId) || subscription?.planId || "starter";
  return {
    id: profile.id,
    name: asString(data.businessName) || asString(data.companyName) || profile.id,
    slug: asString(data.slug) || profile.id.toLowerCase(),
    contactName: asString(data.contactName) || asString(data.ownerName) || "Business owner",
    email: asString(data.email),
    phone: asString(data.phone),
    island: asString(data.island) || asString(data.address).split(",")[0] || "Maldives",
    status,
    joinedAt: asIso(data.createdAt),
    lastActiveAt: asIso(data.updatedAt || data.createdAt),
    users: userCount,
    shipments: asNumber(data.shipmentCount) || asNumber(summary?.shipmentCount) || asNumber(summary?.tripCount),
    mrr: asNumber(data.mrr) || subscription?.amount || 0,
    planId,
    renewalDate: asIso(data.renewalDate || subscription?.renewalDate),
    enabledModules: asStringList(data.enabledModules),
    risk: data.risk === "high" || data.risk === "medium" ? data.risk : status === "active" ? "low" : status === "pending" ? "medium" : "high",
  };
}

function mapPlan(item: { id: string; data: DocumentData }): SubscriptionPlan { const data = item.data; return { id: item.id, name: asString(data.name) || item.id, description: asString(data.description), price: asNumber(data.price), billingPeriod: data.billingPeriod === "annual" ? "annual" : "monthly", trialDays: asNumber(data.trialDays), features: asStringList(data.features), active: data.active !== false, subscribers: asNumber(data.subscribers), accent: data.accent === "mint" || data.accent === "amber" ? data.accent : "blue" }; }
function mapSubscription(item: { id: string; data: DocumentData }): Subscription { const data = item.data; const status = ["trial", "active", "past_due", "cancelled", "expired"].includes(asString(data.status)) ? asString(data.status) as Subscription["status"] : "active"; return { id: item.id, tenantId: asString(data.tenantId), planId: asString(data.planId) || "starter", status, startedAt: asIso(data.startedAt), renewalDate: asIso(data.renewalDate), amount: asNumber(data.amount), paymentMethod: asString(data.paymentMethod) || "Not added", lastPayment: asString(data.lastPayment) || "Pending" }; }
function mapModule(item: { id: string; data: DocumentData }): PlatformModule { const data = item.data; const category = ["operations", "finance", "growth", "platform"].includes(asString(data.category)) ? asString(data.category) as PlatformModule["category"] : "operations"; return { id: item.id, name: asString(data.name) || item.id, description: asString(data.description), category, enabledFor: asNumber(data.enabledFor), status: data.status === "beta" || data.status === "sunset" ? data.status : "available", adoption: asNumber(data.adoption), monthlyValue: asNumber(data.monthlyValue) }; }
function mapAdmin(item: { id: string; data: DocumentData }): PlatformAdminUser { const data = item.data; const role = ["platform_owner", "platform_admin", "support", "billing"].includes(asString(data.role)) ? asString(data.role) as PlatformAdminUser["role"] : "support"; const status = ["active", "invited", "suspended"].includes(asString(data.status)) ? asString(data.status) as AdminStatus : "invited"; return { id: item.id, name: asString(data.name) || asString(data.email), email: asString(data.email), role, status, lastActiveAt: asIso(data.lastActiveAt), twoFactorEnabled: data.twoFactorEnabled === true }; }

function buildSnapshot(state: LiveState): PlatformSnapshot {
  const fallbackPlans = state.plans.length ? state.plans.map(mapPlan) : fixtureSnapshot.plans.map((plan) => ({ ...plan, subscribers: 0 }));
  const fallbackModules = state.modules.length ? state.modules.map(mapModule) : fixtureSnapshot.modules.map((module) => ({ ...module, enabledFor: 0, adoption: 0, monthlyValue: 0 }));
  const tenants = state.profiles.map((profile) => mapTenant(profile, state));
  const subscriptions = state.subscriptions.map(mapSubscription);
  const plans = fallbackPlans.map((plan) => ({ ...plan, subscribers: subscriptions.filter((subscription) => subscription.planId === plan.id && subscription.status === "active").length }));
  const modules = fallbackModules.map((module) => {
    const enabledFor = tenants.filter((tenant) => tenant.enabledModules.includes(module.id)).length;
    return { ...module, enabledFor, adoption: tenants.length ? Math.round((enabledFor / tenants.length) * 100) : module.adoption };
  });
  return {
    tenants,
    plans,
    subscriptions,
    modules,
    admins: state.admins.map(mapAdmin),
    auditEvents: state.auditEvents.map((item) => ({ id: item.id, actor: asString(item.data.actor), action: asString(item.data.action), target: asString(item.data.target), description: asString(item.data.description), timestamp: asIso(item.data.timestamp), tone: item.data.tone === "danger" || item.data.tone === "warning" || item.data.tone === "success" ? item.data.tone : "neutral" })),
    settings: { ...fixtureSnapshot.settings, ...state.settings } as PlatformSettings,
  };
}

async function call<T>(name: string, data: unknown): Promise<T> { const result = await httpsCallable<unknown, T>(getFunctionsClient(), name)(data); return result.data; }

export class LivePlatformAdminService implements PlatformAdminService {
  async getSession(): Promise<PlatformAdminSession | null> {
    const firebaseAuth = getFirebaseAuth();
    await firebaseAuth.authStateReady();
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    const token = await user.getIdTokenResult(true);
    if (token.claims.platformAdmin !== true) throw new Error("This account is not authorized for platform administration.");
    return { id: user.uid, name: user.displayName || user.email?.split("@")[0] || "Platform admin", email: user.email || "", role: (token.claims.platformRole as PlatformAdminSession["role"]) || "platform_admin", platformAdmin: true };
  }

  async signIn(email: string, password: string): Promise<PlatformAdminSession> { await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password); const session = await this.getSession(); if (!session) throw new Error("Platform admin session could not be established."); return session; }
  async signInWithGoogle(): Promise<PlatformAdminSession> { await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider()); const session = await this.getSession(); if (!session) throw new Error("Platform admin session could not be established."); return session; }
  async bootstrap(): Promise<void> { await call("platformAdminBootstrap", {}); await getFirebaseAuth().currentUser?.getIdToken(true); }
  async signOut(): Promise<void> { await signOut(getFirebaseAuth()); }

  async getSnapshot(): Promise<PlatformSnapshot> {
    const firestore = getFirebaseDb();
    const [profiles, users, summaries, plans, subscriptions, modules, admins, auditEvents, settings] = await Promise.all([
      getDocs(collection(firestore, "business_profiles")),
      getDocs(collection(firestore, "business_users")),
      getDocs(collectionGroup(firestore, "summary_reports")),
      getDocs(collection(firestore, "platform_plans")),
      getDocs(collection(firestore, "platform_subscriptions")),
      getDocs(collection(firestore, "platform_modules")),
      getDocs(collection(firestore, "platform_admins")),
      getDocs(collection(firestore, "platform_audit_logs")),
      getDoc(doc(firestore, "platform_settings", "config")),
    ]);
    return buildSnapshot({ profiles: entries(profiles), users: entries(users), summaries: entries(summaries), plans: entries(plans), subscriptions: entries(subscriptions), modules: entries(modules), admins: entries(admins), auditEvents: entries(auditEvents), settings: settings.exists() ? settings.data() : {} });
  }

  subscribeSnapshot(onSnapshotUpdate: (snapshot: PlatformSnapshot) => void, onError: (error: Error) => void): () => void {
    const firestore = getFirebaseDb();
    const state = emptyState();
    const emit = () => onSnapshotUpdate(buildSnapshot(state));
    const fail = (error: Error) => onError(error);
    const subscriptions: Unsubscribe[] = [];
    const listenQuery = (target: Query<DocumentData>, update: (value: QuerySnapshot<DocumentData>) => void) => subscriptions.push(onSnapshot(target, (value) => { update(value); emit(); }, fail));
    const listenDocument = (target: DocumentReference<DocumentData>, update: (value: DocumentSnapshot<DocumentData>) => void) => subscriptions.push(onSnapshot(target, (value) => { update(value); emit(); }, fail));
    listenQuery(collection(firestore, "business_profiles"), (value) => { state.profiles = entries(value); });
    listenQuery(collection(firestore, "business_users"), (value) => { state.users = entries(value); });
    listenQuery(collectionGroup(firestore, "summary_reports"), (value) => { state.summaries = entries(value); });
    listenQuery(collection(firestore, "platform_plans"), (value) => { state.plans = entries(value); });
    listenQuery(collection(firestore, "platform_subscriptions"), (value) => { state.subscriptions = entries(value); });
    listenQuery(collection(firestore, "platform_modules"), (value) => { state.modules = entries(value); });
    listenQuery(collection(firestore, "platform_admins"), (value) => { state.admins = entries(value); });
    listenQuery(collection(firestore, "platform_audit_logs"), (value) => { state.auditEvents = entries(value); });
    listenDocument(doc(firestore, "platform_settings", "config"), (value) => { state.settings = value.exists() ? value.data() : {}; });
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }

  updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant> { return call<Tenant>("platformAdminUpdateTenantStatus", { tenantId, status }); }
  assignPlan(tenantId: string, planId: string): Promise<Tenant> { return call<Tenant>("platformAdminAssignPlan", { tenantId, planId }); }
  updateModuleEntitlement(tenantId: string, moduleId: string, enabled: boolean): Promise<Tenant> { return call<Tenant>("platformAdminUpdateModuleEntitlement", { tenantId, moduleId, enabled }); }
  createPlan(plan: Omit<SubscriptionPlan, "id" | "subscribers">): Promise<SubscriptionPlan> { return call<SubscriptionPlan>("platformAdminCreatePlan", plan); }
  inviteAdmin(input: Pick<PlatformAdminUser, "name" | "email" | "role">): Promise<PlatformAdminUser> { return call<PlatformAdminUser>("platformAdminInviteAdmin", input); }
  updateAdminStatus(adminId: string, status: AdminStatus): Promise<PlatformAdminUser> { return call<PlatformAdminUser>("platformAdminUpdateAdminStatus", { adminId, status }); }
  updateSettings(settings: PlatformSettings): Promise<PlatformSettings> { return call<PlatformSettings>("platformAdminUpdateSettings", settings); }
  getEvents(): Promise<PlatformSnapshot["auditEvents"]> { return this.getSnapshot().then((snapshot) => snapshot.auditEvents); }
}
