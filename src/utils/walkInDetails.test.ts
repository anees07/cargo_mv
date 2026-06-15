import assert from "node:assert/strict";
import test from "node:test";

import {
  customerMatchesDestination,
  isWalkInCustomer,
  isWalkInDetailsComplete,
  walkInDisplayName,
  walkInPhone,
} from "./walkInDetails.js";
import type { Customer } from "../types.js";

const walkInCustomer: Pick<Customer, "customerType" | "displayName" | "phone" | "defaultDestinationId"> = {
  customerType: "walk_in",
  displayName: "Walk-in Customer",
  phone: "-",
  defaultDestinationId: "male",
};

const regularCustomer: Pick<Customer, "customerType" | "displayName" | "phone" | "defaultDestinationId"> = {
  customerType: "business",
  displayName: "Anees Traders",
  phone: "7770000",
  defaultDestinationId: "male",
};

test("walk-in customers require name and phone before cargo entry", () => {
  assert.equal(isWalkInDetailsComplete(walkInCustomer, { name: "", phone: "7770000" }), false);
  assert.equal(isWalkInDetailsComplete(walkInCustomer, { name: "Ali", phone: "" }), false);
  assert.equal(isWalkInDetailsComplete(walkInCustomer, { name: " Ali ", phone: " 7770000 " }), true);
});

test("non walk-in customers do not require one-off details", () => {
  assert.equal(isWalkInDetailsComplete(regularCustomer, undefined), true);
});

test("walk-in display prefers one-off operation and bill details", () => {
  assert.equal(isWalkInCustomer(walkInCustomer), true);
  assert.equal(walkInDisplayName(walkInCustomer, { name: "Fathimath", phone: "7550000" }), "Fathimath");
  assert.equal(walkInPhone(walkInCustomer, { name: "Fathimath", phone: "7550000" }), "7550000");
  assert.equal(walkInDisplayName(regularCustomer, { name: "Ignored", phone: "7000000" }), "Anees Traders");
});

test("walk-in customer is available for every destination without duplicating customer records", () => {
  assert.equal(customerMatchesDestination(walkInCustomer, "addu"), true);
  assert.equal(customerMatchesDestination(regularCustomer, "addu"), false);
  assert.equal(customerMatchesDestination(regularCustomer, "male"), true);
});
