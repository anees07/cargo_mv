import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFX-50uxkzWuVJAk3f68ou8eOzyflQkWM",
  authDomain: "cargomv-d41f8.firebaseapp.com",
  projectId: "cargomv-d41f8",
  storageBucket: "cargomv-d41f8.firebasestorage.app",
  messagingSenderId: "497131341189",
  appId: "1:497131341189:web:70ae5a1bf264e2c0e270ec",
};

const demoEmail = "demo@atollcargo.mv";
const demoPassword = "AtollCargoDemo#2026";
const businessProfileId = "bp_demo_atollcargo";
const now = new Date();
const today = now.toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function getOrCreateDemoUser() {
  try {
    const credential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
    await updateProfile(credential.user, { displayName: "Demo Owner" });
    return credential.user;
  } catch (error) {
    if (error?.code !== "auth/email-already-in-use") {
      throw error;
    }
    const credential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
    if (credential.user.displayName !== "Demo Owner") {
      await updateProfile(credential.user, { displayName: "Demo Owner" });
    }
    return credential.user;
  }
}

function withTenant(items) {
  return items.map(item => ({ ...item, businessProfileId }));
}

async function writeRoot(collectionName, id, data) {
  try {
    const ref = doc(db, collectionName, id);
    const existing = await getDoc(ref);
    const existingCreatedAt = existing.exists() ? existing.data().createdAt : undefined;
    const safeData = existingCreatedAt && data.createdAt
      ? { ...data, createdAt: existingCreatedAt }
      : data;
    await setDoc(ref, safeData);
  } catch (error) {
    error.message = `${collectionName}/${id}: ${error.message}`;
    throw error;
  }
}

async function writeTenant(collectionName, id, data) {
  try {
    const ref = doc(db, "business_profiles", businessProfileId, collectionName, id);
    const existing = await getDoc(ref);
    const existingCreatedAt = existing.exists() ? existing.data().createdAt : undefined;
    const safeData = existingCreatedAt && data.createdAt
      ? { ...data, createdAt: existingCreatedAt }
      : data;
    await setDoc(ref, safeData);
  } catch (error) {
    error.message = `business_profiles/${businessProfileId}/${collectionName}/${id}: ${error.message}`;
    throw error;
  }
}

