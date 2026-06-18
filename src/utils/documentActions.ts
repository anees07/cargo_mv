import { Capacitor, registerPlugin } from "@capacitor/core";
import { MVR } from "./format";

export type ShareResult = "native" | "clipboard" | "unsupported";

type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

type ShareNavigator = {
  share?: (payload: SharePayload) => Promise<void>;
  clipboard?: {
    writeText: (value: string) => Promise<void>;
  };
};

type ShareEnvironment = {
  navigator?: ShareNavigator;
};

type PrintableWindow = {
  print: () => void;
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
