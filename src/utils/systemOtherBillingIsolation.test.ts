import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("system other loading lines stay in the normal operation and draft bill merge path", () => {
  const store = readFileSync("src/store.tsx", "utf8");

  assert.doesNotMatch(store, /function isIsolatedSystemOtherLoading/);
  assert.doesNotMatch(store, /isolatedSystemOtherOperationId/);
  assert.match(store, /const reusableOperation = current\.operations\.find\(o =>/);
  assert.match(store, /const operationId = reusableOperation\?\.id \|\| operationDocumentId\(first\.tripId, operationType, first\.destinationId, first\.customerId\)/);
  assert.match(store, /let existingBill = current\.bills\.find\(b =>/);
  assert.match(store, /billMatchesOperationIdentity\(b, op, current\.customers\)/);
  assert.match(store, /isBillEditableBeforeFinalize\(b\)/);
  assert.match(store, /mergeOperationItems\(remoteOperation\.items, remoteBill\.items \|\| \[\]\)/);
});
