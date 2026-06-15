import assert from "node:assert/strict";
import test from "node:test";

import type { NumberingSequence } from "../types.ts";
import { formatSequenceNumber, vesselCodeFromName } from "./numbering.ts";

const sequence = (formatTemplate: string): NumberingSequence => ({
  id: "bill",
  businessProfileId: "bp_1",
  numberType: "bill",
  prefix: "VESSEL",
  currentSequence: 0,
  formatTemplate,
  padding: 6,
  lastGenerated: "",
});

test("vessel code uses the registered vessel name without common vessel prefixes", () => {
  assert.equal(vesselCodeFromName("MV Ocean Star"), "OCE");
  assert.equal(vesselCodeFromName("Sea Queen"), "SEA");
});

test("bill numbers replace BILL with the vessel code and keep destination code", () => {
  assert.equal(
    formatSequenceNumber(sequence("{VESSEL}-{DEST}-{000000}"), 1, {
      destCode: "MLE",
      vesselName: "MV Ocean Star",
    }),
    "OCE-MLE-000001",
  );
});

test("receipt numbers include vessel code while staying distinct from bill numbers", () => {
  assert.equal(
    formatSequenceNumber(sequence("{VESSEL}-RCP-{000000}"), 1, {
      vesselName: "MV Ocean Star",
    }),
    "OCE-RCP-000001",
  );
});
