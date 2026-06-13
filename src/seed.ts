import type {
  BusinessProfile, User, Destination, Customer, CatalogItem,
  ItemPriceRate, Trip, Operation, Bill, Payment, TaxSetting,
  NumberingSequence, AuditLog, OperationItem, AppNotification
} from "./types";

// ============================================================================
// Seed data — mirrors what would come from InsForge PostgreSQL via Edge Functions
// ============================================================================

export const businessProfile: BusinessProfile = {
  id: "bp_001",
  ownerUserId: "u_001",
  businessName: "Atoll Marine Services",
  vesselName: "MV Ocean Star",
  vesselRegistrationNumber: "MV-DH-4521",
  companyName: "Atoll Marine Services Pvt Ltd",
  companyRegistrationNumber: "C-2018/2341",
  gstNumber: "GST-MV-1004521",
  taxRegistrationStatus: "registered",
  phone: "+960 779 1234",
  email: "ops@atollmarine.mv",
  address: "Hulhumale Ferry Terminal, Male'",
  logoEmoji: "⛴️",
  defaultCurrency: "MVR",
  defaultTaxRate: 8,
  taxInclusivePricingEnabled: true,
  activeStatus: true,
  createdAt: "2024-08-12T08:00:00Z",
};

export const users: User[] = [
  { id: "u_001", name: "Ibrahim Hassan", email: "ibrahim@atollmarine.mv", role: "owner", businessProfileId: "bp_001", avatar: "IH", online: true },
  { id: "u_002", name: "Aishath Nafea", email: "aishath@atollmarine.mv", role: "admin", businessProfileId: "bp_001", avatar: "AN", online: true },
  { id: "u_003", name: "Mohamed Latheef", email: "latheef@atollmarine.mv", role: "manager", businessProfileId: "bp_001", avatar: "ML", online: true },
  { id: "u_004", name: "Fathimath Saeed", email: "saeed@atollmarine.mv", role: "cashier", businessProfileId: "bp_001", avatar: "FS", online: false },
  { id: "u_005", name: "Ali Rasheed", email: "ali@atollmarine.mv", role: "loading_staff", businessProfileId: "bp_001", avatar: "AR", online: true },
  { id: "u_006", name: "Hussain Shareef", email: "hussain@atollmarine.mv", role: "offloading_staff", businessProfileId: "bp_001", avatar: "HS", online: true },
  { id: "u_007", name: "Mariyam Adam", email: "mariyam@atollmarine.mv", role: "viewer", businessProfileId: "bp_001", avatar: "MA", online: false },
];

export const currentUser: User = users[0]; // Owner — full access

export const destinations: Destination[] = [
  { id: "d_001", businessProfileId: "bp_001", islandName: "Male'", atoll: "Kaafu", destinationCode: "MLE", activeStatus: true, sortOrder: 1 },
  { id: "d_002", businessProfileId: "bp_001", islandName: "Hulhumale", atoll: "Kaafu", destinationCode: "HUL", activeStatus: true, sortOrder: 2 },
  { id: "d_003", businessProfileId: "bp_001", islandName: "Addu City", atoll: "Addu", destinationCode: "ADD", activeStatus: true, sortOrder: 3 },
  { id: "d_004", businessProfileId: "bp_001", islandName: "Fuvahmulah", atoll: "Gnaviyani", destinationCode: "FUV", activeStatus: true, sortOrder: 4 },
  { id: "d_005", businessProfileId: "bp_001", islandName: "Kulhudhuffushi", atoll: "Haa Dhaalu", destinationCode: "KUL", activeStatus: true, sortOrder: 5 },
  { id: "d_006", businessProfileId: "bp_001", islandName: "Thinadhoo", atoll: "Gaafu Dhaalu", destinationCode: "THD", activeStatus: true, sortOrder: 6 },
  { id: "d_007", businessProfileId: "bp_001", islandName: "Naifaru", atoll: "Lhaviyani", destinationCode: "NAI", activeStatus: true, sortOrder: 7 },
  { id: "d_008", businessProfileId: "bp_001", islandName: "Dharavandhoo", atoll: "Baa", destinationCode: "DHV", activeStatus: true, sortOrder: 8 },
  { id: "d_009", businessProfileId: "bp_001", islandName: "Eydhafushi", atoll: "Baa", destinationCode: "EYD", activeStatus: true, sortOrder: 9 },
  { id: "d_010", businessProfileId: "bp_001", islandName: "Hanimaadhoo", atoll: "Haa Dhaalu", destinationCode: "HMD", activeStatus: true, sortOrder: 10 },
];

