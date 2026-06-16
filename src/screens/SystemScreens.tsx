import { useApp } from "../useApp";
import { Btn, Card, Section, TopBar } from "../components/ui";
import { MVR, formatDateTime } from "../utils/format";

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
  const { back, bills, customers } = useApp();
  const docs = bills.map((bill, index) => ({
    id: `pdf_${bill.id}`,
    number: bill.billNumber.replace("BILL", bill.billType === "credit" ? "INV" : "BILL"),
    customer: customers.find(c => c.id === bill.customerId)?.displayName || "Unknown",
    amount: bill.grandTotal,
    version: index % 2 === 0 ? 2 : 1,
    stored: Boolean(bill.finalizedAt),
    date: bill.finalizedAt || bill.createdAt,
  }));

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="PDF documents" subtitle="Invoices, bills, receipts" onBack={back} trailing={<Btn size="sm" icon="printer" variant="outline">Print</Btn>} />

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
                <Btn size="sm" icon="share">Share</Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
