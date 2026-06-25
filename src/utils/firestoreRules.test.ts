import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("bill reconciliation fields are allowed by Firestore tenant writes", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const validTenantDoc = rules.match(/function validTenantDoc\(data\) \{[\s\S]*?\n    \}/)?.[0] || "";

  assert.match(validTenantDoc, /'offloadedItems'/);
});

test("customer price level adjustment writes are covered by Firestore rules", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const priceLevelRule = rules.match(/match \/price_levels\/\{priceLevelId\} \{[\s\S]*?allow delete: if false;\n      \}/)?.[0] || "";
  const validator = rules.match(/function validCustomerPriceLevel\(data\) \{[\s\S]*?\n    \}/)?.[0] || "";

  assert.match(priceLevelRule, /allow update:/);
  assert.match(validator, /'adjustmentType'/);
  assert.match(validator, /'adjustmentValue'/);
  assert.match(validator, /'fixed_amount'/);
  assert.match(validator, /data\.adjustmentValue >= -100000/);
});

test("summary aggregate collections are server-owned in Firestore rules", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const summaryRule = rules.match(/match \/summary_reports\/\{summaryId\} \{[\s\S]*?allow write: if false;\n      \}/)?.[0] || "";
  const aggregateEventsRule = rules.match(/match \/aggregate_events\/\{eventId\} \{[\s\S]*?allow read, write: if false;\n      \}/)?.[0] || "";
  const genericTenantRule = rules.match(/match \/\{collectionName\}\/\{docId\} \{[\s\S]*?\n      \}/)?.[0] || "";

  assert.match(summaryRule, /allow read: if isBusinessMember\(businessProfileId\)/);
  assert.match(summaryRule, /allow write: if false/);
  assert.match(aggregateEventsRule, /allow read, write: if false/);
  assert.match(genericTenantRule, /collectionName != 'summary_reports'/);
  assert.match(genericTenantRule, /collectionName != 'aggregate_events'/);
});
