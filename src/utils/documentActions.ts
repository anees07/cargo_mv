import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";
import { MVR } from "./format";

export type ShareResult = "native" | "clipboard" | "unsupported";

type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

type ShareNavigator = {
  share?: (payload: SharePayload | FileSharePayload) => Promise<void>;
  canShare?: (payload: FileSharePayload) => boolean;
  clipboard?: {
    writeText: (value: string) => Promise<void>;
  };
};

type ShareEnvironment = {
  navigator?: ShareNavigator;
  FileCtor?: typeof File;
  capacitor?: Pick<typeof Capacitor, "isNativePlatform" | "isPluginAvailable">;
  filesystem?: Pick<typeof Filesystem, "writeFile">;
  nativeShare?: NativeSharePlugin;
};

type PrintableWindow = {
  print: () => void;
  open?: (url?: string, target?: string) => PrintPopup | null;
};

type PrintPopup = {
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
  };
  focus?: () => void;
  print: () => void;
};

type FileSharePayload = {
  title: string;
  text?: string;
  files: File[];
};

type NativeSharePayload = {
  title: string;
  text: string;
  url: string;
  dialogTitle: string;
};

type NativeSharePlugin = {
  share: (payload: NativeSharePayload) => Promise<unknown>;
};

export type NativePrintPayload = {
  host: string;
  port: number;
  text: string;
};

type NativePrinterPlugin = {
  print: (payload: NativePrintPayload) => Promise<void>;
};

type NativePrintEnvironment = {
  printer?: NativePrinterPlugin;
};

const NativePrinter = registerPlugin<NativePrinterPlugin>("NativePrinter");

const divider = "-".repeat(32);
const defaultPrinterPort = 9100;

export type A4DocumentLineItem = {
  name: string;
  description?: string;
  quantity: number;
  unitType: string;
  unitPrice: number;
  taxAmount: number;
  total: number;
};

