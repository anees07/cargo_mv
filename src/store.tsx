import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, runTransaction, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import {
  createFirebaseOwnerAccount,
  getFirebaseFirestore,
  sendFirebasePasswordReset,
  signInWithFirebase,
  signOutFirebase,
} from "./lib/firebase";
import { MVR } from "./utils/format";
import { formatSequenceNumber, sequenceFromNumber } from "./utils/numbering";
import { isBillEditableBeforeFinalize, validatePaymentRequest } from "./utils/operationFlow";
import { isUnfinishedTrip } from "./utils/trips";
import { buildDestinationWalkInCustomer, ensureDestinationWalkInCustomers } from "./utils/walkInDetails";
import { CUSTOMER_PRICE_LEVEL_DEFINITIONS, buildCustomerPriceLevel, toFirestoreCustomerPriceLevel } from "./data/customerPriceLevels";
import { DEFAULT_CATALOG_CATEGORY_DEFINITIONS, buildCatalogCategory, makeUniqueCatalogCategoryCode, toFirestoreCatalogCategory } from "./data/catalogCategories";
import { SYSTEM_OTHER_ITEM_ID, buildSystemOtherCatalogItem, buildSystemOtherStandardRate } from "./data/systemCatalogItems";
import { AppContext, type AppContextValue } from "./appContext";
import type {
  BusinessProfile, User, Destination, Customer, CatalogItem, CatalogCategory, ItemPriceRate, CustomerPriceLevel,
  Trip, Bill, Payment, TaxSetting, NumberingSequence, AuditLog,
  OperationItem, Operation, AppNotification, OperationType, WalkInDetails
} from "./types";

// ============================================================================
// State Store — modeled after Riverpod NotifierProvider.
// Firebase Auth owns identity; Cloud Firestore owns tenant data.
// ============================================================================

export type Screen =
  | "splash" | "welcome" | "login" | "register" | "business_setup" | "select_profile"
  | "dashboard" | "trips" | "trip_detail" | "create_trip" | "operation"
  | "destinations" | "destination_detail" | "customers" | "customer_detail" | "catalog" | "price_levels"
  | "billing" | "invoice_preview" | "payments"
  | "reports" | "settings" | "users" | "audit_logs" | "profile" | "notifications"
  | "sync_conflicts" | "pdf_documents";

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
  variant: "info" | "success" | "warning" | "error";
}

export interface AppState {
  // auth
  isAuthed: boolean;
  currentUser: User;
  // profile
  businessProfile: BusinessProfile;
  // master data
  users: User[];
  destinations: Destination[];
  customers: Customer[];
  catalogCategories: CatalogCategory[];
  catalogItems: CatalogItem[];
  itemPriceRates: ItemPriceRate[];
  priceLevels: CustomerPriceLevel[];
  // operations
  trips: Trip[];
  activeTripId: string | null;
  operations: Operation[];
  // billing
  bills: Bill[];
  payments: Payment[];
  taxSettings: TaxSetting[];
  numbering: NumberingSequence[];
  // system
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  toasts: ToastMessage[];
  // ui
  screen: Screen;
  screenStack: Screen[];
  selectedTripId: string | null;
  selectedBillId: string | null;
  selectedCustomerId: string | null;
  selectedDestinationId: string | null;
  isOnline: boolean;
  pendingSyncCount: number;
  pendingOwnerRegistration: { uid: string; name: string; email: string } | null;
}

type AddOperationItemInput = Omit<OperationItem, "id" | "createdAt" | "businessProfileId" | "createdBy" | "taxAmount" | "lineTotalTaxInclusive"> & {
  operationType: OperationType;
  walkInDetails?: WalkInDetails;
};

export interface AppActions {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  registerOwner: (name: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  createOwnerBusinessProfile: (input: {
    businessName: string;
    vesselName: string;
    vesselReg: string;
    companyReg: string;
    gst: string;
    taxRate: string;
  }) => Promise<void>;
  selectBusinessProfile: (profileId: string) => void;
  navigate: (s: Screen) => void;
  back: () => void;
  openTrip: (tripId: string) => void;
  endTrip: (tripId: string) => void;
  selectTrip: (id: string) => void;
  selectBill: (id: string) => void;
  selectCustomer: (id: string) => void;
  selectDestination: (id: string) => void;
  addOperationItem: (item: AddOperationItemInput) => void;
  addOperationItems: (items: AddOperationItemInput[]) => void;
  removeOperationItem: (itemId: string) => void;
  finalizeBill: (billId: string) => void;
  postPayment: (billId: string, amount: number, method: Payment["method"], reference?: string, notes?: string) => Promise<boolean>;
  updateDraftBill: (billId: string, items: OperationItem[], reason: string) => void;
  createTrip: (originDestinationId: string, returnDestinationId: string, plannedArrivalAt: string, notes: string) => Promise<Trip | null>;
  addDestination: (islandName: string, atoll: string, code: string) => Destination;
  addCustomer: (customer: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">) => Customer;
  syncCatalogCategories: () => Promise<void>;
  saveCatalogCategory: (category: CatalogCategory) => Promise<void>;
  addCatalogItem: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number) => CatalogItem;
  syncCustomerPriceLevels: () => Promise<void>;
  saveCustomerPriceLevel: (priceLevel: CustomerPriceLevel) => Promise<void>;
  toast: (t: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  generateNextNumber: (type: NumberingSequence["numberType"], destCode?: string) => string;
  createBillFromOperation: (operationId: string, billType: Bill["billType"]) => Promise<Bill | null>;
  closeTrip: (tripId: string) => void;
  toggleOnline: () => void;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void;
  inviteUser: (user: Omit<User, "id" | "businessProfileId" | "online">) => User;
  updateTripStatus: (tripId: string, status: Trip["status"]) => void;
  alterBillAfterTripEnd: (billId: string, newTotal: number, reason: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateDestination: (destId: string, updates: Partial<Destination>) => void;
  deleteDestination: (destId: string) => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deleteCustomer: (customerId: string) => void;
  updateCatalogItem: (itemId: string, updates: Partial<CatalogItem>, newPrice?: number) => void;
  deleteCatalogItem: (itemId: string) => void;
  updateTripNotes: (tripId: string, notes: string) => void;
  deleteTrip: (tripId: string) => void;
  cancelBill: (billId: string, reason: string) => void;
  voidPayment: (paymentId: string, reason: string) => void;
  updateTaxSetting: (taxId: string, updates: Partial<TaxSetting>) => void;
}

const initialState: AppState = {
  isAuthed: false,
  currentUser: {
    id: "",
    name: "Cargo Operator",
    email: "",
    role: "viewer",
    businessProfileId: "",
    avatar: "CO",
    online: false,
  },
  businessProfile: {
    id: "",
    ownerUserId: "",
    businessName: "AtollCargo",
    vesselName: "",
    vesselRegistrationNumber: "",
    companyName: "",
    companyRegistrationNumber: "",
    gstNumber: "",
    taxRegistrationStatus: "unregistered",
    phone: "",
    email: "",
    address: "",
    logoEmoji: "AC",
    defaultCurrency: "MVR",
    defaultTaxRate: 8,
    taxInclusivePricingEnabled: true,
    activeStatus: true,
    createdAt: "",
  },
  users: [],
  destinations: [],
  customers: [],
  catalogCategories: [],
  catalogItems: [],
  itemPriceRates: [],
  priceLevels: [],
  trips: [],
  activeTripId: null,
  operations: [],
  bills: [],
  payments: [],
  taxSettings: [],
  numbering: [],
  auditLogs: [],
  notifications: [],
  toasts: [],
  screen: "splash",
  screenStack: [],
  selectedTripId: null,
  selectedBillId: null,
  selectedCustomerId: null,
  selectedDestinationId: null,
  isOnline: true,
  pendingSyncCount: 0,
  pendingOwnerRegistration: null,
};

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const toastTimeoutMs = 2500;

function appendToast(toasts: ToastMessage[], toast: ToastMessage) {
  const duplicateIndex = toasts.findIndex(item =>
    item.title === toast.title &&
    item.body === toast.body &&
    item.variant === toast.variant
  );
  if (duplicateIndex === -1) return [...toasts, toast];
  return [...toasts.slice(0, duplicateIndex), ...toasts.slice(duplicateIndex + 1), toast];
}

function mergeOperationItems(incoming: OperationItem[], existing: OperationItem[] = []) {
  const seen = new Set<string>();
  return [...incoming, ...existing].filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const tenantCollections = {
  users: "business_users",
  destinations: "destinations",
  customers: "customers",
  catalogCategories: "catalog_categories",
  catalogItems: "catalog_items",
  itemPriceRates: "item_price_rates",
  priceLevels: "price_levels",
  trips: "trips",
  operations: "operations",
  bills: "bills",
  payments: "payments",
  taxSettings: "tax_settings",
  numbering: "numbering_sequences",
  auditLogs: "audit_logs",
  notifications: "notifications",
} as const;

async function loadTenantCollection<T extends { id?: string }>(
  collectionName: string,
  businessProfileId: string,
): Promise<T[]> {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(collection(db, "business_profiles", businessProfileId, collectionName));
  return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as T);
}

const persistTenantDoc = (collectionName: string, docId: string, data: Record<string, unknown>) => {
  void persistTenantDocAsync(collectionName, docId, data).catch(error => {
    console.error(`Failed to persist ${collectionName}/${docId}`, error);
  });
};

async function ensureSystemOtherCatalogItem(
  businessProfileId: string,
  catalogItems: CatalogItem[],
  itemPriceRates: ItemPriceRate[],
) {
  const timestamp = new Date().toISOString();
  const systemItem = buildSystemOtherCatalogItem(businessProfileId, timestamp);
  const systemRate = buildSystemOtherStandardRate(businessProfileId, timestamp);
  const hasSystemItem = catalogItems.some(item => item.id === SYSTEM_OTHER_ITEM_ID || item.itemCode === systemItem.itemCode);
  const hasSystemRate = itemPriceRates.some(rate => rate.itemId === SYSTEM_OTHER_ITEM_ID && rate.priceLevel === "standard" && !rate.destinationId);
  const writes: Array<Promise<void>> = [];

  if (!hasSystemItem) {
    writes.push(persistTenantDocAsync(tenantCollections.catalogItems, systemItem.id, systemItem as unknown as Record<string, unknown>));
    catalogItems.push(systemItem);
  }
  if (!hasSystemRate) {
    writes.push(persistTenantDocAsync(tenantCollections.itemPriceRates, systemRate.id, systemRate as unknown as Record<string, unknown>));
    itemPriceRates.push(systemRate);
  }

  await Promise.all(writes);
}

async function ensureTenantWalkInCustomers(
  businessProfileId: string,
  destinations: Destination[],
  customers: Customer[],
) {
  const missingWalkIns = ensureDestinationWalkInCustomers(businessProfileId, destinations, customers);
  if (missingWalkIns.length === 0) return;

  await Promise.all(missingWalkIns.map(customer =>
    persistTenantDocAsync(tenantCollections.customers, customer.id, customer as unknown as Record<string, unknown>)
  ));
  customers.push(...missingWalkIns);
}

const persistTenantDocAsync = async (collectionName: string, docId: string, data: Record<string, unknown>) => {
  try {
    const db = getFirebaseFirestore();
    const businessProfileId = String(data.businessProfileId || "");
    const target = collectionName === "business_profiles"
      ? doc(db, collectionName, docId)
      : businessProfileId
        ? doc(db, "business_profiles", businessProfileId, collectionName, docId)
        : null;
    if (!target) {
      console.error(`Failed to persist ${collectionName}/${docId}: missing businessProfileId`);
      return;
    }
    await setDoc(target, stripUndefined(data) as Record<string, unknown>, { merge: true });
  } catch (error) {
    console.error(`Failed to persist ${collectionName}/${docId}`, error);
    throw error;
  }
};

const persistRootBusinessUser = (uid: string, data: Record<string, unknown>) => {
  void setDoc(doc(getFirebaseFirestore(), "business_users", uid), data).catch(error => {
    console.error(`Failed to persist business_users/${uid}`, error);
  });
};

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  );
};

const deleteTenantDoc = (collectionName: string, businessProfileId: string, docId: string) => {
  void deleteDoc(doc(getFirebaseFirestore(), "business_profiles", businessProfileId, collectionName, docId)).catch(error => {
    console.error(`Failed to delete business_profiles/${businessProfileId}/${collectionName}/${docId}`, error);
  });
};

async function getMaxSequenceFromFirestore(businessProfileId: string, collectionName: string, numberField: string) {
  const snapshot = await getDocs(collection(getFirebaseFirestore(), "business_profiles", businessProfileId, collectionName));
  return snapshot.docs.reduce((max, document) => {
    const numberValue = String((document.data() as Record<string, unknown>)[numberField] || "");
    return Math.max(max, sequenceFromNumber(numberValue));
  }, 0);
}

const operationDocumentId = (tripId: string, operationType: OperationType, destinationId: string, customerId: string) =>
  `op_${[tripId, operationType, destinationId, customerId].join("_").replace(/[^A-Za-z0-9_-]/g, "_")}`;

const isolatedSystemOtherOperationId = (tripId: string, operationType: OperationType, destinationId: string, customerId: string) =>
  `${operationDocumentId(tripId, operationType, destinationId, customerId)}_${id("other")}`;

function isIsolatedSystemOtherLoading(items: Array<Pick<AddOperationItemInput, "operationType" | "itemId">>) {
  return items.length === 1 &&
    items[0].operationType === "loading" &&
    items[0].itemId === SYSTEM_OTHER_ITEM_ID;
}

function isSystemOtherOnlyOperation(operation: Pick<Operation, "operationType" | "items">) {
  return operation.operationType === "loading" &&
    operation.items.length === 1 &&
    operation.items[0].itemId === SYSTEM_OTHER_ITEM_ID;
}

const initials = (nameOrEmail: string) =>
  nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "U";

const userFromFirebase = (firebaseUser: FirebaseUser, businessProfileId: string, role: User["role"] = "owner"): User => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Cargo Operator",
  email: firebaseUser.email || "",
  role,
  businessProfileId,
  avatar: initials(firebaseUser.displayName || firebaseUser.email || "Cargo Operator"),
  online: true,
});