export const customers: Customer[] = [
  { id: "c_001", businessProfileId: "bp_001", customerType: "business", displayName: "STO Maldives", legalName: "State Trading Organization Plc", phone: "+960 334 4000", nationalIdOrRegNo: "GST-MV-2001451", gstNumber: "GST-MV-2001451", defaultDestinationId: "d_001", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 250000, outstandingBalance: 42500, activeStatus: true },
  { id: "c_002", businessProfileId: "bp_001", customerType: "business", displayName: "Maldives Ports Ltd", legalName: "Maldives Ports Limited", phone: "+960 332 5500", nationalIdOrRegNo: "GST-MV-2002155", gstNumber: "GST-MV-2002155", defaultDestinationId: "d_001", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 180000, outstandingBalance: 0, activeStatus: true },
  { id: "c_003", businessProfileId: "bp_001", customerType: "government", displayName: "Addu City Council", legalName: "Addu City Council", phone: "+960 689 8888", nationalIdOrRegNo: "GOV-2014-1100", defaultDestinationId: "d_003", defaultPriceLevelId: "government", creditAllowed: true, creditLimit: 500000, outstandingBalance: 132000, activeStatus: true },
  { id: "c_004", businessProfileId: "bp_001", customerType: "individual", displayName: "Ahmed Naseer", legalName: "Ahmed Naseer", phone: "+960 777 5512", nationalIdOrRegNo: "A-152341", defaultDestinationId: "d_005", defaultPriceLevelId: "individual", creditAllowed: false, creditLimit: 0, outstandingBalance: 0, activeStatus: true },
  { id: "c_005", businessProfileId: "bp_001", customerType: "business", displayName: "Fuvahmulah Hardware", legalName: "Fuvahmulah Hardware & Trading", phone: "+960 682 2233", nationalIdOrRegNo: "BRN-2019-4455", defaultDestinationId: "d_004", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 75000, outstandingBalance: 12400, activeStatus: true },
  { id: "c_006", businessProfileId: "bp_001", customerType: "walk_in", displayName: "Walk-in Customer", legalName: "Walk-in", phone: "-", nationalIdOrRegNo: "-", defaultDestinationId: "d_001", defaultPriceLevelId: "walk_in", creditAllowed: false, creditLimit: 0, outstandingBalance: 0, activeStatus: true },
  { id: "c_007", businessProfileId: "bp_001", customerType: "business", displayName: "Kulhudhuffushi Mart", legalName: "Kulhudhuffushi Cooperative Mart", phone: "+960 652 1100", nationalIdOrRegNo: "BRN-2017-8821", defaultDestinationId: "d_005", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 120000, outstandingBalance: 0, activeStatus: true },
];