export type A4DocumentPayload = {
  title: string;
  documentNumber: string;
  businessName: string;
  businessDetails: string[];
  customerName: string;
  customerDetails?: string[];
  destinationDetails?: string[];
  meta: Array<{ label: string; value?: string }>;
  items: A4DocumentLineItem[];
  totals: Array<{ label: string; value: string; strong?: boolean }>;
  footer?: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function compact(values: Array<string | undefined | null>) {
  return values.map(value => value?.trim()).filter((value): value is string => Boolean(value));
}

function sanitizedPdfFileName(documentNumber: string) {
  return `${documentNumber.replace(/[^A-Za-z0-9_-]/g, "-")}.pdf`;
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
}

export function buildA4DocumentText(document: A4DocumentPayload) {
  return [
    document.businessName,
    document.title,
    document.documentNumber,
    ...document.meta.map(item => `${item.label}: ${item.value || ""}`),
    `Customer: ${document.customerName}`,
    ...(document.customerDetails || []),
    ...(document.destinationDetails || []),
    divider,
    ...document.items.flatMap(item => [
      item.name,
      item.description ? `  ${item.description}` : undefined,
      `${item.quantity} ${item.unitType} x ${MVR(item.unitPrice)}`,
      `Tax: ${MVR(item.taxAmount)}  Total: ${MVR(item.total)}`,
    ]),
    divider,
    ...document.totals.map(item => `${item.label}: ${item.value}`),
    ...(document.footer || []),
  ].filter((line): line is string => Boolean(line)).join("\n");
}

export function buildA4DocumentHtml(document: A4DocumentPayload) {
  const businessDetails = compact(document.businessDetails);
  const customerDetails = compact(document.customerDetails || []);
  const destinationDetails = compact(document.destinationDetails || []);
  const footer = compact(document.footer || []);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.documentNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
      @bottom-right { content: "Page " counter(page) " of " counter(pages); color: #64748b; font-size: 8pt; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; }
    .page { display: flex; flex-direction: column; width: 186mm; min-height: 273mm; margin: 0 auto; }
    .content { flex: 1 0 auto; }
    .top { display: flex; justify-content: space-between; gap: 14mm; border-bottom: 1.5pt solid #0f172a; padding-bottom: 6mm; }
    .business h1 { margin: 0 0 2mm; font-size: 17pt; line-height: 1.1; }
    .muted { color: #64748b; }
    .doc-title { text-align: right; }
    .doc-title h2 { margin: 0; font-size: 21pt; letter-spacing: .02em; }
    .doc-title p, .business p { margin: 1mm 0; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 7mm; }
    .label { margin: 0 0 2mm; color: #64748b; font-size: 8pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .name { margin: 0 0 1.5mm; font-size: 12pt; font-weight: 700; }
    .details p { margin: 1mm 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 7mm; table-layout: fixed; break-inside: auto; page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border-bottom: 1px solid #cbd5e1; padding: 2.5mm 2mm; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-size: 8.5pt; text-align: left; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .center { text-align: center; white-space: nowrap; }
    .item-desc { margin-top: 1mm; color: #64748b; font-size: 9pt; }
    .totals { display: flex; justify-content: flex-end; margin-top: 6mm; }
    .totals-inner { width: 72mm; }
    .total-row { display: flex; justify-content: space-between; gap: 4mm; padding: 1.4mm 0; }
    .total-row.strong { margin-top: 1.5mm; border-top: 1.5pt solid #0f172a; font-size: 12pt; font-weight: 700; }
    .footer { margin-top: auto; border-top: 1px dashed #cbd5e1; padding-top: 4mm; text-align: center; color: #64748b; font-size: 9pt; }
    .footer p { margin: 1.2mm 0; }
    .page-number { display: none; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { width: auto; min-height: 273mm; }
      .content { flex: 1 0 auto; }
    }
    @media screen {
      body { background: #e2e8f0; padding: 12mm 0; }
      .page { min-height: 273mm; background: #fff; box-shadow: 0 12px 40px rgba(15, 23, 42, .18); padding: 0; }
      .page-number { display: block; margin-top: 4mm; text-align: right; color: #64748b; font-size: 8pt; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="content">
      <section class="top">
        <div class="business">
          <h1>${escapeHtml(document.businessName)}</h1>
          ${businessDetails.map(line => `<p class="muted">${escapeHtml(line)}</p>`).join("")}
        </div>
        <div class="doc-title">
          <h2>${escapeHtml(document.title)}</h2>
          <p><strong>${escapeHtml(document.documentNumber)}</strong></p>
          ${document.meta.map(item => item.value ? `<p class="muted">${escapeHtml(item.label)}: ${escapeHtml(item.value)}</p>` : "").join("")}
        </div>
      </section>
      <section class="info">
        <div class="details">
          <p class="label">Customer</p>
          <p class="name">${escapeHtml(document.customerName)}</p>
          ${customerDetails.map(line => `<p class="muted">${escapeHtml(line)}</p>`).join("")}
        </div>
        <div class="details" style="text-align:right">
          <p class="label">Destination</p>
          ${destinationDetails.map((line, index) => index === 0 ? `<p class="name">${escapeHtml(line)}</p>` : `<p class="muted">${escapeHtml(line)}</p>`).join("")}
        </div>
      </section>
      <table>
        <thead>
          <tr>
            <th style="width: 38%">Item</th>
            <th class="center" style="width: 16%">Qty</th>
            <th class="num" style="width: 16%">Unit</th>
            <th class="num" style="width: 14%">Tax</th>
            <th class="num" style="width: 16%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${document.items.length > 0 ? document.items.map(item => `
            <tr>
              <td>${escapeHtml(item.name)}${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ""}</td>
              <td class="center">${escapeHtml(String(item.quantity))} ${escapeHtml(item.unitType)}</td>
              <td class="num">${escapeHtml(MVR(item.unitPrice))}</td>
              <td class="num">${escapeHtml(MVR(item.taxAmount))}</td>
              <td class="num">${escapeHtml(MVR(item.total))}</td>
            </tr>
          `).join("") : `<tr><td colspan="5" class="center muted">No line items saved.</td></tr>`}
        </tbody>
      </table>
      <section class="totals">
        <div class="totals-inner">
          ${document.totals.map(item => `<div class="total-row ${item.strong ? "strong" : ""}"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.value)}</span></div>`).join("")}
        </div>
      </section>
    </div>
    ${footer.length > 0 ? `<section class="footer">${footer.map(line => `<p>${escapeHtml(line)}</p>`).join("")}</section>` : ""}
    <div class="page-number">Page 1</div>
  </main>
</body>
</html>`;
}

export function buildBillShareText({
  billNumber,
  customerName,
  destinationName,
  tripNumber,
  totalAmount,
  balanceDue,
}: {
  billNumber: string;
  customerName: string;
  destinationName?: string;
  tripNumber?: string;
  totalAmount: number;
  balanceDue: number;
}) {
  return [
    `Bill ${billNumber}`,
    `Customer: ${customerName}`,
    destinationName ? `Destination: ${destinationName}` : undefined,
    tripNumber ? `Trip: ${tripNumber}` : undefined,
    `Total: ${MVR(totalAmount)}`,
    `Balance due: ${MVR(Math.max(0, balanceDue))}`,
  ].filter(Boolean).join("\n");
}

export function buildDocumentShareText({
  documentNumber,
  customerName,
  amount,
  status,
}: {
  documentNumber: string;
  customerName: string;
  amount: number;
  status: string;
}) {
  return [
    `Document ${documentNumber}`,
    `Customer: ${customerName}`,
    `Amount: ${MVR(amount)}`,
    `Status: ${status}`,
  ].join("\n");
}

export function buildInvoicePrintText({
  businessName,
  billNumber,
  customerName,
  destinationName,
  tripNumber,
  createdAt,
  items,
  subtotal,
  taxTotal,
  grandTotal,
  paidAmount,
  balanceDue,
  footer,
}: {
  businessName: string;
  billNumber: string;
  customerName: string;
  destinationName?: string;
  tripNumber?: string;
  createdAt: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitType: string;
    unitPrice: number;
    taxAmount: number;
    total: number;
  }>;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  footer?: string;
}) {
  const lines = [
    businessName,
    "TAX INVOICE",
    billNumber,
    `Date: ${createdAt}`,
    tripNumber ? `Trip: ${tripNumber}` : undefined,
    destinationName ? `Destination: ${destinationName}` : undefined,
    `Customer: ${customerName}`,
    divider,
    ...items.flatMap(item => [
      item.name,
      item.description ? `  ${item.description}` : undefined,
      `${item.quantity} ${item.unitType} x ${MVR(item.unitPrice)}`,
      `Tax: ${MVR(item.taxAmount)}  Total: ${MVR(item.total)}`,
    ]),
    divider,
    `Subtotal: ${MVR(subtotal)}`,
    `GST: ${MVR(taxTotal)}`,
    `Grand Total: ${MVR(grandTotal)}`,
    `Paid: ${MVR(paidAmount)}`,
    `Balance Due: ${MVR(Math.max(0, balanceDue))}`,
    divider,
    footer,
    "",
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function isNativeSilentPrintAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("NativePrinter");
}

export async function silentPrintDocument(payload: NativePrintPayload, env: NativePrintEnvironment = {}) {
  const printer = env.printer || NativePrinter;
  await printer.print(payload);
  return true;
}

export function parsePrinterAddress(value: string): { host: string; port: number } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const [host, portValue] = trimmed.split(":");
  const port = portValue === undefined ? defaultPrinterPort : Number(portValue);
  if (!host.trim() || !Number.isInteger(port) || port <= 0 || port > 65535) return null;

  return { host: host.trim(), port };
}

export async function shareDocument(payload: SharePayload, env: ShareEnvironment = {}): Promise<ShareResult> {
  const shareNavigator = env.navigator || (typeof navigator !== "undefined" ? navigator : undefined);

  if (shareNavigator?.share) {
    await shareNavigator.share(payload);
    return "native";
  }

  if (shareNavigator?.clipboard?.writeText) {
    await shareNavigator.clipboard.writeText([payload.text, payload.url].filter(Boolean).join("\n"));
    return "clipboard";
  }

  return "unsupported";
}

export function printDocument(printWindow: PrintableWindow | undefined = typeof window !== "undefined" ? window : undefined) {
  if (!printWindow?.print) return false;
  printWindow.print();
  return true;
}

function splitPdfText(pdf: jsPDF, text: string, maxWidth: number) {
  return pdf.splitTextToSize(text, maxWidth) as string[];
}

function addPdfLines(pdf: jsPDF, lines: string[], x: number, y: number, lineHeight = 5) {
  for (const line of lines) {
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addPdfText(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  return addPdfLines(pdf, splitPdfText(pdf, text, maxWidth), x, y, lineHeight);
}

function addPdfPageNumbers(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }
  pdf.setTextColor(15, 23, 42);
}

export function buildA4PdfDocument(document: A4DocumentPayload) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 12;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin - 9;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed <= bottomLimit) return;
    pdf.addPage();
    y = margin;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(document.businessName, margin, y);
  pdf.setFontSize(18);
  pdf.text(document.title, pageWidth - margin, y, { align: "right" });
  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const detail of compact(document.businessDetails)) {
    pdf.text(detail, margin, y);
    y += 4;
  }
  const metaTop = margin + 7;
  let metaY = metaTop;
  pdf.setFont("helvetica", "bold");
  pdf.text(document.documentNumber, pageWidth - margin, metaY, { align: "right" });
  metaY += 4;
  pdf.setFont("helvetica", "normal");
  for (const item of document.meta) {
    if (!item.value) continue;
    pdf.text(`${item.label}: ${item.value}`, pageWidth - margin, metaY, { align: "right" });
    metaY += 4;
  }
  y = Math.max(y, metaY) + 3;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("CUSTOMER", margin, y);
  pdf.text("DESTINATION", pageWidth - margin, y, { align: "right" });
  y += 5;

  pdf.setFontSize(11);
  pdf.text(document.customerName, margin, y);
  const destinationDetails = compact(document.destinationDetails || []);
  if (destinationDetails[0]) pdf.text(destinationDetails[0], pageWidth - margin, y, { align: "right" });
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const leftDetails = compact(document.customerDetails || []);
  const rightDetails = destinationDetails.slice(1);
  const detailRows = Math.max(leftDetails.length, rightDetails.length);
  for (let index = 0; index < detailRows; index += 1) {
    if (leftDetails[index]) pdf.text(leftDetails[index], margin, y);
    if (rightDetails[index]) pdf.text(rightDetails[index], pageWidth - margin, y, { align: "right" });
    y += 4;
  }
  y += 4;

  const col = {
    item: margin,
    qty: margin + 78,
    unit: margin + 108,
    tax: margin + 138,
    total: margin + 165,
  };
  const drawTableHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y - 4, contentWidth, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Item", col.item, y);
    pdf.text("Qty", col.qty, y, { align: "center" });
    pdf.text("Unit", col.unit + 20, y, { align: "right" });
    pdf.text("Tax", col.tax + 18, y, { align: "right" });
    pdf.text("Total", pageWidth - margin, y, { align: "right" });
    y += 6;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;
  };

  drawTableHeader();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const item of document.items) {
    const nameLines = splitPdfText(pdf, item.name, 70);
    const descriptionLines = item.description ? splitPdfText(pdf, item.description, 70) : [];
    const rowHeight = Math.max(8, nameLines.length * 4.5 + descriptionLines.length * 4) + 5;
    addPageIfNeeded(rowHeight);
    if (y === margin) drawTableHeader();
    const startY = y;
    y = addPdfLines(pdf, nameLines, col.item, y, 4.5);
    if (descriptionLines.length > 0) {
      pdf.setTextColor(100, 116, 139);
      y = addPdfLines(pdf, descriptionLines, col.item, y, 4);
      pdf.setTextColor(15, 23, 42);
    }
    const rowBottom = Math.max(y, startY + 8);
    pdf.text(`${item.quantity} ${item.unitType}`, col.qty, startY, { align: "center" });
    pdf.text(MVR(item.unitPrice), col.unit + 20, startY, { align: "right" });
    pdf.text(MVR(item.taxAmount), col.tax + 18, startY, { align: "right" });
    pdf.text(MVR(item.total), pageWidth - margin, startY, { align: "right" });
    y = rowBottom + 2;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;
  }
  if (document.items.length === 0) {
    pdf.text("No line items saved.", pageWidth / 2, y, { align: "center" });
    y += 8;
  }

  const footer = compact(document.footer || []);
  const footerLineCount = footer.reduce((sum, line) => sum + splitPdfText(pdf, line, contentWidth).length, 0);
  const totalsHeight = document.totals.reduce((sum, total) => sum + (total.strong ? 8 : 5), 0) + 8;
  const footerHeight = footer.length > 0 ? 12 + footerLineCount * 4 : 0;
  const closingBlockHeight = totalsHeight + footerHeight;

  addPageIfNeeded(closingBlockHeight);
  const totalX = pageWidth - margin - 72;
  y = Math.max(y + 3, bottomLimit - closingBlockHeight);
  pdf.setFontSize(9);
  for (const total of document.totals) {
    if (total.strong) {
      y += 2;
      pdf.line(totalX, y, pageWidth - margin, y);
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
    }
    pdf.text(total.label, totalX, y);
    pdf.text(total.value, pageWidth - margin, y, { align: "right" });
    y += total.strong ? 6 : 5;
  }

  if (footer.length > 0) {
    y += 5;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    for (const line of footer) {
      y = addPdfText(pdf, line, margin, y, contentWidth, 4);
    }
    pdf.setTextColor(15, 23, 42);
  }

  addPdfPageNumbers(pdf, pageWidth, pageHeight, margin);
  return pdf;
}

export function buildA4PdfBlob(document: A4DocumentPayload) {
  const pdf = buildA4PdfDocument(document);
  return pdf.output("blob");
}

export function printA4Document(document: A4DocumentPayload, printWindow: PrintableWindow | undefined = typeof window !== "undefined" ? window : undefined) {
  const popup = printWindow?.open?.("", "_blank");
  if (!popup) return false;

  popup.document.open();
  popup.document.write(buildA4DocumentHtml(document));
  popup.document.close();
  popup.focus?.();
  setTimeout(() => popup.print(), 150);
  return true;
}

export async function shareA4PdfDocument(document: A4DocumentPayload, env: ShareEnvironment = {}): Promise<ShareResult> {
  const shareNavigator = env.navigator || (typeof navigator !== "undefined" ? navigator : undefined);
  const FileConstructor = env.FileCtor || (typeof File !== "undefined" ? File : undefined);
  const capacitorRuntime = env.capacitor || Capacitor;
  const filesystem = env.filesystem || Filesystem;
  const nativeShare = env.nativeShare || Share;
  const pdfBlob = buildA4PdfBlob(document);
  const fileName = sanitizedPdfFileName(document.documentNumber);
  const shareText = `${document.title} ${document.documentNumber}`;

  if (
    capacitorRuntime.isNativePlatform() &&
    capacitorRuntime.isPluginAvailable("Filesystem") &&
    capacitorRuntime.isPluginAvailable("Share")
  ) {
    const path = `shared-pdfs/${fileName}`;
    const written = await filesystem.writeFile({
      path,
      data: await blobToBase64(pdfBlob),
      directory: Directory.Cache,
      recursive: true,
    });
    await nativeShare.share({
      title: document.documentNumber,
      text: shareText,
      url: written.uri,
      dialogTitle: `Share ${document.documentNumber}`,
    } satisfies NativeSharePayload);
    return "native";
  }

  if (FileConstructor && shareNavigator?.share) {
    const file = new FileConstructor([pdfBlob], fileName, { type: "application/pdf" });
    const payload = { title: document.documentNumber, text: shareText, files: [file] };
    if (!shareNavigator.canShare || shareNavigator.canShare(payload)) {
      await shareNavigator.share(payload);
      return "native";
    }
  }

  if (shareNavigator?.clipboard?.writeText) {
    await shareNavigator.clipboard.writeText(buildA4DocumentText(document));
    return "clipboard";
  }

  return "unsupported";
}
