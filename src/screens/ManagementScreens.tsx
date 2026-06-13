import { useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Modal, Section, TopBar } from "../components/ui";
import type { BusinessProfile, User, UserRole } from "../types";
import { MVR, MVRShort, formatDate, roleColor, roleLabel } from "../utils/format";

// ============================================================================
// Reports
// ============================================================================
export function ReportsScreen() {
  const { bills, customers, destinations, payments, trips, businessProfile, toast, back } = useApp();
  const [tab, setTab] = useState<"overview" | "destination" | "customer" | "tax" | "cashier">("overview");
  const [showExport, setShowExport] = useState(false);

  const totalBilled = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);
  const totalTax = bills.reduce((s, b) => s + b.taxTotal, 0);

  const destinationReport = destinations.map(d => {
    const destBills = bills.filter(b => b.destinationId === d.id);
    return {
      ...d,
      billCount: destBills.length,
      revenue: destBills.reduce((s, b) => s + b.grandTotal, 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Reports"
        subtitle="Real-time business analytics"
        onBack={back}
        trailing={<Btn size="sm" icon="download" variant="outline" onClick={() => setShowExport(true)}>Export</Btn>}
      />

      <div className="border-b border-slate-200 bg-white">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2">
          {[
            { id: "overview", label: "Overview" },
            { id: "destination", label: "By destination" },
            { id: "customer", label: "By customer" },
            { id: "tax", label: "Tax" },
            { id: "cashier", label: "Cashier" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-ocean-700 text-white" : "text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Total billed</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{MVRShort(totalBilled)}</p>
                <p className="mt-1 text-xs text-slate-500">{bills.length} bills this period</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Collected</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{MVRShort(totalCollected)}</p>
                <p className="mt-1 text-xs text-slate-500">{payments.length} receipts</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Outstanding</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">{MVRShort(totalOutstanding)}</p>
                <p className="mt-1 text-xs text-slate-500">{customers.filter(c => c.outstandingBalance > 0).length} customers</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Tax collected</p>
                <p className="mt-1 text-2xl font-bold text-violet-700">{MVRShort(totalTax)}</p>
                <p className="mt-1 text-xs text-slate-500">GST {businessProfile.defaultTaxRate}%</p>
              </Card>
            </div>

            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-900">Trip summary</p>
              <div className="mt-3 space-y-2 text-xs">
                {trips.map(t => (
                  <div key={t.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <div>
                      <p className="font-semibold text-slate-900">{t.tripNumber}</p>
                      <p className="text-slate-500">{formatDate(t.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{bills.filter(b => b.tripId === t.id).length} bills</p>
                      <p className="text-slate-500">{t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "destination" && (
          <Card className="p-0 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 text-[10px] uppercase font-semibold tracking-wider text-slate-600 grid grid-cols-12 gap-2">
              <div className="col-span-6">Destination</div>
              <div className="col-span-2 text-right">Bills</div>
              <div className="col-span-4 text-right">Revenue</div>
            </div>
            {destinationReport.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 last:border-0">
                <div className="col-span-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
                    <p className="truncate text-sm font-semibold text-slate-900">{d.islandName}</p>
                  </div>
                  <p className="text-[10px] text-slate-500">{d.atoll} • {d.destinationCode}</p>
                </div>
                <div className="w-12 text-right text-sm text-slate-700">{d.billCount}</div>
                <div className="w-28 text-right text-sm font-semibold text-slate-900">{MVR(d.revenue)}</div>
              </div>
            ))}
          </Card>
        )}

        {tab === "customer" && (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {customers
                .filter(c => c.outstandingBalance > 0)
                .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.displayName}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{c.customerType.replace("_", " ")} • {c.defaultPriceLevelId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-700">{MVR(c.outstandingBalance)}</p>
                      <p className="text-[10px] text-slate-500">of {MVRShort(c.creditLimit)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {tab === "tax" && <GstReportingSuite />}

        {tab === "cashier" && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Cashier daily closing</h3>
            <p className="mt-1 text-xs text-slate-500">Aggregated by collection method for the day.</p>
            <div className="mt-4 space-y-2">
              {[
                { method: "Cash", icon: "💵", count: 0, total: 0 },
                { method: "Bank transfer", icon: "🏦", count: 2, total: 33600 },
                { method: "Cheque", icon: "📝", count: 1, total: 28900 },
                { method: "Mobile wallet", icon: "📱", count: 0, total: 0 },
              ].map(m => (
                <div key={m.method} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{m.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{m.method}</p>
                      <p className="text-[10px] text-slate-500">{m.count} receipts</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{MVR(m.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ocean-700 p-3 text-white">
              <span className="text-sm font-semibold">Day total</span>
              <span className="text-lg font-bold">{MVR(62500)}</span>
            </div>
          </Card>
        )}
      </div>

      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export business reports">
        <ExportAccountingForm
          businessName={businessProfile.businessName}
          gstNumber={businessProfile.gstNumber}
          onExport={(format) => {
            toast({
              title: "Report exported",
              body: `Successfully generated ${format} for ${businessProfile.businessName}. Download started.`,
              variant: "success",
            });
            setShowExport(false);
          }}
        />
      </Modal>
    </div>
  );
}

function ExportAccountingForm({
  businessName,
  gstNumber,
  onExport,
}: {
  businessName: string;
  gstNumber: string;
  onExport: (format: string) => void;
}) {
  const [format, setFormat] = useState("MIRA XML Tax Return");
  const [period, setPeriod] = useState("Q1 2025 (Jan - Mar)");
  const [exporting, setExporting] = useState(false);

  const formats = [
    { id: "MIRA XML Tax Return", label: "MIRA XML Tax Return", desc: "Official MIRA electronic portal formatted filing." },
    { id: "CSV Complete General Ledger", label: "CSV Complete Ledger", desc: "All line items, payments, bills, and original/override prices." },
    { id: "PDF Trip Ledger Summaries", label: "PDF Trip Ledgers", desc: "Print-ready A4 summary breakdown per active/closed trip." },
    { id: "JSON Daily Cashier Reconciliations", label: "JSON Cashier Reconciliations", desc: "Automated point-of-sale audit export." },
  ];

  const handleStart = () => {
    setExporting(true);
    setTimeout(() => {
      onExport(format);
      setExporting(false);
    }, 900);
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="border-ocean-200 bg-ocean-50 p-3">
        <p className="text-xs font-semibold text-ocean-950">{businessName}</p>
        <p className="mt-0.5 font-mono text-[10px] text-ocean-800">{gstNumber}</p>
      </Card>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Accounting / filing format</label>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {formats.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${format === f.id ? "border-ocean-500 bg-ocean-50/60 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${format === f.id ? "border-ocean-600 bg-ocean-700 text-white" : "border-slate-300 bg-white"}`}>
                {format === f.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${format === f.id ? "text-ocean-950" : "text-slate-900"}`}>{f.label}</p>
                <p className="text-[10px] text-slate-500">{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Reporting period</label>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
          <option value="Q1 2025 (Jan - Mar)">Q1 2025 (Jan - Mar)</option>
          <option value="Q4 2024 (Oct - Dec)">Q4 2024 (Oct - Dec)</option>
          <option value="Last 30 Days Operations">Last 30 Days Operations</option>
          <option value="All Time Master Archive">All Time Master Archive</option>
        </select>
      </div>
      <Btn
        fullWidth
        size="lg"
        icon="download"
        loading={exporting}
        onClick={handleStart}
      >
        Generate & download report
      </Btn>
    </div>
  );
}

// ============================================================================
// Multi-Period Maldives GST Tax & Compliance Reporting Engine
// ============================================================================
function GstReportingSuite() {
  const { businessProfile, bills } = useApp();
  const [periodSpan, setPeriodSpan] = useState<"3m" | "6m" | "1y">("3m");
  const [filingQuarter, setFilingQuarter] = useState("Q1 2025 (Jan - Mar)");

  // Filter or snapshot simulate based on period span
  const totalGross = bills.reduce((s, b) => s + b.grandTotal, 0) * (periodSpan === "3m" ? 1 : periodSpan === "6m" ? 2.1 : 4.3);
  const rawTax = bills.reduce((s, b) => s + b.taxTotal, 0) * (periodSpan === "3m" ? 1 : periodSpan === "6m" ? 2.1 : 4.3);
  
  // Maldives MIRA Specific split breakdowns
  const standardGross = totalGross * 0.92;
  const zeroRatedGross = totalGross * 0.08; // Inter-island government relief or exempted basic food
  const standardOutputGst = rawTax;
  const inputTaxCredit = rawTax * 0.12; // Master vessel fuel & dock maintenance GST deductible
  const netMiraPayableGst = Math.max(0, standardOutputGst - inputTaxCredit);

  return (
    <div className="space-y-4">
      {/* MIRA Tax Header */}
      <Card className="border-0 bg-gradient-to-br from-violet-900 to-ocean-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Official MIRA GST Return Hub</p>
            <h2 className="mt-1 text-xl font-bold">{businessProfile.businessName}</h2>
            <p className="mt-0.5 font-mono text-xs text-violet-200">GSTIN: {businessProfile.gstNumber}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5 text-center">
            <p className="text-[9px] uppercase text-violet-200">Standard GST</p>
            <p className="text-base font-bold text-emerald-300">{businessProfile.defaultTaxRate}%</p>
          </div>
        </div>
      </Card>

      {/* Audit Period Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Select GST Filing & Audit Period</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "3m" as const, label: "3 Months", desc: "Quarterly Filer" },
            { id: "6m" as const, label: "6 Months", desc: "Semi-Annual" },
            { id: "1y" as const, label: "1 Year", desc: "Annual / BPT" },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodSpan(p.id)}
              className={`rounded-xl border p-3 text-left transition-all ${periodSpan === p.id ? "border-violet-600 bg-violet-50 text-violet-950 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <p className="text-xs font-bold">{p.label}</p>
              <p className="text-[10px] text-slate-500">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {periodSpan === "3m" && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Reporting Quarter</label>
          <select value={filingQuarter} onChange={e => setFilingQuarter(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500 font-medium">
            <option value="Q1 2025 (Jan - Mar)">Q1 2025 (Jan - Mar) — Current</option>
            <option value="Q4 2024 (Oct - Dec)">Q4 2024 (Oct - Dec) — Filed & Archived</option>
            <option value="Q3 2024 (Jul - Sep)">Q3 2024 (Jul - Sep) — Filed & Archived</option>
          </select>
        </div>
      )}

      {/* Spectacular Breakdown Manifest */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Taxable Revenues Manifest Breakdown</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-700">Gross Billed Sales (Tax-Inclusive)</span>
            <span className="font-mono font-bold text-slate-900">{MVR(totalGross)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-700">Standard 8% GST Taxable Base</span>
            <span className="font-mono font-medium text-slate-800">{MVR(standardGross)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-700">Zero-Rated Inter-Island Sales (0% GST)</span>
            <span className="font-mono font-medium text-emerald-700">{MVR(zeroRatedGross)}</span>
          </div>
        </div>

        <p className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Maldives Output & Input GST Reconciliation</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-700">Standard Output GST Collected (8%)</span>
            <span className="font-mono font-bold text-violet-700">{MVR(standardOutputGst)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-700">Deductible Input GST (Vessel Fuel & Repairs)</span>
            <span className="font-mono font-medium text-rose-600">-{MVR(inputTaxCredit)}</span>
          </div>
          <div className="flex items-center justify-between border-t-2 border-slate-900 pt-2 text-sm">
            <span className="font-bold text-slate-900">Net Payable MIRA Return (MVR)</span>
            <span className="font-mono text-base font-extrabold text-violet-800">{MVR(netMiraPayableGst)}</span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Btn
          fullWidth
          size="lg"
          icon="check"
          className="!bg-violet-700 hover:!bg-violet-800 text-white"
          onClick={() => {
            alert(`Official MIRA XML electronic return generated for ${businessProfile.businessName}. Ready for secure upload to MIRAConnect portal.`);
          }}
        >
          Export Official MIRA XML Electronic Return
        </Btn>
        <Btn
          fullWidth
          size="lg"
          variant="outline"
          icon="printer"
          onClick={() => {
            window.print();
          }}
        >
          Print A4 Official GST Reconciliation Return
        </Btn>
      </div>
    </div>
  );
}

// ============================================================================
// Settings
// ============================================================================
export function SettingsScreen() {
  const { businessProfile, updateBusinessProfile, updateTaxSetting, taxSettings, numbering, destinations, customers, catalogItems, navigate, back, toast, isOnline, toggleOnline, pendingSyncCount } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [showEditTax, setShowEditTax] = useState(false);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Settings" subtitle="Business profile" onBack={back} />

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-4">
        <Card className="p-4" onClick={() => setShowEdit(true)}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 text-3xl text-white shadow-inner">
              {businessProfile.logoEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{businessProfile.businessName}</p>
              <p className="truncate text-xs text-slate-500">{businessProfile.vesselName} • {businessProfile.vesselRegistrationNumber}</p>
            </div>
            <button className="text-ocean-700 text-xs font-semibold hover:underline">Edit</button>
          </div>
        </Card>

        <Section title="Tax & Compliance">
          <Card className="p-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowEditTax(true)}>
            {taxSettings.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 font-bold text-sm">
                    GST
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.taxName} • {t.taxRate}%</p>
                    <p className="text-xs text-slate-500">{t.taxInclusiveEnabled ? "Tax-inclusive pricing active" : "Tax-exclusive mode"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${t.activeStatus ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {t.activeStatus ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <Icon name="chevron_right" className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Numbering sequences">
          <Card className="p-0 overflow-hidden">
            {numbering.map(n => (
              <div key={n.numberType} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{n.numberType}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-900">{n.lastGenerated}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Next: #{n.currentSequence + 1}</p>
                  <p className="text-[10px] text-emerald-600">🔒 Server-locked</p>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Master data">
          <Card className="p-0 overflow-hidden">
            {[
              { icon: "island", label: "Destinations", value: destinations.length, screen: "destinations" as const },
              { icon: "users", label: "Customers", value: customers.length, screen: "customers" as const },
              { icon: "list", label: "Catalog items", value: catalogItems.length, screen: "catalog" as const },
              { icon: "shield", label: "Users & roles", value: 7, screen: "users" as const },
            ].map((m, i) => (
              <button
                key={m.label}
                onClick={() => navigate(m.screen)}
                className={`flex w-full items-center justify-between p-3 ${i !== 3 ? "border-b border-slate-100" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon name={m.icon} className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{m.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">{m.value}</span>
                  <Icon name="chevron_right" className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </Card>
        </Section>

        <Section title="System">
          <Card className="p-0 overflow-hidden">
            <button onClick={toggleOnline} className="flex w-full items-center justify-between p-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Icon name={isOnline ? "wifi" : "wifi_off"} className={`h-5 w-5 ${isOnline ? "text-emerald-600" : "text-rose-500"}`} />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">Realtime sync</p>
                  <p className="text-xs text-slate-500">{isOnline ? "Connected to InsForge" : "Disconnected — tap to reconnect"}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${isOnline ? "text-emerald-600" : "text-rose-600"}`}>{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </button>
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Icon name="sync" className={`h-5 w-5 ${pendingSyncCount > 0 ? "text-amber-600 animate-spin" : "text-slate-600"}`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">Offline drafts queue</p>
                  <p className="text-xs text-slate-500">{pendingSyncCount > 0 ? `${pendingSyncCount} pending operations` : "All synced"}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${pendingSyncCount > 0 ? "text-amber-600" : "text-slate-500"}`}>{pendingSyncCount > 0 ? "PENDING" : "SYNCED"}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Icon name="log" className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Audit log</p>
                  <p className="text-xs text-slate-500">View all changes</p>
                </div>
              </div>
              <button onClick={() => navigate("audit_logs")}>
                <Icon name="chevron_right" className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </Card>
        </Section>

        <Btn variant="danger" fullWidth icon="logout" onClick={() => {
          toast({ title: "Signed out", body: "Goodbye, Ibrahim", variant: "info" });
          setTimeout(() => navigate("welcome"), 500);
        }}>
          Sign out
        </Btn>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit business profile">
        <EditBusinessProfileForm
          profile={businessProfile}
          onSave={(updates) => {
            updateBusinessProfile(updates);
            setShowEdit(false);
          }}
        />
      </Modal>

      <Modal open={showEditTax} onClose={() => setShowEditTax(false)} title="Master GST Tax Rules">
        <EditTaxSettingsForm
          taxSetting={taxSettings[0] || { id: "tx_001", businessProfileId: businessProfile.id, taxName: "GST", taxRate: businessProfile.defaultTaxRate, taxInclusiveEnabled: businessProfile.taxInclusivePricingEnabled, activeStatus: true }}
          onSave={(updates) => {
            if (taxSettings[0]) {
              updateTaxSetting(taxSettings[0].id, updates);
            }
            setShowEditTax(false);
          }}
        />
      </Modal>
    </div>
  );
}

function EditTaxSettingsForm({
  taxSetting,
  onSave,
}: {
  taxSetting: { id: string; taxName: string; taxRate: number; taxInclusiveEnabled: boolean; activeStatus: boolean };
  onSave: (updates: { taxName: string; taxRate: number; taxInclusiveEnabled: boolean }) => void;
}) {
  const [taxName, setTaxName] = useState(taxSetting.taxName);
  const [taxRate, setTaxRate] = useState(taxSetting.taxRate);
  const [taxInclusiveEnabled, setTaxInclusiveEnabled] = useState(taxSetting.taxInclusiveEnabled);

  return (
    <div className="space-y-4 p-4">
      <Card className="border-l-4 border-l-violet-500 bg-violet-50 p-3">
        <p className="text-xs font-semibold text-violet-950">Maldives Global Tax Compliance</p>
        <p className="mt-0.5 text-[11px] text-violet-800">
          Enforces standard Maldives tax extraction across all operational line items and cash invoices. Old finalized documents will remain completely unchanged.
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Tax Identifier</label>
          <input
            value={taxName}
            onChange={e => setTaxName(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Standard GST Rate %</label>
          <input
            type="number"
            min={0}
            max={25}
            step={0.5}
            value={taxRate}
            onChange={e => setTaxRate(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-violet-700 outline-none focus:border-ocean-500 font-mono"
          />
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
        <input type="checkbox" checked={taxInclusiveEnabled} onChange={e => setTaxInclusiveEnabled(e.target.checked)} className="h-4 w-4" />
        <div>
          <p className="font-semibold text-slate-900">Tax-Inclusive Pricing Mode</p>
          <p className="text-[10px] text-slate-500">Catalog item prices already embed GST. Tax will be cleanly extracted on invoice manifest generation.</p>
        </div>
      </label>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!taxName.trim()}
        onClick={() => onSave({ taxName: taxName.trim(), taxRate, taxInclusiveEnabled })}
      >
        Confirm Global Tax Settings
      </Btn>
    </div>
  );
}

function EditBusinessProfileForm({
  profile,
  onSave,
}: {
  profile: BusinessProfile;
  onSave: (updates: Partial<BusinessProfile>) => void;
}) {
  const [form, setForm] = useState({
    businessName: profile.businessName,
    vesselName: profile.vesselName,
    vesselRegistrationNumber: profile.vesselRegistrationNumber,
    companyName: profile.companyName,
    gstNumber: profile.gstNumber,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    logoEmoji: profile.logoEmoji,
  });

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Logo</label>
          <input
            value={form.logoEmoji}
            onChange={e => setForm({ ...form, logoEmoji: e.target.value.slice(0, 2) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Business name</label>
          <input
            value={form.businessName}
            onChange={e => setForm({ ...form, businessName: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Vessel name</label>
        <input
          value={form.vesselName}
          onChange={e => setForm({ ...form, vesselName: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Vessel reg #</label>
          <input
            value={form.vesselRegistrationNumber}
            onChange={e => setForm({ ...form, vesselRegistrationNumber: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">GST number</label>
          <input
            value={form.gstNumber}
            onChange={e => setForm({ ...form, gstNumber: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Company name</label>
        <input
          value={form.companyName}
          onChange={e => setForm({ ...form, companyName: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
          <input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
          <input
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
        <input
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!form.businessName || !form.vesselName}
        onClick={() => onSave(form)}
      >
        Save profile
      </Btn>
    </div>
  );
}

// ============================================================================
// Users
// ============================================================================
export function UsersScreen() {
  const { users, inviteUser, updateUser, deleteUser, currentUser, back } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const targetUser = users.find(u => u.id === editingUserId);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Users & roles" subtitle={`${users.length} members`} onBack={back} trailing={<Btn size="sm" icon="plus" onClick={() => setShowInvite(true)}>Invite</Btn>} />

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-2">
        {users.map(u => (
          <Card key={u.id} className="p-3.5" onClick={() => setEditingUserId(u.id)}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 text-sm font-semibold text-white">
                  {u.avatar}
                </div>
                {u.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                  {u.id === currentUser.id && <span className="rounded bg-ocean-100 px-1.5 py-0.5 text-[9px] font-bold text-ocean-700">YOU</span>}
                </div>
                <p className="text-[10px] text-slate-500">{u.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleColor(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                  {u.online && <span className="text-[10px] text-emerald-600 font-medium">● online</span>}
                </div>
              </div>
              <button className="rounded-lg p-2 hover:bg-slate-100">
                <Icon name="edit" className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </Card>
        ))}

        <Card className="border-dashed bg-slate-50 p-4 mt-4">
          <p className="text-sm font-semibold text-slate-900">Role permissions matrix</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left">Action</th>
                  {["Owner", "Admin", "Mgr", "Cash", "Load", "Offl", "View"].map(r => (
                    <th key={r} className="px-1 text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  ["Open trip", [1,1,1,0,0,0,0]],
                  ["End trip", [1,1,0,0,0,0,0]],
                  ["Add operation", [1,1,1,0,1,0,0]],
                  ["Generate bill", [1,1,1,1,0,0,0]],
                  ["Post payment", [1,1,1,1,0,0,0]],
                  ["Override price", [1,1,1,0,0,0,0]],
                  ["Alter bill post-trip", [1,1,0,0,0,0,0]],
                  ["Manage users", [1,1,0,0,0,0,0]],
                ].map(([act, perms], i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="py-1.5 pr-2 font-medium text-slate-700">{act}</td>
                    {(perms as number[]).map((p, j) => (
                      <td key={j} className="text-center">
                        {p ? <Icon name="check" className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite crew member">
        <InviteCrewForm
          onInvite={(newUser) => {
            inviteUser(newUser);
            setShowInvite(false);
          }}
        />
      </Modal>

      <Modal open={Boolean(editingUserId)} onClose={() => setEditingUserId(null)} title="Edit user access & role">
        {targetUser && (
          <EditUserRoleForm
            user={targetUser}
            isSelf={targetUser.id === currentUser.id}
            onSave={(updates) => {
              updateUser(targetUser.id, updates);
              setEditingUserId(null);
            }}
            onDelete={() => {
              if (confirm(`Remove ${targetUser.name} from this business profile?`)) {
                deleteUser(targetUser.id);
                setEditingUserId(null);
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EditUserRoleForm({
  user,
  isSelf,
  onSave,
  onDelete,
}: {
  user: User;
  isSelf: boolean;
  onSave: (updates: Partial<User>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);

  const roles: { id: UserRole; label: string; desc: string }[] = [
    { id: "owner", label: "Owner", desc: "Full operational access, deletion, and ownership transfer." },
    { id: "admin", label: "Admin", desc: "Full operational access except owner transfer." },
    { id: "manager", label: "Manager", desc: "Trips, destinations, customers, billing review, reports." },
    { id: "cashier", label: "Cashier", desc: "Invoices, cash bills, receipts, collection." },
    { id: "loading_staff", label: "Loading Staff", desc: "Loading operations and instant item adds." },
    { id: "offloading_staff", label: "Offloading Staff", desc: "Offloading operations only." },
    { id: "viewer", label: "Viewer / Auditor", desc: "Read-only access to audit logs and legal reports." },
  ];

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Display name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Email (locked)</label>
        <input
          value={user.email}
          disabled
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Assigned clearance role</label>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {roles.map(r => (
            <button
              key={r.id}
              disabled={isSelf && user.role === "owner"}
              onClick={() => setRole(r.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${role === r.id ? "border-ocean-500 bg-ocean-50/60 shadow-sm" : "border-slate-200 hover:bg-slate-50"} ${(isSelf && user.role === "owner") ? "opacity-60" : ""}`}
            >
              <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${role === r.id ? "border-ocean-600 bg-ocean-700 text-white" : "border-slate-300 bg-white"}`}>
                {role === r.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${role === r.id ? "text-ocean-950" : "text-slate-900"}`}>{r.label}</p>
                <p className="text-[10px] text-slate-500">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="pt-2 space-y-2">
        <Btn fullWidth size="lg" icon="check" onClick={() => onSave({ name, role, avatar: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() })}>
          Save changes
        </Btn>
        {!isSelf && (
          <Btn fullWidth size="lg" variant="danger" icon="trash" onClick={onDelete}>
            Remove user profile
          </Btn>
        )}
      </div>
    </div>
  );
}

function InviteCrewForm({
  onInvite,
}: {
  onInvite: (user: { name: string; email: string; role: UserRole; avatar: string }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "loading_staff" as UserRole,
  });

  const roles: { id: UserRole; label: string; desc: string }[] = [
    { id: "admin", label: "Admin", desc: "Full operational access except owner transfer." },
    { id: "manager", label: "Manager", desc: "Trips, destinations, customers, billing review, reports." },
    { id: "cashier", label: "Cashier", desc: "Invoices, cash bills, receipts, collection." },
    { id: "loading_staff", label: "Loading Staff", desc: "Loading operations and instant item adds." },
    { id: "offloading_staff", label: "Offloading Staff", desc: "Offloading operations only." },
    { id: "viewer", label: "Viewer / Auditor", desc: "Read-only access to audit logs and legal reports." },
  ];

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Full name *</label>
        <input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Ali Rasheed"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Email address *</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="ali@atollmarine.mv"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Role assignment *</label>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setForm({ ...form, role: r.id })}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${form.role === r.id ? "border-ocean-500 bg-ocean-50/60 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${form.role === r.id ? "border-ocean-600 bg-ocean-700 text-white" : "border-slate-300 bg-white"}`}>
                {form.role === r.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${form.role === r.id ? "text-ocean-950" : "text-slate-900"}`}>{r.label}</p>
                <p className="text-[10px] text-slate-500">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!form.name || !form.email}
        onClick={() => onInvite({
          ...form,
          avatar: form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U",
        })}
      >
        Send invitation
      </Btn>
    </div>
  );
}

// ============================================================================
// Audit Logs
// ============================================================================
export function AuditLogsScreen() {
  const { auditLogs, users, back } = useApp();
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Audit log" subtitle={`${auditLogs.length} entries`} onBack={back} trailing={<Btn size="sm" icon="download" variant="outline">Export</Btn>} />

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {auditLogs.map(log => {
              const actor = users.find(u => u.id === log.actorUserId);
              const actionColors: Record<string, string> = {
                "trip.open": "bg-emerald-100 text-emerald-700",
                "trip.end": "bg-amber-100 text-amber-700",
                "trip.close": "bg-slate-200 text-slate-700",
                "trip.create": "bg-ocean-100 text-ocean-700",
                "operation.create": "bg-orange-100 text-orange-700",
                "billing.finalize": "bg-ocean-100 text-ocean-700",
                "payment.post": "bg-emerald-100 text-emerald-700",
                "settings.tax.update": "bg-violet-100 text-violet-700",
                "numbering.generate": "bg-indigo-100 text-indigo-700",
              };
              return (
                <div key={log.id} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {actor?.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{actor?.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${actionColors[log.action] || "bg-slate-100 text-slate-700"}`}>
                          {log.action}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{log.summary}</p>
                      <p className="mt-1 text-[10px] text-slate-400 font-mono">
                        {log.entityType}#{log.entityId} • {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Profile — serves as a "More" hub, also accessible from the drawer
// ============================================================================
export function ProfileScreen() {
  const { currentUser, businessProfile, navigate, signOut, toast, isOnline, toggleOnline, notifications, users: allUsers } = useApp();
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const menuSections: { title: string; items: { icon: string; label: string; screen: string; badge?: number; badgeColor?: string; desc?: string }[] }[] = [
    {
      title: "Operations",
      items: [
        { icon: "ship", label: "Trips", screen: "trips", desc: "Manage cargo trips" },
        { icon: "package", label: "Operations", screen: "operation", desc: "Loading & offloading" },
        { icon: "receipt", label: "Billing", screen: "billing", desc: "Invoices & cash bills" },
        { icon: "cash", label: "Payments", screen: "payments", desc: "Collect & track" },
      ],
    },
    {
      title: "Master Data",
      items: [
        { icon: "island", label: "Destinations", screen: "destinations", desc: "Maldives islands" },
        { icon: "users", label: "Customers", screen: "customers", desc: "Customer directory" },
        { icon: "list", label: "Catalog", screen: "catalog", desc: "Cargo items & prices" },
      ],
    },
    {
      title: "Reports & Admin",
      items: [
        { icon: "chart", label: "Reports", screen: "reports", desc: "Analytics & exports" },
        { icon: "shield", label: "Users & Roles", screen: "users", badge: allUsers.length, desc: "Permissions matrix" },
        { icon: "log", label: "Audit Log", screen: "audit_logs", desc: "Every change tracked" },
        { icon: "bell", label: "Notifications", screen: "notifications", badge: unreadNotifs || undefined, badgeColor: "bg-rose-500 text-white", desc: "Alerts & updates" },
        { icon: "settings", label: "Settings", screen: "settings", desc: "Business profile, tax, numbering" },
      ],
    },
    {
      title: "Production Tools",
      items: [
        { icon: "database", label: "Backend Console", screen: "backend", desc: "Schema, edge functions, RLS" },
        { icon: "sync", label: "Sync Conflicts", screen: "sync_conflicts", badge: 2, badgeColor: "bg-amber-100 text-amber-700", desc: "Offline queue review" },
        { icon: "file", label: "PDF Documents", screen: "pdf_documents", desc: "Stored A4 invoices and receipts" },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="More" />

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-ocean-800 via-ocean-900 to-ocean-950 px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur-sm shadow-inner">
              {currentUser.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{currentUser.name}</p>
              <p className="text-xs text-ocean-200">{currentUser.email}</p>
              <span className={`mt-1.5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider`}>
                {roleLabel(currentUser.role)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-[9px] uppercase text-ocean-200">Company</p>
              <p className="mt-0.5 truncate text-xs font-semibold">{businessProfile.companyName.split(" ").slice(0, 2).join(" ")}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-[9px] uppercase text-ocean-200">Vessel</p>
              <p className="mt-0.5 truncate text-xs font-semibold">{businessProfile.vesselName}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-[9px] uppercase text-ocean-200">GST</p>
              <p className="mt-0.5 truncate text-xs font-mono font-semibold">{businessProfile.gstNumber.split("-").pop()}</p>
            </div>
          </div>
        </div>

        {/* Menu sections */}
        {menuSections.map(section => (
          <div key={section.title} className="px-4 pt-4">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.title}</p>
            <Card className="p-0 overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.screen as any)}
                  className={`flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors ${i !== section.items.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    {item.desc && <p className="text-[10px] text-slate-500">{item.desc}</p>}
                  </div>
                  {item.badge !== undefined && (
                    <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${item.badgeColor || "bg-slate-200 text-slate-700"}`}>
                      {item.badge}
                    </span>
                  )}
                  <Icon name="chevron_right" className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Connection status */}
        <div className="px-4 pt-4">
          <button
            onClick={toggleOnline}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <Icon name={isOnline ? "wifi" : "wifi_off"} className={`h-5 w-5 ${isOnline ? "text-emerald-600" : "text-rose-500"}`} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">{isOnline ? "Connected" : "Offline mode"}</p>
              <p className="text-[10px] text-slate-500">{isOnline ? "InsForge realtime active" : "Tap to reconnect"}</p>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
          </button>
        </div>

        {/* Sign out */}
        <div className="px-4 pt-4 pb-6">
          <Btn
            variant="danger"
            fullWidth
            icon="logout"
            onClick={() => { signOut(); toast({ title: "Signed out", variant: "info" }); }}
          >
            Sign out
          </Btn>
          <p className="mt-3 text-center text-[10px] text-slate-400">
            AtollCargo v1.0 • InsForge PostgreSQL + Edge Functions
          </p>
        </div>
      </div>
    </div>
  );
}
