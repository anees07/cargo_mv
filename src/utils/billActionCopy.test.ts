import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("operation bill action keeps generate wording for draft bill merges", () => {
  const operationScreen = readFileSync("src/screens/OperationScreen.tsx", "utf8");
  const store = readFileSync("src/store.tsx", "utf8");
  const operationBillPath = store.match(/const createBillFromOperation[\s\S]*?\n  }, \[state\.bills/)?.[0] || "";

  assert.match(operationScreen, /Generate bill/);
  assert.doesNotMatch(operationScreen, /Update bill/);
  assert.doesNotMatch(operationBillPath, /billing\.update_draft|Bill updated|Bill not updated|Updated draft bill/);
});

test("invoice preview renders saved route text in the visible destination block", () => {
  const billingScreen = readFileSync("src/screens/BillingScreens.tsx", "utf8");
  const billToBlock = billingScreen.match(/\{\/\* Bill to \*\/\}[\s\S]*?\{\/\* Line items table \*\/\}/)?.[0] || "";

  assert.match(billingScreen, /const routeDescription = \(bill\.routeDescription \|\| bill\.notes \|\| ""\)\.trim\(\);/);
  assert.match(billToBlock, /routeDescription &&/);
  assert.match(billToBlock, /Route:/);
});

test("billing screen exposes draft bill destination correction through shared backend action", () => {
  const billingScreen = readFileSync("src/screens/BillingScreens.tsx", "utf8");
  const store = readFileSync("src/store.tsx", "utf8");

  assert.match(billingScreen, /ChangeBillDestinationForm/);
  assert.match(billingScreen, /updateBillDestination\(movingBill\.id, destinationId, reason\)/);
  assert.match(billingScreen, /updateBillDestination\(bill\.id, destinationId, reason\)/);
  assert.match(billingScreen, />Destination<\/Btn>/);
  assert.match(store, /const updateBillDestination = useCallback/);
  assert.match(store, /moveDraftBillDestination\(bill, nextDestination/);
});
