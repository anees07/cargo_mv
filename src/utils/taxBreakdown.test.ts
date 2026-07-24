import assert from "node:assert/strict";
import test from "node:test";

import {
  applyOperationLineTaxBreakdowns,
  billSubtotalExcludingTax,
  buildOperationLineTaxBreakdowns,
  calculateBillTaxBreakdown,
  calculateTaxInclusiveBreakdown,
  operationUnitPriceExcludingTax,
} from "./taxBreakdown.js";

test("calculateTaxInclusiveBreakdown extracts GST from an inclusive MVR 10 price", () => {
  assert.deepEqual(calculateTaxInclusiveBreakdown(10, 8), {
    subtotalExcludingTax: 9.26,
    taxAmount: 0.74,
    totalTaxInclusive: 10,
  });
});

test("calculateTaxInclusiveBreakdown extracts GST from an inclusive MVR 128 price", () => {
  assert.deepEqual(calculateTaxInclusiveBreakdown(128, 8), {
    subtotalExcludingTax: 118.52,
    taxAmount: 9.48,
    totalTaxInclusive: 128,
  });
});

test("billSubtotalExcludingTax uses persisted GST as the extracted tax amount", () => {
  assert.equal(billSubtotalExcludingTax({
    grandTotal: 128,
    subtotalTaxInclusive: 128,
    taxTotal: 9.48,
  }), 118.52);
});

test("operationUnitPriceExcludingTax derives the net unit price from the shown inclusive unit price", () => {
  assert.equal(operationUnitPriceExcludingTax({
    unitPriceTaxInclusive: 10,
    taxRate: 8,
  }), 9.26);
});

test("calculateBillTaxBreakdown extracts GST at bill level to avoid subtotal rounding drift", () => {
  assert.deepEqual(calculateBillTaxBreakdown({
    grandTotal: 338,
    subtotalTaxInclusive: 338,
    taxTotal: 25.03,
    items: [
      { quantity: 1, unitPriceTaxInclusive: 35, taxRate: 8, lineTotalTaxInclusive: 35 },
      { quantity: 1, unitPriceTaxInclusive: 140, taxRate: 8, lineTotalTaxInclusive: 140 },
      { quantity: 1, unitPriceTaxInclusive: 128, taxRate: 8, lineTotalTaxInclusive: 128 },
      { quantity: 1, unitPriceTaxInclusive: 35, taxRate: 8, lineTotalTaxInclusive: 35 },
    ],
  }), {
    subtotalExcludingTax: 312.96,
    taxAmount: 25.04,
    totalTaxInclusive: 338,
  });
});

test("applyOperationLineTaxBreakdowns distributes bill-level rounding residual across lines", () => {
  const lines = applyOperationLineTaxBreakdowns([
    { quantity: 1, unitPriceTaxInclusive: 35, taxRate: 8 },
    { quantity: 1, unitPriceTaxInclusive: 140, taxRate: 8 },
    { quantity: 1, unitPriceTaxInclusive: 128, taxRate: 8 },
    { quantity: 1, unitPriceTaxInclusive: 35, taxRate: 8 },
  ]);

  assert.equal(lines.reduce((sum, line) => sum + line.lineTotalTaxInclusive, 0), 338);
  assert.equal(Number(lines.reduce((sum, line) => sum + line.taxAmount, 0).toFixed(2)), 25.04);
  assert.deepEqual(lines.map(line => line.taxAmount), [2.59, 10.38, 9.48, 2.59]);
});

test("buildOperationLineTaxBreakdowns keeps invoice GST rows quantity-aware", () => {
  const lines = buildOperationLineTaxBreakdowns([
    { quantity: 2, unitPriceTaxInclusive: 35, taxRate: 8, lineTotalTaxInclusive: 70 },
    { quantity: 4, unitPriceTaxInclusive: 140, taxRate: 8, lineTotalTaxInclusive: 560 },
    { quantity: 1, unitPriceTaxInclusive: 128, taxRate: 8, lineTotalTaxInclusive: 128 },
    { quantity: 1, unitPriceTaxInclusive: 35, taxRate: 8, lineTotalTaxInclusive: 35 },
  ]);

  assert.deepEqual(lines.map(line => line.unitPriceExcludingTax), [32.41, 129.63, 118.52, 32.41]);
  assert.deepEqual(lines.map(line => line.taxAmount), [5.19, 41.48, 9.48, 2.59]);
  assert.deepEqual(lines.map(line => line.subtotalExcludingTax), [64.81, 518.52, 118.52, 32.41]);
  assert.equal(Number(lines.reduce((sum, line) => sum + line.subtotalExcludingTax, 0).toFixed(2)), 734.26);
  assert.equal(Number(lines.reduce((sum, line) => sum + line.taxAmount, 0).toFixed(2)), 58.74);
  assert.equal(lines.reduce((sum, line) => sum + line.totalTaxInclusive, 0), 793);
});
