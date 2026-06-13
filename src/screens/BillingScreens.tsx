import { useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Modal, StatusBadge, TopBar } from "../components/ui";
import { MVR, formatDate } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import type { BillType, PaymentMethod } from "../types";

// ============================================================================
// Billing — list, filter, generate, finalize
// ============================================================================
export function BillingScreen() {
  const { bills, customers, destinations, trips, navigate, selectBill, createManualBill, back, currentUser } = useApp();
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid" | "credit">("all");
  const [showGenerate, setShowGenerate] = useState(false);

  const filtered = bills.filter(b => {
    if (filter === "all") return true;
    if (filter === "unpaid") return b.paymentStatus === "unpaid";
    if (filter === "partial") return b.paymentStatus === "partial";
    if (filter === "paid") return b.paymentStatus === "paid";
    if (filter === "credit") return b.billType === "credit";
    return true;
  });

  const totals = {
    count: filtered.length,
    total: filtered.reduce((s, b) => s + b.grandTotal, 0),
    paid: filtered.reduce((s, b) => s + b.paidAmount, 0),
    outstanding: filtered.reduce((s, b) => s + (b.grandTotal - b.paidAmount), 0),
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Billing"
        subtitle={`${totals.count} bills • ${MVR(totals.outstanding)} outstanding`}
        onBack={back}
        trailing={
          hasPermission(currentUser.role, "create_bill") && (
            <Btn size="sm" icon="plus" onClick={() => setShowGenerate(true)}>New bill</Btn>
          )
        }
      />

      <div className="border-b border-slate-200 bg-white">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2">
          {[
            { id: "all", label: "All" },
            { id: "unpaid", label: "Unpaid" },
            { id: "partial", label: "Partial" },
            { id: "paid", label: "Paid" },
            { id: "credit", label: "Credit" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f.id ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <Card className="mb-3 p-4 bg-gradient-to-br from-ocean-700 to-ocean-900 text-white border-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ocean-200">Billed</p>
              <p className="mt-1 text-base font-bold">{MVR(totals.total)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-ocean-200">Collected</p>
              <p className="mt-1 text-base font-bold text-emerald-300">{MVR(totals.paid)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-ocean-200">Outstanding</p>
              <p className="mt-1 text-base font-bold text-amber-300">{MVR(totals.outstanding)}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-500">No bills match this filter.</Card>
          )}
          {filtered.map(b => {
            const c = customers.find(c => c.id === b.customerId);
            const d = destinations.find(d => d.id === b.destinationId);
            const t = trips.find(t => t.id === b.tripId);
            const due = b.grandTotal - b.paidAmount;
            return (
              <Card key={b.id} className="p-3.5" onClick={() => { selectBill(b.id); navigate("invoice_preview"); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{c?.displayName}</p>
                      <StatusBadge status={b.paymentStatus} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{b.billNumber} • {b.itemCount} items</p>
                    <p className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><Icon name="island" className="h-3 w-3" /> {d?.islandName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-xs">{t?.tripNumber}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{MVR(b.grandTotal)}</p>
                    {due > 0 && <p className="text-xs font-semibold text-rose-600">Due {MVR(due)}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(b.createdAt)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate new bill" full>
        <GenerateBillForm
          onGenerate={(type, customerId, destId, tripId) => {
            const bill = createManualBill({
              billType: type as BillType,
              customerId,
              destinationId: destId,
              tripId,
            });
            setShowGenerate(false);
            if (bill) {
              selectBill(bill.id);
              navigate("invoice_preview");
            }
          }}
        />
      </Modal>
    </div>
  );
}

function GenerateBillForm({ onGenerate }: { onGenerate: (type: string, customerId: string, destId: string, tripId: string) => void }) {
  const { customers, destinations, trips, activeTripId } = useApp();
  const [type, setType] = useState("credit");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [destId, setDestId] = useState(destinations[0]?.id || "");
  const [tripId, setTripId] = useState(activeTripId || trips[0]?.id || "");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Bill type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {[
            { id: "instant_cash", label: "Instant cash bill" },
            { id: "credit", label: "Credit invoice" },
            { id: "destination_grouped", label: "Destination grouped" },
            { id: "individual_invoice", label: "Individual invoice" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-xl border p-3 text-left text-xs font-medium ${type === t.id ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-slate-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Customer</label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm">
          {customers.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Destination</label>
        <select value={destId} onChange={e => setDestId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm">
          {destinations.map(d => <option key={d.id} value={d.id}>{d.islandName} ({d.destinationCode})</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Trip</label>
        <select value={tripId} onChange={e => setTripId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm">
          {trips.filter(t => ["open", "loading", "sailing", "offloading"].includes(t.status)).map(t => <option key={t.id} value={t.id}>{t.tripNumber}</option>)}
        </select>
      </div>
      <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-3 text-xs text-ocean-900">
        Number generation happens on the server. The new bill will use the next sequence in the numbering lock for this business profile.
      </div>
      <Btn fullWidth size="lg" icon="check" onClick={() => onGenerate(type, customerId, destId, tripId)}>
        Generate bill
      </Btn>
    </div>
  );
}

// ============================================================================
// Invoice Preview — A4 PDF rendering
// ============================================================================
export function InvoicePreviewScreen() {
  const { bills, customers, destinations, trips, businessProfile, currentUser, selectedBillId, navigate, postPayment, finalizeBill, alterBillAfterTripEnd } = useApp();
  const bill = bills.find(b => b.id === selectedBillId) || bills[0];
  const [showPay, setShowPay] = useState(false);
  const [showAlter, setShowAlter] = useState(false);

  if (!bill) return null;
  const customer = customers.find(c => c.id === bill.customerId);
  const destination = destinations.find(d => d.id === bill.destinationId);
  const trip = trips.find(t => t.id === bill.tripId);
  const taxRate = businessProfile.defaultTaxRate;
  const subtotal = bill.subtotalTaxInclusive - bill.taxTotal;

  return (
    <div className="flex h-full flex-col bg-slate-200">
      <TopBar
        title="Invoice"
        subtitle={bill.billNumber}
        onBack={() => navigate("billing")}
        trailing={
          <div className="flex items-center gap-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100" title="Print"><Icon name="printer" className="h-4 w-4" /></button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100" title="Share"><Icon name="share" className="h-4 w-4" /></button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 no-scrollbar">
        <div className="mx-auto max-w-2xl bg-white shadow-lg rounded-lg p-6 text-xs leading-relaxed">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ocean-700 text-3xl text-white">
                {businessProfile.logoEmoji}
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">{businessProfile.businessName}</h1>
                <p className="text-slate-700">{businessProfile.vesselName}</p>
                <p className="text-slate-500 text-xs">{businessProfile.address}</p>
                <p className="text-slate-500 text-xs">GST: {businessProfile.gstNumber} • Reg: {businessProfile.vesselRegistrationNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-slate-900">{bill.billType === "credit" ? "TAX INVOICE" : "CASH BILL"}</p>
              <p className="text-slate-700 font-mono mt-1">{bill.billNumber}</p>
              <p className="text-slate-500 text-xs">Date: {formatDate(bill.createdAt)}</p>
              <p className="text-slate-500 text-xs">Trip: {trip?.tripNumber}</p>
            </div>
          </div>

          {/* Bill to */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{customer?.displayName}</p>
              <p className="text-slate-600">{customer?.legalName}</p>
              <p className="text-slate-500">Phone: {customer?.phone}</p>
              {customer?.gstNumber && <p className="text-slate-500">GST: {customer.gstNumber}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Destination</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{destination?.islandName}</p>
              <p className="text-slate-600">{destination?.atoll} Atoll</p>
              <p className="text-slate-500">{destination?.destinationCode}</p>
            </div>
          </div>

          {/* Line items table */}
          <div className="mt-5 border border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border-b border-slate-300 px-2 py-1.5 text-left">Item</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 text-center">Qty</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 text-right">Unit (incl)</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 text-right">Tax</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 text-right">Total (incl)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: bill.itemCount }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-2 py-1.5">{i % 3 === 0 ? "Cement Bag (50kg)" : i % 3 === 1 ? "Sand (m³)" : "Construction Steel"}</td>
                    <td className="px-2 py-1.5 text-center font-mono">{[120, 8, 2][i % 3]}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{[140, 850, 1850][i % 3].toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{([140, 850, 1850][i % 3] * 0.074).toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{([16800, 6800, 3700][i % 3] / 1).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-3 flex justify-end">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-600">Subtotal (excl. tax)</span><span className="font-mono">{MVR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">GST {taxRate}% (inclusive)</span><span className="font-mono">{MVR(bill.taxTotal)}</span></div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-1 text-sm font-bold">
                <span>Grand Total</span>
                <span className="font-mono">{MVR(bill.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700"><span>Paid</span><span className="font-mono">{MVR(bill.paidAmount)}</span></div>
              {bill.grandTotal - bill.paidAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Balance due</span>
                  <span className="font-mono">{MVR(bill.grandTotal - bill.paidAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 border-t-2 border-dashed border-slate-300 pt-3 text-xs text-slate-500">
            <p className="text-center">All prices are tax-inclusive. GST 8% included as per Maldives Tax Act.</p>
            <p className="text-center mt-1">Thank you for your business. Payment is due within 30 days. Late payments attract 2% monthly interest.</p>
            <p className="text-center mt-2 text-slate-400">{businessProfile.businessName} • {businessProfile.email} • {businessProfile.phone}</p>
          </div>
        </div>

        {/* Status banner */}
        {bill.billStatus === "draft" && (
          <div className="mx-auto mt-3 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Draft.</strong> Finalize this bill to lock the numbering and generate the official PDF.
            <Btn size="sm" variant="primary" className="mt-2" onClick={() => finalizeBill(bill.id)}>Finalize bill</Btn>
          </div>
        )}

        {bill.paymentStatus !== "paid" && bill.billStatus !== "draft" && hasPermission(currentUser.role, "manage_payment") && (
          <div className="mx-auto mt-3 max-w-2xl">
            <Btn fullWidth size="lg" icon="cash" onClick={() => setShowPay(true)}>
              Collect payment — {MVR(bill.grandTotal - bill.paidAmount)}
            </Btn>
          </div>
        )}

        {trip && ["ended", "closed"].includes(trip.status) && ["owner", "admin"].includes(currentUser.role) && (
          <div className="mx-auto mt-3 max-w-2xl">
            <Btn fullWidth size="lg" variant="outline" icon="edit" onClick={() => setShowAlter(true)}>
              Alter / Correct Finalized Bill (Audit Logged)
            </Btn>
          </div>
        )}
      </div>

      <Modal open={showAlter} onClose={() => setShowAlter(false)} title="Alter existing bill (Trip ended)">
        <AlterBillForm
          currentTotal={bill.grandTotal}
          onSave={(newTotal, reason) => {
            alterBillAfterTripEnd(bill.id, newTotal, reason);
            setShowAlter(false);
          }}
        />
      </Modal>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Collect payment">
        <CollectPaymentForm
          maxAmount={bill.grandTotal - bill.paidAmount}
          onPost={(amount, method, ref) => {
            postPayment(bill.id, amount, method as PaymentMethod, ref);
            setShowPay(false);
            navigate("payments");
          }}
        />
      </Modal>
    </div>
  );
}

function CollectPaymentForm({ maxAmount, onPost }: { maxAmount: number; onPost: (amount: number, method: string, ref?: string) => void }) {
  const [amount, setAmount] = useState(maxAmount);
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-3.5 text-sm text-slate-500">MVR</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            max={maxAmount}
            step={0.5}
            className="h-11 w-full rounded-xl border border-slate-300 pl-12 pr-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">Max: {MVR(maxAmount)}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Method</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          {[
            { id: "cash", label: "Cash", icon: "💵" },
            { id: "bank_transfer", label: "Bank", icon: "🏦" },
            { id: "cheque", label: "Cheque", icon: "📝" },
            { id: "mobile_wallet", label: "Wallet", icon: "📱" },
            { id: "other", label: "Other", icon: "⋯" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`rounded-xl border p-3 text-center text-xs font-medium ${method === m.id ? "border-ocean-500 bg-ocean-50" : "border-slate-200"}`}
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-1">{m.label}</div>
            </button>
          ))}
        </div>
      </div>
      {(method === "bank_transfer" || method === "cheque" || method === "mobile_wallet") && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reference</label>
          <input
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="Transaction / cheque #"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      )}
      <Btn fullWidth size="lg" icon="check" onClick={() => onPost(amount, method as PaymentMethod, ref)}>
        Post payment
      </Btn>
    </div>
  );
}

function AlterBillForm({
  currentTotal,
  onSave,
}: {
  currentTotal: number;
  onSave: (newTotal: number, reason: string) => void;
}) {
  const [total, setTotal] = useState(currentTotal);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <Card className="border-l-4 border-l-rose-500 bg-rose-50 p-3">
        <p className="text-xs font-semibold text-rose-950">Legal document modification</p>
        <p className="mt-0.5 text-xs text-rose-800">
          Modifying a finalized bill after the trip has ended creates an immutable compliance entry in the official audit trail.
        </p>
      </Card>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Corrected grand total (MVR) *</label>
        <div className="relative">
          <span className="absolute left-3 top-3.5 text-sm font-semibold text-slate-500">MVR</span>
          <input
            type="number"
            min={1}
            step={0.5}
            value={total}
            onChange={e => setTotal(Math.max(1, Number(e.target.value)))}
            className="h-11 w-full rounded-xl border border-slate-300 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Mandatory modification reason *</label>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Corrected offloading damage discount"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <Btn
        fullWidth
        size="lg"
        variant="danger"
        icon="check"
        disabled={!reason.trim() || total <= 0}
        onClick={() => onSave(total, reason.trim())}
      >
        Confirm Post-Trip Bill Alteration
      </Btn>
    </div>
  );
}
