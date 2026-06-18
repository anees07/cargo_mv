import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBillShareText,
  buildA4DocumentHtml,
  buildA4PdfBlob,
  buildInvoicePrintText,
  buildDocumentShareText,
  printDocument,
  printA4Document,
  parsePrinterAddress,
  shareA4PdfDocument,
  silentPrintDocument,
  shareDocument,
} from "./documentActions.js";

test("bill share text includes the customer, bill number, destination, trip, total and due amount", () => {
  const text = buildBillShareText({
    billNumber: "BILL-MLE-000033",
    customerName: "STO Maldives",
    destinationName: "Male'",
    tripNumber: "TRIP-2026-000005",
    totalAmount: 361.76,
    balanceDue: 120,
  });

  assert.equal(
    text,
    [
      "Bill BILL-MLE-000033",
      "Customer: STO Maldives",
      "Destination: Male'",
      "Trip: TRIP-2026-000005",
      "Total: MVR 361.76",
      "Balance due: MVR 120.00",
    ].join("\n"),
  );
});

test("document share text summarizes a PDF document", () => {
  const text = buildDocumentShareText({
    documentNumber: "BILL-ADD-000034",
    customerName: "Addu City Council",
    amount: 143.36,
    status: "Saved",
  });

  assert.equal(
    text,
    [
      "Document BILL-ADD-000034",
      "Customer: Addu City Council",
      "Amount: MVR 143.36",
      "Status: Saved",
    ].join("\n"),
  );
});

test("share document uses native share when available", async () => {
  const shared: unknown[] = [];
  const result = await shareDocument(
    { title: "Invoice", text: "Bill details" },
    { navigator: { share: async payload => { shared.push(payload); } } },
  );

  assert.equal(result, "native");
  assert.deepEqual(shared, [{ title: "Invoice", text: "Bill details" }]);
});

test("share document copies to clipboard when native share is unavailable", async () => {
  let copied = "";
  const result = await shareDocument(
    { title: "Invoice", text: "Bill details", url: "https://example.com/bill" },
    { navigator: { clipboard: { writeText: async value => { copied = value; } } } },
  );

  assert.equal(result, "clipboard");
  assert.equal(copied, "Bill details\nhttps://example.com/bill");
});

test("print document invokes the browser print dialog when available", () => {
  let printed = false;
  const result = printDocument({ print: () => { printed = true; } });

  assert.equal(result, true);
  assert.equal(printed, true);
});

test("invoice print text includes line items and totals for native raw printing", () => {
  const text = buildInvoicePrintText({
    businessName: "AtollCargo",
    billNumber: "BILL-MLE-000033",
    customerName: "STO Maldives",
    destinationName: "Male'",
    tripNumber: "TRIP-2026-000005",
    createdAt: "18 Jun 2026",
    items: [
      { name: "Rice Sack (50kg)", quantity: 2, unitType: "sack", unitPrice: 143.36, taxAmount: 21.24, total: 286.72 },
    ],
    subtotal: 265.48,
    taxTotal: 21.24,
    grandTotal: 286.72,
    paidAmount: 0,
    balanceDue: 286.72,
    footer: "Thank you",
  });

  assert.match(text, /AtollCargo/);
  assert.match(text, /BILL-MLE-000033/);
  assert.match(text, /Rice Sack \(50kg\)/);
  assert.match(text, /2 sack x MVR 143\.36/);
  assert.match(text, /Grand Total: MVR 286\.72/);
  assert.match(text, /Balance Due: MVR 286\.72/);
});

test("silent print sends text to the native printer plugin", async () => {
  const calls: unknown[] = [];
  const result = await silentPrintDocument(
    { host: "192.168.1.50", port: 9100, text: "Invoice text" },
    { printer: { print: async payload => { calls.push(payload); } } },
  );

  assert.equal(result, true);
  assert.deepEqual(calls, [{ host: "192.168.1.50", port: 9100, text: "Invoice text" }]);
});

test("A4 document html declares A4 print page and invoice table", () => {
  const html = buildA4DocumentHtml({
    title: "TAX INVOICE",
    documentNumber: "BILL-MLE-000033",
    businessName: "AtollCargo",
    businessDetails: ["GST: 123"],
    customerName: "STO Maldives",
    meta: [{ label: "Date", value: "18 Jun 2026" }],
    destinationDetails: ["Male'", "Kaafu Atoll"],
    items: [
      { name: "Rice Sack (50kg)", quantity: 2, unitType: "sack", unitPrice: 143.36, taxAmount: 21.24, total: 286.72 },
    ],
    totals: [{ label: "Grand Total", value: "MVR 286.72", strong: true }],
  });

  assert.match(html, /@page \{ size: A4; margin: 12mm; \}/);
  assert.match(html, /TAX INVOICE/);
  assert.match(html, /Rice Sack \(50kg\)/);
  assert.match(html, /Grand Total/);
});

test("A4 PDF builder returns an application pdf blob", () => {
  const blob = buildA4PdfBlob({
    title: "TAX INVOICE",
    documentNumber: "BILL-MLE-000033",
    businessName: "AtollCargo",
    businessDetails: [],
    customerName: "STO Maldives",
    meta: [],
    items: [],
    totals: [{ label: "Grand Total", value: "MVR 0.00", strong: true }],
  });

  assert.equal(blob.type, "application/pdf");
  assert.ok(blob.size > 0);
});

test("A4 print writes printable html before opening print dialog", async () => {
  let written = "";
  let printed = false;
  const result = printA4Document({
    title: "TAX INVOICE",
    documentNumber: "BILL-MLE-000033",
    businessName: "AtollCargo",
    businessDetails: [],
    customerName: "STO Maldives",
    meta: [],
    items: [],
    totals: [],
  }, {
    print: () => {},
    open: () => ({
      document: {
        open: () => {},
        write: value => { written = value; },
        close: () => {},
      },
      print: () => { printed = true; },
    }),
  });

  assert.equal(result, true);
  assert.match(written, /size: A4/);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(printed, true);
});

test("A4 PDF share uses native file sharing when available", async () => {
  const shared: unknown[] = [];
  class TestFile extends Blob {
    name: string;
    constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
      super(parts, options);
      this.name = name;
    }
  }

  const result = await shareA4PdfDocument({
    title: "TAX INVOICE",
    documentNumber: "BILL-MLE-000033",
    businessName: "AtollCargo",
    businessDetails: [],
    customerName: "STO Maldives",
    meta: [],
    items: [],
    totals: [],
  }, {
    FileCtor: TestFile as typeof File,
    navigator: {
      canShare: payload => payload.files.length === 1,
      share: async payload => { shared.push(payload); },
    },
  });

  assert.equal(result, "native");
  assert.equal(shared.length, 1);
});

test("printer address parser accepts host with optional port", () => {
  assert.deepEqual(parsePrinterAddress("192.168.1.50"), { host: "192.168.1.50", port: 9100 });
  assert.deepEqual(parsePrinterAddress("printer.local:9101"), { host: "printer.local", port: 9101 });
  assert.equal(parsePrinterAddress(""), null);
  assert.equal(parsePrinterAddress("192.168.1.50:0"), null);
});
