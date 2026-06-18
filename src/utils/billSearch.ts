import type { Bill, Customer } from "../types.js";
import { walkInDisplayName, walkInPhone } from "./walkInDetails.js";

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");

export function filterBillsForSearch(bills: Bill[], customers: Customer[], search: string): Bill[] {
  const query = normalizeText(search);
  if (!query) return bills;

  const phoneQuery = normalizePhone(query);
  return bills.filter(bill => {
    const customer = customers.find(item => item.id === bill.customerId);
    const customerName = walkInDisplayName(customer, bill.walkInDetails);
    const customerPhone = walkInPhone(customer, bill.walkInDetails);
    const searchableText = [
      bill.billNumber,
      customerName,
      customer?.legalName || "",
      bill.walkInDetails?.name || "",
    ].join(" ").toLowerCase();

    return searchableText.includes(query) ||
      Boolean(phoneQuery && normalizePhone(customerPhone).includes(phoneQuery));
  });
}
