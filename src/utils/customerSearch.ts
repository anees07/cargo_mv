import type { Customer } from "../types.js";
import { customerMatchesDestination } from "./walkInDetails.js";

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();
const normalizePhoneValue = (value: string) => value.replace(/\D/g, "");

export function filterCustomersForPicker(customers: Customer[], destinationId: string | null | undefined, search: string): Customer[] {
  const scopedCustomers = customers.filter(customer => customerMatchesDestination(customer, destinationId));
  const query = normalizeSearchValue(search);
  if (!query) return scopedCustomers;

  const phoneQuery = normalizePhoneValue(query);
  return scopedCustomers.filter(customer => {
    const searchableText = [
      customer.displayName,
      customer.legalName,
      customer.customerType.replace("_", " "),
      customer.defaultPriceLevelId,
    ].join(" ").toLowerCase();
    const customerPhone = normalizePhoneValue(customer.phone || "");

    return searchableText.includes(query) || Boolean(phoneQuery && customerPhone.includes(phoneQuery));
  });
}
