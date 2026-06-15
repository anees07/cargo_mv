import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("offloading tab does not render the live operation item cart", () => {
  const operationScreen = readFileSync("src/screens/OperationScreen.tsx", "utf8");

  assert.match(
    operationScreen,
    /opType !== "offloading" && currentOp && currentOp\.items\.length > 0/
  );
});
