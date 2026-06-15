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