const businessUserFromDoc = (data: Record<string, unknown>): User => ({
  id: String(data.uid || data.id || ""),
  name: String(data.name || data.email || "Cargo Operator"),
  email: String(data.email || ""),
  role: (data.role || "viewer") as User["role"],
  businessProfileId: String(data.businessProfileId || ""),
  avatar: String(data.avatar || initials(String(data.name || data.email || "Cargo Operator"))),
  online: Boolean(data.online ?? true),
});

const addAudit = (
  logs: AuditLog[],
  businessProfileId: string,
  entry: Omit<AuditLog, "id" | "createdAt" | "businessProfileId">,
) => {
  const auditEntry = { ...entry, id: id("al"), createdAt: new Date().toISOString(), businessProfileId };
  persistTenantDoc(tenantCollections.auditLogs, auditEntry.id, auditEntry);
  emitTenantNotification(auditEntry);
  return [auditEntry, ...logs];
};

const notificationTitleForAudit = (action: string) => {
  if (action.startsWith("trip.")) return "Trip updated";
  if (action === "billing.generate") return "Bill generated";
  if (action.startsWith("billing.")) return "Bill updated";
  if (action.startsWith("payment.")) return "Payment updated";
  if (action.startsWith("catalog.")) return "Catalog updated";
  if (action.startsWith("customer.")) return "Customer updated";
  if (action.startsWith("destination.")) return "Destination updated";
  if (action.startsWith("user.")) return "User updated";
  if (action.startsWith("users.")) return "User updated";
  if (action.startsWith("tax.")) return "Tax updated";
  if (action.startsWith("settings.")) return "Settings updated";
  return "Business updated";
};

const notificationTypeForAudit = (action: string): AppNotification["type"] => {
  if (action.includes("delete") || action.includes("cancel") || action.includes("void")) return "warning";
  if (action.includes("create") || action.includes("post") || action.includes("finalize")) return "success";
  return "info";
};

const emitTenantNotification = (auditEntry: AuditLog) => {
  const notification: AppNotification = {
    id: id("n"),
    businessProfileId: auditEntry.businessProfileId,
    actorUserId: auditEntry.actorUserId,
    action: auditEntry.action,
    entityType: auditEntry.entityType,
    entityId: auditEntry.entityId,
    title: notificationTitleForAudit(auditEntry.action),
    body: auditEntry.summary,
    type: notificationTypeForAudit(auditEntry.action),
    createdAt: auditEntry.createdAt,
    read: false,
    readBy: [auditEntry.actorUserId],
  };
  persistTenantDoc(tenantCollections.notifications, notification.id, notification as unknown as Record<string, unknown>);
};

