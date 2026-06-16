import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("system other loading lines stay in the normal operation and draft bill merge path", () => {
  const store = readFileSync("src/store.tsx", "utf8");

  assert.doesNotMatch(store, /function isIsolatedSystemOtherLoading/);
  assert.doesNotMatch(store, /isolatedSystemOtherOperationId/);
  assert.match(store, /const operationId = reusableOperation\?\.id \|\| operationDocumentId\(first\.tripId, operationType, first\.destinationId, first\.customerId\)/);
  assert.match(store, /const existingBill = current\.bills\.find\(b =>\s+billMatchesOperationIdentity\(b, op, current\.customers\)/);
  assert.match(store, /function mergeDuplicateDraftBills/);
});
