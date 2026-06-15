import assert from "node:assert/strict";
import test from "node:test";

import type { NumberingSequence } from "../types.ts";
import { formatSequenceNumber } from "./numbering.ts";

const sequence = (formatTemplate: string, numberType: NumberingSequence["numberType"] = "bill"): NumberingSequence => ({
  id: numberType,
  businessProfileId: "bp_1",
  numberType,
  prefix: numberType === "receipt" ? "RCP" : "BILL",
  currentSequence: 0,
  formatTemplate,
  padding: 6,
  lastGenerated: "",
});

test("bill numbers use BILL prefix and destination code", () => {
  assert.equal(
    formatSequenceNumber(sequence("BILL-{DEST}-{000000}"), 1, "MLE"),
    "BILL-MLE-000001",
  );
});

test("receipt numbers use RCP prefix without vessel code", () => {
  assert.equal(
    formatSequenceNumber(sequence("RCP-{000000}", "receipt"), 214),
    "RCP-000214",
  );
});
