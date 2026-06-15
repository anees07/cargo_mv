import { useEffect, useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Modal, Section, StatusBadge, TopBar } from "../components/ui";
import { MVR, MVRShort, formatDate, relativeTime } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import { isUnfinishedTrip } from "../utils/trips";
import { getDefaultCompleteTripDestinationIds } from "../utils/tripRoute";
import type { Customer, Destination } from "../types";

// ============================================================================
// Customer Detail / Ledger
// ============================================================================
export function CustomerDetailScreen() {
  const { selectedCustomerId, customers, destinations, bills, payments, operations, navigate, selectBill, updateCustomer, deleteCustomer, currentUser } = useApp();
  const customer = customers.find(c => c.id === selectedCustomerId);
  const [showEdit, setShowEdit] = useState(false);

  if (!customer) return null;

  const dest = destinations.find(d => d.id === customer.defaultDestinationId);
  const customerBills = bills.filter(b => b.customerId === customer.id);
  const customerPayments = payments.filter(p => customerBills.some(b => b.id === p.billId));
  const customerOps = operations.filter(o => o.customerId === customer.id);
  const totalBilled = customerBills.reduce((s, b) => s + b.grandTotal, 0);
  const totalPaid = customerBills.reduce((s, b) => s + b.paidAmount, 0);
  const [tab, setTab] = useState<"overview" | "bills" | "payments" | "operations">("overview");

  const typeColors: Record<string, string> = {
    business: "from-ocean-500 to-ocean-700",
    government: "from-amber-500 to-amber-700",
    individual: "from-emerald-500 to-emerald-700",
    walk_in: "from-slate-400 to-slate-600",
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title={customer.displayName}
        subtitle={`${customer.customerType.replace("_", " ")} customer`}
        onBack={() => navigate("customers")}
        trailing={
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} title="Print Statement" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 text-slate-500">
              <Icon name="printer" className="h-4 w-4" />
            </button>
            {hasPermission(currentUser.role, "manage_master") && <Btn size="sm" variant="outline" icon="edit" onClick={() => setShowEdit(true)}>Edit</Btn>}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Hero card */}
        <div className={`bg-gradient-to-br ${typeColors[customer.customerType] || "from-slate-500 to-slate-700"} px-5 py-6 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{customer.displayName}</h2>
              <p className="mt-0.5 text-sm opacity-80">{customer.legalName}</p>
              {customer.gstNumber && <p className="mt-1 text-xs opacity-70">GST: {customer.gstNumber}</p>}
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-xl font-bold backdrop-blur-sm">
              {customer.displayName.slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-center">
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Total billed</p>
              <p className="mt-0.5 text-sm font-bold">{MVRShort(totalBilled)}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Paid</p>
              <p className="mt-0.5 text-sm font-bold">{MVRShort(totalPaid)}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Outstanding</p>
              <p className="mt-0.5 text-sm font-bold">{MVRShort(customer.outstandingBalance)}</p>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-2 p-4">
          <Card className="p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Phone</p>
                <p className="mt-0.5 font-semibold text-slate-900">{customer.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Destination</p>
                <p className="mt-0.5 font-semibold text-slate-900">{dest?.islandName} ({dest?.destinationCode})</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Price level</p>
                <p className="mt-0.5 font-semibold text-slate-900 capitalize">{customer.defaultPriceLevelId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Credit status</p>
                <div className="mt-0.5 flex items-center gap-1">
                  {customer.creditAllowed ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-emerald-700">Allowed</span>
                      <span className="text-slate-400">/ {MVRShort(customer.creditLimit)}</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span className="font-semibold text-slate-600">Cash only</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {customer.outstandingBalance > 0 && (
            <Card className="border-l-4 border-l-amber-500 bg-amber-50 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-900">Outstanding balance</p>
                  <p className="mt-0.5 text-lg font-bold text-amber-800">{MVR(customer.outstandingBalance)}</p>
                  <p className="text-xs text-amber-700">
                    {Math.round((customer.outstandingBalance / customer.creditLimit) * 100)}% of credit limit used
                  </p>
                </div>
                <div className="h-12 w-12">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#fde68a" strokeWidth="3" />
                    <path
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#f59e0b" strokeWidth="3"
                      strokeDasharray={`${Math.min(100, (customer.outstandingBalance / customer.creditLimit) * 100)}, 100`}
                    />
                  </svg>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Tab navigation */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex gap-1 px-4 py-2">
            {[
              { id: "overview" as const, label: "Overview" },
              { id: "bills" as const, label: `Bills (${customerBills.length})` },
              { id: "payments" as const, label: `Payments (${customerPayments.length})` },
              { id: "operations" as const, label: `Ops (${customerOps.length})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-ocean-700 text-white" : "text-slate-600"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tab === "overview" && (
            <div className="space-y-3">
              <Card className="p-4">
                <p className="text-sm font-semibold text-slate-900">Ledger summary</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Total invoiced</span>
                    <span className="font-mono font-semibold text-slate-900">{MVR(totalBilled)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Total paid</span>
                    <span className="font-mono font-semibold text-emerald-700">{MVR(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Balance due</span>
                    <span className="font-mono font-bold text-rose-700">{MVR(customer.outstandingBalance)}</span>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold text-slate-900">Activity</p>
                <p className="mt-2 text-xs text-slate-500">{customerBills.length} bills · {customerPayments.length} payments · {customerOps.reduce((s, o) => s + o.items.length, 0)} items loaded</p>
              </Card>
            </div>
          )}

          {tab === "bills" && (
            <div className="space-y-2">
              {customerBills.map(b => (
                <Card key={b.id} className="p-3" onClick={() => { selectBill(b.id); navigate("invoice_preview"); }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{b.billNumber}</p>
                        <StatusBadge status={b.paymentStatus} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(b.createdAt)} · {b.itemCount} items</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{MVR(b.grandTotal)}</p>
                  </div>
                </Card>
              ))}
              {customerBills.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No bills for this customer.</p>}
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-2">
              {customerPayments.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.paymentNumber}</p>
                      <p className="mt-0.5 text-xs text-slate-500 capitalize">{p.method.replace("_", " ")} · {formatDate(p.collectedAt)}</p>
                      {p.reference && <p className="text-xs text-slate-400 font-mono">Ref: {p.reference}</p>}
                    </div>
                    <p className="text-sm font-bold text-emerald-700">{MVR(p.amount)}</p>
                  </div>
                </Card>
              ))}
              {customerPayments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No payments recorded.</p>}
            </div>
          )}

          {tab === "operations" && (
            <div className="space-y-2">
              {customerOps.map(op => (
                <Card key={op.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 capitalize">{op.operationType.replace("_", " ")}</p>
                      <p className="text-xs text-slate-500">{op.items.length} items · {relativeTime(op.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{MVR(op.totalTaxInclusive)}</p>
                      <p className="text-xs text-slate-500">tax {MVR(op.totalTax)}</p>
                    </div>
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2 space-y-1">
                    {op.items.slice(0, 3).map(it => (
                      <div key={it.id} className="flex justify-between text-xs text-slate-600">
                        <span>{it.itemNameSnapshot} × {it.quantity}</span>
                        <span className="font-mono">{MVR(it.lineTotalTaxInclusive)}</span>
                      </div>
                    ))}
                    {op.items.length > 3 && <p className="text-xs text-slate-400">+{op.items.length - 3} more items</p>}
                  </div>
                </Card>
              ))}
              {customerOps.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No operations for this customer.</p>}
            </div>
          )}
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit customer profile">
        <EditCustomerForm
          customer={customer}
          destinations={destinations}
          onSave={(updates) => {
            updateCustomer(customer.id, updates);
            setShowEdit(false);
          }}
          onDelete={() => {
            if (confirm(`Remove ${customer.displayName}?`)) {
              deleteCustomer(customer.id);
              setShowEdit(false);
              navigate("customers");
            }
          }}
        />
      </Modal>
    </div>
  );
}

function EditCustomerForm({
  customer,
  destinations,
  onSave,
  onDelete,
}: {
  customer: Customer;
  destinations: Destination[];
  onSave: (updates: Partial<Customer>) => void;
  onDelete: () => void;
}) {
  const [displayName, setDisplayName] = useState(customer.displayName);
  const [legalName, setLegalName] = useState(customer.legalName);
  const [phone, setPhone] = useState(customer.phone);
  const [gstNumber, setGstNumber] = useState(customer.gstNumber || "");
  const [defaultDestinationId, setDefaultDestinationId] = useState(customer.defaultDestinationId);
  const [creditAllowed, setCreditAllowed] = useState(customer.creditAllowed);
  const [creditLimit, setCreditLimit] = useState(customer.creditLimit);

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Display Name</label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Legal Company / Registered Name</label>
        <input
          value={legalName}
          onChange={e => setLegalName(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">GST Number</label>
          <input
            value={gstNumber}
            onChange={e => setGstNumber(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 font-mono"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Default Destination Island</label>
        <select
          value={defaultDestinationId}
          onChange={e => setDefaultDestinationId(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        >
          {destinations.map(d => <option key={d.id} value={d.id}>{d.islandName} ({d.destinationCode})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-1">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={creditAllowed} onChange={e => setCreditAllowed(e.target.checked)} />
          Credit allowed
        </label>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Credit Limit (MVR)</label>
          <input
            type="number"
            disabled={!creditAllowed}
            value={creditLimit}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setCreditLimit(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 disabled:opacity-50"
          />
        </div>
      </div>
      <div className="pt-2 space-y-2">
        <Btn
          fullWidth
          size="lg"
          icon="check"
          disabled={!displayName.trim()}
          onClick={() => onSave({ displayName: displayName.trim(), legalName: legalName.trim(), phone, gstNumber: gstNumber.trim() || undefined, defaultDestinationId, creditAllowed, creditLimit })}
        >
          Save customer settings
        </Btn>
        <Btn fullWidth size="lg" variant="danger" icon="trash" onClick={onDelete}>
          Delete customer profile
        </Btn>
      </div>
    </div>
  );
}

// ============================================================================
// Destination Detail
// ============================================================================
export function DestinationDetailScreen() {
  const { selectedDestinationId, destinations, customers, operations, bills, navigate, selectCustomer, updateDestination, deleteDestination } = useApp();
  const dest = destinations.find(d => d.id === selectedDestinationId);
  const [showEdit, setShowEdit] = useState(false);

  if (!dest) return null;

  const destCustomers = customers.filter(c => c.defaultDestinationId === dest.id);
  const destOps = operations.filter(o => o.destinationId === dest.id);
  const destBills = bills.filter(b => b.destinationId === dest.id);
  const totalRevenue = destBills.reduce((s, b) => s + b.grandTotal, 0);
  const totalItems = destOps.reduce((s, o) => s + o.items.length, 0);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title={dest.islandName}
        subtitle={`${dest.atoll} Atoll · ${dest.destinationCode}`}
        onBack={() => navigate("destinations")}
        trailing={<Btn size="sm" variant="outline" icon="edit" onClick={() => setShowEdit(true)}>Edit</Btn>}
      />

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold backdrop-blur-sm">
              {dest.destinationCode}
            </div>
            <div>
              <h2 className="text-xl font-bold">{dest.islandName}</h2>
              <p className="text-sm text-ocean-100">{dest.atoll} Atoll</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-center">
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Customers</p>
              <p className="mt-0.5 text-lg font-bold">{destCustomers.length}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Cargo items</p>
              <p className="mt-0.5 text-lg font-bold">{totalItems}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-xs uppercase opacity-70">Revenue</p>
              <p className="mt-0.5 text-lg font-bold">{MVRShort(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <Section title={`Customers (${destCustomers.length})`}>
            {destCustomers.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">No customers registered at this destination.</Card>
            ) : (
              <div className="space-y-2">
                {destCustomers.map(c => (
                  <Card
                    key={c.id}
                    className="p-3"
                    onClick={() => { selectCustomer(c.id); navigate("customer_detail" as any); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-100 text-xs font-bold text-ocean-700">
                          {c.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{c.displayName}</p>
                          <p className="text-xs text-slate-500 capitalize">{c.customerType.replace("_", " ")} · {c.defaultPriceLevelId}</p>
                        </div>
                      </div>
                      {c.outstandingBalance > 0 && (
                        <p className="text-xs font-bold text-rose-600">{MVR(c.outstandingBalance)}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Bills (${destBills.length})`}>
            {destBills.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">No bills for this destination.</Card>
            ) : (
              <div className="space-y-2">
                {destBills.map(b => {
                  const c = customers.find(x => x.id === b.customerId);
                  return (
                    <Card key={b.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{b.billNumber}</p>
                            <StatusBadge status={b.paymentStatus} />
                          </div>
                          <p className="text-xs text-slate-500">{c?.displayName} · {formatDate(b.createdAt)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{MVR(b.grandTotal)}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit island destination">
        <EditDestinationForm
          destination={dest}
          onSave={(updates) => {
            updateDestination(dest.id, updates);
            setShowEdit(false);
          }}
          onDelete={() => {
            if (confirm(`Remove ${dest.islandName} (${dest.destinationCode})?`)) {
              deleteDestination(dest.id);
              setShowEdit(false);
              navigate("destinations");
            }
          }}
        />
      </Modal>
    </div>
  );
}

function EditDestinationForm({
  destination,
  onSave,
  onDelete,
}: {
  destination: Destination;
  onSave: (updates: Partial<Destination>) => void;
  onDelete: () => void;
}) {
  const [islandName, setIslandName] = useState(destination.islandName);
  const [atoll, setAtoll] = useState(destination.atoll);
  const [destinationCode, setDestinationCode] = useState(destination.destinationCode);
  const [sortOrder, setSortOrder] = useState(destination.sortOrder);

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Island Name</label>
        <input
          value={islandName}
          onChange={e => setIslandName(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Atoll</label>
        <input
          value={atoll}
          onChange={e => setAtoll(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">3-Letter Code</label>
          <input
            value={destinationCode}
            onChange={e => setDestinationCode(e.target.value.toUpperCase().slice(0, 4))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 font-mono font-bold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Display Sort Order</label>
          <input
            type="number"
            min={1}
            value={sortOrder}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setSortOrder(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 font-mono"
          />
        </div>
      </div>
      <div className="pt-2 space-y-2">
        <Btn
          fullWidth
          size="lg"
          icon="check"
          disabled={!islandName.trim() || !destinationCode.trim()}
          onClick={() => onSave({ islandName: islandName.trim(), atoll: atoll.trim(), destinationCode: destinationCode.trim(), sortOrder })}
        >
          Save destination specs
        </Btn>
        <Btn fullWidth size="lg" variant="danger" icon="trash" onClick={onDelete}>
          Delete destination island
        </Btn>
      </div>
    </div>
  );
}

// ============================================================================
// Create Trip Form (proper modal form)
// ============================================================================
export function CreateTripScreen() {
  const { destinations, businessProfile, trips, navigate, createTrip, selectTrip, toast } = useApp();
  const defaultRoute = getDefaultCompleteTripDestinationIds(destinations);
  const [origin, setOrigin] = useState(defaultRoute.originDestinationId);
  const [returnDestination, setReturnDestination] = useState(defaultRoute.returnDestinationId);
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState(8);
  const [creating, setCreating] = useState(false);
  const unfinishedTrip = trips.find(isUnfinishedTrip);
  const routeReady = Boolean(origin && returnDestination);

  useEffect(() => {
    if (!origin && defaultRoute.originDestinationId) setOrigin(defaultRoute.originDestinationId);
    if (!returnDestination && defaultRoute.returnDestinationId) setReturnDestination(defaultRoute.returnDestinationId);
  }, [defaultRoute.originDestinationId, defaultRoute.returnDestinationId, origin, returnDestination]);

  const handleCreate = async () => {
    if (creating) return;
    if (!routeReady) {
      toast({ title: "Trip route missing", body: "Select origin and return destination first.", variant: "warning" });
      return;
    }
    if (unfinishedTrip) {
      selectTrip(unfinishedTrip.id);
      toast({ title: "Trip already open", body: unfinishedTrip.tripNumber, variant: "warning" });
      navigate("trip_detail");
      return;
    }
    setCreating(true);
    const arrival = new Date(Date.now() + hours * 3600000).toISOString();
    const trip = await createTrip(origin, returnDestination, arrival, notes || "New cargo trip");
    if (!trip) {
      setCreating(false);
      navigate("trip_detail");
      return;
    }
    selectTrip(trip.id);
    toast({ title: "Trip created", body: trip.tripNumber, variant: "success" });
    navigate("trip_detail");
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <TopBar title="Create new trip" subtitle={businessProfile.vesselName} onBack={() => navigate("trips")} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="border-ocean-200 bg-ocean-50 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-700 text-xl text-white">⛴️</div>
            <div>
              <p className="text-sm font-semibold text-ocean-900">{businessProfile.vesselName}</p>
              <p className="text-xs text-ocean-700">{businessProfile.vesselRegistrationNumber}</p>
            </div>
          </div>
        </Card>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Origin (departure island)</label>
          <select value={origin} onChange={e => setOrigin(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100">
            {destinations.map(d => <option key={d.id} value={d.id}>{d.islandName} ({d.destinationCode}) — {d.atoll}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Return destination</label>
          <select value={returnDestination} onChange={e => setReturnDestination(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100">
            {destinations.map(d => <option key={d.id} value={d.id}>{d.islandName} ({d.destinationCode}) — {d.atoll}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Estimated duration (hours)</label>
          <input
            type="number"
            value={hours}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setHours(Math.max(1, Number(e.target.value)))}
            min={1}
            max={72}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Arrival estimated at {new Date(Date.now() + hours * 3600000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} today
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Trip notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Mixed cargo for southern atolls. Fuel and construction priority."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100 resize-none"
          />
        </div>

        <Card className="border-dashed p-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-ocean-500" />
            <div>
              <p className="font-semibold text-slate-900">Trip number is automatic</p>
              <p className="mt-0.5">Numbers stay unique across devices.</p>
            </div>
          </div>
        </Card>

        {unfinishedTrip && (
          <Card className="border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-950">Finish current trip first</p>
                <p className="mt-0.5">{unfinishedTrip.tripNumber} is {unfinishedTrip.status}.</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 space-y-2">
        <Btn fullWidth size="lg" icon={unfinishedTrip ? "ship" : "check"} loading={creating} disabled={!unfinishedTrip && !routeReady} onClick={handleCreate}>
          {unfinishedTrip ? "View current trip" : "Create draft trip"}
        </Btn>
        <p className="text-center text-xs text-slate-400">
          {unfinishedTrip ? "End or close it before creating another trip." : "You can open the trip for loading after creation."}
        </p>
      </div>
    </div>
  );
}