export const catalogItems: CatalogItem[] = [
  { id: "i_001", businessProfileId: "bp_001", itemName: "Rice Sack (50kg)", itemCode: "RIC-50", category: "perishable", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🍚" },
  { id: "i_002", businessProfileId: "bp_001", itemName: "Flour Sack (50kg)", itemCode: "FLR-50", category: "perishable", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🌾" },
  { id: "i_003", businessProfileId: "bp_001", itemName: "Sugar Sack (50kg)", itemCode: "SGR-50", category: "perishable", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🧂" },
  { id: "i_004", businessProfileId: "bp_001", itemName: "Cement Bag (50kg)", itemCode: "CEM-50", category: "construction", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🧱" },
  { id: "i_005", businessProfileId: "bp_001", itemName: "Sand (Cubic Meter)", itemCode: "SND-M3", category: "construction", unitType: "m3", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "⏳" },
  { id: "i_006", businessProfileId: "bp_001", itemName: "Gas Cylinder (12kg)", itemCode: "GAS-12", category: "general_cargo", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🛢️" },
  { id: "i_007", businessProfileId: "bp_001", itemName: "Diesel Drum (200L)", itemCode: "DSL-200", category: "fuel", unitType: "litre", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "⛽" },
  { id: "i_008", businessProfileId: "bp_001", itemName: "Petrol Drum (200L)", itemCode: "PTR-200", category: "fuel", unitType: "litre", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "⛽" },
  { id: "i_009", businessProfileId: "bp_001", itemName: "Construction Steel (ton)", itemCode: "STL-T", category: "construction", unitType: "ton", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🔩" },
  { id: "i_010", businessProfileId: "bp_001", itemName: "Beverage Crate", itemCode: "BEV-CR", category: "general_cargo", unitType: "crate", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "📦" },
  { id: "i_011", businessProfileId: "bp_001", itemName: "Vehicle (Sedan)", itemCode: "VEH-SD", category: "vehicle", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🚗" },
  { id: "i_012", businessProfileId: "bp_001", itemName: "Three-Wheeler", itemCode: "VEH-3W", category: "vehicle", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🛺" },
  { id: "i_013", businessProfileId: "bp_001", itemName: "Frozen Fish Box (20kg)", itemCode: "FSH-20", category: "perishable", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🐟" },
  { id: "i_014", businessProfileId: "bp_001", itemName: "Furniture Set", itemCode: "FRN-SET", category: "general_cargo", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🛋️" },
  { id: "i_015", businessProfileId: "bp_001", itemName: "General Cargo Carton", itemCode: "GEN-CT", category: "general_cargo", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "📦" },
];

export const itemPriceRates: ItemPriceRate[] = [
  { id: "p_001", businessProfileId: "bp_001", itemId: "i_001", priceLevel: "standard", priceTaxInclusive: 145 },
  { id: "p_002", businessProfileId: "bp_001", itemId: "i_001", priceLevel: "business", priceTaxInclusive: 128 },
  { id: "p_003", businessProfileId: "bp_001", itemId: "i_001", priceLevel: "government", priceTaxInclusive: 120 },
  { id: "p_004", businessProfileId: "bp_001", itemId: "i_001", priceLevel: "walk_in", priceTaxInclusive: 160 },
  { id: "p_005", businessProfileId: "bp_001", itemId: "i_004", priceLevel: "standard", priceTaxInclusive: 165 },
  { id: "p_006", businessProfileId: "bp_001", itemId: "i_004", priceLevel: "business", priceTaxInclusive: 148 },
  { id: "p_007", businessProfileId: "bp_001", itemId: "i_004", priceLevel: "government", priceTaxInclusive: 140 },
  { id: "p_008", businessProfileId: "bp_001", itemId: "i_005", priceLevel: "standard", priceTaxInclusive: 850 },
  { id: "p_009", businessProfileId: "bp_001", itemId: "i_005", priceLevel: "business", priceTaxInclusive: 760 },
  { id: "p_010", businessProfileId: "bp_001", itemId: "i_006", priceLevel: "standard", priceTaxInclusive: 195 },
  { id: "p_011", businessProfileId: "bp_001", itemId: "i_007", priceLevel: "standard", priceTaxInclusive: 21.5 },
  { id: "p_012", businessProfileId: "bp_001", itemId: "i_007", priceLevel: "business", priceTaxInclusive: 19.8 },
  { id: "p_013", businessProfileId: "bp_001", itemId: "i_011", priceLevel: "standard", priceTaxInclusive: 1850 },
  { id: "p_014", businessProfileId: "bp_001", itemId: "i_011", priceLevel: "business", priceTaxInclusive: 1620 },
  { id: "p_015", businessProfileId: "bp_001", itemId: "i_013", priceLevel: "standard", priceTaxInclusive: 220 },
  { id: "p_016", businessProfileId: "bp_001", itemId: "i_015", priceLevel: "standard", priceTaxInclusive: 35 },
  { id: "p_017", businessProfileId: "bp_001", itemId: "i_015", priceLevel: "business", priceTaxInclusive: 28 },
];

const now = new Date();
const today = now.toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

export const trips: Trip[] = [
  {
    id: "t_001", businessProfileId: "bp_001",
    tripNumber: "TRIP-2025-000142", vesselName: "MV Ocean Star",
    originDestinationId: "d_001",
    plannedDepartureAt: today, actualDepartureAt: today,
    plannedArrivalAt: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: "loading", openedBy: "u_003", notes: "Mixed cargo for southern atolls. Fuel and construction priority.",
    createdAt: today,
  },
  {
    id: "t_002", businessProfileId: "bp_001",
    tripNumber: "TRIP-2025-000141", vesselName: "MV Ocean Star",
    originDestinationId: "d_001",
    plannedDepartureAt: yesterday, actualDepartureAt: yesterday,
    plannedArrivalAt: new Date(Date.now() - 16 * 3600000).toISOString(),
    actualArrivalAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    status: "ended", openedBy: "u_003", endedBy: "u_002",
    notes: "Hulhumale supply run. All deliveries confirmed.",
    createdAt: yesterday,
  },
  {
    id: "t_003", businessProfileId: "bp_001",
    tripNumber: "TRIP-2025-000140", vesselName: "MV Ocean Star",
    originDestinationId: "d_001",
    plannedDepartureAt: lastWeek, actualDepartureAt: lastWeek,
    plannedArrivalAt: lastWeek, actualArrivalAt: lastWeek,
    status: "closed", openedBy: "u_001", endedBy: "u_001", closedBy: "u_001",
    notes: "Northern atolls fuel run. Closed and archived.",
    createdAt: lastWeek,
  },
];

const operationItemsList: OperationItem[] = [
  { id: "oi_001", businessProfileId: "bp_001", tripId: "t_001", operationId: "op_001", destinationId: "d_003", customerId: "c_003", itemId: "i_004", itemNameSnapshot: "Cement Bag (50kg)", unitType: "sack", quantity: 120, unitPriceTaxInclusive: 140, taxRate: 8, taxAmount: 1244.44, lineTotalTaxInclusive: 16800, createdBy: "u_005", createdAt: today },
  { id: "oi_002", businessProfileId: "bp_001", tripId: "t_001", operationId: "op_001", destinationId: "d_003", customerId: "c_003", itemId: "i_005", itemNameSnapshot: "Sand (Cubic Meter)", unitType: "m3", quantity: 8, unitPriceTaxInclusive: 850, taxRate: 8, taxAmount: 503.70, lineTotalTaxInclusive: 6800, createdBy: "u_005", createdAt: today },
  { id: "oi_003", businessProfileId: "bp_001", tripId: "t_001", operationId: "op_002", destinationId: "d_004", customerId: "c_005", itemId: "i_001", itemNameSnapshot: "Rice Sack (50kg)", unitType: "sack", quantity: 45, unitPriceTaxInclusive: 128, taxRate: 8, taxAmount: 426.67, lineTotalTaxInclusive: 5760, createdBy: "u_005", createdAt: today },
  { id: "oi_004", businessProfileId: "bp_001", tripId: "t_001", operationId: "op_002", destinationId: "d_004", customerId: "c_005", itemId: "i_006", itemNameSnapshot: "Gas Cylinder (12kg)", unitType: "piece", quantity: 24, unitPriceTaxInclusive: 195, taxRate: 8, taxAmount: 346.67, lineTotalTaxInclusive: 4680, createdBy: "u_005", createdAt: today },
];

export const operations: Operation[] = [
  {
    id: "op_001", businessProfileId: "bp_001", tripId: "t_001",
    operationType: "loading", destinationId: "d_003", customerId: "c_003",
    items: operationItemsList.filter(i => i.operationId === "op_001"),
    totalTaxInclusive: 23600, totalTax: 1748.14,
    createdBy: "u_005", createdAt: today, synced: true,
  },
  {
    id: "op_002", businessProfileId: "bp_001", tripId: "t_001",
    operationType: "loading", destinationId: "d_004", customerId: "c_005",
    items: operationItemsList.filter(i => i.operationId === "op_002"),
    totalTaxInclusive: 10440, totalTax: 773.33,
    createdBy: "u_005", createdAt: today, synced: true,
  },
];

export const bills: Bill[] = [
  { id: "b_001", businessProfileId: "bp_001", tripId: "t_002", destinationId: "d_002", customerId: "c_001", billNumber: "BILL-HUL-000088", billType: "credit", billStatus: "partially_paid", subtotalTaxInclusive: 32400, taxTotal: 2400, grandTotal: 32400, paymentStatus: "partial", paidAmount: 18000, createdBy: "u_002", finalizedBy: "u_002", finalizedAt: yesterday, createdAt: yesterday, itemCount: 12 },
  { id: "b_002", businessProfileId: "bp_001", tripId: "t_002", destinationId: "d_002", customerId: "c_002", billNumber: "BILL-HUL-000087", billType: "credit", billStatus: "paid", subtotalTaxInclusive: 15600, taxTotal: 1155.56, grandTotal: 15600, paymentStatus: "paid", paidAmount: 15600, createdBy: "u_002", finalizedBy: "u_002", finalizedAt: yesterday, createdAt: yesterday, itemCount: 6 },
  { id: "b_003", businessProfileId: "bp_001", tripId: "t_003", destinationId: "d_005", customerId: "c_007", billNumber: "BILL-KUL-000086", billType: "credit", billStatus: "paid", subtotalTaxInclusive: 28900, taxTotal: 2140.74, grandTotal: 28900, paymentStatus: "paid", paidAmount: 28900, createdBy: "u_001", finalizedBy: "u_001", finalizedAt: lastWeek, createdAt: lastWeek, itemCount: 9 },
  { id: "b_004", businessProfileId: "bp_001", tripId: "t_001", destinationId: "d_001", customerId: "c_006", billNumber: "BILL-MLE-000089", billType: "instant_cash", billStatus: "finalized", subtotalTaxInclusive: 4200, taxTotal: 311.11, grandTotal: 4200, paymentStatus: "unpaid", paidAmount: 0, createdBy: "u_004", finalizedBy: "u_004", finalizedAt: today, createdAt: today, itemCount: 3 },
];

export const payments: Payment[] = [
  { id: "pm_001", businessProfileId: "bp_001", billId: "b_001", paymentNumber: "RCP-000214", amount: 18000, method: "bank_transfer", reference: "BNK-TRF-4521", collectedBy: "u_004", collectedAt: yesterday, notes: "Partial settlement from STO Maldives" },
  { id: "pm_002", businessProfileId: "bp_001", billId: "b_002", paymentNumber: "RCP-000213", amount: 15600, method: "bank_transfer", reference: "BNK-TRF-4518", collectedBy: "u_004", collectedAt: yesterday },
  { id: "pm_003", businessProfileId: "bp_001", billId: "b_003", paymentNumber: "RCP-000212", amount: 28900, method: "cheque", reference: "CHQ-784512", collectedBy: "u_004", collectedAt: lastWeek, notes: "Cheque deposited same-day" },
];

export const taxSettings: TaxSetting[] = [
  { id: "tx_001", businessProfileId: "bp_001", taxName: "GST", taxRate: 8, taxInclusiveEnabled: true, activeStatus: true },
];

export const numbering: NumberingSequence[] = [
  { numberType: "trip", prefix: "TRIP", currentSequence: 142, formatTemplate: "TRIP-{YYYY}-{000000}", padding: 6, lastGenerated: "TRIP-2025-000142" },
  { numberType: "bill", prefix: "BILL", currentSequence: 89, formatTemplate: "BILL-{DEST}-{000000}", padding: 6, lastGenerated: "BILL-MLE-000089" },
  { numberType: "invoice", prefix: "INV", currentSequence: 78, formatTemplate: "INV-{YYYY}-{MM}-{000000}", padding: 6, lastGenerated: "INV-2025-01-000078" },
  { numberType: "receipt", prefix: "RCP", currentSequence: 214, formatTemplate: "RCP-{000000}", padding: 6, lastGenerated: "RCP-000214" },
  { numberType: "payment", prefix: "PAY", currentSequence: 214, formatTemplate: "PAY-{000000}", padding: 6, lastGenerated: "PAY-000214" },
  { numberType: "customer", prefix: "CUS", currentSequence: 7, formatTemplate: "CUS-{000000}", padding: 6, lastGenerated: "CUS-000007" },
];

export const auditLogs: AuditLog[] = [
  { id: "al_001", businessProfileId: "bp_001", actorUserId: "u_003", action: "trip.open", entityType: "trip", entityId: "t_001", createdAt: today, summary: "Opened trip TRIP-2025-000142 to Addu City" },
  { id: "al_002", businessProfileId: "bp_001", actorUserId: "u_005", action: "operation.create", entityType: "operation", entityId: "op_001", createdAt: today, summary: "Loading 120 cement bags + 8m³ sand for Addu City Council" },
  { id: "al_003", businessProfileId: "bp_001", actorUserId: "u_005", action: "operation.create", entityType: "operation", entityId: "op_002", createdAt: today, summary: "Loading 45 rice sacks + 24 gas cylinders for Fuvahmulah Hardware" },
  { id: "al_004", businessProfileId: "bp_001", actorUserId: "u_002", action: "trip.end", entityType: "trip", entityId: "t_002", createdAt: yesterday, summary: "Ended trip TRIP-2025-000141 — all deliveries confirmed" },
  { id: "al_005", businessProfileId: "bp_001", actorUserId: "u_004", action: "payment.post", entityType: "payment", entityId: "pm_001", createdAt: yesterday, summary: "Posted MVR 18,000 partial payment from STO Maldives" },
  { id: "al_006", businessProfileId: "bp_001", actorUserId: "u_001", action: "trip.close", entityType: "trip", entityId: "t_003", createdAt: lastWeek, summary: "Closed and archived trip TRIP-2025-000140" },
  { id: "al_007", businessProfileId: "bp_001", actorUserId: "u_002", action: "billing.finalize", entityType: "bill", entityId: "b_001", createdAt: yesterday, summary: "Finalized credit bill BILL-HUL-000088" },
  { id: "al_008", businessProfileId: "bp_001", actorUserId: "u_001", action: "settings.tax.update", entityType: "tax_setting", entityId: "tx_001", createdAt: "2024-12-01T08:00:00Z", summary: "Confirmed GST rate at 8% (tax-inclusive pricing)" },
];

export const notifications: AppNotification[] = [
  { id: "n_001", title: "Trip is loading", body: "TRIP-2025-000142 is in active loading at Male'.", type: "info", createdAt: today, read: false },
  { id: "n_002", title: "Payment received", body: "MVR 18,000 partial payment from STO Maldives.", type: "success", createdAt: yesterday, read: true },
  { id: "n_003", title: "Credit limit warning", body: "Addu City Council at 26% of credit limit.", type: "warning", createdAt: yesterday, read: false },
  { id: "n_004", title: "Numbering sync", body: "All numbering sequences synchronized across devices.", type: "info", createdAt: today, read: true },
];
