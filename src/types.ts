// ============================================================================
// Core Domain Types — stored in Firebase Auth and Cloud Firestore
// ============================================================================

export type ID = string;
export type ISODate = string;

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "cashier"
  | "loading_staff"
  | "offloading_staff"
  | "viewer";

export interface BusinessProfile {
  id: ID;
  ownerUserId: ID;
  businessName: string;
  vesselName: string;
  vesselRegistrationNumber: string;
  companyName: string;
  companyRegistrationNumber: string;
  gstNumber: string;
  taxRegistrationStatus: "registered" | "unregistered";
  phone: string;
  email: string;
  address: string;
  logoEmoji: string;
  defaultCurrency: "MVR";
  defaultTaxRate: number; // percent, e.g. 8
  taxInclusivePricingEnabled: boolean;
  activeStatus: boolean;
  createdAt: ISODate;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  businessProfileId: ID;
  avatar: string;
  online: boolean;
}

export interface Destination {
  id: ID;
  businessProfileId: ID;
  islandName: string;
  atoll: string;
  destinationCode: string; // e.g. "MLE", "ADH"
  activeStatus: boolean;
  sortOrder: number;
}

export type CustomerGroup = "business" | "individual" | "government" | "walk_in";

export interface Customer {
  id: ID;
  businessProfileId: ID;
  customerType: CustomerGroup;
  displayName: string;
  legalName: string;
  phone: string;
  nationalIdOrRegNo: string;
  gstNumber?: string;
  defaultDestinationId: ID;
  defaultPriceLevelId: ID;
  creditAllowed: boolean;
  creditLimit: number;
  outstandingBalance: number;
  activeStatus: boolean;
  createdAt?: ISODate;
}

export type PriceLevel = "standard" | "business" | "individual" | "government" | "walk_in" | "custom";

export type CustomerPriceLevelCode = "business" | "government" | "individual" | "walk_in";
export type PriceLevelAdjustmentType = "percentage" | "fixed_amount";

export interface CustomerPriceLevel {
  id: ID;
  businessProfileId: ID;
  code: CustomerPriceLevelCode;
  name: string;
  description: string;
  adjustmentType: PriceLevelAdjustmentType;
  adjustmentValue: number;
  activeStatus: boolean;
  sortOrder: number;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface CatalogItem {
  id: ID;
  businessProfileId: ID;
  itemName: string;
  itemCode: string;
  category: "general_cargo" | "perishable" | "construction" | "fuel" | "vehicle" | "other";
  unitType: "kg" | "ton" | "piece" | "crate" | "sack" | "litre" | "m3" | "trip";
  defaultTaxRate: number;
  taxInclusive: boolean;
  activeStatus: boolean;
  icon: string;
  createdAt?: ISODate;
}

export interface ItemPriceRate {
  id: ID;
  businessProfileId: ID;
  itemId: ID;
  priceLevel: PriceLevel;
  destinationId?: ID;
  priceTaxInclusive: number;
}

export type TripStatus =
  | "draft"
  | "open"
  | "loading"
  | "sailing"
  | "offloading"
  | "ended"
  | "closed";

export interface Trip {
  id: ID;
  businessProfileId: ID;
  tripNumber: string;
  vesselName: string;
  originDestinationId: ID;
  returnDestinationId?: ID;
  plannedDepartureAt: ISODate;
  actualDepartureAt?: ISODate;
  plannedArrivalAt: ISODate;
  actualArrivalAt?: ISODate;
  status: TripStatus;
  openedBy: ID;
  endedBy?: ID;
  endedAt?: ISODate;
  closedBy?: ID;
  closedAt?: ISODate;
  notes: string;
  createdAt: ISODate;
}

export type OperationType = "loading" | "offloading" | "cargo_handling";

export interface OperationItem {
  id: ID;
  businessProfileId: ID;
  tripId: ID;
  operationId: ID;
  destinationId: ID;
  customerId: ID;
  itemId: ID;
  itemNameSnapshot: string;
  unitType: string;
  quantity: number;
  unitPriceTaxInclusive: number;
  taxRate: number;
  taxAmount: number;
  lineTotalTaxInclusive: number;
  originalPrice?: number;
  overridePrice?: number;
  overrideReason?: string;
  createdBy: ID;
  createdAt: ISODate;
}

export interface WalkInDetails {
  name: string;
  phone: string;
  description?: string;
}

export interface Operation {
  id: ID;
  businessProfileId: ID;
  tripId: ID;
  operationType: OperationType;
  destinationId: ID;
  customerId: ID;
  walkInDetails?: WalkInDetails;
  items: OperationItem[];
  totalTaxInclusive: number;
  totalTax: number;
  createdBy: ID;
  createdAt: ISODate;
  synced: boolean;
}

export type BillType =
  | "instant_cash"
  | "credit"
  | "destination_grouped"
  | "individual_invoice"
  | "grouped_destination_invoice"
  | "loading_bill"
  | "offloading_bill";

export type BillStatus =
  | "draft"
  | "finalized"
  | "partially_paid"
  | "paid"
  | "credit"
  | "cancelled"
  | "adjusted";

export interface Bill {
  id: ID;
  businessProfileId: ID;
  tripId: ID;
  destinationId: ID;
  customerId: ID;
  walkInDetails?: WalkInDetails;
  billNumber: string;
  billType: BillType;
  billStatus: BillStatus;
  subtotalTaxInclusive: number;
  taxTotal: number;
  grandTotal: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  paidAmount: number;
  createdBy: ID;
  finalizedBy?: ID;
  finalizedAt?: ISODate;
  createdAt: ISODate;
  updatedAt?: ISODate;
  itemCount: number;
  items?: OperationItem[];
  offloadedItems?: OperationItem[];
}

export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "mobile_wallet" | "other";

export interface Payment {
  id: ID;
  businessProfileId: ID;
  billId: ID;
  paymentNumber: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  collectedBy: ID;
  collectedAt: ISODate;
  notes?: string;
}

export interface TaxSetting {
  id: ID;
  businessProfileId: ID;
  taxName: string;
  taxRate: number;
  taxInclusiveEnabled: boolean;
  activeStatus: boolean;
}

export interface NumberingSequence {
  id: ID;
  businessProfileId: ID;
  numberType: "trip" | "bill" | "invoice" | "receipt" | "payment" | "customer";
  prefix: string;
  currentSequence: number;
  formatTemplate: string;
  padding: number;
  lastGenerated: string;
}

export interface AuditLog {
  id: ID;
  businessProfileId: ID;
  actorUserId: ID;
  action: string;
  entityType: string;
  entityId: ID;
  createdAt: ISODate;
  summary: string;
}

export type ScreenName =
  | "splash"
  | "welcome"
  | "login"
  | "register"
  | "business_setup"
  | "dashboard"
  | "trips"
  | "trip_detail"
  | "operation"
  | "destinations"
  | "customers"
  | "catalog"
  | "billing"
  | "invoice_preview"
  | "payments"
  | "reports"
  | "settings"
  | "users"
  | "audit_logs"
  | "profile";

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: ISODate;
  read: boolean;
  businessProfileId?: ID;
  actorUserId?: ID;
  action?: string;
  entityType?: string;
  entityId?: ID;
  readBy?: ID[];
}
