import { initializeApp } from "firebase/app";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFX-50uxkzWuVJAk3f68ou8eOzyflQkWM",
  authDomain: "cargomv-d41f8.firebaseapp.com",
  projectId: "cargomv-d41f8",
  storageBucket: "cargomv-d41f8.firebasestorage.app",
  messagingSenderId: "497131341189",
  appId: "1:497131341189:web:70ae5a1bf264e2c0e270ec",
};

const businessProfileId = "bp_demo_atollcargo";
const demoEmail = "demo@atollcargo.mv";
const demoPassword = "AtollCargoDemo#2026";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const tenantDoc = (collectionName, id) =>
  doc(db, "business_profiles", businessProfileId, collectionName, id);

async function expectPermissionDenied(label, action) {
  try {
    await action();
  } catch (error) {
    if (error?.code === "permission-denied") {
      return true;
    }
    throw new Error(`${label} failed with unexpected error: ${error?.code || error}`);
  }
  throw new Error(`${label} was allowed but should be denied`);
}

async function expectRealtimeDoc(collectionName, id, data) {
  const target = tenantDoc(collectionName, id);
  const seen = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for realtime ${collectionName}/${id}`));
    }, 10000);
    const unsubscribe = onSnapshot(collection(db, "business_profiles", businessProfileId, collectionName), snapshot => {
      if (snapshot.docs.some(document => document.id === id)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    }, reject);
    setDoc(target, data).catch(reject);
  });
  await deleteDoc(target);
  return seen;
}

async function main() {
  const credential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
  const stamp = Date.now();

  const destination = {
    id: `smoke_dest_${stamp}`,
    businessProfileId,
    islandName: "Smoke Island",
    atoll: "Kaafu",
    destinationCode: "SMK",
    activeStatus: true,
    sortOrder: 999,
  };
  const customer = {
    id: `smoke_customer_${stamp}`,
    businessProfileId,
    customerType: "business",
    displayName: "Smoke Customer",
    legalName: "Smoke Customer Pvt Ltd",
    phone: "+960 700 0000",
    nationalIdOrRegNo: "SMOKE-001",
    gstNumber: "GST-SMOKE-001",
    defaultDestinationId: destination.id,
    defaultPriceLevelId: "business",
    creditAllowed: true,
    creditLimit: 1000,
    outstandingBalance: 0,
    activeStatus: true,
    createdAt: new Date().toISOString(),
  };
  const catalogItem = {
    id: `smoke_item_${stamp}`,
    businessProfileId,
    itemName: "Smoke Cargo",
    itemCode: "SMK-CG",
    category: "general_cargo",
    unitType: "piece",
    defaultTaxRate: 8,
    taxInclusive: true,
    activeStatus: true,
    icon: "box",
    createdAt: new Date().toISOString(),
  };
  const priceRate = {
    id: `smoke_price_${stamp}`,
    businessProfileId,
    itemId: catalogItem.id,
    priceLevel: "standard",
    priceTaxInclusive: 25,
  };
  const trip = {
    id: `smoke_trip_${stamp}`,
    businessProfileId,
    tripNumber: `SMOKE-${stamp}`,
    vesselName: "MV Ocean Star",
    originDestinationId: destination.id,
    returnDestinationId: destination.id,
    plannedDepartureAt: new Date().toISOString(),
    plannedArrivalAt: new Date(Date.now() + 3600000).toISOString(),
    status: "draft",
    openedBy: credential.user.uid,
    notes: "Smoke test trip",
    createdAt: new Date().toISOString(),
  };
  const operation = {
    id: `smoke_operation_${stamp}`,
    businessProfileId,
    tripId: trip.id,
    operationType: "loading",
    destinationId: destination.id,
    customerId: customer.id,
    walkInDetails: {
      name: "Smoke Walk-in",
      phone: "7770000",
      description: "Rules smoke test",
    },
    items: [],
    totalTaxInclusive: 0,
    totalTax: 0,
    createdBy: credential.user.uid,
    createdAt: new Date().toISOString(),
    synced: true,
  };
  const bill = {
    id: `smoke_bill_${stamp}`,
    businessProfileId,
    tripId: trip.id,
    destinationId: destination.id,
    customerId: customer.id,
    walkInDetails: {
      name: "Smoke Walk-in",
      phone: "7770000",
      description: "Rules smoke test",
    },
    billNumber: `SMOKE-BILL-${stamp}`,
    billType: "credit",
    billStatus: "draft",
    subtotalTaxInclusive: 25,
    taxTotal: 1.85,
    grandTotal: 25,
    paymentStatus: "unpaid",
    paidAmount: 0,
    createdBy: credential.user.uid,
    createdAt: new Date().toISOString(),
    itemCount: 1,
  };
  const payment = {
    id: `smoke_payment_${stamp}`,
    businessProfileId,
    billId: bill.id,
    paymentNumber: `SMOKE-RCP-${stamp}`,
    amount: 10,
    method: "cash",
    reference: "SMOKE",
    collectedBy: credential.user.uid,
    collectedAt: new Date().toISOString(),
    notes: "Smoke payment",
  };

  const created = [
    ["destinations", destination],
    ["customers", customer],
    ["catalog_items", catalogItem],
    ["item_price_rates", priceRate],
    ["trips", trip],
    ["operations", operation],
    ["bills", bill],
    ["payments", payment],
  ];

  for (const [collectionName, data] of created) {
    await setDoc(tenantDoc(collectionName, data.id), data);
  }

  await setDoc(tenantDoc("destinations", destination.id), {
    ...destination,
    islandName: "Smoke Island Updated",
    updatedAt: new Date().toISOString(),
  });

  const realtimeSeen = await expectRealtimeDoc("notifications", `smoke_notification_${stamp}`, {
    id: `smoke_notification_${stamp}`,
    businessProfileId,
    title: "Smoke realtime",
    body: "Realtime listener verification",
    type: "info",
    createdAt: new Date().toISOString(),
    read: false,
  });

  const rootDenied = await expectPermissionDenied("root tenant collection read", () =>
    getDocs(collection(db, "destinations")),
  );
  const vesselDenied = await expectPermissionDenied("extra vessel write", () =>
    setDoc(tenantDoc("vessels", `smoke_vessel_${stamp}`), {
      id: `smoke_vessel_${stamp}`,
      businessProfileId,
      vesselName: "Second Vessel",
    }),
  );
  const invalidTenantDenied = await expectPermissionDenied("wrong businessProfileId write", () =>
    setDoc(tenantDoc("destinations", `smoke_wrong_tenant_${stamp}`), {
      ...destination,
      id: `smoke_wrong_tenant_${stamp}`,
      businessProfileId: "bp_other_business",
    }),
  );

  for (const [collectionName, data] of created.reverse()) {
    await deleteDoc(tenantDoc(collectionName, data.id));
  }

  console.log(JSON.stringify({
    ok: true,
    uid: credential.user.uid,
    businessProfileId,
    createdUpdatedDeleted: created.length,
    realtimeSeen,
    rootDenied,
    vesselDenied,
    invalidTenantDenied,
  }, null, 2));
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