async function seed() {
  const owner = await getOrCreateDemoUser();

  const businessProfile = {
    id: businessProfileId,
    ownerUserId: owner.uid,
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
    logoEmoji: "AC",
    defaultCurrency: "MVR",
    defaultTaxRate: 8,
    taxInclusivePricingEnabled: true,
    activeStatus: true,
    createdAt: "2024-08-12T08:00:00Z",
  };

  const users = [
    { id: owner.uid, uid: owner.uid, name: "Demo Owner", email: demoEmail, role: "owner", avatar: "DO", online: true, activeStatus: true, createdAt: today },
    { id: "u_demo_manager", uid: "u_demo_manager", name: "Mohamed Latheef", email: "latheef@atollmarine.mv", role: "manager", avatar: "ML", online: true, activeStatus: true, createdAt: today },
    { id: "u_demo_cashier", uid: "u_demo_cashier", name: "Fathimath Saeed", email: "saeed@atollmarine.mv", role: "cashier", avatar: "FS", online: false, activeStatus: true, createdAt: today },
  ].map(user => ({ ...user, businessProfileId }));

  const destinations = withTenant([
    { id: "d_001", islandName: "Male'", atoll: "Kaafu", destinationCode: "MLE", activeStatus: true, sortOrder: 1 },
    { id: "d_002", islandName: "Hulhumale", atoll: "Kaafu", destinationCode: "HUL", activeStatus: true, sortOrder: 2 },
    { id: "d_003", islandName: "Addu City", atoll: "Addu", destinationCode: "ADD", activeStatus: true, sortOrder: 3 },
    { id: "d_004", islandName: "Fuvahmulah", atoll: "Gnaviyani", destinationCode: "FUV", activeStatus: true, sortOrder: 4 },
    { id: "d_005", islandName: "Kulhudhuffushi", atoll: "Haa Dhaalu", destinationCode: "KUL", activeStatus: true, sortOrder: 5 },
  ]);

  const customers = withTenant([
    { id: "c_001", customerType: "business", displayName: "STO Maldives", legalName: "State Trading Organization Plc", phone: "+960 334 4000", nationalIdOrRegNo: "GST-MV-2001451", gstNumber: "GST-MV-2001451", defaultDestinationId: "d_001", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 250000, outstandingBalance: 42500, activeStatus: true, createdAt: today },
    { id: "c_002", customerType: "government", displayName: "Addu City Council", legalName: "Addu City Council", phone: "+960 689 8888", nationalIdOrRegNo: "GOV-2014-1100", defaultDestinationId: "d_003", defaultPriceLevelId: "government", creditAllowed: true, creditLimit: 500000, outstandingBalance: 132000, activeStatus: true, createdAt: today },
    { id: "c_003", customerType: "business", displayName: "Fuvahmulah Hardware", legalName: "Fuvahmulah Hardware & Trading", phone: "+960 682 2233", nationalIdOrRegNo: "BRN-2019-4455", defaultDestinationId: "d_004", defaultPriceLevelId: "business", creditAllowed: true, creditLimit: 75000, outstandingBalance: 12400, activeStatus: true, createdAt: today },
    { id: "c_004", customerType: "walk_in", displayName: "Walk-in Customer", legalName: "Walk-in", phone: "-", nationalIdOrRegNo: "-", defaultDestinationId: "d_001", defaultPriceLevelId: "walk_in", creditAllowed: false, creditLimit: 0, outstandingBalance: 0, activeStatus: true, createdAt: today },
  ]);

  const catalogItems = withTenant([
    { id: "i_001", itemName: "Rice Sack (50kg)", itemCode: "RIC-50", category: "perishable", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🌾", createdAt: today },
    { id: "i_002", itemName: "Cement Bag (50kg)", itemCode: "CEM-50", category: "construction", unitType: "sack", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🧱", createdAt: today },
    { id: "i_003", itemName: "Gas Cylinder (12kg)", itemCode: "GAS-12", category: "general_cargo", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "🔥", createdAt: today },
    { id: "i_004", itemName: "General Cargo Carton", itemCode: "GEN-CT", category: "general_cargo", unitType: "piece", defaultTaxRate: 8, taxInclusive: true, activeStatus: true, icon: "📦", createdAt: today },
  ]);

  const itemPriceRates = withTenant([
    { id: "p_001", itemId: "i_001", priceLevel: "business", priceTaxInclusive: 128 },
    { id: "p_002", itemId: "i_002", priceLevel: "government", priceTaxInclusive: 140 },
    { id: "p_003", itemId: "i_003", priceLevel: "standard", priceTaxInclusive: 195 },
    { id: "p_004", itemId: "i_004", priceLevel: "walk_in", priceTaxInclusive: 35 },
  ]);

  const trips = withTenant([
    { id: "t_001", tripNumber: "TRIP-2026-000142", vesselName: "MV Ocean Star", originDestinationId: "d_003", returnDestinationId: "d_001", plannedDepartureAt: today, actualDepartureAt: today, plannedArrivalAt: new Date(Date.now() + 8 * 3600000).toISOString(), status: "loading", openedBy: owner.uid, notes: "Mixed cargo for southern atolls. Fuel and construction priority.", createdAt: today },
    { id: "t_002", tripNumber: "TRIP-2026-000141", vesselName: "MV Ocean Star", originDestinationId: "d_002", returnDestinationId: "d_001", plannedDepartureAt: yesterday, actualDepartureAt: yesterday, plannedArrivalAt: new Date(Date.now() - 16 * 3600000).toISOString(), actualArrivalAt: new Date(Date.now() - 14 * 3600000).toISOString(), status: "ended", openedBy: owner.uid, endedBy: owner.uid, notes: "Hulhumale supply run. All deliveries confirmed.", createdAt: yesterday },
  ]);

  const operations = withTenant([
    {
      id: "op_001",
      tripId: "t_001",
      operationType: "loading",
      destinationId: "d_003",
      customerId: "c_002",
      items: [
        { id: "oi_001", businessProfileId, tripId: "t_001", operationId: "op_001", destinationId: "d_003", customerId: "c_002", itemId: "i_002", itemNameSnapshot: "Cement Bag (50kg)", unitType: "sack", quantity: 120, unitPriceTaxInclusive: 140, taxRate: 8, taxAmount: 1244.44, lineTotalTaxInclusive: 16800, createdBy: owner.uid, createdAt: today },
      ],
      totalTaxInclusive: 16800,
      totalTax: 1244.44,
      createdBy: owner.uid,
      createdAt: today,
      synced: true,
    },
  ]);

  const bills = withTenant([
    { id: "b_001", tripId: "t_002", destinationId: "d_002", customerId: "c_001", billNumber: "OCE-HUL-000088", billType: "credit", billStatus: "partially_paid", subtotalTaxInclusive: 32400, taxTotal: 2400, grandTotal: 32400, paymentStatus: "partial", paidAmount: 18000, createdBy: owner.uid, finalizedBy: owner.uid, finalizedAt: yesterday, createdAt: yesterday, itemCount: 12 },
  ]);

  const payments = withTenant([
    { id: "pm_001", billId: "b_001", paymentNumber: "OCE-RCP-000214", amount: 18000, method: "bank_transfer", reference: "BNK-TRF-4521", collectedBy: owner.uid, collectedAt: yesterday, notes: "Partial settlement from STO Maldives" },
  ]);

  const taxSettings = withTenant([
    { id: "tx_001", taxName: "GST", taxRate: 8, taxInclusiveEnabled: true, activeStatus: true },
  ]);

  const numbering = withTenant([
    { id: "trip", numberType: "trip", prefix: "TRIP", currentSequence: 142, formatTemplate: "TRIP-{YYYY}-{000000}", padding: 6, lastGenerated: "TRIP-2026-000142" },
    { id: "bill", numberType: "bill", prefix: "VESSEL", currentSequence: 88, formatTemplate: "{VESSEL}-{DEST}-{000000}", padding: 6, lastGenerated: "OCE-HUL-000088" },
    { id: "invoice", numberType: "invoice", prefix: "INV", currentSequence: 78, formatTemplate: "INV-{YYYY}-{MM}-{000000}", padding: 6, lastGenerated: "INV-2026-01-000078" },
    { id: "receipt", numberType: "receipt", prefix: "VESSEL", currentSequence: 214, formatTemplate: "{VESSEL}-RCP-{000000}", padding: 6, lastGenerated: "OCE-RCP-000214" },
    { id: "payment", numberType: "payment", prefix: "PAY", currentSequence: 214, formatTemplate: "PAY-{000000}", padding: 6, lastGenerated: "PAY-000214" },
    { id: "customer", numberType: "customer", prefix: "CUS", currentSequence: 4, formatTemplate: "CUS-{000000}", padding: 6, lastGenerated: "CUS-000004" },
  ]);

  const auditLogs = withTenant([
    { id: "al_001", actorUserId: owner.uid, action: "demo.seed", entityType: "business_profile", entityId: businessProfileId, createdAt: today, summary: "Seeded Firebase demo tenant for AtollCargo" },
    { id: "al_002", actorUserId: owner.uid, action: "trip.open", entityType: "trip", entityId: "t_001", createdAt: today, summary: "Opened trip TRIP-2026-000142 to Addu City" },
    { id: "al_003", actorUserId: owner.uid, action: "payment.post", entityType: "payment", entityId: "pm_001", createdAt: yesterday, summary: "Posted MVR 18,000 partial payment from STO Maldives" },
  ]);

  const notifications = withTenant([
    { id: "n_001", title: "Trip is loading", body: "TRIP-2026-000142 is in active loading at Male'.", type: "info", createdAt: today, read: false },
    { id: "n_002", title: "Payment received", body: "MVR 18,000 partial payment from STO Maldives.", type: "success", createdAt: yesterday, read: true },
  ]);

  await writeRoot("business_profiles", businessProfileId, businessProfile);
  await writeRoot("business_users", owner.uid, users[0]);

  const writeMany = async (collectionName, items) => {
    for (const item of items) {
      await writeTenant(collectionName, item.id, item);
    }
  };

  await writeMany("business_users", users);
  await writeMany("destinations", destinations);
  await writeMany("customers", customers);
  await writeMany("catalog_items", catalogItems);
  await writeMany("item_price_rates", itemPriceRates);
  await writeMany("trips", trips);
  await writeMany("operations", operations);
  await writeMany("bills", bills);
  await writeMany("payments", payments);
  await writeMany("tax_settings", taxSettings);
  await writeMany("numbering_sequences", numbering);
  await writeMany("audit_logs", auditLogs);
  await writeMany("notifications", notifications);

  console.log(JSON.stringify({
    ok: true,
    projectId: firebaseConfig.projectId,
    email: demoEmail,
    password: demoPassword,
    businessProfileId,
    uid: owner.uid,
    counts: {
      users: users.length,
      destinations: destinations.length,
      customers: customers.length,
      catalogItems: catalogItems.length,
      trips: trips.length,
      bills: bills.length,
      payments: payments.length,
    },
  }, null, 2));
  process.exit(0);
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
