import type { Bill } from "../types.js";

export type BillListGroupId = "current" | "unpaid" | "partial" | "paid";

export interface BillListGroup {
  id: BillListGroupId;
  title: string;
  description: string;
  bills: Bill[];
}

const groupDefinitions: Array<Omit<BillListGroup, "bills"> & { matches: (bill: Bill) => boolean }> = [
  {
    id: "current",
    title: "Current bills",
    description: "Draft bills waiting to finalize",
    matches: bill => bill.billStatus === "draft",
  },
  {
    id: "unpaid",
    title: "Unpaid bills",
    description: "Finalized bills waiting for payment",
    matches: bill => bill.billStatus !== "draft" && bill.paymentStatus === "unpaid",
  },
  {
    id: "partial",
    title: "Partial payments",
    description: "Bills with balance remaining",
    matches: bill => bill.paymentStatus === "partial",
  },
  {
    id: "paid",
    title: "Paid bills",
    description: "Completed and collected",
    matches: bill => bill.paymentStatus === "paid",
  },
];

const groupMatchers = new Map(groupDefinitions.map(group => [group.id, group.matches]));

export function groupBillsForList(bills: Bill[]): BillListGroup[] {
  return groupDefinitions
    .map(({ matches, ...definition }) => ({
      ...definition,
      bills: bills.filter(matches),
    }))
    .filter(group => group.bills.length > 0);
}

export function filterBillsForListCategory(bills: Bill[], category: BillListGroupId): Bill[] {
  const matches = groupMatchers.get(category);
  return matches ? bills.filter(matches) : bills;
}
