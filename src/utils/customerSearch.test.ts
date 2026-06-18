import assert from "node:assert/strict";
import test from "node:test";

import { filterCustomersForPicker } from "./customerSearch.js";
import type { Customer } from "../types.js";

const customer = (overrides: Partial<Customer>): Customer => ({
  id: "customer_1",
  businessProfileId: "bp_1",
  customerType: "business",
  displayName: "Addu City Council",
  legalName: "Addu City Council",
  phone: "7771122",
  nationalIdOrRegNo: "",
  defaultDestinationId: "addu",
  defaultPriceLevelId: "government",
  creditAllowed: true,
  creditLimit: 0,
  outstandingBalance: 0,
  activeStatus: true,
  ...overrides,
});

test("customer picker search keeps results scoped to the selected destination", () => {
  const results = filterCustomersForPicker([
    customer({ id: "addu_council", displayName: "Addu City Council", defaultDestinationId: "addu" }),
    customer({ id: "male_council", displayName: "Male City Council", defaultDestinationId: "male" }),
  ], "addu", "city council");

  assert.deepEqual(results.map(item => item.id), ["addu_council"]);
});

test("customer picker search matches customer phone numbers", () => {
  const results = filterCustomersForPicker([
    customer({ id: "sto", displayName: "STO Maldives", phone: "7771122", defaultDestinationId: "male" }),
    customer({ id: "mifco", displayName: "MIFCO", phone: "9553344", defaultDestinationId: "male" }),
  ], "male", "777");

  assert.deepEqual(results.map(item => item.id), ["sto"]);
});

test("customer picker search returns destination customers when search is empty", () => {
  const results = filterCustomersForPicker([
    customer({ id: "business", defaultDestinationId: "male" }),
    customer({ id: "government", defaultDestinationId: "male" }),
    customer({ id: "other_destination", defaultDestinationId: "addu" }),
  ], "male", "   ");

  assert.deepEqual(results.map(item => item.id), ["business", "government"]);
});
