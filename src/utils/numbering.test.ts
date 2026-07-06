import assert from "node:assert/strict";
import test from "node:test";

import type { NumberingSequence } from "../types.ts";
import { formatSequenceNumber, replaceBillDestinationCode } from "./numbering.ts";

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

test("bill destination code can be corrected without changing sequence", () => {
  assert.equal(replaceBillDestinationCode("BILL-MUL-000084", "GAN"), "BILL-GAN-000084");
});

test("bill destination code replacement leaves non-standard bill numbers unchanged", () => {
  assert.equal(replaceBillDestinationCode("INV-2026-07-000084", "GAN"), "INV-2026-07-000084");
});
