import { useApp } from "../useApp";
import { Btn, Card, Section, TopBar } from "../components/ui";
import { MVR, formatDate, formatDateTime } from "../utils/format";
import { shareA4PdfDocument, type A4DocumentPayload } from "../utils/documentActions";
import { isWalkInCustomer, walkInDisplayName, walkInPhone } from "../utils/walkInDetails";
import type { Bill } from "../types";

export function SyncConflictsScreen() {
  const { back, operations, trips } = useApp();
  const endedTrip = trips.find(t => t.status === "ended");
  const conflicts = [
    {
      id: "sc_001",
      device: "Loading tablet",
      trip: endedTrip?.tripNumber || "TRIP-2025-000141",
      reason: "Offline draft needs review",
      records: 3,
      amount: 4200,
      status: "review",
    },
    {
      id: "sc_002",
      device: "Cashier phone",
      trip: trips[0]?.tripNumber || "TRIP-2025-000142",
      reason: "Customer changed offline",
      records: 1,
      amount: 1280,
      status: "review",
    },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Sync conflicts" subtitle={`${conflicts.length} to review`} onBack={back} />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <Card className="mb-4 border-l-4 border-l-amber-500 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Review required</p>
          <p className="mt-0.5 text-xs text-amber-800">Queued records stay on hold until a manager resolves them.</p>
        </Card>

        <div className="space-y-3">
          {conflicts.map(conflict => (
            <Card key={conflict.id} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-bold text-slate-900">{conflict.id}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase text-amber-700">{conflict.status}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{conflict.reason}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{conflict.trip} • {conflict.device}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{MVR(conflict.amount)}</p>
                  <p className="text-xs text-slate-500">{conflict.records} records</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <Btn size="sm" variant="outline" icon="eye">Review</Btn>
                <Btn size="sm" icon="check">Resolve</Btn>
              </div>
            </Card>
          ))}
        </div>

        <Section title="Local queue" className="mt-6">
          <Card className="p-0 overflow-hidden">
            {operations.slice(0, 3).map((op, i) => (
              <div key={op.id} className={`flex items-center justify-between p-3 ${i !== 2 ? "border-b border-slate-100" : ""}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{op.operationType.replace("_", " ")}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(op.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${op.synced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {op.synced ? "SYNCED" : "QUEUED"}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      </div>
    </div>
  );
}

export function PdfDocumentsScreen() {
  const { back, bills, customers, destinations, trips, businessProfile, toast, openA4Document } = useApp();
  const buildBillA4Document = (bill: Bill): A4DocumentPayload => {
    const customer = customers.find(item => item.id === bill.customerId);
    const destination = destinations.find(item => item.id === bill.destinationId);
    const trip = trips.find(item => item.id === bill.tripId);
    const customerName = walkInDisplayName(customer, bill.walkInDetails);
    const customerPhone = walkInPhone(customer, bill.walkInDetails);
    const subtotal = Number((bill.subtotalTaxInclusive - bill.taxTotal).toFixed(2));
    const balanceDue = Number((bill.grandTotal - bill.paidAmount).toFixed(2));

    return {
      title: bill.billType === "credit" ? "INVOICE" : "TAX INVOICE",
      documentNumber: bill.billNumber.replace("BILL", bill.billType === "credit" ? "INV" : "BILL"),
      businessName: businessProfile.businessName,
      businessDetails: [
        businessProfile.vesselName,
        businessProfile.address,
        `GST: ${businessProfile.gstNumber}`,
        `Reg: ${businessProfile.vesselRegistrationNumber}`,
        `${businessProfile.email} • ${businessProfile.phone}`,
      ],
      customerName,
      customerDetails: [
        !isWalkInCustomer(customer) ? customer?.legalName : undefined,
        customerPhone ? `Phone: ${customerPhone}` : undefined,
        bill.walkInDetails?.description ? `Description: ${bill.walkInDetails.description}` : undefined,
        customer?.gstNumber ? `GST: ${customer.gstNumber}` : undefined,
      ].filter((line): line is string => Boolean(line)),
      destinationDetails: [
        destination?.islandName,
        destination?.atoll ? `${destination.atoll} Atoll` : undefined,
        destination?.destinationCode,
      ].filter((line): line is string => Boolean(line)),
      meta: [
        { label: "Date", value: formatDate(bill.createdAt) },
        { label: "Trip", value: trip?.tripNumber },
        { label: "Status", value: bill.finalizedAt ? "Saved" : "Draft" },
      ],
      items: (bill.items || []).map(item => ({
        name: item.itemNameSnapshot,
        description: item.lineDescription,
        quantity: item.quantity,
        unitType: item.unitType,
        unitPrice: item.unitPriceTaxInclusive,
        taxAmount: item.taxAmount,
        total: item.lineTotalTaxInclusive,
      })),
      totals: [
        { label: "Subtotal (excl. tax)", value: MVR(subtotal) },
        { label: `GST ${businessProfile.defaultTaxRate}% (inclusive)`, value: MVR(bill.taxTotal) },
        { label: "Grand Total", value: MVR(bill.grandTotal), strong: true },
        { label: "Paid", value: MVR(bill.paidAmount) },
        ...(balanceDue > 0 ? [{ label: "Balance due", value: MVR(balanceDue), strong: true }] : []),
      ],
      footer: [
        "All prices are tax-inclusive. GST 8% included as per Maldives Tax Act.",
        `${businessProfile.businessName} • ${businessProfile.email} • ${businessProfile.phone}`,
      ],
    };
  };
  const docs = bills.map((bill, index) => ({
    id: `pdf_${bill.id}`,
    number: bill.billNumber.replace("BILL", bill.billType === "credit" ? "INV" : "BILL"),
    customer: walkInDisplayName(customers.find(c => c.id === bill.customerId), bill.walkInDetails),
    amount: bill.grandTotal,
    version: index % 2 === 0 ? 2 : 1,
    stored: Boolean(bill.finalizedAt),
    date: bill.finalizedAt || bill.createdAt,
    bill,
  }));
  const handlePrint = () => {
    const printDocument = docs.length === 1
      ? buildBillA4Document(docs[0].bill)
      : {
          title: "PDF DOCUMENTS",
          documentNumber: "DOCUMENT-LIST",
          businessName: businessProfile.businessName,
          businessDetails: [
            businessProfile.vesselName,
            businessProfile.address,
            `${businessProfile.email} • ${businessProfile.phone}`,
          ],
          customerName: "All documents",
          customerDetails: [`${docs.length} documents listed`],
          destinationDetails: ["All destinations"],
          meta: [{ label: "Printed", value: formatDateTime(new Date().toISOString()) }],
          items: docs.map(doc => ({
            name: doc.number,
            description: `${doc.customer} • ${doc.stored ? "Saved" : "Draft"} • ${formatDateTime(doc.date)}`,
            quantity: 1,
            unitType: "doc",
            unitPrice: doc.amount,
            taxAmount: 0,
            total: doc.amount,
          })),
          totals: [{ label: "Total listed", value: MVR(docs.reduce((sum, doc) => sum + doc.amount, 0)), strong: true }],
          footer: [`${businessProfile.businessName} • ${businessProfile.email} • ${businessProfile.phone}`],
        } satisfies A4DocumentPayload;
    openA4Document(printDocument);
  };
  const handleShare = async (doc: typeof docs[number]) => {
    try {
      const result = await shareA4PdfDocument(buildBillA4Document(doc.bill));
      if (result === "clipboard") {
        toast({ title: "PDF sharing unavailable", body: "A text copy was copied because this device cannot share PDF files.", variant: "warning" });
      } else if (result === "unsupported") {
        toast({ title: "Share unavailable", body: "This device cannot share PDF files. Use Print on web, or update the mobile app.", variant: "error" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: "Share failed", body: "Try again from this device.", variant: "error" });
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="PDF documents" subtitle="Invoices, bills, receipts" onBack={back} trailing={<Btn size="sm" icon="printer" variant="outline" onClick={handlePrint}>Print</Btn>} />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id} className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold text-slate-900">{doc.number}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{doc.customer} • v{doc.version} • {formatDateTime(doc.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{MVR(doc.amount)}</p>
                  <span className={`text-xs font-semibold ${doc.stored ? "text-emerald-600" : "text-amber-600"}`}>
                    {doc.stored ? "Saved" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <Btn size="sm" variant="outline" icon="eye">Preview</Btn>
                <Btn size="sm" icon="share" onClick={() => handleShare(doc)}>Share</Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
