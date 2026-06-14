import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import {
  createFirebaseOwnerAccount,
  getFirebaseFirestore,
  sendFirebasePasswordReset,
  signInWithFirebase,
  signOutFirebase,
} from "./lib/firebase";
import { MVR } from "./utils/format";
import { isUnfinishedTrip } from "./utils/trips";
import type {
  BusinessProfile, User, Destination, Customer, CatalogItem, ItemPriceRate,
  Trip, Bill, Payment, TaxSetting, NumberingSequence, AuditLog,
  OperationItem, Operation, AppNotification, OperationType
} from "./types";

// ============================================================================
// State Store — modeled after Riverpod NotifierProvider.
// Firebase Auth owns identity; Cloud Firestore owns tenant data.
// ============================================================================

export type Screen =
  | "splash" | "welcome" | "login" | "register" | "business_setup" | "select_profile"
  | "dashboard" | "trips" | "trip_detail" | "create_trip" | "operation"
  | "destinations" | "destination_detail" | "customers" | "customer_detail" | "catalog"
  | "billing" | "invoice_preview" | "payments"
  | "reports" | "settings" | "users" | "audit_logs" | "profile" | "notifications"
  | "sync_conflicts" | "pdf_documents";

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
  variant: "info" | "success" | "warning" | "error";
}

