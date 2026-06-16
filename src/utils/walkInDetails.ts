import type { Customer, WalkInDetails } from "../types.js";

type CustomerIdentity = Pick<Customer, "customerType" | "displayName" | "phone" | "defaultDestinationId">;
type WalkInDestination = {
  id: string;
  islandName: string;
};

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
  return !destinationId || customer.defaultDestinationId === destinationId;
}

export function walkInCustomerIdForDestination(destinationId: string): string {
  return `walk_in_${destinationId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export function buildDestinationWalkInCustomer(
  businessProfileId: string,
  destination: WalkInDestination,
  createdAt = new Date().toISOString(),
): Customer {
  return {
    id: walkInCustomerIdForDestination(destination.id),
    businessProfileId,
    customerType: "walk_in",
    displayName: `Walk-in Customer - ${destination.islandName}`,
    legalName: "Walk-in",
    phone: "-",
    nationalIdOrRegNo: "-",
    defaultDestinationId: destination.id,
    defaultPriceLevelId: "walk_in",
    creditAllowed: false,
    creditLimit: 0,
    outstandingBalance: 0,
    activeStatus: true,
    createdAt,
  };
}

export function ensureDestinationWalkInCustomers(
  businessProfileId: string,
  destinations: WalkInDestination[],
  customers: Customer[],
  createdAt = new Date().toISOString(),
): Customer[] {
  const existingWalkInDestinationIds = new Set(
    customers
      .filter(customer => isWalkInCustomer(customer))
      .map(customer => customer.defaultDestinationId)
  );
  return destinations
    .filter(destination => !existingWalkInDestinationIds.has(destination.id))
    .map(destination => buildDestinationWalkInCustomer(businessProfileId, destination, createdAt));
}
