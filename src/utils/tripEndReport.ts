import type { A4DocumentPayload } from "./documentActions.js";
import { MVR, formatDate, formatDateTime } from "./format.js";
import type { Bill, BusinessProfile, Customer, Destination, Trip } from "../types.js";
import { walkInDisplayName } from "./walkInDetails.js";

export type TripEndDestinationSummary = {
  destinationId: string;
  destinationName: string;
  destinationCode?: string;
  atoll?: string;
  billCount: number;
  itemCount: number;
  subtotalTaxInclusive: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  bills: Bill[];
};

export type TripEndBillSummary = {
  tripId: string;
  tripNumber: string;
  destinations: TripEndDestinationSummary[];
  billCount: number;
  itemCount: number;
  subtotalTaxInclusive: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
};

function money(value: number) {
  return Number(value.toFixed(2));
}

function destinationSortValue(group: TripEndDestinationSummary) {
  return `${group.destinationName.toLowerCase()}-${group.destinationCode || ""}`;
}

export function buildTripEndBillSummary(
  trip: Trip,
  bills: Bill[],
  destinations: Destination[],
): TripEndBillSummary {
  const destinationsById = new Map(destinations.map(destination => [destination.id, destination]));
  const groups = new Map<string, TripEndDestinationSummary>();

  for (const bill of bills) {
    if (bill.tripId !== trip.id || bill.billStatus === "cancelled") continue;
    const destination = destinationsById.get(bill.destinationId);
    const destinationId = destination?.id || bill.destinationId || "unknown_destination";
    const existing = groups.get(destinationId);
    const group = existing || {
      destinationId,
      destinationName: destination?.islandName || "Unknown destination",
      destinationCode: destination?.destinationCode,
      atoll: destination?.atoll,
      billCount: 0,
      itemCount: 0,
      subtotalTaxInclusive: 0,
      taxTotal: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceDue: 0,
      bills: [],
    };

    group.billCount += 1;
    group.itemCount += bill.itemCount || bill.items?.length || 0;
    group.subtotalTaxInclusive = money(group.subtotalTaxInclusive + bill.subtotalTaxInclusive);
    group.taxTotal = money(group.taxTotal + bill.taxTotal);
    group.grandTotal = money(group.grandTotal + bill.grandTotal);
    group.paidAmount = money(group.paidAmount + bill.paidAmount);
    group.balanceDue = money(group.balanceDue + Math.max(0, bill.grandTotal - bill.paidAmount));
    group.bills.push(bill);
    groups.set(destinationId, group);
  }

  const destinationGroups = Array.from(groups.values())
    .sort((a, b) => destinationSortValue(a).localeCompare(destinationSortValue(b)))
    .map(group => ({
      ...group,
      bills: [...group.bills].sort((a, b) => a.billNumber.localeCompare(b.billNumber)),
    }));

  return {
    tripId: trip.id,
    tripNumber: trip.tripNumber,
    destinations: destinationGroups,
    billCount: destinationGroups.reduce((sum, group) => sum + group.billCount, 0),
    itemCount: destinationGroups.reduce((sum, group) => sum + group.itemCount, 0),
    subtotalTaxInclusive: money(destinationGroups.reduce((sum, group) => sum + group.subtotalTaxInclusive, 0)),
    taxTotal: money(destinationGroups.reduce((sum, group) => sum + group.taxTotal, 0)),
    grandTotal: money(destinationGroups.reduce((sum, group) => sum + group.grandTotal, 0)),
    paidAmount: money(destinationGroups.reduce((sum, group) => sum + group.paidAmount, 0)),
    balanceDue: money(destinationGroups.reduce((sum, group) => sum + group.balanceDue, 0)),
  };
}

