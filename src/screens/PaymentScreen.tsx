import { useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Modal, Section, TopBar } from "../components/ui";
import { MVR, relativeTime } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import type { Bill, Customer, PaymentMethod } from "../types";

// ============================================================================
// Payments
// ============================================================================
export function PaymentsScreen() {
  const { payments, bills, customers, postPayment, back, currentUser } = useApp();
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [showRecord, setShowRecord] = useState(false);
  const filtered = payments.filter(p => methodFilter === "all" || p.method === methodFilter);
  const total = filtered.reduce((s, p) => s + p.amount, 0);
  const today = filtered.filter(p => new Date(p.collectedAt).toDateString() === new Date().toDateString()).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Payments"
        subtitle={`${payments.length} receipts`}
        onBack={back}
        trailing={
          hasPermission(currentUser.role, "manage_payment") && (
            <Btn size="sm" icon="plus" onClick={() => setShowRecord(true)}>Record</Btn>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 border-0 p-4 text-white">
            <p className="text-xs uppercase tracking-wider text-emerald-100">Today collected</p>
            <p className="mt-1 text-2xl font-bold">{MVR(today)}</p>
            <p className="text-xs text-emerald-100 mt-0.5">Cashier closing in 6h</p>
          </Card>
          <Card className="bg-gradient-to-br from-ocean-600 to-ocean-800 border-0 p-4 text-white">
            <p className="text-xs uppercase tracking-wider text-ocean-100">Period total</p>
            <p className="mt-1 text-2xl font-bold">{MVR(total)}</p>
            <p className="text-xs text-ocean-100 mt-0.5">{filtered.length} receipts</p>
          </Card>
        </div>

        <Section title="Filter" className="mt-5">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "All methods" },
              { id: "cash", label: "Cash" },
              { id: "bank_transfer", label: "Bank" },
              { id: "cheque", label: "Cheque" },
              { id: "mobile_wallet", label: "Wallet" },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethodFilter(m.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${methodFilter === m.id ? "bg-ocean-700 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Receipts" className="mt-5">
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map(p => {
                const bill = bills.find(b => b.id === p.billId);
                const c = customers.find(c => c.id === bill?.customerId);
                const methodLabel: Record<string, string> = {
                  cash: "💵 Cash", bank_transfer: "🏦 Bank", cheque: "📝 Cheque", mobile_wallet: "📱 Wallet", other: "Other",
                };
                return (
                  <div key={p.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{p.paymentNumber}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{methodLabel[p.method]}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{c?.displayName} • {bill?.billNumber}</p>
                        {p.reference && <p className="text-xs text-slate-400 font-mono">Ref: {p.reference}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-700">{MVR(p.amount)}</p>
                        <p className="text-xs text-slate-400">{relativeTime(p.collectedAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Section>
      </div>

      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Record payment">
        <RecordStandalonePaymentForm
          bills={bills.filter(b => b.paymentStatus !== "paid" && b.billStatus !== "draft" && b.billStatus !== "cancelled")}
          customers={customers}
          onPost={async (billId, amount, method, ref, notes) => {
            const posted = await postPayment(billId, amount, method, ref, notes);
            if (posted) {
              setShowRecord(false);
            }
          }}
        />
      </Modal>
    </div>
  );
}

function RecordStandalonePaymentForm({
  bills,
  customers,
  onPost,
}: {
  bills: Bill[];
  customers: Customer[];
  onPost: (billId: string, amount: number, method: PaymentMethod, reference?: string, notes?: string) => void | Promise<void>;
}) {
  const [selectedBillId, setSelectedBillId] = useState<string>(bills[0]?.id || "");
  const selectedBill = bills.find(b => b.id === selectedBillId);
  const maxDue = selectedBill ? selectedBill.grandTotal - selectedBill.paidAmount : 0;
  
  const [amount, setAmount] = useState<number>(maxDue);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const needsReference = ["bank_transfer", "cheque", "mobile_wallet"].includes(method);
  const canSubmit = Boolean(selectedBillId) && amount > 0 && amount <= maxDue && (!needsReference || Boolean(ref.trim())) && !submitting;

  const handleBillChange = (id: string) => {
    setSelectedBillId(id);
    const bill = bills.find(b => b.id === id);
    if (bill) {
      setAmount(bill.grandTotal - bill.paidAmount);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onPost(selectedBillId, amount, method, ref.trim() || undefined, notes.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  if (bills.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <Icon name="check_circle" className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        All bills are currently fully paid!
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Select outstanding bill / invoice *</label>
        <select
          value={selectedBillId}
          onChange={e => handleBillChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        >
          {bills.map(b => {
            const cust = customers.find(c => c.id === b.customerId);
            const due = b.grandTotal - b.paidAmount;
            return (
              <option key={b.id} value={b.id}>
                {b.billNumber} • {cust?.displayName || "Customer"} (Due: {MVR(due)})
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Payment amount (MVR) *</label>
        <div className="relative">
          <span className="absolute left-3 top-3.5 text-sm font-semibold text-slate-500">MVR</span>
          <input
            type="number"
            min={0.5}
            max={maxDue}
            step={0.5}
            value={amount}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setAmount(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-slate-300 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">Balance outstanding: {MVR(maxDue)}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Payment method *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          {[
            { id: "cash" as const, label: "Cash", icon: "💵" },
            { id: "bank_transfer" as const, label: "Bank", icon: "🏦" },
            { id: "cheque" as const, label: "Cheque", icon: "📝" },
            { id: "mobile_wallet" as const, label: "Wallet", icon: "📱" },
            { id: "other" as const, label: "Other", icon: "⋯" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`rounded-xl border p-3 text-center text-xs font-medium transition-all ${method === m.id ? "border-ocean-500 bg-ocean-50 text-ocean-950 shadow-sm" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-1 font-semibold">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {(method === "bank_transfer" || method === "cheque" || method === "mobile_wallet") && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Transaction / Cheque reference *</label>
          <input
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="e.g. BNK-TRF-99214"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Optional receipt notes</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Same day partial settlement"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>

      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Posting payment..." : "Post official payment receipt"}
      </Btn>
    </div>
  );
}
