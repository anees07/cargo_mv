import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import * as seed from "./seed";
import { MVR } from "./utils/format";
import type {
  BusinessProfile, User, Destination, Customer, CatalogItem, ItemPriceRate,
  Trip, Bill, Payment, TaxSetting, NumberingSequence, AuditLog,
  OperationItem, Operation, AppNotification
} from "./types";

// ============================================================================
// State Store — modeled after Riverpod NotifierProvider
// Mirrors the InsForge PostgreSQL repository pattern.
// ============================================================================

export type Screen =
  | "splash" | "welcome" | "login" | "register" | "business_setup" | "select_profile"
  | "dashboard" | "trips" | "trip_detail" | "create_trip" | "operation"
  | "destinations" | "destination_detail" | "customers" | "customer_detail" | "catalog"
  | "billing" | "invoice_preview" | "payments"
  | "reports" | "settings" | "users" | "audit_logs" | "profile" | "notifications"
  | "backend" | "sync_conflicts" | "pdf_documents";

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
}

interface AppActions {
  signIn: (email: string, password: string) => void;
  signOut: () => void;
  selectBusinessProfile: (profileId: string) => void;
  navigate: (s: Screen) => void;
  back: () => void;
  openTrip: (tripId: string) => void;
  endTrip: (tripId: string) => void;
  selectTrip: (id: string) => void;
  selectBill: (id: string) => void;
  selectCustomer: (id: string) => void;
  selectDestination: (id: string) => void;
  addOperationItem: (item: Omit<OperationItem, "id" | "createdAt" | "businessProfileId" | "createdBy" | "taxAmount" | "lineTotalTaxInclusive">) => void;
  removeOperationItem: (itemId: string) => void;
  finalizeBill: (billId: string) => void;
  postPayment: (billId: string, amount: number, method: Payment["method"], reference?: string, notes?: string) => void;
  createTrip: (originDestinationId: string, plannedArrivalAt: string, notes: string) => Trip;
  addDestination: (islandName: string, atoll: string, code: string) => Destination;
  addCustomer: (customer: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">) => Customer;
  addCatalogItem: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">) => CatalogItem;
  toast: (t: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  generateNextNumber: (type: NumberingSequence["numberType"], destCode?: string) => string;
  createBillFromOperation: (operationId: string, billType: Bill["billType"]) => Bill | null;
  createManualBill: (input: { billType: Bill["billType"]; customerId: string; destinationId: string; tripId: string }) => Bill | null;
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
  currentUser: seed.currentUser,
  businessProfile: seed.businessProfile,
  users: seed.users,
  destinations: seed.destinations,
  customers: seed.customers,
  catalogItems: seed.catalogItems,
  itemPriceRates: seed.itemPriceRates,
  trips: seed.trips,
  activeTripId: "t_001",
  operations: seed.operations,
  bills: seed.bills,
  payments: seed.payments,
  taxSettings: seed.taxSettings,
  numbering: seed.numbering,
  auditLogs: seed.auditLogs,
  notifications: seed.notifications,
  toasts: [],
  screen: "splash",
  screenStack: [],
  selectedTripId: null,
  selectedBillId: null,
  selectedCustomerId: null,
  selectedDestinationId: null,
  isOnline: true,
  pendingSyncCount: 0,
};

const AppContext = createContext<(AppState & AppActions) | null>(null);

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const addAudit = (logs: AuditLog[], entry: Omit<AuditLog, "id" | "createdAt" | "businessProfileId">) => [
  { ...entry, id: id("al"), createdAt: new Date().toISOString(), businessProfileId: "bp_001" },
  ...logs,
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  // Simulate splash screen transition
  useEffect(() => {
    const t = setTimeout(() => {
      setState(s => ({ ...s, screen: "welcome" }));
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  const signIn = useCallback((_email: string, _password: string) => {
    // If user belongs to multiple profiles, route to select_profile. We'll simulate that here.
    setState(s => ({ ...s, isAuthed: true, screen: "select_profile", screenStack: [] }));
  }, []);

  const selectBusinessProfile = useCallback((_profileId: string) => {
    setState(s => ({ ...s, screen: "dashboard", screenStack: [] }));
  }, []);

  const signOut = useCallback(() => {
    setState(s => ({ ...s, isAuthed: false, screen: "welcome", screenStack: [] }));
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id, action: "trip.open",
          entityType: "trip", entityId: tripId, summary: `Opened trip ${trip.tripNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Trip opened", body: `${trip.tripNumber} is now in loading state.`, variant: "success" }],
      };
    });
  }, []);

  const endTrip = useCallback((tripId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: "ended", endedBy: s.currentUser.id, actualArrivalAt: new Date().toISOString(), endedAt: new Date().toISOString() } : t),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "trip.end",
        entityType: "trip", entityId: tripId, summary: `Ended trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip ended", body: "New loading and bills are now blocked. Payments remain active.", variant: "info" }],
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id, action: "numbering.generate",
          entityType: "numbering", entityId: `n_${type}`,
          summary: `Generated ${type} number: ${formatted}`,
        }),
      };
    });
    return nextNumber;
  }, []);

  const addOperationItem = useCallback((item: Omit<OperationItem, "id" | "createdAt" | "businessProfileId" | "createdBy" | "taxAmount" | "lineTotalTaxInclusive">) => {
    setState(s => {
      const taxAmount = (item.unitPriceTaxInclusive * item.quantity) - (item.unitPriceTaxInclusive * item.quantity) / (1 + item.taxRate / 100);
      const lineTotal = item.unitPriceTaxInclusive * item.quantity;
      const newItem: OperationItem = {
        ...item,
        id: id("oi"),
        businessProfileId: s.businessProfile.id,
        createdBy: s.currentUser.id,
        createdAt: new Date().toISOString(),
        taxAmount: Number(taxAmount.toFixed(2)),
        lineTotalTaxInclusive: Number(lineTotal.toFixed(2)),
      };
      const existingOp = s.operations.find(o => o.tripId === item.tripId && o.destinationId === item.destinationId && o.customerId === item.customerId);
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
        id: id("op"),
        businessProfileId: s.businessProfile.id,
        tripId: item.tripId,
        operationType: "loading",
        destinationId: item.destinationId,
        customerId: item.customerId,
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
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "billing.finalize",
        entityType: "bill", entityId: billId,
        summary: `Finalized bill ${s.bills.find(b => b.id === billId)?.billNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Bill finalized", body: "PDF generated and stored.", variant: "success" }],
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id, action: "payment.post",
          entityType: "payment", entityId: newPayment.id,
          summary: `Posted MVR ${amount.toFixed(2)} payment — ${receiptNum}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment posted", body: `${receiptNum} • MVR ${amount.toLocaleString()}`, variant: "success" }],
      };
    });
  }, []);