interface AppState {
  // auth
  isAuthed: boolean;
  currentUser: User;
  // profile
  businessProfile: BusinessProfile;
  // master data
  users: User[];
  destinations: Destination[];
  customers: Customer[];
  catalogItems: CatalogItem[];
  itemPriceRates: ItemPriceRate[];
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

interface AppActions {
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
  addOperationItem: (item: Omit<OperationItem, "id" | "createdAt" | "businessProfileId" | "createdBy" | "taxAmount" | "lineTotalTaxInclusive"> & { operationType: OperationType }) => void;
  removeOperationItem: (itemId: string) => void;
  finalizeBill: (billId: string) => void;
  postPayment: (billId: string, amount: number, method: Payment["method"], reference?: string, notes?: string) => void;
  createTrip: (originDestinationId: string, plannedArrivalAt: string, notes: string) => Trip | null;
  addDestination: (islandName: string, atoll: string, code: string) => Destination;
  addCustomer: (customer: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">) => Customer;
  addCatalogItem: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number) => CatalogItem;
  toast: (t: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  generateNextNumber: (type: NumberingSequence["numberType"], destCode?: string) => string;
  createBillFromOperation: (operationId: string, billType: Bill["billType"]) => Bill | null;
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
  catalogItems: [],
  itemPriceRates: [],
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

const AppContext = createContext<(AppState & AppActions) | null>(null);

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const toastTimeoutMs = 800;

function appendToast(toasts: ToastMessage[], toast: ToastMessage) {
  const duplicateIndex = toasts.findIndex(item =>
    item.title === toast.title &&
    item.body === toast.body &&
    item.variant === toast.variant
  );
  if (duplicateIndex === -1) return [...toasts, toast];
  return [...toasts.slice(0, duplicateIndex), ...toasts.slice(duplicateIndex + 1), toast];
}

const tenantCollections = {
  users: "business_users",
  destinations: "destinations",
  customers: "customers",
  catalogItems: "catalog_items",
  itemPriceRates: "item_price_rates",
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
  void setDoc(target, data).catch(error => {
    console.error(`Failed to persist ${collectionName}/${docId}`, error);
  });
};

const persistRootBusinessUser = (uid: string, data: Record<string, unknown>) => {
  void setDoc(doc(getFirebaseFirestore(), "business_users", uid), data).catch(error => {
    console.error(`Failed to persist business_users/${uid}`, error);
  });
};

const deleteTenantDoc = (collectionName: string, businessProfileId: string, docId: string) => {
  void deleteDoc(doc(getFirebaseFirestore(), "business_profiles", businessProfileId, collectionName, docId)).catch(error => {
    console.error(`Failed to delete business_profiles/${businessProfileId}/${collectionName}/${docId}`, error);
  });
};

const persistTenantState = (state: AppState) => {
  if (!state.isAuthed || !state.businessProfile.id) return;
  const businessProfileId = state.businessProfile.id;
  persistTenantDoc("business_profiles", businessProfileId, state.businessProfile as unknown as Record<string, unknown>);
  state.users.forEach(user => persistTenantDoc(tenantCollections.users, user.id, {
    ...user,
    uid: user.id,
    activeStatus: true,
  }));
  if (state.currentUser.id) {
    persistRootBusinessUser(state.currentUser.id, {
      ...state.currentUser,
      uid: state.currentUser.id,
      activeStatus: true,
    });
  }
  state.destinations.forEach(item => persistTenantDoc(tenantCollections.destinations, item.id, item as unknown as Record<string, unknown>));
  state.customers.forEach(item => persistTenantDoc(tenantCollections.customers, item.id, item as unknown as Record<string, unknown>));
  state.catalogItems.forEach(item => persistTenantDoc(tenantCollections.catalogItems, item.id, item as unknown as Record<string, unknown>));
  state.itemPriceRates.forEach(item => persistTenantDoc(tenantCollections.itemPriceRates, item.id, item as unknown as Record<string, unknown>));
  state.trips.forEach(item => persistTenantDoc(tenantCollections.trips, item.id, item as unknown as Record<string, unknown>));
  state.operations.forEach(item => persistTenantDoc(tenantCollections.operations, item.id, item as unknown as Record<string, unknown>));
  state.bills.forEach(item => persistTenantDoc(tenantCollections.bills, item.id, item as unknown as Record<string, unknown>));
  state.payments.forEach(item => persistTenantDoc(tenantCollections.payments, item.id, item as unknown as Record<string, unknown>));
  state.taxSettings.forEach(item => persistTenantDoc(tenantCollections.taxSettings, item.id, item as unknown as Record<string, unknown>));
  state.numbering.forEach(item => persistTenantDoc(tenantCollections.numbering, item.numberType, {
    ...item,
    id: item.numberType,
    businessProfileId,
  }));
  state.auditLogs.slice(0, 250).forEach(item => persistTenantDoc(tenantCollections.auditLogs, item.id, item as unknown as Record<string, unknown>));
  state.notifications.forEach(item => persistTenantDoc(tenantCollections.notifications, item.id, {
    ...item,
    businessProfileId,
  } as unknown as Record<string, unknown>));
};

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
  return [auditEntry, ...logs];
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
    catalogItems,
    itemPriceRates,
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
    loadTenantCollection<CatalogItem>(tenantCollections.catalogItems, businessProfileId),
    loadTenantCollection<ItemPriceRate>(tenantCollections.itemPriceRates, businessProfileId),
    loadTenantCollection<Trip>(tenantCollections.trips, businessProfileId),
    loadTenantCollection<Operation>(tenantCollections.operations, businessProfileId),
    loadTenantCollection<Bill>(tenantCollections.bills, businessProfileId),
    loadTenantCollection<Payment>(tenantCollections.payments, businessProfileId),
    loadTenantCollection<TaxSetting>(tenantCollections.taxSettings, businessProfileId),
    loadTenantCollection<NumberingSequence & { id?: string; businessProfileId?: string }>(tenantCollections.numbering, businessProfileId),
    loadTenantCollection<AuditLog>(tenantCollections.auditLogs, businessProfileId),
    loadTenantCollection<AppNotification & { businessProfileId?: string }>(tenantCollections.notifications, businessProfileId),
  ]);

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
    catalogItems,
    itemPriceRates,
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
  const lastRemoteUpdateAt = useRef(0);
  const pendingTripRef = useRef<Trip | null>(null);

