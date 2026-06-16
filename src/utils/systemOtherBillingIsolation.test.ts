import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("system other loading lines are isolated from grouped operation and draft bill merge paths", () => {
  const store = readFileSync("src/store.tsx", "utf8");

  assert.match(store, /function isIsolatedSystemOtherLoading/);
  assert.match(store, /isolatedSystemOtherOperationId\(first\.tripId, operationType, first\.destinationId, first\.customerId\)/);
  assert.match(store, /const shouldCreateSeparateSystemOtherBill = op\.operationType === "loading"/);
  assert.match(store, /const existingBill = shouldCreateSeparateSystemOtherBill \? undefined : state\.bills\.find/);
  assert.match(store, /!isSystemOtherOnlyOperation\(o\)/);
});