  const createTrip = useCallback((originDestinationId: string, plannedArrivalAt: string, notes: string): Trip => {
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
    setState(s => ({
      ...s,
      trips: [newTrip, ...s.trips],
      numbering: s.numbering.map(n => n.numberType === "trip" ? { ...n, currentSequence: newSeq, lastGenerated: tripNumber } : n),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "trip.create",
        entityType: "trip", entityId: newTrip.id,
        summary: `Created draft trip ${tripNumber}`,
      }),
    }));
    return newTrip;
  }, [state.numbering, state.businessProfile, state.currentUser]);

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

  const addCatalogItem = useCallback((item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">): CatalogItem => {
    const newItem: CatalogItem = {
      ...item,
      id: id("i"),
      businessProfileId: state.businessProfile.id,
      activeStatus: true,
    };
    setState(s => ({ ...s, catalogItems: [...s.catalogItems, newItem] }));
    return newItem;
  }, [state.businessProfile]);

  const toast = useCallback((t: Omit<ToastMessage, "id">) => {
    const newToast = { ...t, id: id("t") };
    setState(s => ({ ...s, toasts: [...s.toasts, newToast] }));
    setTimeout(() => {
      setState(s => ({ ...s, toasts: s.toasts.filter(x => x.id !== newToast.id) }));
    }, 3500);
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "billing.create",
          entityType: "bill",
          entityId: newBill!.id,
          summary: `Created ${billType.replace("_", " ")} bill ${billNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill created", body: `${billNumber} — draft ready to finalize`, variant: "success" as const }],
      };
    });
    return newBill;
  }, []);

  const createManualBill = useCallback((input: { billType: Bill["billType"]; customerId: string; destinationId: string; tripId: string }): Bill | null => {
    let newBill: Bill | null = null;
    setState(s => {
      const trip = s.trips.find(t => t.id === input.tripId);
      if (!trip || ["ended", "closed"].includes(trip.status)) {
        return {
          ...s,
          toasts: [...s.toasts, { id: id("t"), title: "Trip not active", body: "Bills can only be created while a trip is active.", variant: "error" as const }],
        };
      }
      const dest = s.destinations.find(d => d.id === input.destinationId);
      const seq = s.numbering.find(n => n.numberType === "bill");
      if (!seq) return s;
      const newSeq = seq.currentSequence + 1;
      const padded = String(newSeq).padStart(seq.padding, "0");
      const billNumber = `BILL-${dest?.destinationCode || "GEN"}-${padded}`;
      const baseAmount = input.billType === "instant_cash" ? 4200 : input.billType === "destination_grouped" ? 18500 : 9600;
      const taxTotal = Number((baseAmount - baseAmount / (1 + s.businessProfile.defaultTaxRate / 100)).toFixed(2));
      newBill = {
        id: id("b"),
        businessProfileId: s.businessProfile.id,
        tripId: input.tripId,
        destinationId: input.destinationId,
        customerId: input.customerId,
        billNumber,
        billType: input.billType,
        billStatus: "draft",
        subtotalTaxInclusive: baseAmount,
        taxTotal,
        grandTotal: baseAmount,
        paymentStatus: "unpaid",
        paidAmount: 0,
        createdBy: s.currentUser.id,
        createdAt: new Date().toISOString(),
        itemCount: input.billType === "destination_grouped" ? 8 : 3,
      };
      return {
        ...s,
        selectedBillId: newBill.id,
        bills: [newBill, ...s.bills],
        numbering: s.numbering.map(n => n.numberType === "bill" ? { ...n, currentSequence: newSeq, lastGenerated: billNumber } : n),
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "billing.create",
          entityType: "bill",
          entityId: newBill!.id,
          summary: `Created draft bill ${billNumber}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill created", body: `${billNumber} is ready to review.`, variant: "success" as const }],
      };
    });
    return newBill;
  }, []);

  const closeTrip = useCallback((tripId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, status: "closed", closedBy: s.currentUser.id, closedAt: new Date().toISOString() } : t),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id,
        action: "trip.close",
        entityType: "trip",
        entityId: tripId,
        summary: `Closed and archived trip ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip closed", body: "Archived for reporting and audit.", variant: "info" as const }],
    }));
  }, []);

  const toggleOnline = useCallback(() => {
    setState(s => ({
      ...s,
      isOnline: !s.isOnline,
      toasts: [...s.toasts, {
        id: id("t"),
        title: !s.isOnline ? "Back online" : "Offline mode",
        body: !s.isOnline ? "Syncing pending operations…" : "Draft operations will queue locally.",
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "settings.update",
          entityType: "business_profile",
          entityId: updated.id,
          summary: `Updated business settings for ${updated.businessName}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Profile updated", body: "Settings saved successfully.", variant: "success" as const }],
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "users.invite",
          entityType: "user",
          entityId: created.id,
          summary: `Invited ${created.name} as ${created.role.replace("_", " ")}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "User invited", body: `An invite email was sent to ${created.email}.`, variant: "success" as const }],
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "trip.update_status",
          entityType: "trip",
          entityId: tripId,
          summary: `Changed trip ${trip.tripNumber} status to ${status}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Trip status updated", body: `${trip.tripNumber} is now ${status}.`, variant: "info" as const }],
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
          toasts: [...s.toasts, { id: id("t"), title: "Permission denied", body: "Only Owner or Admin can alter existing bills after trip end.", variant: "error" as const }],
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id,
          action: "billing.alter_post_trip",
          entityType: "bill",
          entityId: billId,
          summary: `Altered bill ${bill.billNumber} from MVR ${oldTotal} to MVR ${newTotal} (Trip ${trip?.tripNumber || "ended"}). Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill adjusted", body: `Legal audit trail recorded for ${bill.billNumber}.`, variant: "success" as const }],
      };
    });
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setState(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "user.update", entityType: "user", entityId: userId, summary: `Updated user settings for ${s.users.find(u => u.id === userId)?.name}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "User updated", body: "Changes applied successfully.", variant: "success" as const }],
    }));
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setState(s => ({
      ...s,
      users: s.users.filter(u => u.id !== userId),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "user.delete", entityType: "user", entityId: userId, summary: `Removed crew member from directory`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "User removed", body: "User was deleted.", variant: "info" as const }],
    }));
  }, []);

  const updateDestination = useCallback((destId: string, updates: Partial<Destination>) => {
    setState(s => ({
      ...s,
      destinations: s.destinations.map(d => d.id === destId ? { ...d, ...updates } : d),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "destination.update", entityType: "destination", entityId: destId, summary: `Updated destination ${s.destinations.find(d => d.id === destId)?.islandName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Destination updated", body: "Island settings updated.", variant: "success" as const }],
    }));
  }, []);

  const deleteDestination = useCallback((destId: string) => {
    setState(s => ({
      ...s,
      destinations: s.destinations.filter(d => d.id !== destId),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "destination.delete", entityType: "destination", entityId: destId, summary: `Removed island destination from operational scope`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Destination removed", body: "Island deleted.", variant: "info" as const }],
    }));
  }, []);

  const updateCustomer = useCallback((customerId: string, updates: Partial<Customer>) => {
    setState(s => ({
      ...s,
      customers: s.customers.map(c => c.id === customerId ? { ...c, ...updates } : c),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "customer.update", entityType: "customer", entityId: customerId, summary: `Updated customer settings for ${s.customers.find(c => c.id === customerId)?.displayName}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Customer updated", body: "Customer ledger settings updated.", variant: "success" as const }],
    }));
  }, []);

  const deleteCustomer = useCallback((customerId: string) => {
    setState(s => ({
      ...s,
      customers: s.customers.filter(c => c.id !== customerId),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "customer.delete", entityType: "customer", entityId: customerId, summary: `Removed customer profile`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Customer removed", body: "Customer deleted.", variant: "info" as const }],
    }));
  }, []);

  const updateCatalogItem = useCallback((itemId: string, updates: Partial<CatalogItem>, newPrice?: number) => {
    setState(s => ({
      ...s,
      catalogItems: s.catalogItems.map(i => i.id === itemId ? { ...i, ...updates } : i),
      itemPriceRates: newPrice !== undefined ? s.itemPriceRates.map(r => r.itemId === itemId && r.priceLevel === "standard" ? { ...r, priceTaxInclusive: newPrice } : r) : s.itemPriceRates,
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "catalog.update", entityType: "catalog_item", entityId: itemId, summary: `Updated catalog item ${updates.itemName || ""}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Catalog updated", body: "Item specs saved.", variant: "success" as const }],
    }));
  }, []);

  const deleteCatalogItem = useCallback((itemId: string) => {
    setState(s => ({
      ...s,
      catalogItems: s.catalogItems.filter(i => i.id !== itemId),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "catalog.delete", entityType: "catalog_item", entityId: itemId, summary: `Removed cargo item from master catalog`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Catalog item removed", body: "Cargo item deleted.", variant: "info" as const }],
    }));
  }, []);

  const updateTripNotes = useCallback((tripId: string, notes: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId ? { ...t, notes } : t),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "trip.update_notes", entityType: "trip", entityId: tripId, summary: `Updated trip notes for ${s.trips.find(t => t.id === tripId)?.tripNumber}`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip notes saved", body: "Live manifest updated.", variant: "success" as const }],
    }));
  }, []);

  const deleteTrip = useCallback((tripId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.filter(t => t.id !== tripId),
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "trip.delete", entityType: "trip", entityId: tripId, summary: `Voided sailing journey manifest`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Trip voided", body: "Trip manifest deleted.", variant: "info" as const }],
    }));
  }, []);

  const cancelBill = useCallback((billId: string, reason: string) => {
    setState(s => {
      const bill = s.bills.find(b => b.id === billId);
      if (!bill) return s;
      return {
        ...s,
        bills: s.bills.map(b => b.id === billId ? { ...b, billStatus: "cancelled" } : b),
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id, action: "billing.cancel", entityType: "bill", entityId: billId, summary: `Cancelled financial document ${bill.billNumber}. Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Bill cancelled", body: `${bill.billNumber} voided successfully.`, variant: "warning" as const }],
      };
    });
  }, []);

  const voidPayment = useCallback((paymentId: string, reason: string) => {
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
        auditLogs: addAudit(s.auditLogs, {
          actorUserId: s.currentUser.id, action: "payment.void", entityType: "payment", entityId: paymentId, summary: `Voided payment receipt ${pay.paymentNumber} (${MVR(pay.amount)}). Reason: ${reason}`,
        }),
        toasts: [...s.toasts, { id: id("t"), title: "Payment voided", body: `Receipt ${pay.paymentNumber} voided.`, variant: "warning" as const }],
      };
    });
  }, []);

  const updateTaxSetting = useCallback((taxId: string, updates: Partial<TaxSetting>) => {
    setState(s => ({
      ...s,
      taxSettings: s.taxSettings.map(t => t.id === taxId ? { ...t, ...updates } : t),
      businessProfile: updates.taxRate !== undefined ? { ...s.businessProfile, defaultTaxRate: updates.taxRate } : s.businessProfile,
      auditLogs: addAudit(s.auditLogs, {
        actorUserId: s.currentUser.id, action: "tax.update", entityType: "tax_setting", entityId: taxId, summary: `Adjusted global GST tax parameter`,
      }),
      toasts: [...s.toasts, { id: id("t"), title: "Tax settings updated", body: "Master GST rules updated.", variant: "success" as const }],
    }));
  }, []);

  const value: AppState & AppActions = {
    ...state,
    signIn, signOut, selectBusinessProfile, navigate, back,
    openTrip, endTrip, closeTrip, selectTrip, selectBill, selectCustomer, selectDestination,
    addOperationItem, removeOperationItem,
    finalizeBill, postPayment, createTrip,
    createBillFromOperation, createManualBill,
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