  // Simulate splash screen transition
  useEffect(() => {
    const t = setTimeout(() => {
      setState(s => ({ ...s, screen: "welcome" }));
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!state.isAuthed || !state.businessProfile.id) return;
    const timeout = window.setTimeout(() => {
      if (Date.now() - lastRemoteUpdateAt.current < 1000) return;
      persistTenantState(state);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [
    state.isAuthed,
    state.businessProfile,
    state.users,
    state.destinations,
    state.customers,
    state.catalogItems,
    state.itemPriceRates,
    state.trips,
    state.operations,
    state.bills,
    state.payments,
    state.taxSettings,
    state.numbering,
    state.auditLogs,
    state.notifications,
  ]);

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

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.catalogItems), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, catalogItems: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as CatalogItem) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.itemPriceRates), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, itemPriceRates: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as ItemPriceRate) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.trips), snapshot => {
      const trips = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as Trip)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const activeTrip = trips.find(trip => ["open", "loading", "sailing", "offloading"].includes(trip.status));
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
      setState(s => ({ ...s, numbering: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as NumberingSequence) }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.auditLogs), snapshot => {
      const auditLogs = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() }) as AuditLog)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      markRemoteUpdate();
      setState(s => ({ ...s, auditLogs }));
    }));

    unsubscribers.push(onSnapshot(tenantCollection(tenantCollections.notifications), snapshot => {
      markRemoteUpdate();
      setState(s => ({ ...s, notifications: snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as AppNotification) }));
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
    const numberingSequences = [
      { numberType: "trip", prefix: "TRIP", currentSequence: 0, formatTemplate: "TRIP-{YYYY}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "bill", prefix: "BILL", currentSequence: 0, formatTemplate: "BILL-{DEST}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "invoice", prefix: "INV", currentSequence: 0, formatTemplate: "INV-{YYYY}-{MM}-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "receipt", prefix: "RCP", currentSequence: 0, formatTemplate: "RCP-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "payment", prefix: "PAY", currentSequence: 0, formatTemplate: "PAY-{000000}", padding: 6, lastGenerated: "" },
      { numberType: "customer", prefix: "CUS", currentSequence: 0, formatTemplate: "CUS-{000000}", padding: 6, lastGenerated: "" },
    ].map(sequence => ({ ...sequence, id: sequence.numberType, businessProfileId }));
    await setDoc(doc(db, "business_users", owner.uid), ownerUser);
    await Promise.all([
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.users, owner.uid), ownerUser),
      setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.taxSettings, taxSetting.id), taxSetting),
      ...numberingSequences.map(sequence => setDoc(doc(db, "business_profiles", businessProfileId, tenantCollections.numbering, sequence.id), sequence)),
    ]);

    setState(s => ({
      ...s,
      isAuthed: true,
      currentUser,
      businessProfile,
      users: [currentUser],
      taxSettings: [taxSetting],
      numbering: numberingSequences,
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
    setState(s => {
      const trip = s.trips.find(t => t.id === tripId);
      if (!trip) return s;
      return {
        ...s,
        trips: s.trips.map(t => t.id === tripId ? { ...t, status: "loading", actualDepartureAt: new Date().toISOString() } : t),
        activeTripId: tripId,
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "trip.open",
          entityType: "trip", entityId: tripId, summary: `Opened trip ${trip.tripNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Trip opened", variant: "success" }],
      };
    });
  }, []);

  const endTrip = useCallback((tripId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: "ended", endedBy: s.currentUser.id, actualArrivalAt: new Date().toISOString(), endedAt: new Date().toISOString() } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.end",
        entityType: "trip", entityId: tripId, summary: `Ended trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip ended", variant: "info" }],
    }));
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
    let nextNumber = "";
    setState(s => {
      const seq = s.numbering.find(n => n.numberType === type);
      if (!seq) return s;
      const newSeq = seq.currentSequence + 1;
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const padded = String(newSeq).padStart(seq.padding, "0");
      let formatted = seq.formatTemplate
        .replace("{YYYY}", String(year))
        .replace("{MM}", month)
        .replace("{000000}", padded);
      if (destCode) {
        formatted = formatted.replace("{DEST}", destCode);
      }
      nextNumber = formatted;
      return {
        ...s,
        numbering: s.numbering.map(n => n.numberType === type ? { ...n, currentSequence: newSeq, lastGenerated: formatted } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "numbering.generate",
          entityType: "numbering", entityId: `n_${type}`,
          summary: `Generated ${type} number: ${formatted}`,
        }),
      };
    });
    return nextNumber;
  }, []);

  const addOperationItem = useCallback((item: Omit<OperationItem, "id" | "createdAt" | "businessProfileId" | "createdBy" | "taxAmount" | "lineTotalTaxInclusive"> & { operationType: OperationType }) => {
    setState(s => {
      const { operationType, ...operationItem } = item;
      const taxAmount = (operationItem.unitPriceTaxInclusive * operationItem.quantity) - (operationItem.unitPriceTaxInclusive * operationItem.quantity) / (1 + operationItem.taxRate / 100);
      const lineTotal = operationItem.unitPriceTaxInclusive * operationItem.quantity;
      const existingOp = s.operations.find(o =>
        o.tripId === operationItem.tripId &&
        o.operationType === operationType &&
        o.destinationId === operationItem.destinationId &&
        o.customerId === operationItem.customerId
      );
      const newItem: OperationItem = {
        ...operationItem,
        id: id("oi"),
        operationId: existingOp?.id || id("op"),
        businessProfileId: s.businessProfile.id,
        createdBy: s.currentUser.id,
        createdAt: new Date().toISOString(),
        taxAmount: Number(taxAmount.toFixed(2)),
        lineTotalTaxInclusive: Number(lineTotal.toFixed(2)),
      };
      if (existingOp) {
        return {
          ...s,
          operations: s.operations.map(o => o.id === existingOp.id ? {
            ...o, items: [newItem, ...o.items],
            totalTaxInclusive: Number((o.totalTaxInclusive + newItem.lineTotalTaxInclusive).toFixed(2)),
            totalTax: Number((o.totalTax + newItem.taxAmount).toFixed(2)),
          } : o),
        };
      }
      const newOp: Operation = {
        id: newItem.operationId,
        businessProfileId: s.businessProfile.id,
        tripId: operationItem.tripId,
        operationType,
        destinationId: operationItem.destinationId,
        customerId: operationItem.customerId,
        items: [newItem],
        totalTaxInclusive: newItem.lineTotalTaxInclusive,
        totalTax: newItem.taxAmount,
        createdBy: s.currentUser.id,
        createdAt: new Date().toISOString(),
        synced: s.isOnline,
      };
      return { ...s, operations: [newOp, ...s.operations] };
    });
  }, []);

  const removeOperationItem = useCallback((itemId: string) => {
    setState(s => ({
      ...s,
      operations: s.operations.map(o => ({
        ...o,
        items: o.items.filter(i => i.id !== itemId),
        totalTaxInclusive: Number(o.items.filter(i => i.id !== itemId).reduce((sum, i) => sum + i.lineTotalTaxInclusive, 0).toFixed(2)),
        totalTax: Number(o.items.filter(i => i.id !== itemId).reduce((sum, i) => sum + i.taxAmount, 0).toFixed(2)),
      })),
    }));
  }, []);

  const finalizeBill = useCallback((billId: string) => {
    setState(s => ({
      ...s,
      bills: s.bills.map(b => b.id === billId ? { ...b, billStatus: "finalized", paymentStatus: b.billType === "credit" ? "unpaid" : "paid", paidAmount: b.billType === "credit" ? 0 : b.grandTotal, finalizedBy: s.currentUser.id, finalizedAt: new Date().toISOString() } : b),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "billing.finalize",
        entityType: "bill", entityId: billId,
        summary: `Finalized bill ${s.bills.find(b => b.id === billId)?.billNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Bill finalized", variant: "success" }],
    }));
  }, []);

  const postPayment = useCallback((billId: string, amount: number, method: Payment["method"], reference?: string, notes?: string) => {
    setState(s => {
      const bill = s.bills.find(b => b.id === billId);
      if (!bill) return s;
      const newPaid = bill.paidAmount + amount;
      const isPaid = newPaid >= bill.grandTotal;
      const receiptNum = `RCP-${String(s.numbering.find(n => n.numberType === "receipt")!.currentSequence + 1).padStart(6, "0")}`;
      const newPayment: Payment = {
        id: id("pm"),
        businessProfileId: s.businessProfile.id,
        billId, paymentNumber: receiptNum,
        amount, method, reference, notes,
        collectedBy: s.currentUser.id,
        collectedAt: new Date().toISOString(),
      };
      return {
        ...s,
        payments: [newPayment, ...s.payments],
        bills: s.bills.map(b => b.id === billId ? {
          ...b,
          paidAmount: newPaid,
          paymentStatus: isPaid ? "paid" : "partial",
          billStatus: isPaid ? "paid" : "partially_paid",
        } : b),
        numbering: s.numbering.map(n => n.numberType === "receipt" ? { ...n, currentSequence: n.currentSequence + 1, lastGenerated: receiptNum } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "payment.post",
          entityType: "payment", entityId: newPayment.id,
          summary: `Posted MVR ${amount.toFixed(2)} payment — ${receiptNum}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment posted", body: MVR(amount), variant: "success" }],
      };
    });
  }, []);

  const createTrip = useCallback((originDestinationId: string, plannedArrivalAt: string, notes: string): Trip | null => {
    const existingTrip = state.trips.find(isUnfinishedTrip) || pendingTripRef.current;
    if (existingTrip) {
      setState(s => ({
        ...s,
        selectedTripId: existingTrip.id,
        toasts: [...s.toasts, { id: id("t"), title: "Trip already open", body: existingTrip.tripNumber, variant: "warning" }],
      }));
      return null;
    }

    const newSeq = state.numbering.find(n => n.numberType === "trip")!.currentSequence + 1;
    const year = new Date().getFullYear();
    const padded = String(newSeq).padStart(6, "0");
    const tripNumber = `TRIP-${year}-${padded}`;
    const newTrip: Trip = {
      id: id("t"),
      businessProfileId: state.businessProfile.id,
      tripNumber,
      vesselName: state.businessProfile.vesselName,
      originDestinationId,
      plannedDepartureAt: new Date().toISOString(),
      plannedArrivalAt,
      status: "draft",
      openedBy: state.currentUser.id,
      notes,
      createdAt: new Date().toISOString(),
    };
    pendingTripRef.current = newTrip;
    setState(s => ({
      ...s,
      trips: [newTrip, ...s.trips],
      numbering: s.numbering.map(n => n.numberType === "trip" ? { ...n, currentSequence: newSeq, lastGenerated: tripNumber } : n),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.create",
        entityType: "trip", entityId: newTrip.id,
        summary: `Created draft trip ${tripNumber}`,
      }),
    }));
    return newTrip;
  }, [state.trips, state.numbering, state.businessProfile, state.currentUser]);

  const addDestination = useCallback((islandName: string, atoll: string, code: string): Destination => {
    const newDest: Destination = {
      id: id("d"),
      businessProfileId: state.businessProfile.id,
      islandName, atoll, destinationCode: code.toUpperCase(),
      activeStatus: true, sortOrder: state.destinations.length + 1,
    };
    setState(s => ({ ...s, destinations: [...s.destinations, newDest] }));
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
    return newCustomer;
  }, [state.businessProfile]);

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
    return newItem;
  }, [state.businessProfile]);

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
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => n.id === notifId ? { ...n, read: true } : n),
    }));
  }, []);

  const createBillFromOperation = useCallback((operationId: string, billType: Bill["billType"]): Bill | null => {
    let newBill: Bill | null = null;
    setState(s => {
      const op = s.operations.find(o => o.id === operationId);
      if (!op) return s;
      if (op.items.length === 0) {
        return {
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "No items", body: "Add cargo first.", variant: "error" as const }],
        };
      }
      const existingBill = s.bills.find(b =>
        b.tripId === op.tripId &&
        b.destinationId === op.destinationId &&
        b.customerId === op.customerId &&
        b.billType === billType
      );
      if (existingBill) {
        return {
          ...s,
          selectedBillId: existingBill.id,
          toasts: [...s.toasts, { id: id("t"), title: "Bill exists", body: existingBill.billNumber, variant: "warning" as const }],
        };
      }
      const dest = s.destinations.find(d => d.id === op.destinationId);
      const seq = s.numbering.find(n => n.numberType === "bill");
      if (!seq) return s;
      const newSeq = seq.currentSequence + 1;
      const padded = String(newSeq).padStart(seq.padding, "0");
      const billNumber = `BILL-${dest?.destinationCode || "GEN"}-${padded}`;

      newBill = {
        id: id("b"),
        businessProfileId: s.businessProfile.id,
        tripId: op.tripId,
        destinationId: op.destinationId,
        customerId: op.customerId,
        billNumber,
        billType,
        billStatus: "draft",
        subtotalTaxInclusive: op.totalTaxInclusive,
        taxTotal: op.totalTax,
        grandTotal: op.totalTaxInclusive,
        paymentStatus: "unpaid",
        paidAmount: 0,
        createdBy: s.currentUser.id,
        createdAt: new Date().toISOString(),
        itemCount: op.items.length,
      };
      return {
        ...s,
        bills: [newBill, ...s.bills],
        numbering: s.numbering.map(n => n.numberType === "bill" ? { ...n, currentSequence: newSeq, lastGenerated: billNumber } : n),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "billing.create",
          entityType: "bill",
          entityId: newBill!.id,
          summary: `Created ${billType.replace("_", " ")} bill ${billNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill created", body: billNumber, variant: "success" as const }],
      };
    });
    return newBill;
  }, []);

  const closeTrip = useCallback((tripId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: "closed", closedBy: s.currentUser.id, closedAt: new Date().toISOString() } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id,
        action: "trip.close",
        entityType: "trip",
        entityId: tripId,
        summary: `Closed and archived trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip closed", variant: "info" as const }],
    }));
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
    setState(s => {
      const updated = { ...s.businessProfile, ...updates };
      return {
        ...s,
        businessProfile: updated,
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id,
          action: "settings.update",
          entityType: "business_profile",
          entityId: updated.id,
          summary: `Updated business settings for ${updated.businessName}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Profile saved", variant: "success" as const }],
      };
    });
  }, []);

  const inviteUser = useCallback((newUser: Omit<User, "id" | "businessProfileId" | "online">): User => {
    let created: User | null = null;
    setState(s => {
      created = {
        ...newUser,
        id: id("u"),
        businessProfileId: s.businessProfile.id,
        online: false,
      };
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
    return created || ({ ...newUser, id: "temp", businessProfileId: "bp", online: false });
  }, []);

  const updateTripStatus = useCallback((tripId: string, status: Trip["status"]) => {
    setState(s => {
      const trip = s.trips.find(t => t.id === tripId);
      if (!trip) return s;
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
  }, []);

  const alterBillAfterTripEnd = useCallback((billId: string, newTotal: number, reason: string) => {
    setState(s => {
      const bill = s.bills.find(b => b.id === billId);
      if (!bill) return s;
      const trip = s.trips.find(t => t.id === bill.tripId);
      if (!["owner", "admin"].includes(s.currentUser.role)) {
        return {
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "Not allowed", body: "Owner or Admin only.", variant: "error" as const }],
        };
      }
      const oldTotal = bill.grandTotal;
      const taxTotal = Number((newTotal - newTotal / (1 + s.businessProfile.defaultTaxRate / 100)).toFixed(2));
      const newBill: Bill = {
        ...bill,
        grandTotal: newTotal,
        subtotalTaxInclusive: newTotal,
        taxTotal,
        billStatus: "adjusted",
        paymentStatus: bill.paidAmount >= newTotal ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
      };

      return {
        ...s,
        bills: s.bills.map(b => b.id === billId ? newBill : b),
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
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setState(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "user.update", entityType: "user", entityId: userId, summary: `Updated user settings for ${s.users.find(u => u.id === userId)?.name}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "User saved", variant: "success" as const }],
    }));
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
    setState(s => ({
      ...s,
      destinations: s.destinations.map(d => d.id === destId ? { ...d, ...updates } : d),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "destination.update", entityType: "destination", entityId: destId, summary: `Updated destination ${s.destinations.find(d => d.id === destId)?.islandName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Island saved", variant: "success" as const }],
    }));
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
    setState(s => ({
      ...s,
      customers: s.customers.map(c => c.id === customerId ? { ...c, ...updates } : c),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "customer.update", entityType: "customer", entityId: customerId, summary: `Updated customer settings for ${s.customers.find(c => c.id === customerId)?.displayName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Customer saved", variant: "success" as const }],
    }));
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
    setState(s => {
      const hasStandardRate = s.itemPriceRates.some(r => r.itemId === itemId && r.priceLevel === "standard");
      const item = s.catalogItems.find(i => i.id === itemId);
      const itemPriceRates = newPrice === undefined
        ? s.itemPriceRates
        : hasStandardRate
          ? s.itemPriceRates.map(r => r.itemId === itemId && r.priceLevel === "standard" ? { ...r, priceTaxInclusive: newPrice } : r)
          : [
              ...s.itemPriceRates,
              {
                id: id("p"),
                businessProfileId: item?.businessProfileId || s.businessProfile.id,
                itemId,
                priceLevel: "standard" as const,
                priceTaxInclusive: newPrice,
              },
            ];

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
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, notes } : t),
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "trip.update_notes", entityType: "trip", entityId: tripId, summary: `Updated trip notes for ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Notes saved", variant: "success" as const }],
    }));
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
    setState(s => {
      const bill = s.bills.find(b => b.id === billId);
      if (!bill) return s;
      return {
        ...s,
        bills: s.bills.map(b => b.id === billId ? { ...b, billStatus: "cancelled" } : b),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "billing.cancel", entityType: "bill", entityId: billId, summary: `Cancelled financial document ${bill.billNumber}. Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill cancelled", body: bill.billNumber, variant: "warning" as const }],
      };
    });
  }, []);

  const voidPayment = useCallback((paymentId: string, reason: string) => {
    deleteTenantDoc(tenantCollections.payments, state.businessProfile.id, paymentId);
    setState(s => {
      const pay = s.payments.find(p => p.id === paymentId);
      if (!pay) return s;
      return {
        ...s,
        payments: s.payments.filter(p => p.id !== paymentId),
        bills: s.bills.map(b => b.id === pay.billId ? {
          ...b,
          paidAmount: Math.max(0, b.paidAmount - pay.amount),
          paymentStatus: Math.max(0, b.paidAmount - pay.amount) >= b.grandTotal ? "paid" : Math.max(0, b.paidAmount - pay.amount) > 0 ? "partial" : "unpaid",
          billStatus: Math.max(0, b.paidAmount - pay.amount) >= b.grandTotal ? "paid" : "partially_paid",
        } : b),
        auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
          actorUserId: s.currentUser.id, action: "payment.void", entityType: "payment", entityId: paymentId, summary: `Voided payment receipt ${pay.paymentNumber} (${MVR(pay.amount)}). Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment voided", body: pay.paymentNumber, variant: "warning" as const }],
      };
    });
  }, [state.businessProfile.id]);

  const updateTaxSetting = useCallback((taxId: string, updates: Partial<TaxSetting>) => {
    setState(s => ({
      ...s,
      taxSettings: s.taxSettings.map(t => t.id === taxId ? { ...t, ...updates } : t),
      businessProfile: updates.taxRate !== undefined ? { ...s.businessProfile, defaultTaxRate: updates.taxRate } : s.businessProfile,
      auditLogs: addAudit(s.auditLogs, s.businessProfile.id, {
        actorUserId: s.currentUser.id, action: "tax.update", entityType: "tax_setting", entityId: taxId, summary: `Adjusted global GST tax parameter`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Tax saved", variant: "success" as const }],
    }));
  }, []);

  const value: AppState & AppActions = {
    ...state,
    signIn, signOut, registerOwner, sendPasswordReset, createOwnerBusinessProfile, selectBusinessProfile, navigate, back,
    openTrip, endTrip, closeTrip, selectTrip, selectBill, selectCustomer, selectDestination,
    addOperationItem, removeOperationItem,
    finalizeBill, postPayment, createTrip,
    createBillFromOperation,
    addDestination, addCustomer, addCatalogItem,
    toast, dismissToast, markNotificationRead,
    generateNextNumber, toggleOnline,
    updateBusinessProfile, inviteUser, updateTripStatus, alterBillAfterTripEnd,
    updateUser, deleteUser, updateDestination, deleteDestination,
    updateCustomer, deleteCustomer, updateCatalogItem, deleteCatalogItem,
    updateTripNotes, deleteTrip, cancelBill, voidPayment, updateTaxSetting,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
