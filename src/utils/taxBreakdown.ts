import type { Bill, OperationItem } from "../types";

type TaxInclusiveLine = Pick<OperationItem, "quantity" | "unitPriceTaxInclusive" | "taxRate"> & Partial<Pick<OperationItem, "lineTotalTaxInclusive">>;
type BillTaxBreakdownInput = Pick<Bill, "grandTotal" | "subtotalTaxInclusive" | "taxTotal"> & {
  items?: TaxInclusiveLine[];
};

export function roundMoney(value: number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

export function calculateTaxInclusiveBreakdown(totalTaxInclusive: number, taxRate: number) {
  const total = roundMoney(totalTaxInclusive);
  const rate = Number(taxRate);

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      subtotalExcludingTax: total,
      taxAmount: 0,
      totalTaxInclusive: total,
    };
  }

  const subtotalExcludingTax = roundMoney(total / (1 + rate / 100));
  return {
    subtotalExcludingTax,
    taxAmount: roundMoney(total - subtotalExcludingTax),
    totalTaxInclusive: total,
  };
}

export function billSubtotalExcludingTax(
  bill: Pick<Bill, "grandTotal" | "subtotalTaxInclusive" | "taxTotal">,
): number {
  const grandTotal = Number(bill.grandTotal);
  const inclusiveTotal = Number.isFinite(grandTotal) ? grandTotal : Number(bill.subtotalTaxInclusive || 0);
  return roundMoney(inclusiveTotal - Number(bill.taxTotal || 0));
}

export function calculateBillTaxBreakdown(
  bill: BillTaxBreakdownInput,
  fallbackTaxRate?: number,
) {
  const grandTotal = Number(bill.grandTotal);
  const inclusiveTotal = Number.isFinite(grandTotal) ? roundMoney(grandTotal) : roundMoney(Number(bill.subtotalTaxInclusive || 0));
  const itemBreakdowns = buildOperationLineTaxBreakdowns(bill.items || [], fallbackTaxRate);

  if (itemBreakdowns.length > 0) {
    const taxAmount = roundMoney(itemBreakdowns.reduce((sum, line) => sum + line.taxAmount, 0));
    return {
      subtotalExcludingTax: roundMoney(inclusiveTotal - taxAmount),
      taxAmount,
      totalTaxInclusive: inclusiveTotal,
    };
  }

  if (fallbackTaxRate !== undefined) {
    return calculateTaxInclusiveBreakdown(inclusiveTotal, fallbackTaxRate);
  }

  return {
    subtotalExcludingTax: billSubtotalExcludingTax(bill),
    taxAmount: roundMoney(Number(bill.taxTotal || 0)),
    totalTaxInclusive: inclusiveTotal,
  };
}

export function operationLineSubtotalExcludingTax(
  item: Pick<OperationItem, "lineTotalTaxInclusive" | "taxAmount">,
): number {
  return roundMoney(Number(item.lineTotalTaxInclusive || 0) - Number(item.taxAmount || 0));
}

export function operationUnitPriceExcludingTax(
  item: Pick<OperationItem, "unitPriceTaxInclusive" | "taxRate">,
): number {
  return calculateTaxInclusiveBreakdown(item.unitPriceTaxInclusive, item.taxRate).subtotalExcludingTax;
}

export function billAverageUnitSubtotalExcludingTax(
  bill: Pick<Bill, "grandTotal" | "subtotalTaxInclusive" | "taxTotal" | "itemCount" | "items">,
  fallbackTaxRate?: number,
): number {
  const itemCount = bill.itemCount || bill.items?.length || 0;
  const subtotal = calculateBillTaxBreakdown(bill, fallbackTaxRate).subtotalExcludingTax;
  return itemCount > 0 ? roundMoney(subtotal / itemCount) : subtotal;
}

export function buildOperationLineTaxBreakdowns<T extends TaxInclusiveLine>(
  items: T[],
  fallbackTaxRate?: number,
) {
  const lineBreakdowns = items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const totalTaxInclusive = roundMoney(
      Number.isFinite(Number(item.lineTotalTaxInclusive))
        ? Number(item.lineTotalTaxInclusive)
        : quantity * Number(item.unitPriceTaxInclusive || 0),
    );
    const taxRate = Number.isFinite(Number(item.taxRate)) ? Number(item.taxRate) : Number(fallbackTaxRate || 0);
    const breakdown = calculateTaxInclusiveBreakdown(totalTaxInclusive, taxRate);

    return {
      index,
      quantity,
      taxRate,
      subtotalExcludingTax: breakdown.subtotalExcludingTax,
      taxAmount: breakdown.taxAmount,
      totalTaxInclusive,
      unitPriceExcludingTax: quantity > 0 ? roundMoney(breakdown.subtotalExcludingTax / quantity) : breakdown.subtotalExcludingTax,
    };
  });

  const groups = new Map<number, number[]>();
  for (const line of lineBreakdowns) {
    if (line.taxRate <= 0) continue;
    groups.set(line.taxRate, [...(groups.get(line.taxRate) || []), line.index]);
  }

  for (const [taxRate, indices] of groups) {
    const groupTotal = roundMoney(indices.reduce((sum, index) => sum + lineBreakdowns[index].totalTaxInclusive, 0));
    const targetTax = calculateTaxInclusiveBreakdown(groupTotal, taxRate).taxAmount;
    const currentTax = roundMoney(indices.reduce((sum, index) => sum + lineBreakdowns[index].taxAmount, 0));
    const residual = roundMoney(targetTax - currentTax);
    if (residual === 0) continue;

    const adjustmentIndex = indices.reduce((largestIndex, index) =>
      lineBreakdowns[index].totalTaxInclusive > lineBreakdowns[largestIndex].totalTaxInclusive ? index : largestIndex,
    indices[0]);
    const adjustedLine = lineBreakdowns[adjustmentIndex];
    adjustedLine.taxAmount = roundMoney(adjustedLine.taxAmount + residual);
    adjustedLine.subtotalExcludingTax = roundMoney(adjustedLine.totalTaxInclusive - adjustedLine.taxAmount);
    adjustedLine.unitPriceExcludingTax = adjustedLine.quantity > 0
      ? roundMoney(adjustedLine.subtotalExcludingTax / adjustedLine.quantity)
      : adjustedLine.subtotalExcludingTax;
  }

  return lineBreakdowns;
}

export function applyOperationLineTaxBreakdowns<T extends TaxInclusiveLine>(items: T[]): Array<T & Pick<OperationItem, "taxAmount" | "lineTotalTaxInclusive">> {
  const lineBreakdowns = buildOperationLineTaxBreakdowns(items);
  return items.map((item, index) => ({
    ...item,
    taxAmount: lineBreakdowns[index].taxAmount,
    lineTotalTaxInclusive: lineBreakdowns[index].totalTaxInclusive,
  }));
}

export function operationLinesTaxTotal(items: TaxInclusiveLine[]): number {
  return roundMoney(buildOperationLineTaxBreakdowns(items).reduce((sum, line) => sum + line.taxAmount, 0));
}
