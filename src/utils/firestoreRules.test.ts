import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("bill reconciliation fields are allowed by Firestore tenant writes", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const validTenantDoc = rules.match(/function validTenantDoc\(data\) \{[\s\S]*?\n    \}/)?.[0] || "";

  assert.match(validTenantDoc, /'offloadedItems'/);
});