async function loadTenantState(firebaseUser: FirebaseUser, userData: Record<string, unknown>) {
  const db = getFirebaseFirestore();
  const businessProfileId = String(userData.businessProfileId || `bp_${firebaseUser.uid}`);
  const role = (userData.role || "owner") as User["role"];
  const profileSnapshot = await getDoc(doc(db, "business_profiles", businessProfileId));
  if (!profileSnapshot.exists()) {
    return {
      missingProfile: true,
      businessProfileId,
      role,
    };
  }

  const [
    users,
    destinations,
    customers,
    catalogCategories,
    catalogItems,
    itemPriceRates,
    priceLevels,
    trips,
    operations,
    bills,
    payments,
    taxSettings,
    numbering,
    auditLogs,
    notifications,
  ] = await Promise.all([
    loadTenantCollection<Record<string, unknown>>(tenantCollections.users, businessProfileId),
    loadTenantCollection<Destination>(tenantCollections.destinations, businessProfileId),
    loadTenantCollection<Customer>(tenantCollections.customers, businessProfileId),
    loadTenantCollection<CatalogCategory>(tenantCollections.catalogCategories, businessProfileId),
    loadTenantCollection<CatalogItem>(tenantCollections.catalogItems, businessProfileId),
    loadTenantCollection<ItemPriceRate>(tenantCollections.itemPriceRates, businessProfileId),
    loadTenantCollection<CustomerPriceLevel>(tenantCollections.priceLevels, businessProfileId),
    loadTenantCollection<Trip>(tenantCollections.trips, businessProfileId),
    loadTenantCollection<Operation>(tenantCollections.operations, businessProfileId),
    loadTenantCollection<Bill>(tenantCollections.bills, businessProfileId),
    loadTenantCollection<Payment>(tenantCollections.payments, businessProfileId),
    loadTenantCollection<TaxSetting>(tenantCollections.taxSettings, businessProfileId),
    loadTenantCollection<NumberingSequence & { id?: string; businessProfileId?: string }>(tenantCollections.numbering, businessProfileId),
    loadTenantCollection<AuditLog>(tenantCollections.auditLogs, businessProfileId),
    loadTenantCollection<AppNotification & { businessProfileId?: string }>(tenantCollections.notifications, businessProfileId),
  ]);

  await ensureSystemOtherCatalogItem(businessProfileId, catalogItems, itemPriceRates);
  await ensureTenantWalkInCustomers(businessProfileId, destinations, customers);

  const currentUser = businessUserFromDoc({
    uid: firebaseUser.uid,
    name: firebaseUser.displayName,
    email: firebaseUser.email,
    businessProfileId,
    role,
    ...userData,
  });
  const activeTrip = trips.find(trip => ["open", "loading", "sailing", "offloading"].includes(trip.status));

  return {
    missingProfile: false,
    currentUser,
    businessProfile: { id: profileSnapshot.id, ...profileSnapshot.data() } as BusinessProfile,
    users: users.map(businessUserFromDoc),
    destinations: destinations.sort((a, b) => a.sortOrder - b.sortOrder),
    customers,
    catalogCategories: catalogCategories.sort((a, b) => a.sortOrder - b.sortOrder),
    catalogItems,
    itemPriceRates,
    priceLevels: priceLevels.sort((a, b) => a.sortOrder - b.sortOrder),
    trips: trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activeTripId: activeTrip?.id || null,
    operations,
    bills: bills.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt)),
    taxSettings,
    numbering,
    auditLogs: auditLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notifications,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const stateRef = useRef<AppState>(initialState);
  const lastRemoteUpdateAt = useRef(0);
  const pendingTripRef = useRef<Trip | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Simulate splash screen transition
  useEffect(() => {
    const t = setTimeout(() => {
      setState(s => ({ ...s, screen: "welcome" }));
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!pendingTripRef.current) return;
    const pendingTripStillOpen = state.trips.some(trip => trip.id === pendingTripRef.current?.id && isUnfinishedTrip(trip));
    if (!pendingTripStillOpen) {
      pendingTripRef.current = null;
    }
  }, [state.trips]);

  useEffect(() => {
    if (!state.isAuthed || !state.businessProfile.id) return;
    const db = getFirebaseFirestore();
    const businessProfileId = state.businessProfile.id;
    const unsubscribers: Unsubscribe[] = [];
    const markRemoteUpdate = () => {
      lastRemoteUpdateAt.current = Date.now();
    };
    const tenantCollection = (collectionName: string) =>
      collection(db, "business_profiles", businessProfileId, collectionName);

    unsubscribers.push(onSnapshot(doc(db, "business_profiles", businessProfileId), snapshot => {
      if (!snapshot.exists()) return;
      markRemoteUpdate();
      setState(s => ({ ...s, businessProfile: { id: snapshot.id, ...snapshot.data() } as BusinessProfile }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.users), snapshot => {
      const users = snapshot.docs.map(document => businessUserFromDoc({ id: document.id, ...document.data() }));
      markRemoteUpdate();
      setState(s => ({
        ...s,
        users,
        currentUser: users.find(user => user.id === s.currentUser.id) || s.currentUser,
      }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.destinations), snapshot => {
      const destinations = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as Destination)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      markRemoteUpdate();
      setState(s => ({ ...s, destinations }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.customers), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, customers: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as Customer) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.catalogCategories), snapshot => {
      const catalogCategories = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as CatalogCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      markRemoteUpdate();
      setState(s => ({ ...s, catalogCategories }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.catalogItems), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, catalogItems: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as CatalogItem) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.itemPriceRates), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, itemPriceRates: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as ItemPriceRate) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.priceLevels), snapshot => {
      const priceLevels = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as CustomerPriceLevel)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      markRemoteUpdate();
      setState(s => ({ ...s, priceLevels }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.trips), snapshot => {
      const trips = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as Trip)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const activeTrip = trips.find(trip => ["open", "loading", "sailing", "offloading"].includes(trip.status));
      const pendingTrip = pendingTripRef.current ? trips.find(trip => trip.id === pendingTripRef.current?.id) : null;
      if (pendingTripRef.current && (!pendingTrip || !isUnfinishedTrip(pendingTrip))) {
        pendingTripRef.current = null;
      }
      markRemoteUpdate();
      setState(s => ({ ...s, trips, activeTripId: activeTrip?.id || null }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.operations), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, operations: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as Operation) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.bills), snapshot => {
      const bills = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as Bill)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      markRemoteUpdate();
      setState(s => ({ ...s, bills }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.payments), snapshot => {
      const payments = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as Payment)
        .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
      markRemoteUpdate();
      setState(s => ({ ...s, payments }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.taxSettings), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, taxSettings: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as TaxSetting) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.numbering), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, numbering: snapshot.docs.map(document => ({ ...document.data(), id: document.id }) as NumberingSequence) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.auditLogs), snapshot => {
      const auditLogs = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as AuditLog)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      markRemoteUpdate();
      setState(s => ({ ...s, auditLogs }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.notifications), snapshot => {
      const notifications = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as AppNotification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      markRemoteUpdate();
      setState(s => ({ ...s, notifications }));
    }));

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [state.isAuthed, state.businessProfile.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const credential = await signInWithFirebase(email, password);
    const db = getFirebaseFirestore();
    const userDoc = await getDoc(doc(db, "business_users", credential.user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const businessProfileId = typeof userData?.businessProfileId === "string" ? userData.businessProfileId : `bp_${credential.user.uid}`;
    const role = typeof userData?.role === "string" ? userData.role as User["role"] : "owner";
    const tenantState = userData ? await loadTenantState(credential.user, userData) : null;
    setState(s => ({
      ...s,
      isAuthed: true,
      ...(tenantState && !tenantState.missingProfile ? tenantState : {
        currentUser: userFromFirebase(credential.user, businessProfileId, role),
      }),
      screen: tenantState && !tenantState.missingProfile ? "dashboard" : "business_setup",
      screenStack: [],
      pendingOwnerRegistration: tenantState && !tenantState.missingProfile ? null : {
        uid: credential.user.uid,
        name: credential.user.displayName || credential.user.email?.split("@")[0] || "Cargo Operator",
        email: credential.user.email || email,
      },
    }));
  }, []);

  const registerOwner = useCallback(async (name: string, email: string, password: string) => {
    const credential = await createFirebaseOwnerAccount(name, email, password);
    const pendingOwnerRegistration = {
      uid: credential.user.uid,
      name: name.trim(),
      email: credential.user.email || email.trim(),
    };
    setState(s => ({
      ...s,
      isAuthed: true,
      currentUser: userFromFirebase(credential.user, `bp_${credential.user.uid}`, "owner"),
      pendingOwnerRegistration,
      screen: "business_setup",
      screenStack: [],
    }));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendFirebasePasswordReset(email);
  }, []);

  const createOwnerBusinessProfile = useCallback(async (input: {
    businessName: string;
    vesselName: string;
    vesselReg: string;
    companyReg: string;
    gst: string;
    taxRate: string;
  }) => {
    const owner = state.pendingOwnerRegistration;
    if (!owner) {
      throw new Error("Create an owner account before setting up a business profile.");
    }
    const db = getFirebaseFirestore();
    const businessProfileId = `bp_${owner.uid}`;
    const createdAt = new Date().toISOString();
    const businessProfile: BusinessProfile = {
      id: businessProfileId,
      ownerUserId: owner.uid,
      businessName: input.businessName.trim(),
      vesselName: input.vesselName.trim(),
      vesselRegistrationNumber: input.vesselReg.trim(),
      companyName: input.businessName.trim(),
      companyRegistrationNumber: input.companyReg.trim(),
      gstNumber: input.gst.trim(),
      taxRegistrationStatus: input.gst.trim() ? "registered" : "unregistered",
      phone: "",
      email: owner.email,
      address: "",
      logoEmoji: "AC",
      defaultCurrency: "MVR",
      defaultTaxRate: Number(input.taxRate) || 0,
      taxInclusivePricingEnabled: true,
      activeStatus: true,
      createdAt,
    };
    const currentUser: User = {
      id: owner.uid,
      name: owner.name,
      email: owner.email,
      role: "owner",
      businessProfileId,
      avatar: initials(owner.name || owner.email),
      online: true,
    };

    await setDoc(doc(db, "business_profiles", businessProfileId), businessProfile);
    const ownerUser = {
      uid: owner.uid,
      id: owner.uid,
      name: owner.name,
      email: owner.email,
      role: "owner",
      businessProfileId,
      activeStatus: true,
      createdAt,
      avatar: currentUser.avatar,
      online: true,
    };
    const taxSetting: TaxSetting = {
      id: "tx_001",
      businessProfileId,
      taxName: "GST",
      taxRate: businessProfile.defaultTaxRate,
      taxInclusiveEnabled: businessProfile.taxInclusivePricingEnabled,
      activeStatus: true,
    };
    const numberingSeeds: Array<Omit<NumberingSequence, "id" | "businessProfileId">> = [
      { numberType: "trip", prefix: "TRIP", currentSequence: 0, formatTemplate: "TRIP-{YYYY}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "bill", prefix: "BILL", currentSequence: 0, formatTemplate: "BILL-{DEST}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "invoice", prefix: "INV", currentSequence: 0, formatTemplate: "INV-{YYYY}-{MM}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "receipt", prefix: "RCP", currentSequence: 0, formatTemplate: "RCP-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "payment", prefix: "PAY", currentSequence: 0, formatTemplate: "PAY-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "customer", prefix: "CUS", currentSequence: 0, formatTemplate: "CUS-{000000}", padding: 6, lastGenerated: "" },
    ];
    const numberingSequences: NumberingSequence[] = numberingSeeds.map(sequence => ({ ...sequence, id: sequence.numberType, businessProfileId }));
    const catalogCategories = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(category =>
      buildCatalogCategory(businessProfileId, category.code, {}, createdAt)
    );
    const customerPriceLevels = CUSTOMER_PRICE_LEVEL_DEFINITIONS.map(level =>
      buildCustomerPriceLevel(businessProfileId, level.code, {}, createdAt)
    );
    const systemOtherItem = buildSystemOtherCatalogItem(businessProfileId, createdAt);
    const systemOtherRate = buildSystemOtherStandardRate(businessProfileId, createdAt);
    await setDoc(doc(db, "business_users", owner.uid), ownerUser);
    await Promise.all([
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.users, owner.uid), ownerUser),
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.taxSettings, taxSetting.id), taxSetting),
      ...catalogCategories.map(category => setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.catalogCategories, category.id), category)),
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.catalogItems, systemOtherItem.id), systemOtherItem),
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.itemPriceRates, systemOtherRate.id), systemOtherRate),
      ...customerPriceLevels.map(level => setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.priceLevels, level.id), level)),
      ...numberingSequences.map(sequence => setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.numbering, sequence.id), sequence)),
    ]);

    setState(s => ({
      ...s,
      isAuthed: true,
      currentUser,
      businessProfile,
      users: [currentUser],
      catalogCategories,
      catalogItems: [systemOtherItem],
      itemPriceRates: [systemOtherRate],
      taxSettings: [taxSetting],
      numbering: numberingSequences,
      priceLevels: customerPriceLevels,
      pendingOwnerRegistration: null,
      screen: "dashboard",
      screenStack: [],
    }));
  }, [state.pendingOwnerRegistration]);

  const selectBusinessProfile = useCallback((_profileId: string) => {
    setState(s => ({ ...s, screen: "dashboard", screenStack: [] }));
  }, []);

  const signOut = useCallback(async () => {
    await signOutFirebase();
    setState(s => ({ ...s, isAuthed: false, screen: "welcome", screenStack: [], pendingOwnerRegistration: null }));
  }, []);

  const navigate = useCallback((screen: Screen) => {
    setState(s => ({
      ...s,
      screen,
      // Avoid pushing duplicate entries; this prevents screens like Billing from
      // feeling stuck when a tab/drawer item is tapped repeatedly.
      screenStack: screen === s.screen ? s.screenStack : [...s.screenStack, s.screen].slice(-8),
    }));
  }, []);

  const back = useCallback(() => {
    setState(s => {
      const stack = [...s.screenStack];
      let prev = stack.pop();
      while (prev && prev === s.screen) {
        prev = stack.pop();
      }
      return { ...s, screen: prev || "dashboard", screenStack: stack };
    });
  }, []);

  const selectTrip = useCallback((tripId: string) => {
    setState(s => ({ ...s, selectedTripId: tripId }));
  }, []);

  const openTrip = useCallback((tripId: string) => {
    const current = stateRef.current;
    const trip = current.trips.find(t => t.id === tripId);
    if (!trip) return;
    const updatedTrip: Trip = { ...trip, status: "loading", actualDepartureAt: new Date().toISOString() };
    setState(s => {
      return {
        ...s,
        trips: s.trips.map(t => t.id === tripId ? { ...t, status: updatedTrip.status, actualDepartureAt: updatedTrip.actualDepartureAt } : t),
        activeTripId: tripId,
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "trip.open",
          entityType: "trip", entityId: tripId, summary: `Opened trip ${trip.tripNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Trip opened", variant: "success" }],
      };
    });
    persistTenantDoc(tenantCollections.trips, updatedTrip.id, updatedTrip as unknown as Record<string, unknown>);
  }, []);

  const endTrip = useCallback((tripId: string) => {
    const current = stateRef.current;
    const trip = current.trips.find(t => t.id === tripId);
    if (!trip) return;
    const updatedTrip: Trip = { ...trip, status: "ended", endedBy: current.currentUser.id, actualArrivalAt: new Date().toISOString(), endedAt: new Date().toISOString() };
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: updatedTrip.status, endedBy: updatedTrip.endedBy, actualArrivalAt: updatedTrip.actualArrivalAt, endedAt: updatedTrip.endedAt } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.end",
        entityType: "trip", entityId: tripId, summary: `Ended trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip ended", variant: "info" }],
    }));
    persistTenantDoc(tenantCollections.trips, updatedTrip.id, updatedTrip as unknown as Record<string, unknown>);
  }, []);

  const selectBill = useCallback((billId: string) => {
    setState(s => ({ ...s, selectedBillId: billId, screen: "invoice_preview" }));
  }, []);

  const selectCustomer = useCallback((customerId: string) => {
    setState(s => ({ ...s, selectedCustomerId: customerId }));
  }, []);

  const selectDestination = useCallback((destinationId: string) => {
    setState(s => ({ ...s, selectedDestinationId: destinationId }));
  }, []);

  const generateNextNumber = useCallback((type: NumberingSequence["numberType"], destCode?: string): string => {
    const seq = state.numbering.find(n => n.numberType === type);
    return seq ? formatSequenceNumber(seq, seq.currentSequence + 1, destCode) : "";
  }, [state.numbering]);

  const addOperationItems = useCallback((items: AddOperationItemInput[]) => {
    if (items.length === 0) return;
    const current = stateRef.current;
    const first = items[0];
    const { operationType, walkInDetails } = first;
    const shouldIsolateSystemOther = isIsolatedSystemOtherLoading(items);
    const reusableOperation = shouldIsolateSystemOther ? null : current.operations.find(o =>
      o.tripId === first.tripId &&
      o.operationType === operationType &&
      o.destinationId === first.destinationId &&
      o.customerId === first.customerId &&
      !isSystemOtherOnlyOperation(o)
    );
    const operationId = reusableOperation?.id || (
      shouldIsolateSystemOther
        ? isolatedSystemOtherOperationId(first.tripId, operationType, first.destinationId, first.customerId)
        : operationDocumentId(first.tripId, operationType, first.destinationId, first.customerId)
    );
    const existingOp = current.operations.find(o => o.id === operationId);
    const createdAt = new Date().toISOString();
    const newItems: OperationItem[] = items.map(item => {
      const { operationType: _operationType, walkInDetails: _walkInDetails, ...operationItem } = item;
      const taxAmount = (operationItem.unitPriceTaxInclusive * operationItem.quantity) - (operationItem.unitPriceTaxInclusive * operationItem.quantity) / (1 + operationItem.taxRate / 100);
      const lineTotal = operationItem.unitPriceTaxInclusive * operationItem.quantity;
      return {
        ...operationItem,
        id: id("oi"),
        operationId,
        businessProfileId: current.businessProfile.id,
        createdBy: current.currentUser.id,
        createdAt,
        taxAmount: Number(taxAmount.toFixed(2)),
        lineTotalTaxInclusive: Number(lineTotal.toFixed(2)),
      };
    });
    const mergedLocalItems = [...newItems, ...(existingOp?.items || [])];
    const operationToPersist: Operation = existingOp ? {
      ...existingOp,
      walkInDetails: walkInDetails ?? existingOp.walkInDetails,
      items: mergedLocalItems,
      totalTaxInclusive: Number(mergedLocalItems.reduce((sum, opItem) => sum + opItem.lineTotalTaxInclusive, 0).toFixed(2)),
      totalTax: Number(mergedLocalItems.reduce((sum, opItem) => sum + opItem.taxAmount, 0).toFixed(2)),
    } : {
      id: operationId,
      businessProfileId: current.businessProfile.id,
      tripId: first.tripId,
      operationType,
      destinationId: first.destinationId,
      customerId: first.customerId,
      walkInDetails,
      items: newItems,
      totalTaxInclusive: Number(newItems.reduce((sum, opItem) => sum + opItem.lineTotalTaxInclusive, 0).toFixed(2)),
      totalTax: Number(newItems.reduce((sum, opItem) => sum + opItem.taxAmount, 0).toFixed(2)),
      createdBy: current.currentUser.id,
      createdAt,
      synced: current.isOnline,
    };
    setState(s => existingOp ? {
      ...s,
      operations: s.operations.map(o => o.id === existingOp.id ? operationToPersist : o),
    } : {
      ...s,
      operations: [operationToPersist, ...s.operations],
    });
    const db = getFirebaseFirestore();
    const opRef = doc(db, "business_profiles", current.businessProfile.id, tenantCollections.operations, operationToPersist.id);
    void runTransaction(db, async transaction => {
      const snapshot = await transaction.get(opRef);
      const remoteOperation = snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Operation) : null;
      const remoteItems = remoteOperation?.items || [];
      const mergedItems = [...newItems, ...remoteItems];
      const operationToWrite: Operation = remoteOperation ? {
        ...remoteOperation,
        walkInDetails: walkInDetails ?? remoteOperation.walkInDetails,
        items: mergedItems,
        totalTaxInclusive: Number(mergedItems.reduce((sum, opItem) => sum + opItem.lineTotalTaxInclusive, 0).toFixed(2)),
        totalTax: Number(mergedItems.reduce((sum, opItem) => sum + opItem.taxAmount, 0).toFixed(2)),
      } : operationToPersist;
      transaction.set(opRef, stripUndefined(operationToWrite) as Record<string, unknown>);
    }).catch(error => {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Items not saved", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
      }));
    });
  }, []);

  const addOperationItem = useCallback((item: AddOperationItemInput) => {
    addOperationItems([item]);
  }, [addOperationItems]);

  const removeOperationItem = useCallback((itemId: string) => {
    const current = stateRef.current;
    const operation = current.operations.find(o => o.items.some(i => i.id === itemId));
    if (!operation) return;
    const items = operation.items.filter(i => i.id !== itemId);
    const updatedOperation: Operation = {
      ...operation,
      items,
      totalTaxInclusive: Number(items.reduce((sum, i) => sum + i.lineTotalTaxInclusive, 0).toFixed(2)),
      totalTax: Number(items.reduce((sum, i) => sum + i.taxAmount, 0).toFixed(2)),
    };
    setState(s => ({
      ...s,
      operations: s.operations.map(o => o.id === operation.id ? updatedOperation : o).filter(o => o.items.length > 0),
    }));
    if (updatedOperation.items.length === 0) {
      const db = getFirebaseFirestore();
      const opRef = doc(db, "business_profiles", updatedOperation.businessProfileId, tenantCollections.operations, updatedOperation.id);
      void runTransaction(db, async transaction => {
        const snapshot = await transaction.get(opRef);
        if (!snapshot.exists()) return;
        const remoteOperation = { id: snapshot.id, ...snapshot.data() } as Operation;
        const remoteItems = remoteOperation.items.filter(i => i.id !== itemId);
        if (remoteItems.length === 0) {
          transaction.delete(opRef);
          return;
        }
        transaction.set(opRef, stripUndefined({
          ...remoteOperation,
          items: remoteItems,
          totalTaxInclusive: Number(remoteItems.reduce((sum, i) => sum + i.lineTotalTaxInclusive, 0).toFixed(2)),
          totalTax: Number(remoteItems.reduce((sum, i) => sum + i.taxAmount, 0).toFixed(2)),
        }) as Record<string, unknown>);
      }).catch(error => {
        setState(s => ({
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "Item not removed", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
        }));
      });
    } else {
      const db = getFirebaseFirestore();
      const opRef = doc(db, "business_profiles", updatedOperation.businessProfileId, tenantCollections.operations, updatedOperation.id);
      void runTransaction(db, async transaction => {
        const snapshot = await transaction.get(opRef);
        if (!snapshot.exists()) return;
        const remoteOperation = { id: snapshot.id, ...snapshot.data() } as Operation;
        const remoteItems = remoteOperation.items.filter(i => i.id !== itemId);
        if (remoteItems.length === 0) {
          transaction.delete(opRef);
          return;
        }
        transaction.set(opRef, stripUndefined({
          ...remoteOperation,
          items: remoteItems,
          totalTaxInclusive: Number(remoteItems.reduce((sum, i) => sum + i.lineTotalTaxInclusive, 0).toFixed(2)),
          totalTax: Number(remoteItems.reduce((sum, i) => sum + i.taxAmount, 0).toFixed(2)),
        }) as Record<string, unknown>);
      }).catch(error => {
        setState(s => ({
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "Item not removed", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
        }));
      });
    }
  }, []);

  const finalizeBill = useCallback((billId: string) => {
    const current = stateRef.current;
    const bill = current.bills.find(b => b.id === billId);
    if (!bill) return;
    const updatedBill: Bill = {
      ...bill,
      billStatus: "finalized",
      paymentStatus: bill.paidAmount >= bill.grandTotal ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
      finalizedBy: current.currentUser.id,
      finalizedAt: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      bills: s.bills.map(b => b.id === billId ? { ...b, ...updatedBill } : b),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "billing.finalize",
        entityType: "bill", entityId: billId,
        summary: `Finalized bill ${s.bills.find(b => b.id === billId)?.billNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Bill finalized", body: "Ready to collect.", variant: "success" }],
    }));
    persistTenantDoc(tenantCollections.bills, updatedBill.id, updatedBill as unknown as Record<string, unknown>);
  }, []);

  const postPayment = useCallback(async (billId: string, amount: number, method: Payment["method"], reference?: string, notes?: string) => {
    const businessProfileId = state.businessProfile.id;
    const localSeq = state.numbering.find(n => n.numberType === "receipt");
    if (!businessProfileId || !localSeq) return false;
    const localBill = state.bills.find(bill => bill.id === billId);
    const localValidation = validatePaymentRequest(localBill, amount);
    if (!localValidation.ok) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Payment not posted", body: localValidation.reason, variant: "error" as const }],
      }));
      return false;
    }

    try {
      const db = getFirebaseFirestore();
      const remoteMaxSequence = await getMaxSequenceFromFirestore(businessProfileId, tenantCollections.payments, "paymentNumber");
      const localMaxSequence = state.payments.reduce((max, payment) => Math.max(max, sequenceFromNumber(payment.paymentNumber)), 0);
      const paymentId = id("pm");
      const billRef = doc(db, "business_profiles", businessProfileId, tenantCollections.bills, billId);
      const paymentRef = doc(db, "business_profiles", businessProfileId, tenantCollections.payments, paymentId);
      const seqRef = doc(db, "business_profiles", businessProfileId, tenantCollections.numbering, "receipt");

      const result = await runTransaction(db, async transaction => {
        const [seqSnapshot, billSnapshot] = await Promise.all([
          transaction.get(seqRef),
          transaction.get(billRef),
        ]);
        if (!billSnapshot.exists()) {
          throw new Error("Bill not found.");
        }

        const bill = { id: billSnapshot.id, ...billSnapshot.data() } as Bill;
        const paymentValidation = validatePaymentRequest(bill, amount);
        if (!paymentValidation.ok) {
          throw new Error(paymentValidation.reason);
        }
        const sequenceData = seqSnapshot.exists()
          ? ({ ...localSeq, ...seqSnapshot.data() } as NumberingSequence)
          : localSeq;
        const nextSequence = Math.max(
          Number(sequenceData.currentSequence || 0),
          remoteMaxSequence,
          localMaxSequence
        ) + 1;
        const receiptNum = formatSequenceNumber(sequenceData, nextSequence);
        const updatedBill: Bill = {
          ...bill,
          paidAmount: paymentValidation.nextPaidAmount,
          paymentStatus: paymentValidation.nextPaymentStatus,
          billStatus: paymentValidation.nextBillStatus,
        };
        const newPayment: Payment = {
          id: paymentId,
          businessProfileId,
          billId,
          paymentNumber: receiptNum,
          amount,
          method,
          reference,
          notes,
          collectedBy: state.currentUser.id,
          collectedAt: new Date().toISOString(),
        };
        const updatedSequence: NumberingSequence & { id: string; businessProfileId: string } = {
          ...sequenceData,
          id: "receipt",
          businessProfileId,
          numberType: "receipt",
          currentSequence: nextSequence,
          lastGenerated: receiptNum,
        };

        transaction.set(paymentRef, stripUndefined(newPayment) as Record<string, unknown>);
        transaction.set(billRef, stripUndefined(updatedBill) as Record<string, unknown>);
        transaction.set(seqRef, stripUndefined(updatedSequence) as Record<string, unknown>);
        return { payment: newPayment, bill: updatedBill, sequence: updatedSequence };
      });

      setState(s => ({
        ...s,
        payments: [result.payment, ...s.payments.filter(payment => payment.id !== result.payment.id)],
        bills: s.bills.map(b => b.id === billId ? result.bill : b),
        numbering: s.numbering.map(n => n.numberType === "receipt" ? { ...n, ...result.sequence } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "payment.post",
          entityType: "payment",
          entityId: result.payment.id,
          summary: `Posted MVR ${amount.toFixed(2)} payment - ${result.payment.paymentNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment posted", body: MVR(amount), variant: "success" }],
      }));
      return true;
    } catch (error) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Payment not posted", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
      }));
      return false;
    }
  }, [state.businessProfile.id, state.currentUser.id, state.numbering, state.payments]);

  const updateDraftBill = useCallback((billId: string, items: OperationItem[], reason: string) => {
    const bill = state.bills.find(b => b.id === billId);
    if (!bill) return;
    if (bill.billStatus !== "draft") {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Bill locked", body: bill.billNumber, variant: "warning" as const }],
      }));
      return;
    }
    const validItems = items.filter(item => item.quantity > 0 && item.unitPriceTaxInclusive > 0);
    if (validItems.length === 0) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "No items", body: "Cancel instead.", variant: "error" as const }],
      }));
      return;
    }
    const recalculatedItems = validItems.map(item => {
      const lineTotal = Number((item.quantity * item.unitPriceTaxInclusive).toFixed(2));
      const taxAmount = Number((lineTotal - lineTotal / (1 + item.taxRate / 100)).toFixed(2));
      return {
        ...item,
        lineTotalTaxInclusive: lineTotal,
        taxAmount,
      };
    });
    const grandTotal = Number(recalculatedItems.reduce((sum, item) => sum + item.lineTotalTaxInclusive, 0).toFixed(2));
    const taxTotal = Number(recalculatedItems.reduce((sum, item) => sum + item.taxAmount, 0).toFixed(2));
    const updatedBill: Bill = {
      ...bill,
      items: recalculatedItems,
      itemCount: recalculatedItems.length,
      subtotalTaxInclusive: grandTotal,
      taxTotal,
      grandTotal,
      paymentStatus: bill.paidAmount >= grandTotal ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
    };
    setState(s => ({
      ...s,
      bills: s.bills.map(b => b.id === billId ? updatedBill : b),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "billing.update_draft",
        entityType: "bill",
        entityId: billId,
        summary: `Updated draft bill ${bill.billNumber}. Reason: ${reason || "Draft correction"}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Bill updated", body: bill.billNumber, variant: "success" as const }],
    }));
    persistTenantDoc(tenantCollections.bills, updatedBill.id, updatedBill as unknown as Record<string, unknown>);
  }, [state.bills]);

  const createTrip = useCallback(async (originDestinationId: string, returnDestinationId: string, plannedArrivalAt: string, notes: string): Promise<Trip | null> => {
    const existingTrip = state.trips.find(isUnfinishedTrip) || pendingTripRef.current;
    if (existingTrip) {
      setState(s => ({
        ...s,
        selectedTripId: existingTrip.id,
        toasts: [...s.toasts, { id: id("t"), title: "Trip already open", body: existingTrip.tripNumber, variant: "warning" }],
      }));
      return null;
    }

    const businessProfileId = state.businessProfile.id;
    const localSeq = state.numbering.find(n => n.numberType === "trip");
    if (!businessProfileId || !localSeq) return null;

    try {
      const db = getFirebaseFirestore();
      const remoteTrips = await loadTenantCollection<Trip>(tenantCollections.trips, businessProfileId);
      const remoteUnfinishedTrip = remoteTrips.find(isUnfinishedTrip);
      if (remoteUnfinishedTrip) {
        setState(s => ({
          ...s,
          selectedTripId: remoteUnfinishedTrip.id,
          toasts: [...s.toasts, { id: id("t"), title: "Trip already open", body: remoteUnfinishedTrip.tripNumber, variant: "warning" as const }],
        }));
        return null;
      }

      const remoteMaxSequence = remoteTrips.reduce((max, trip) => Math.max(max, sequenceFromNumber(trip.tripNumber)), 0);
      const localMaxSequence = state.trips.reduce((max, trip) => Math.max(max, sequenceFromNumber(trip.tripNumber)), 0);
      const tripId = id("t");
      const tripRef = doc(db, "business_profiles", businessProfileId, tenantCollections.trips, tripId);
      const seqRef = doc(db, "business_profiles", businessProfileId, tenantCollections.numbering, "trip");
      const activeTripRef = doc(db, "business_profiles", businessProfileId, "runtime_locks", "active_trip");

      const result = await runTransaction(db, async transaction => {
        const [seqSnapshot, activeTripSnapshot] = await Promise.all([
          transaction.get(seqRef),
          transaction.get(activeTripRef),
        ]);
        if (activeTripSnapshot.exists()) {
          const activeTripId = String(activeTripSnapshot.data().tripId || "");
          if (activeTripId) {
            const activeTripDoc = await transaction.get(doc(db, "business_profiles", businessProfileId, tenantCollections.trips, activeTripId));
            if (activeTripDoc.exists()) {
              const activeTrip = { id: activeTripDoc.id, ...activeTripDoc.data() } as Trip;
              if (isUnfinishedTrip(activeTrip)) {
                throw new Error(`Trip already open: ${activeTrip.tripNumber}`);
              }
            }
          }
        }

        const sequenceData = seqSnapshot.exists()
          ? ({ ...localSeq, ...seqSnapshot.data() } as NumberingSequence)
          : localSeq;
        const nextSequence = Math.max(
          Number(sequenceData.currentSequence || 0),
          remoteMaxSequence,
          localMaxSequence
        ) + 1;
        const tripNumber = formatSequenceNumber(sequenceData, nextSequence);
        const newTrip: Trip = {
          id: tripId,
          businessProfileId,
          tripNumber,
          vesselName: state.businessProfile.vesselName,
          originDestinationId,
          returnDestinationId,
          plannedDepartureAt: new Date().toISOString(),
          plannedArrivalAt,
          status: "draft",
          openedBy: state.currentUser.id,
          notes,
          createdAt: new Date().toISOString(),
        };
        const updatedSequence: NumberingSequence & { id: string; businessProfileId: string } = {
          ...sequenceData,
          id: "trip",
          businessProfileId,
          numberType: "trip",
          currentSequence: nextSequence,
          lastGenerated: tripNumber,
        };

        transaction.set(tripRef, stripUndefined(newTrip) as Record<string, unknown>);
        transaction.set(seqRef, stripUndefined(updatedSequence) as Record<string, unknown>);
        transaction.set(activeTripRef, {
          businessProfileId,
          tripId,
          tripNumber,
          status: newTrip.status,
          updatedAt: new Date().toISOString(),
        });
        return { trip: newTrip, sequence: updatedSequence };
      });

      pendingTripRef.current = result.trip;
      setState(s => ({
        ...s,
        trips: [result.trip, ...s.trips.filter(trip => trip.id !== result.trip.id)],
        numbering: s.numbering.map(n => n.numberType === "trip" ? { ...n, ...result.sequence } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "trip.create",
          entityType: "trip",
          entityId: result.trip.id,
          summary: `Created draft trip ${result.trip.tripNumber}`,
        }),
      }));
      return result.trip;
    } catch (error) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Trip not created", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
      }));
      return null;
    }
  }, [state.trips, state.numbering, state.businessProfile.id, state.businessProfile.vesselName, state.currentUser.id]);

  const addDestination = useCallback((islandName: string, atoll: string, code: string): Destination => {
    const createdAt = new Date().toISOString();
    const newDest: Destination = {
      id: id("d"),
      businessProfileId: state.businessProfile.id,
      islandName, atoll, destinationCode: code.toUpperCase(),
      activeStatus: true, sortOrder: state.destinations.length + 1,
    };
    const walkInCustomer = buildDestinationWalkInCustomer(state.businessProfile.id, newDest, createdAt);
    setState(s => ({
      ...s,
      destinations: [...s.destinations, newDest],
      customers: [...s.customers, walkInCustomer],
    }));
    persistTenantDoc(tenantCollections.destinations, newDest.id, newDest as unknown as Record<string, unknown>);
    persistTenantDoc(tenantCollections.customers, walkInCustomer.id, walkInCustomer as unknown as Record<string, unknown>);
    return newDest;
  }, [state.businessProfile, state.destinations.length]);

  const addCustomer = useCallback((customer: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">): Customer => {
    const newCustomer: Customer = {
      ...customer,
      id: id("c"),
      businessProfileId: state.businessProfile.id,
      outstandingBalance: 0,
      activeStatus: true,
      createdAt: new Date().toISOString(),
    };
    setState(s => ({ ...s, customers: [...s.customers, newCustomer] }));
    persistTenantDoc(tenantCollections.customers, newCustomer.id, newCustomer as unknown as Record<string, unknown>);
    return newCustomer;
  }, [state.businessProfile]);

  const syncCatalogCategories = useCallback(async () => {
    const current = stateRef.current;
    if (!current.businessProfile.id) return;
    const now = new Date().toISOString();
    const existingByCode = new Map(current.catalogCategories.map(category => [category.code, category]));
    const nextCategories = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(definition => {
      const existing = existingByCode.get(definition.code);
      return buildCatalogCategory(current.businessProfile.id, definition.code, existing || {}, now);
    });

    await Promise.all(nextCategories.map(category =>
      persistTenantDocAsync(tenantCollections.catalogCategories, category.id, toFirestoreCatalogCategory(category) as unknown as Record<string, unknown>)
    ));

    setState(s => ({
      ...s,
      catalogCategories: nextCategories.sort((a, b) => a.sortOrder - b.sortOrder),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "catalog_category.sync",
        entityType: "catalog_category",
        entityId: "catalog_categories",
        summary: "Synced catalog category master records",
      }),
      toasts: appendToast(s.toasts, { id: id("t"), title: "Catalog categories synced", variant: "success" as const }),
    }));
  }, []);

  const saveCatalogCategory = useCallback(async (category: CatalogCategory) => {
    const current = stateRef.current;
    if (!current.businessProfile.id) return;
    const now = new Date().toISOString();
    const trimmedName = category.name.trim();
    if (!trimmedName) {
      throw new Error("Category name is required.");
    }
    const existing = current.catalogCategories.find(item => item.id === category.id || item.code === category.code);
    const code = existing?.code || makeUniqueCatalogCategoryCode(
      trimmedName,
      current.catalogCategories.map(item => item.code)
    );
    const savedCategory: CatalogCategory = {
      id: code,
      businessProfileId: current.businessProfile.id,
      code,
      name: trimmedName,
      icon: category.icon.trim() || "📦",
      activeStatus: category.activeStatus,
      sortOrder: existing?.sortOrder ?? category.sortOrder ?? current.catalogCategories.length + 1,
      createdAt: existing?.createdAt || category.createdAt || now,
      updatedAt: now,
    };
    await persistTenantDocAsync(
      tenantCollections.catalogCategories,
      savedCategory.id,
      toFirestoreCatalogCategory(savedCategory) as unknown as Record<string, unknown>
    );

    setState(s => ({
      ...s,
      catalogCategories: [
        ...s.catalogCategories.filter(item => item.code !== savedCategory.code),
        savedCategory,
      ].sort((a, b) => a.sortOrder - b.sortOrder),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "catalog_category.update",
        entityType: "catalog_category",
        entityId: savedCategory.id,
        summary: `Updated catalog category ${savedCategory.name}`,
      }),
      toasts: appendToast(s.toasts, { id: id("t"), title: "Category saved", variant: "success" as const }),
    }));
  }, []);

  const addCatalogItem = useCallback((item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number): CatalogItem => {
    const newItem: CatalogItem = {
      ...item,
      id: id("i"),
      businessProfileId: state.businessProfile.id,
      activeStatus: true,
    };
    const newRate: ItemPriceRate = {
      id: id("p"),
      businessProfileId: state.businessProfile.id,
      itemId: newItem.id,
      priceLevel: "standard",
      priceTaxInclusive: standardPrice,
    };
    setState(s => ({
      ...s,
      catalogItems: [...s.catalogItems, newItem],
      itemPriceRates: [...s.itemPriceRates, newRate],
    }));
    persistTenantDoc(tenantCollections.catalogItems, newItem.id, newItem as unknown as Record<string, unknown>);
    persistTenantDoc(tenantCollections.itemPriceRates, newRate.id, newRate as unknown as Record<string, unknown>);
    return newItem;
  }, [state.businessProfile]);

  const syncCustomerPriceLevels = useCallback(async () => {
    const current = stateRef.current;
    if (!current.businessProfile.id) return;
    const now = new Date().toISOString();
    const existingByCode = new Map(current.priceLevels.map(level => [level.code, level]));
    const nextLevels = CUSTOMER_PRICE_LEVEL_DEFINITIONS.map(definition => {
      const existing = existingByCode.get(definition.code);
      return buildCustomerPriceLevel(current.businessProfile.id, definition.code, existing || {}, now);
    });

    await Promise.all(nextLevels.map(level =>
      persistTenantDocAsync(tenantCollections.priceLevels, level.id, level as unknown as Record<string, unknown>)
    ));

    setState(s => ({
      ...s,
      priceLevels: nextLevels.sort((a, b) => a.sortOrder - b.sortOrder),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "price_level.sync",
        entityType: "price_level",
        entityId: "customer_price_levels",
        summary: "Synced customer price level master records",
      }),
      toasts: appendToast(s.toasts, { id: id("t"), title: "Price levels synced", variant: "success" as const }),
    }));
  }, []);

  const saveCustomerPriceLevel = useCallback(async (priceLevel: CustomerPriceLevel) => {
    const current = stateRef.current;
    if (!current.businessProfile.id) return;
    const definition = CUSTOMER_PRICE_LEVEL_DEFINITIONS.find(level => level.code === priceLevel.code);
    if (!definition) return;
    const existing = current.priceLevels.find(level => level.code === priceLevel.code);
    const now = new Date().toISOString();
    const savedLevel: CustomerPriceLevel = {
      ...definition,
      ...existing,
      ...priceLevel,
      id: definition.id,
      businessProfileId: current.businessProfile.id,
      code: definition.code,
      name: priceLevel.name.trim() || definition.name,
      description: priceLevel.description.trim() || definition.description,
      adjustmentType: priceLevel.adjustmentType,
      adjustmentValue: Number(priceLevel.adjustmentValue.toFixed(2)),
      sortOrder: definition.sortOrder,
      createdAt: existing?.createdAt || priceLevel.createdAt || now,
      updatedAt: now,
    };
    await persistTenantDocAsync(tenantCollections.priceLevels, savedLevel.id, toFirestoreCustomerPriceLevel(savedLevel) as unknown as Record<string, unknown>);

    setState(s => ({
      ...s,
      priceLevels: [
        ...s.priceLevels.filter(level => level.code !== savedLevel.code),
        savedLevel,
      ].sort((a, b) => a.sortOrder - b.sortOrder),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "price_level.update",
        entityType: "price_level",
        entityId: savedLevel.id,
        summary: `Updated ${savedLevel.name} price level`,
      }),
      toasts: appendToast(s.toasts, { id: id("t"), title: "Price level saved", variant: "success" as const }),
    }));
  }, []);

  const toast = useCallback((t: Omit<ToastMessage, "id">) => {
    const newToast = { ...t, id: id("t") };
    setState(s => ({ ...s, toasts: appendToast(s.toasts, newToast) }));
    setTimeout(() => {
      setState(s => ({ ...s, toasts: s.toasts.filter(x => x.id !== newToast.id) }));
    }, toastTimeoutMs);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== toastId) }));
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    const current = stateRef.current;
    const updatedNotification = current.notifications.find(n => n.id === notifId);
    if (!updatedNotification) return;
    const readBy = Array.from(new Set([...(updatedNotification.readBy || []), current.currentUser.id]));
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => n.id === notifId ? { ...n, readBy } : n),
    }));
    const db = getFirebaseFirestore();
    const notificationRef = doc(db, "business_profiles", current.businessProfile.id, tenantCollections.notifications, notifId);
    void updateDoc(notificationRef, { readBy: arrayUnion(current.currentUser.id) }).catch(error => {
      console.error(`Failed to mark notification ${notifId} read`, error);
    });
  }, []);

  const createBillFromOperation = useCallback(async (operationId: string, billType: Bill["billType"]): Promise<Bill | null> => {
    const op = state.operations.find(o => o.id === operationId);
    if (!op) return null;
    if (op.items.length === 0) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "No items", body: "Add cargo first.", variant: "error" as const }],
      }));
      return null;
    }
    if (op.operationType !== "loading") {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Loading only", body: "Bills can only be generated from the loading tab.", variant: "warning" as const }],
      }));
      return null;
    }
    const shouldCreateSeparateSystemOtherBill = op.operationType === "loading" &&
      op.items.length === 1 &&
      op.items[0].itemId === SYSTEM_OTHER_ITEM_ID;
    const existingBill = shouldCreateSeparateSystemOtherBill ? undefined : state.bills.find(b =>
      b.tripId === op.tripId &&
      b.destinationId === op.destinationId &&
      b.customerId === op.customerId &&
      b.billStatus !== "cancelled"
    );
    if (existingBill) {
      if (!isBillEditableBeforeFinalize(existingBill)) {
        setState(s => ({
          ...s,
          selectedBillId: existingBill.id,
          toasts: [...s.toasts, { id: id("t"), title: "Bill locked", body: existingBill.billNumber, variant: "warning" as const }],
        }));
        return null;
      }
      try {
        const db = getFirebaseFirestore();
        const billRef = doc(db, "business_profiles", state.businessProfile.id, tenantCollections.bills, existingBill.id);
        const opRef = doc(db, "business_profiles", state.businessProfile.id, tenantCollections.operations, op.id);
        const updatedBill = await runTransaction(db, async transaction => {
          const [billSnapshot, opSnapshot] = await Promise.all([
            transaction.get(billRef),
            transaction.get(opRef),
          ]);
          if (!billSnapshot.exists()) {
            throw new Error("Bill not found.");
          }
          if (!opSnapshot.exists()) {
            throw new Error("Operation already billed.");
          }

          const remoteBill = { id: billSnapshot.id, ...billSnapshot.data() } as Bill;
          if (!isBillEditableBeforeFinalize(remoteBill)) {
            throw new Error(`Bill locked: ${remoteBill.billNumber}`);
          }

          const remoteOperation = { id: opSnapshot.id, ...opSnapshot.data() } as Operation;
          const isOffloadReconciliation = remoteOperation.operationType === "offloading";
          const mergedItems = isOffloadReconciliation
            ? (remoteBill.items || [])
            : mergeOperationItems(remoteOperation.items, remoteBill.items || []);
          const mergedOffloadedItems = isOffloadReconciliation
            ? mergeOperationItems(remoteOperation.items, remoteBill.offloadedItems || [])
            : (remoteBill.offloadedItems || []);
          const billToWrite: Bill = {
            ...remoteBill,
            billStatus: "draft",
            walkInDetails: remoteOperation.walkInDetails ?? remoteBill.walkInDetails,
            items: mergedItems,
            offloadedItems: mergedOffloadedItems,
            itemCount: mergedItems.length,
            subtotalTaxInclusive: isOffloadReconciliation
              ? remoteBill.subtotalTaxInclusive
              : Number((Number(remoteBill.subtotalTaxInclusive || 0) + remoteOperation.totalTaxInclusive).toFixed(2)),
            taxTotal: isOffloadReconciliation
              ? remoteBill.taxTotal
              : Number((Number(remoteBill.taxTotal || 0) + remoteOperation.totalTax).toFixed(2)),
            grandTotal: isOffloadReconciliation
              ? remoteBill.grandTotal
              : Number((Number(remoteBill.grandTotal || 0) + remoteOperation.totalTaxInclusive).toFixed(2)),
            updatedAt: new Date().toISOString(),
          };

          transaction.set(billRef, stripUndefined(billToWrite) as Record<string, unknown>, { merge: true });
          transaction.delete(opRef);
          return billToWrite;
        });

        setState(s => ({
          ...s,
          selectedBillId: existingBill.id,
          operations: s.operations.filter(operation => operation.id !== op.id),
          bills: s.bills.map(b => b.id === existingBill.id ? updatedBill : b),
          auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
            actorUserId: s.currentUser.id,
            action: "billing.generate",
            entityType: "bill",
            entityId: existingBill.id,
            summary: `Generated bill ${updatedBill.billNumber}`,
          }),
          toasts: [...s.toasts, { id: id("t"), title: "Bill generated", body: updatedBill.billNumber, variant: "success" as const }],
        }));
        return updatedBill;
      } catch (error) {
        setState(s => ({
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "Bill not generated", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
        }));
        return null;
      }
    }

    const businessProfileId = state.businessProfile.id;
    const dest = state.destinations.find(d => d.id === op.destinationId);
    const localSeq = state.numbering.find(n => n.numberType === "bill");
    if (!businessProfileId || !localSeq) return null;

    try {
      const db = getFirebaseFirestore();
      const remoteMaxSequence = await getMaxSequenceFromFirestore(businessProfileId, tenantCollections.bills, "billNumber");
      const localMaxSequence = state.bills.reduce((max, bill) => Math.max(max, sequenceFromNumber(bill.billNumber)), 0);
      const billId = id("b");
      const billRef = doc(db, "business_profiles", businessProfileId, tenantCollections.bills, billId);
      const opRef = doc(db, "business_profiles", businessProfileId, tenantCollections.operations, op.id);
      const seqRef = doc(db, "business_profiles", businessProfileId, tenantCollections.numbering, "bill");

      const result = await runTransaction(db, async transaction => {
        const [seqSnapshot, opSnapshot] = await Promise.all([
          transaction.get(seqRef),
          transaction.get(opRef),
        ]);
        if (!opSnapshot.exists()) {
          throw new Error("Operation already billed.");
        }
        const sequenceData = seqSnapshot.exists()
          ? ({ ...localSeq, ...seqSnapshot.data() } as NumberingSequence)
          : localSeq;
        const nextSequence = Math.max(
          Number(sequenceData.currentSequence || 0),
          remoteMaxSequence,
          localMaxSequence
        ) + 1;
        const billNumber = formatSequenceNumber(sequenceData, nextSequence, dest?.destinationCode);
        const newBill: Bill = {
          id: billId,
          businessProfileId,
          tripId: op.tripId,
          destinationId: op.destinationId,
          customerId: op.customerId,
          walkInDetails: op.walkInDetails,
          billNumber,
          billType,
          billStatus: "draft",
          subtotalTaxInclusive: op.totalTaxInclusive,
          taxTotal: op.totalTax,
          grandTotal: op.totalTaxInclusive,
          paymentStatus: "unpaid",
          paidAmount: 0,
          createdBy: state.currentUser.id,
          createdAt: new Date().toISOString(),
          itemCount: op.items.length,
          items: op.items,
        };
        const updatedSequence: NumberingSequence & { id: string; businessProfileId: string } = {
          ...sequenceData,
          id: "bill",
          businessProfileId,
          numberType: "bill",
          currentSequence: nextSequence,
          lastGenerated: billNumber,
        };
        transaction.set(billRef, stripUndefined(newBill) as Record<string, unknown>);
        transaction.set(seqRef, stripUndefined(updatedSequence) as Record<string, unknown>);
        transaction.delete(opRef);
        return { bill: newBill, sequence: updatedSequence };
      });

      setState(s => ({
        ...s,
        operations: s.operations.filter(operation => operation.id !== op.id),
        bills: [result.bill, ...s.bills.filter(bill => bill.id !== result.bill.id)],
        numbering: s.numbering.map(n => n.numberType === "bill" ? { ...n, ...result.sequence } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "billing.create",
          entityType: "bill",
          entityId: result.bill.id,
          summary: `Created ${billType.replace("_", " ")} bill ${result.bill.billNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill created", body: result.bill.billNumber, variant: "success" as const }],
      }));
      return result.bill;
    } catch (error) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Bill not created", body: error instanceof Error ? error.message : "Try again.", variant: "error" as const }],
      }));
      return null;
    }
  }, [state.bills, state.businessProfile.id, state.currentUser.id, state.destinations, state.numbering, state.operations]);

  const closeTrip = useCallback((tripId: string) => {
    const current = stateRef.current;
    const trip = current.trips.find(t => t.id === tripId);
    if (!trip) return;
    const updatedTrip: Trip = { ...trip, status: "closed", closedBy: current.currentUser.id, closedAt: new Date().toISOString() };
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: updatedTrip.status, closedBy: updatedTrip.closedBy, closedAt: updatedTrip.closedAt } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "trip.close",
        entityType: "trip",
        entityId: tripId,
        summary: `Closed and archived trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip closed", variant: "info" as const }],
    }));
    persistTenantDoc(tenantCollections.trips, updatedTrip.id, updatedTrip as unknown as Record<string, unknown>);
  }, []);

  const toggleOnline = useCallback(() => {
    setState(s => ({
      ...s,
      isOnline: !s.isOnline,
      toasts: [...s.toasts, {
        id: id("t"),
        title: !s.isOnline ? "Back online" : "Offline mode",
        body: !s.isOnline ? "Syncing now." : "Drafts will queue.",
        variant: !s.isOnline ? "success" as const : "warning" as const,
      }],
    }));
  }, []);

  const updateBusinessProfile = useCallback((updates: Partial<BusinessProfile>) => {
    const current = stateRef.current;
    const updatedProfile: BusinessProfile = { ...current.businessProfile, ...updates };
    setState(s => {
      return {
        ...s,
        businessProfile: { ...s.businessProfile, ...updates },
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "settings.update",
          entityType: "business_profile",
          entityId: updatedProfile.id,
          summary: `Updated business settings for ${updatedProfile.businessName}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Profile saved", variant: "success" as const }],
      };
    });
    persistTenantDoc("business_profiles", updatedProfile.id, updatedProfile as unknown as Record<string, unknown>);
  }, []);

  const inviteUser = useCallback((newUser: Omit<User, "id" | "businessProfileId" | "online">): User => {
    const current = stateRef.current;
    const created: User = {
      ...newUser,
      id: id("u"),
      businessProfileId: current.businessProfile.id,
      online: false,
    };
    setState(s => {
      return {
        ...s,
        users: [...s.users, created],
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "users.invite",
          entityType: "user",
          entityId: created.id,
          summary: `Invited ${created.name} as ${created.role.replace("_", " ")}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Invite sent", variant: "success" as const }],
      };
    });
    persistTenantDoc(tenantCollections.users, created.id, {
      ...created,
      uid: created.id,
      activeStatus: true,
    } as unknown as Record<string, unknown>);
    return created;
  }, []);

  const updateTripStatus = useCallback((tripId: string, status: Trip["status"]) => {
    const current = stateRef.current;
    const trip = current.trips.find(t => t.id === tripId);
    if (!trip) return;
    const updatedTrip: Trip = { ...trip, status };
    setState(s => {
      return {
        ...s,
        trips: s.trips.map(t => t.id === tripId ? { ...t, status } : t),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "trip.update_status",
          entityType: "trip",
          entityId: tripId,
          summary: `Changed trip ${trip.tripNumber} status to ${status}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Trip updated", body: status, variant: "info" as const }],
      };
    });
    persistTenantDoc(tenantCollections.trips, updatedTrip.id, updatedTrip as unknown as Record<string, unknown>);
  }, []);

  const alterBillAfterTripEnd = useCallback((billId: string, newTotal: number, reason: string) => {
    const current = stateRef.current;
    const bill = current.bills.find(b => b.id === billId);
    if (!bill) return;
    const trip = current.trips.find(t => t.id === bill.tripId);
    if (!["owner", "admin"].includes(current.currentUser.role)) {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Not allowed", body: "Owner or Admin only.", variant: "error" as const }],
      }));
      return;
    }
    const oldTotal = bill.grandTotal;
    const taxTotal = Number((newTotal - newTotal / (1 + current.businessProfile.defaultTaxRate / 100)).toFixed(2));
    const updatedBill: Bill = {
      ...bill,
      grandTotal: newTotal,
      subtotalTaxInclusive: newTotal,
      taxTotal,
      billStatus: "adjusted",
      paymentStatus: bill.paidAmount >= newTotal ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
    };
    setState(s => {
      return {
        ...s,
        bills: s.bills.map(b => b.id === billId ? updatedBill : b),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "billing.alter_post_trip",
          entityType: "bill",
          entityId: billId,
          summary: `Altered bill ${bill.billNumber} from MVR ${oldTotal} to MVR ${newTotal} (Trip ${trip?.tripNumber || "ended"}). Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill adjusted", body: bill.billNumber, variant: "success" as const }],
      };
    });
    persistTenantDoc(tenantCollections.bills, updatedBill.id, updatedBill as unknown as Record<string, unknown>);
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    const current = stateRef.current;
    const user = current.users.find(u => u.id === userId);
    if (!user) return;
    const updatedUser: User = { ...user, ...updates };
    setState(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "user.update", entityType: "user", entityId: userId, summary: `Updated user settings for ${s.users.find(u => u.id === userId)?.name}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "User saved", variant: "success" as const }],
    }));
    const payload = { ...updatedUser, uid: updatedUser.id, activeStatus: true } as unknown as Record<string, unknown>;
    persistTenantDoc(tenantCollections.users, updatedUser.id, payload);
    persistRootBusinessUser(updatedUser.id, payload);
  }, []);

  const deleteUser = useCallback((userId: string) => {
    deleteTenantDoc(tenantCollections.users, state.businessProfile.id, userId);
    setState(s => ({
      ...s,
      users: s.users.filter(u => u.id !== userId),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "user.delete", entityType: "user", entityId: userId, summary: `Removed crew member from directory`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "User removed", variant: "info" as const }],
    }));
  }, [state.businessProfile.id]);

  const updateDestination = useCallback((destId: string, updates: Partial<Destination>) => {
    const current = stateRef.current;
    const destination = current.destinations.find(d => d.id === destId);
    if (!destination) return;
    const updatedDestination: Destination = { ...destination, ...updates };
    setState(s => ({
      ...s,
      destinations: s.destinations.map(d => d.id === destId ? { ...d, ...updates } : d),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "destination.update", entityType: "destination", entityId: destId, summary: `Updated destination ${s.destinations.find(d => d.id === destId)?.islandName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Island saved", variant: "success" as const }],
    }));
    persistTenantDoc(tenantCollections.destinations, updatedDestination.id, updatedDestination as unknown as Record<string, unknown>);
  }, []);

  const deleteDestination = useCallback((destId: string) => {
    deleteTenantDoc(tenantCollections.destinations, state.businessProfile.id, destId);
    setState(s => ({
      ...s,
      destinations: s.destinations.filter(d => d.id !== destId),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "destination.delete", entityType: "destination", entityId: destId, summary: `Removed island destination from operational scope`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Island removed", variant: "info" as const }],
    }));
  }, [state.businessProfile.id]);

  const updateCustomer = useCallback((customerId: string, updates: Partial<Customer>) => {
    const current = stateRef.current;
    const customer = current.customers.find(c => c.id === customerId);
    if (!customer) return;
    const updatedCustomer: Customer = { ...customer, ...updates };
    setState(s => ({
      ...s,
      customers: s.customers.map(c => c.id === customerId ? { ...c, ...updates } : c),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "customer.update", entityType: "customer", entityId: customerId, summary: `Updated customer settings for ${s.customers.find(c => c.id === customerId)?.displayName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Customer saved", variant: "success" as const }],
    }));
    persistTenantDoc(tenantCollections.customers, updatedCustomer.id, updatedCustomer as unknown as Record<string, unknown>);
  }, []);

  const deleteCustomer = useCallback((customerId: string) => {
    deleteTenantDoc(tenantCollections.customers, state.businessProfile.id, customerId);
    setState(s => ({
      ...s,
      customers: s.customers.filter(c => c.id !== customerId),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "customer.delete", entityType: "customer", entityId: customerId, summary: `Removed customer profile`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Customer removed", variant: "info" as const }],
    }));
  }, [state.businessProfile.id]);

  const updateCatalogItem = useCallback((itemId: string, updates: Partial<CatalogItem>, newPrice?: number) => {
    const current = stateRef.current;
    const item = current.catalogItems.find(i => i.id === itemId);
    if (!item) return;
    const updatedItem: CatalogItem = { ...item, ...updates };
    const hasStandardRate = current.itemPriceRates.some(r => r.itemId === itemId && r.priceLevel === "standard");
    const itemPriceRates = newPrice === undefined
      ? current.itemPriceRates
      : hasStandardRate
        ? current.itemPriceRates.map(r => r.itemId === itemId && r.priceLevel === "standard" ? { ...r, priceTaxInclusive: newPrice } : r)
        : [
            ...current.itemPriceRates,
            {
              id: id("p"),
              businessProfileId: item.businessProfileId || current.businessProfile.id,
              itemId,
              priceLevel: "standard" as const,
              priceTaxInclusive: newPrice,
            },
          ];
    const updatedRates = itemPriceRates.filter(rate => rate.itemId === itemId && rate.priceLevel === "standard");
    setState(s => {
      return {
        ...s,
        catalogItems: s.catalogItems.map(i => i.id === itemId ? { ...i, ...updates } : i),
        itemPriceRates,
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "catalog.update", entityType: "catalog_item", entityId: itemId, summary: `Updated catalog item ${updates.itemName || ""}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Item saved", variant: "success" as const }],
      };
    });
    persistTenantDoc(tenantCollections.catalogItems, updatedItem.id, updatedItem as unknown as Record<string, unknown>);
    updatedRates.forEach(rate => persistTenantDoc(tenantCollections.itemPriceRates, rate.id, rate as unknown as Record<string, unknown>));
  }, []);

  const deleteCatalogItem = useCallback((itemId: string) => {
    deleteTenantDoc(tenantCollections.catalogItems, state.businessProfile.id, itemId);
    state.itemPriceRates.filter(rate => rate.itemId === itemId).forEach(rate => deleteTenantDoc(tenantCollections.itemPriceRates, state.businessProfile.id, rate.id));
    setState(s => ({
      ...s,
      catalogItems: s.catalogItems.filter(i => i.id !== itemId),
      itemPriceRates: s.itemPriceRates.filter(r => r.itemId !== itemId),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "catalog.delete", entityType: "catalog_item", entityId: itemId, summary: `Removed cargo item from master catalog`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Item removed", variant: "info" as const }],
    }));
  }, [state.businessProfile.id, state.itemPriceRates]);

  const updateTripNotes = useCallback((tripId: string, notes: string) => {
    const current = stateRef.current;
    const trip = current.trips.find(t => t.id === tripId);
    if (!trip) return;
    const updatedTrip: Trip = { ...trip, notes };
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, notes } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.update_notes", entityType: "trip", entityId: tripId, summary: `Updated trip notes for ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Notes saved", variant: "success" as const }],
    }));
    persistTenantDoc(tenantCollections.trips, updatedTrip.id, updatedTrip as unknown as Record<string, unknown>);
  }, []);

  const deleteTrip = useCallback((tripId: string) => {
    deleteTenantDoc(tenantCollections.trips, state.businessProfile.id, tripId);
    setState(s => ({
      ...s,
      trips: s.trips.filter(t => t.id !== tripId),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.delete", entityType: "trip", entityId: tripId, summary: `Voided sailing journey manifest`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip removed", variant: "info" as const }],
    }));
  }, [state.businessProfile.id]);

  const cancelBill = useCallback((billId: string, reason: string) => {
    const bill = state.bills.find(b => b.id === billId);
    if (!bill) return;
    if (bill.billStatus !== "draft") {
      setState(s => ({
        ...s,
        toasts: [...s.toasts, { id: id("t"), title: "Bill locked", body: bill.billNumber, variant: "warning" as const }],
      }));
      return;
    }
    const cancelledBill: Bill = {
      ...bill,
      billStatus: "cancelled",
      paymentStatus: "unpaid",
      paidAmount: 0,
    };
    setState(s => ({
      ...s,
      bills: s.bills.map(b => b.id === billId ? cancelledBill : b),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "billing.cancel",
        entityType: "bill",
        entityId: billId,
        summary: `Cancelled draft bill ${bill.billNumber}. Tax removed from active GST totals. Reason: ${reason}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Bill cancelled", body: bill.billNumber, variant: "warning" as const }],
    }));
    persistTenantDoc(tenantCollections.bills, cancelledBill.id, cancelledBill as unknown as Record<string, unknown>);
  }, [state.bills]);

  const voidPayment = useCallback((paymentId: string, reason: string) => {
    const current = stateRef.current;
    const pay = current.payments.find(p => p.id === paymentId);
    if (!pay) return;
    const bill = current.bills.find(b => b.id === pay.billId);
    const paidAmount = bill ? Math.max(0, bill.paidAmount - pay.amount) : 0;
    const updatedBill: Bill | null = bill ? {
      ...bill,
      paidAmount,
      paymentStatus: paidAmount >= bill.grandTotal ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      billStatus: paidAmount >= bill.grandTotal ? "paid" : "partially_paid",
    } : null;
    deleteTenantDoc(tenantCollections.payments, current.businessProfile.id, paymentId);
    setState(s => {
      return {
        ...s,
        payments: s.payments.filter(p => p.id !== paymentId),
        bills: updatedBill ? s.bills.map(b => b.id === pay.billId ? updatedBill : b) : s.bills,
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "payment.void", entityType: "payment", entityId: paymentId, summary: `Voided payment receipt ${pay.paymentNumber} (${MVR(pay.amount)}). Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment voided", body: pay.paymentNumber, variant: "warning" as const }],
      };
    });
    if (updatedBill) {
      persistTenantDoc(tenantCollections.bills, updatedBill.id, updatedBill as unknown as Record<string, unknown>);
    }
  }, []);

  const updateTaxSetting = useCallback((taxId: string, updates: Partial<TaxSetting>) => {
    const current = stateRef.current;
    const taxSetting = current.taxSettings.find(t => t.id === taxId);
    if (!taxSetting) return;
    const updatedTax: TaxSetting = { ...taxSetting, ...updates };
    const updatedProfile: BusinessProfile | null = updates.taxRate !== undefined
      ? { ...current.businessProfile, defaultTaxRate: updates.taxRate }
      : null;
    setState(s => ({
      ...s,
      taxSettings: s.taxSettings.map(t => t.id === taxId ? { ...t, ...updates } : t),
      businessProfile: updatedProfile || s.businessProfile,
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "tax.update", entityType: "tax_setting", entityId: taxId, summary: `Adjusted global GST tax parameter`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Tax saved", variant: "success" as const }],
    }));
    persistTenantDoc(tenantCollections.taxSettings, updatedTax.id, updatedTax as unknown as Record<string, unknown>);
    if (updatedProfile) {
      persistTenantDoc("business_profiles", updatedProfile.id, updatedProfile as unknown as Record<string, unknown>);
    }
  }, []);

  const value: AppContextValue = {
    ...state,
    signIn, signOut, registerOwner, sendPasswordReset, createOwnerBusinessProfile, selectBusinessProfile, navigate, back,
    openTrip, endTrip, closeTrip, selectTrip, selectBill, selectCustomer, selectDestination,
    addOperationItem, addOperationItems, removeOperationItem,
    finalizeBill, postPayment, updateDraftBill, createTrip,
    createBillFromOperation,
    addDestination, addCustomer, syncCatalogCategories, saveCatalogCategory, addCatalogItem, syncCustomerPriceLevels, saveCustomerPriceLevel,
    toast, dismissToast, markNotificationRead,
    generateNextNumber, toggleOnline,
    updateBusinessProfile, inviteUser, updateTripStatus, alterBillAfterTripEnd,
    updateUser, deleteUser, updateDestination, deleteDestination,
    updateCustomer, deleteCustomer, updateCatalogItem, deleteCatalogItem,
    updateTripNotes, deleteTrip, cancelBill, voidPayment, updateTaxSetting,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
