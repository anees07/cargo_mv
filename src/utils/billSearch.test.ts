import assert from "node:assert/strict";
import test from "node:test";

import { filterBillsForSearch } from "./billSearch.js";
import type { Bill, Customer } from "../types.js";

const bill = (overrides: Partial<Bill>): Bill => ({
  id: "bill_1",
  businessProfileId: "bp_1",
  tripId: "trip_1",
  destinationId: "dest_1",
  customerId: "customer_1",
  billNumber: "BILL-ADD-000034",
  billType: "loading_bill",
  billStatus: "draft",
  subtotalTaxInclusive: 100,
  taxTotal: 7.41,
  grandTotal: 100,
  paymentStatus: "unpaid",
  paidAmount: 0,
  createdBy: "user_1",
  createdAt: "2026-06-18T08:00:00.000Z",
  itemCount: 1,
  ...overrides,
});

const customer = (overrides: Partial<Customer>): Customer => ({
  id: "customer_1",
  businessProfileId: "bp_1",
  customerType: "business",
  displayName: "North Reef Hardware",
  legalName: "North Reef Hardware Pvt Ltd",
  phone: "7771122",
  nationalIdOrRegNo: "",
  defaultDestinationId: "dest_1",
  defaultPriceLevelId: "business",
  creditAllowed: true,
  creditLimit: 0,
  outstandingBalance: 0,
  activeStatus: true,
  ...overrides,
});

test("bill search matches customer display name", () => {
  const results = filterBillsForSearch([
    bill({ id: "north", customerId: "customer_1" }),
    bill({ id: "other", customerId: "customer_2" }),
  ], [
    customer({ id: "customer_1", displayName: "North Reef Hardware" }),
    customer({ id: "customer_2", displayName: "Ahmed Mohamed", legalName: "Ahmed Mohamed" }),
  ], "reef");

  assert.deepEqual(results.map(item => item.id), ["north"]);
});

test("bill search matches customer phone number", () => {
  const results = filterBillsForSearch([
    bill({ id: "phone_match", customerId: "customer_1" }),
    bill({ id: "phone_miss", customerId: "customer_2" }),
  ], [
    customer({ id: "customer_1", phone: "777 1122" }),
    customer({ id: "customer_2", phone: "9553344" }),
  ], "7771");

  assert.deepEqual(results.map(item => item.id), ["phone_match"]);
});

test("bill search matches bill number and walk-in details", () => {
  const bills = [
    bill({ id: "number_match", billNumber: "BILL-HUL-000035", customerId: "walk_in", walkInDetails: { name: "Ahmed Mohamed", phone: "7440000" } }),
    bill({ id: "name_match", billNumber: "BILL-ADD-000034", customerId: "walk_in", walkInDetails: { name: "Sarusana Privet Limited", phone: "7330000" } }),
  ];
  const results = filterBillsForSearch(bills, [], "hul");

  assert.deepEqual(results.map(item => item.id), ["number_match"]);
  assert.deepEqual(filterBillsForSearch(bills, [], "sarusana").map(item => item.id), ["name_match"]);
});
