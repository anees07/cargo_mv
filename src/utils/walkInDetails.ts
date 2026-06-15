import type { Customer, WalkInDetails } from "../types.js";

type CustomerIdentity = Pick<Customer, "customerType" | "displayName" | "phone" | "defaultDestinationId">;

export const emptyWalkInDetails: WalkInDetails = {
  name: "",
  phone: "",
  description: "",
};

export function isWalkInCustomer(customer?: Pick<Customer, "customerType"> | null): boolean {
  return customer?.customerType === "walk_in";
}

export function isWalkInDetailsComplete(
  customer?: Pick<Customer, "customerType"> | null,
  details?: Pick<WalkInDetails, "name" | "phone"> | null
): boolean {
  if (!isWalkInCustomer(customer)) return true;
  return Boolean(details?.name.trim() && details?.phone.trim());
}

export function cleanWalkInDetails(details: WalkInDetails): WalkInDetails {
  return {
    name: details.name.trim(),
    phone: details.phone.trim(),
    description: details.description?.trim() || undefined,
  };
}

export function walkInDisplayName(customer?: CustomerIdentity | null, details?: WalkInDetails): string {
  if (isWalkInCustomer(customer) && details?.name.trim()) {
    return details.name.trim();
  }
  return customer?.displayName || "Customer";
}

export function walkInPhone(customer?: Pick<Customer, "customerType" | "phone"> | null, details?: WalkInDetails): string {
  if (isWalkInCustomer(customer) && details?.phone.trim()) {
    return details.phone.trim();
  }
  return customer?.phone || "-";
}

export function customerMatchesDestination(customer: CustomerIdentity, destinationId: string | null | undefined): boolean {
  return isWalkInCustomer(customer) || !destinationId || customer.defaultDestinationId === destinationId;
}
