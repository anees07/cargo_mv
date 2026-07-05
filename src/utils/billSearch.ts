import type { Bill, Customer, Trip } from "../types.js";
import { walkInDisplayName, walkInPhone } from "./walkInDetails.js";

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");

export function filterBillsForSearch(bills: Bill[], customers: Customer[], search: string, trips: Trip[] = []): Bill[] {
  const query = normalizeText(search);
  if (!query) return bills;

  const phoneQuery = normalizePhone(query);
  return bills.filter(bill => {
    const customer = customers.find(item => item.id === bill.customerId);
    const trip = trips.find(item => item.id === bill.tripId);
    const customerName = walkInDisplayName(customer, bill.walkInDetails);
    const customerPhone = walkInPhone(customer, bill.walkInDetails);
    const searchableText = [
      bill.billNumber,
      trip?.tripNumber || "",
      customerName,
      customer?.legalName || "",
      bill.walkInDetails?.name || "",
    ].join(" ").toLowerCase();

    return searchableText.includes(query) ||
      Boolean(phoneQuery && normalizePhone(customerPhone).includes(phoneQuery));
  });
}