export function buildTripEndBillSummaryA4Document({
  trip,
  summary,
  businessProfile,
  customers,
}: {
  trip: Trip;
  summary: TripEndBillSummary;
  businessProfile: BusinessProfile;
  customers: Customer[];
}): A4DocumentPayload {
  const customersById = new Map(customers.map(customer => [customer.id, customer]));
  const reportDate = trip.endedAt || trip.actualArrivalAt || new Date().toISOString();

  return {
    title: "TRIP END BILL SUMMARY",
    documentNumber: `${trip.tripNumber}-BILL-SUMMARY`,
    businessName: businessProfile.businessName,
    businessDetails: [
      businessProfile.vesselName,
      businessProfile.address,
      businessProfile.gstNumber ? `GST: ${businessProfile.gstNumber}` : undefined,
      businessProfile.vesselRegistrationNumber ? `Reg: ${businessProfile.vesselRegistrationNumber}` : undefined,
      `${businessProfile.email} • ${businessProfile.phone}`,
    ].filter((line): line is string => Boolean(line)),
    customerName: "Accounting summary",
    customerDetails: [
      `${summary.billCount} bills across ${summary.destinations.length} destinations`,
      `Generated: ${formatDateTime(new Date().toISOString())}`,
    ],
    destinationDetails: [
      trip.tripNumber,
      `Vessel: ${trip.vesselName}`,
      `Trip ended: ${formatDate(reportDate)}`,
    ],
    meta: [
      { label: "Trip", value: trip.tripNumber },
      { label: "Status", value: trip.status },
      { label: "Ended", value: trip.endedAt ? formatDateTime(trip.endedAt) : undefined },
    ],
    items: summary.destinations.flatMap(group => [
      {
        name: `${group.destinationName}${group.destinationCode ? ` (${group.destinationCode})` : ""}`,
        description: [
          group.atoll ? `${group.atoll} Atoll` : undefined,
          `${group.billCount} bills`,
          `${group.itemCount} line items`,
          `Paid ${MVR(group.paidAmount)}`,
          `Balance ${MVR(group.balanceDue)}`,
        ].filter(Boolean).join(" • "),
        quantity: group.billCount,
        unitType: "bills",
        unitPrice: group.billCount > 0 ? money(group.grandTotal / group.billCount) : 0,
        taxAmount: group.taxTotal,
        total: group.grandTotal,
      },
      ...group.bills.map(bill => ({
        name: bill.billNumber,
        description: [
          walkInDisplayName(customersById.get(bill.customerId), bill.walkInDetails),
          bill.billStatus.replace("_", " "),
          formatDate(bill.createdAt),
          `Paid ${MVR(bill.paidAmount)}`,
          `Balance ${MVR(Math.max(0, bill.grandTotal - bill.paidAmount))}`,
        ].filter(Boolean).join(" • "),
        quantity: bill.itemCount || bill.items?.length || 0,
        unitType: "items",
        unitPrice: bill.itemCount > 0 ? money(bill.grandTotal / bill.itemCount) : bill.grandTotal,
        taxAmount: bill.taxTotal,
        total: bill.grandTotal,
      })),
    ]),
    totals: [
      { label: "Total billed", value: MVR(summary.grandTotal), strong: true },
      { label: "GST included", value: MVR(summary.taxTotal) },
      { label: "Paid", value: MVR(summary.paidAmount) },
      { label: "Balance due", value: MVR(summary.balanceDue), strong: summary.balanceDue > 0 },
    ],
    footer: [
      "Grouped by destination for accounting review. Cancelled bills are excluded.",
      `${businessProfile.businessName} • ${businessProfile.email} • ${businessProfile.phone}`,
    ],
  };
}

export function buildTripEndDestinationBillSummaryA4Document({
  trip,
  destinationSummary,
  businessProfile,
  customers,
}: {
  trip: Trip;
  destinationSummary: TripEndDestinationSummary;
  businessProfile: BusinessProfile;
  customers: Customer[];
}): A4DocumentPayload {
  const customersById = new Map(customers.map(customer => [customer.id, customer]));
  const reportDate = trip.endedAt || trip.actualArrivalAt || new Date().toISOString();
  const destinationCode = destinationSummary.destinationCode || destinationSummary.destinationId;

  return {
    title: "DESTINATION BILL SUMMARY",
    documentNumber: `${trip.tripNumber}-${destinationCode}-BILL-SUMMARY`,
    businessName: businessProfile.businessName,
    businessDetails: [
      businessProfile.vesselName,
      businessProfile.address,
      businessProfile.gstNumber ? `GST: ${businessProfile.gstNumber}` : undefined,
      businessProfile.vesselRegistrationNumber ? `Reg: ${businessProfile.vesselRegistrationNumber}` : undefined,
      `${businessProfile.email} • ${businessProfile.phone}`,
    ].filter((line): line is string => Boolean(line)),
    customerName: "Accounting summary",
    customerDetails: [
      `${destinationSummary.billCount} bills`,
      `${destinationSummary.itemCount} line items`,
      `Generated: ${formatDateTime(new Date().toISOString())}`,
    ],
    destinationDetails: [
      destinationSummary.destinationName,
      destinationSummary.atoll ? `${destinationSummary.atoll} Atoll` : undefined,
      destinationSummary.destinationCode,
      `Trip ended: ${formatDate(reportDate)}`,
    ].filter((line): line is string => Boolean(line)),
    meta: [
      { label: "Trip", value: trip.tripNumber },
      { label: "Status", value: trip.status },
      { label: "Ended", value: trip.endedAt ? formatDateTime(trip.endedAt) : undefined },
    ],
    items: destinationSummary.bills.map(bill => ({
      name: bill.billNumber,
      description: [
        walkInDisplayName(customersById.get(bill.customerId), bill.walkInDetails),
        bill.billStatus.replace("_", " "),
        formatDate(bill.createdAt),
        `Paid ${MVR(bill.paidAmount)}`,
        `Balance ${MVR(Math.max(0, bill.grandTotal - bill.paidAmount))}`,
      ].filter(Boolean).join(" • "),
      quantity: bill.itemCount || bill.items?.length || 0,
      unitType: "items",
      unitPrice: bill.itemCount > 0 ? money(bill.grandTotal / bill.itemCount) : bill.grandTotal,
      taxAmount: bill.taxTotal,
      total: bill.grandTotal,
    })),
    totals: [
      { label: "Destination total", value: MVR(destinationSummary.grandTotal), strong: true },
      { label: "GST included", value: MVR(destinationSummary.taxTotal) },
      { label: "Paid", value: MVR(destinationSummary.paidAmount) },
      { label: "Balance due", value: MVR(destinationSummary.balanceDue), strong: destinationSummary.balanceDue > 0 },
    ],
    footer: [
      "Destination-level accounting summary. Cancelled bills are excluded.",
      `${businessProfile.businessName} • ${businessProfile.email} • ${businessProfile.phone}`,
    ],
  };
}
