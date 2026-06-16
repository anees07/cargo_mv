import type { Bill, Customer, Trip } from "../types.js";

export interface QuarterPeriod {
  id: string;
  label: string;
  rangeLabel: string;
  start: Date;
  end: Date;
}

export interface TaxBillRow {
  billId: string;
  billNumber: string;
  billName: string;
  billStatus: Bill["billStatus"];
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  billDate: string;
  tripNumber: string;
  tripName: string;
}

const quarterStartLabels = ["Jan", "Apr", "Jul", "Oct"];
const quarterEndLabels = ["Mar", "Jun", "Sep", "Dec"];

export function quarterPeriod(id: string): QuarterPeriod {
  const [yearText, quarterText] = id.split("-Q");
  const year = Number(yearText);
  const quarter = Number(quarterText);
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));
  const startLabel = start.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const endLabel = end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  return {
    id,
    label: `Q${quarter} ${year}`,
    rangeLabel: `${startLabel} - ${endLabel}`,
    start,
    end,
  };
}

export function recentQuarterOptions(currentYear = new Date().getFullYear()) {
  return [0, 1, 2, 3].map(index => {
    const quarter = index + 1;
    return {
      id: `${currentYear}-Q${quarter}`,
      label: `Q${quarter} ${currentYear} (${quarterStartLabels[index]} - ${quarterEndLabels[index]})`,
    };
  });
}

export function buildQuarterTaxBillRows(
  bills: Bill[],
  trips: Trip[],
  customers: Customer[],
  period: QuarterPeriod,
): TaxBillRow[] {
  return bills
    .filter(bill => {
      const createdAt = new Date(bill.createdAt);
      return createdAt >= period.start && createdAt <= period.end;
    })
    .map(bill => {
      const trip = trips.find(item => item.id === bill.tripId);
      const customer = customers.find(item => item.id === bill.customerId);
      return {
        billId: bill.id,
        billNumber: bill.billNumber,
        billName: customer?.displayName || bill.billType.replace(/_/g, " "),
        billStatus: bill.billStatus,
        subtotalAmount: Number((bill.grandTotal - bill.taxTotal).toFixed(2)),
        taxAmount: bill.taxTotal,
        totalAmount: bill.grandTotal,
        billDate: bill.createdAt,
        tripNumber: trip?.tripNumber || "No trip",
        tripName: trip?.vesselName || "Unassigned trip",
      };
    })
    .sort((a, b) =>
      a.tripName.localeCompare(b.tripName)
      || a.tripNumber.localeCompare(b.tripNumber, undefined, { numeric: true })
      || a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true })
    );
}
