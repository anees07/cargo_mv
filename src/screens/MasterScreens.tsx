import { useEffect, useMemo, useState } from "react";
import { useApp } from "../useApp";
import { Btn, Card, Icon, Modal, TopBar, DataListBuilder, ListPageControls } from "../components/ui";
import { MVR, MVRShort } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import { buildCustomerOutstandingMap, getTotalOutstanding } from "../utils/billingSummary";
import { catalogIconForItem, DEFAULT_CATALOG_ICON, isCatalogAutoIcon } from "../utils/catalogIcons";
import { CUSTOMER_PRICE_LEVEL_DEFINITIONS, describePriceLevelAdjustment } from "../data/customerPriceLevels";
import { DEFAULT_CATALOG_CATEGORY_DEFINITIONS, catalogCategoryLabel, makeUniqueCatalogCategoryCode } from "../data/catalogCategories";
import { isSystemOtherItem } from "../data/systemCatalogItems";
import type { CatalogCategory, CatalogItem, Customer, CustomerPriceLevel, CustomerPriceLevelCode, PriceLevelAdjustmentType } from "../types";

// ============================================================================
// Destinations
// ============================================================================
export function DestinationsScreen() {
  const { destinations, customers, navigate, addDestination, selectDestination, toast, back, currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [visibleDestinationCount, setVisibleDestinationCount] = useState(50);
  const filtered = destinations.filter(d => d.islandName.toLowerCase().includes(search.toLowerCase()) || d.destinationCode.toLowerCase().includes(search.toLowerCase()));
  const visibleDestinations = filtered.slice(0, visibleDestinationCount);

  useEffect(() => {
    setVisibleDestinationCount(50);
  }, [search]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Destinations"
        subtitle={`${destinations.length} islands`}
        onBack={back}
        trailing={hasPermission(currentUser.role, "manage_master") && <Btn size="sm" icon="plus" onClick={() => setShowAdd(true)}>Add</Btn>}
      />

      <div className="border-b border-slate-200 bg-white p-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search island or code…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <DataListBuilder
          data={visibleDestinations}
          keyExtractor={(d) => d.id}
          icon="island"
          emptyTitle="No destinations found"
          emptyHint="Add islands to your network to start accepting cargo operations."
          renderItem={(d) => {
            const customerCount = customers.filter(c => c.defaultDestinationId === d.id).length;
            return (
              <Card className="p-3" onClick={() => { selectDestination(d.id); navigate("destination_detail"); }}>
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-100 text-ocean-700 text-xs font-bold">
                    {d.destinationCode}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.islandName}</p>
                    <p className="text-xs text-slate-500">{d.atoll} Atoll</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Icon name="users" className="h-3 w-3" /> {customerCount} customers</span>
                  <span className="font-mono">#{d.sortOrder}</span>
                </div>
              </Card>
            );
          }}
        />
        <ListPageControls
          visibleCount={Math.min(visibleDestinationCount, filtered.length)}
          totalCount={filtered.length}
          pageSize={50}
          label="destinations"
          onShowMore={() => setVisibleDestinationCount(current => current + 50)}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add destination">
        <AddDestForm onAdd={(d) => {
          addDestination(d.islandName, d.atoll, d.code);
          setShowAdd(false);
          toast({ title: "Island saved", variant: "success" });
        }} />
      </Modal>
    </div>
  );
}

function AddDestForm({ onAdd }: { onAdd: (d: { islandName: string; atoll: string; code: string }) => void }) {
  const [islandName, setIslandName] = useState("");
  const [atoll, setAtoll] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="p-4 md:p-6 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Island name *</label>
        <input value={islandName} onChange={e => setIslandName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Atoll</label>
        <input value={atoll} onChange={e => setAtoll(e.target.value)} placeholder="e.g. Kaafu" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">3-letter code *</label>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="MLE" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
      </div>
      <Btn fullWidth size="lg" icon="check" disabled={!islandName || !code} onClick={() => onAdd({ islandName, atoll, code })}>
        Save destination
      </Btn>
    </div>
  );
}

// ============================================================================
// Customers
// ============================================================================
export function CustomersScreen() {
  const { customers, destinations, bills, navigate, selectCustomer, addCustomer, back, toast, currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [visibleCustomerCount, setVisibleCustomerCount] = useState(50);
  const filtered = customers.filter(c => {
    const matchesSearch = c.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.customerType === typeFilter;
    return matchesSearch && matchesType;
  });
  const visibleCustomers = filtered.slice(0, visibleCustomerCount);
  const customerOutstanding = buildCustomerOutstandingMap(bills);
  const totalOutstanding = getTotalOutstanding(bills);

  useEffect(() => {
    setVisibleCustomerCount(50);
  }, [search, typeFilter]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Customers"
        subtitle={`${customers.length} customers • ${MVR(totalOutstanding)} outstanding`}
        onBack={back}
        trailing={hasPermission(currentUser.role, "manage_master") && <Btn size="sm" icon="plus" onClick={() => setShowAdd(true)}>Add</Btn>}
      />

      <div className="border-b border-slate-200 bg-white p-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {["all", "business", "government", "individual", "walk_in"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${typeFilter === t ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <DataListBuilder
          data={visibleCustomers}
          keyExtractor={(c) => c.id}
          icon="users"
          emptyTitle="No customers found"
          emptyHint="No registered client ledgers match your search criteria."
          renderItem={(c) => {
            const d = destinations.find(d => d.id === c.defaultDestinationId);
            const outstanding = customerOutstanding.get(c.id) || 0;
            const typeColors: Record<string, string> = {
              business: "bg-ocean-100 text-ocean-700",
              government: "bg-amber-100 text-amber-700",
              individual: "bg-emerald-100 text-emerald-700",
              walk_in: "bg-slate-100 text-slate-700",
            };
            return (
              <Card className="p-3.5" onClick={() => { selectCustomer(c.id); navigate("customer_detail"); }}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${typeColors[c.customerType]}`}>
                    {c.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.displayName}</p>
                      {c.creditAllowed && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">CREDIT</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 capitalize">{c.customerType.replace("_", " ")} • {d?.islandName}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5"><Icon name="pin" className="h-3 w-3" /> {d?.destinationCode}</span>
                      <span className="flex items-center gap-0.5"><Icon name="chart" className="h-3 w-3" /> {c.defaultPriceLevelId}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {outstanding > 0 ? (
                      <>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Due</p>
                        <p className="text-sm font-bold text-rose-600">{MVR(outstanding)}</p>
                        <p className="text-xs text-slate-400">/ {MVRShort(c.creditLimit)}</p>
                      </>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">CLEAR</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          }}
        />
        <ListPageControls
          visibleCount={Math.min(visibleCustomerCount, filtered.length)}
          totalCount={filtered.length}
          pageSize={50}
          label="customers"
          onShowMore={() => setVisibleCustomerCount(current => current + 50)}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add customer">
        <AddCustomerForm
          destinations={destinations}
          onAdd={(customer) => {
            addCustomer(customer);
            setShowAdd(false);
            toast({ title: "Customer saved", variant: "success" });
          }}
        />
      </Modal>
    </div>
  );
}

function AddCustomerForm({
  destinations,
  onAdd,
}: {
  destinations: { id: string; islandName: string; destinationCode: string }[];
  onAdd: (customer: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">) => void;
}) {
  const [form, setForm] = useState({
    customerType: "business" as Customer["customerType"],
    displayName: "",
    legalName: "",
    phone: "",
    nationalIdOrRegNo: "",
    gstNumber: "",
    defaultDestinationId: destinations[0]?.id || "",
    defaultPriceLevelId: "business",
    creditAllowed: true,
    creditLimit: 25000,
  });

  const updateType = (type: Customer["customerType"]) => {
    const level = type === "walk_in" ? "walk_in" : type;
    setForm({ ...form, customerType: type, defaultPriceLevelId: level, creditAllowed: type !== "walk_in" && type !== "individual" });
  };

  return (
    <div className="space-y-3 p-4 md:p-6">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Customer type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {(["business", "individual", "government", "walk_in"] as const).map(type => (
            <button
              key={type}
              onClick={() => updateType(type)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize ${form.customerType === type ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-slate-200 text-slate-700"}`}
            >
              {type.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <Field label="Display name *" value={form.displayName} onChange={v => setForm({ ...form, displayName: v })} />
      <Field label="Legal name" value={form.legalName} onChange={v => setForm({ ...form, legalName: v })} />
      <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
      <Field label="National ID / registration #" value={form.nationalIdOrRegNo} onChange={v => setForm({ ...form, nationalIdOrRegNo: v })} />
      <Field label="GST number" value={form.gstNumber} onChange={v => setForm({ ...form, gstNumber: v })} />
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Default destination</label>
        <select value={form.defaultDestinationId} onChange={e => setForm({ ...form, defaultDestinationId: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
          {destinations.map(d => <option key={d.id} value={d.id}>{d.islandName} ({d.destinationCode})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={form.creditAllowed} onChange={e => setForm({ ...form, creditAllowed: e.target.checked })} />
          Credit allowed
        </label>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Credit limit</label>
          <input type="number" value={form.creditLimit} onFocus={e => e.currentTarget.select()} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
        </div>
      </div>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!form.displayName || !form.defaultDestinationId}
        onClick={() => onAdd({
          ...form,
          legalName: form.legalName || form.displayName,
          nationalIdOrRegNo: form.nationalIdOrRegNo || "-",
        })}
      >
        Save customer
      </Btn>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
      />
    </div>
  );
}

// ============================================================================
// Price Levels
// ============================================================================
export function PriceLevelsScreen() {
  const { priceLevels, syncCustomerPriceLevels, saveCustomerPriceLevel, back, currentUser, toast } = useApp();
  const [editingCode, setEditingCode] = useState<CustomerPriceLevelCode | null>(null);
  const [syncing, setSyncing] = useState(false);
  const canManage = hasPermission(currentUser.role, "manage_master");
  const syncedCount = CUSTOMER_PRICE_LEVEL_DEFINITIONS.filter(definition =>
    priceLevels.some(level => level.code === definition.code)
  ).length;
  const cardStyles: Record<CustomerPriceLevelCode, string> = {
    business: "bg-ocean-100 text-ocean-700",
    government: "bg-amber-100 text-amber-700",
    individual: "bg-emerald-100 text-emerald-700",
    walk_in: "bg-slate-100 text-slate-700",
  };

  const levels = CUSTOMER_PRICE_LEVEL_DEFINITIONS.map(definition => {
    const saved = priceLevels.find(level => level.code === definition.code);
    return {
      ...definition,
      ...(saved || {}),
      businessProfileId: saved?.businessProfileId || "",
      adjustmentType: saved?.adjustmentType || definition.adjustmentType,
      adjustmentValue: Number.isFinite(saved?.adjustmentValue) ? Number(saved?.adjustmentValue) : definition.adjustmentValue,
      createdAt: saved?.createdAt || "",
      updatedAt: saved?.updatedAt || "",
      synced: Boolean(saved),
    };
  });
  const editingLevel = levels.find(level => level.code === editingCode);

  const handleSync = () => {
    setSyncing(true);
    void syncCustomerPriceLevels()
      .catch(error => {
        toast({
          title: "Price levels not synced",
          body: error instanceof Error ? error.message : "Check your access and try again.",
          variant: "error",
        });
      })
      .finally(() => setSyncing(false));
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Price Levels"
        subtitle={`${syncedCount} of ${CUSTOMER_PRICE_LEVEL_DEFINITIONS.length} price levels saved`}
        onBack={back}
        trailing={canManage && (
          <Btn size="sm" icon="sync" loading={syncing} disabled={syncing} onClick={handleSync}>
            {syncing ? "Syncing" : "Sync"}
          </Btn>
        )}
      />

      <div className="border-b border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Customer price level master</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          These four fixed records are used as the customer-category price level list.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <DataListBuilder
          data={levels}
          keyExtractor={(level) => level.code}
          icon="chart"
          emptyTitle="No price levels configured"
          emptyHint="Save the fixed customer price level records."
          renderItem={(level) => (
            <Card className="p-3.5">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${cardStyles[level.code]}`}>
                  {level.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{level.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${level.synced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {level.synced ? "SYNCED" : "MISSING"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{level.code}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{level.description}</p>
                  <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {describePriceLevelAdjustment(level)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Order</p>
                  <p className="font-mono text-sm font-semibold text-slate-800">{level.sortOrder}</p>
                </div>
              </div>
              {canManage && (
                <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
                  <Btn size="sm" variant="outline" icon={level.synced ? "edit" : "check"} onClick={() => {
                    if (level.synced) {
                      setEditingCode(level.code);
                    } else {
                      void saveCustomerPriceLevel(level as CustomerPriceLevel).catch(error => {
                        toast({
                          title: "Price level not saved",
                          body: error instanceof Error ? error.message : "Check your access and try again.",
                          variant: "error",
                        });
                      });
                    }
                  }}>
                    {level.synced ? "Edit" : "Save default"}
                  </Btn>
                </div>
              )}
            </Card>
          )}
        />
      </div>

      <Modal open={Boolean(editingLevel && editingLevel.synced)} onClose={() => setEditingCode(null)} title="Edit price level">
        {editingLevel && (
          <EditPriceLevelForm
            priceLevel={editingLevel as CustomerPriceLevel}
            onSave={async (nextLevel) => {
              try {
                await saveCustomerPriceLevel(nextLevel);
                setEditingCode(null);
              } catch {
                toast({
                  title: "Price level not saved",
                  body: "Check your access and try again.",
                  variant: "error",
                });
                throw new Error("Price level save failed");
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EditPriceLevelForm({
  priceLevel,
  onSave,
}: {
  priceLevel: CustomerPriceLevel;
  onSave: (priceLevel: CustomerPriceLevel) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: priceLevel.name,
    description: priceLevel.description,
    adjustmentType: priceLevel.adjustmentType,
    adjustmentValue: String(priceLevel.adjustmentValue),
    activeStatus: priceLevel.activeStatus,
  });
  const [saving, setSaving] = useState(false);
  const adjustmentLabel = form.adjustmentType === "percentage" ? "Percentage on standard price" : "Fixed MVR on standard price";
  const parsedAdjustmentValue = Number(form.adjustmentValue.trim());
  const canSave = Boolean(form.name.trim()) && Number.isFinite(parsedAdjustmentValue) && !saving;
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ ...priceLevel, ...form, adjustmentValue: parsedAdjustmentValue });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-wider text-slate-500">Fixed code</p>
        <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{priceLevel.code}</p>
      </div>
      <Field label="Display name *" value={form.name} onChange={name => setForm({ ...form, name })} />
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
        <textarea
          value={form.description}
          onChange={event => setForm({ ...form, description: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Price adjustment</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "percentage", label: "Percentage" },
            { id: "fixed_amount", label: "Fixed MVR" },
          ] as Array<{ id: PriceLevelAdjustmentType; label: string }>).map(option => (
            <button
              key={option.id}
              onClick={() => setForm({ ...form, adjustmentType: option.id })}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                form.adjustmentType === option.id
                  ? "border-ocean-500 bg-ocean-50 text-ocean-700"
                  : "border-slate-200 text-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">{adjustmentLabel}</label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={form.adjustmentValue}
            onFocus={event => event.currentTarget.select()}
            onChange={event => setForm({ ...form, adjustmentValue: event.target.value.replace(/[^0-9.-]/g, "") })}
            placeholder={form.adjustmentType === "percentage" ? "0" : "0.00"}
            className="h-11 min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500"
          />
          <div className="flex h-11 min-w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
            {form.adjustmentType === "percentage" ? "%" : "MVR"}
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Use positive values for markup and negative values for discount from the item standard price.
        </p>
        {form.adjustmentValue.trim() && !Number.isFinite(parsedAdjustmentValue) && (
          <p className="mt-1 text-xs font-semibold text-rose-600">Enter a valid number, for example -5, 10, or 12.5.</p>
        )}
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.activeStatus}
          onChange={event => setForm({ ...form, activeStatus: event.target.checked })}
        />
        Active
      </label>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        loading={saving}
        disabled={!canSave}
        onClick={handleSave}
      >
        {saving ? "Saving price level" : "Save price level"}
      </Btn>
    </div>
  );
}

// ============================================================================
// Catalog
// ============================================================================
type CatalogCategoryView = CatalogCategory & { synced: boolean; builtIn: boolean };

function mergeCatalogCategories(savedCategories: CatalogCategory[]): CatalogCategoryView[] {
  const defaultCodes = new Set(DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(category => category.code));
  const mergedDefaults = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(definition => {
    const saved = savedCategories.find(category => category.code === definition.code);
    return {
      ...definition,
      businessProfileId: saved?.businessProfileId || "",
      createdAt: saved?.createdAt || "",
      updatedAt: saved?.updatedAt || "",
      synced: Boolean(saved),
      builtIn: true,
    } satisfies CatalogCategoryView;
  });
  const customCategories = savedCategories
    .filter(category => !defaultCodes.has(category.code))
    .map(category => ({
      ...category,
      synced: true,
      builtIn: false,
    } satisfies CatalogCategoryView));
  return [...mergedDefaults, ...customCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

function nextCatalogCategorySortOrder(categories: CatalogCategoryView[]) {
  return (Math.max(0, ...categories.map(category => category.sortOrder)) + 10);
}

export function CatalogScreen() {
  const {
    catalogCategories, catalogItems, itemPriceRates,
    addCatalogItem, updateCatalogItem, deleteCatalogItem,
    syncCatalogCategories, saveCatalogCategory,
    toast, back, currentUser,
  } = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const mergedCategories = useMemo(() => mergeCatalogCategories(catalogCategories), [catalogCategories]);
  const categoryIconMap = useMemo(() => new Map(mergedCategories.map(cat => [cat.code, cat.icon])), [mergedCategories]);
  const editingItem = catalogItems.find(item => item.id === editingItemId);
  const currentStandardPrice = itemPriceRates.find(rate => rate.itemId === editingItemId && rate.priceLevel === "standard")?.priceTaxInclusive || 0;
  const filtered = catalogItems.filter(item =>
    (category === "all" || item.category === category) &&
    (item.itemName.toLowerCase().includes(search.toLowerCase()) || item.itemCode.toLowerCase().includes(search.toLowerCase()))
  );
  const canManage = hasPermission(currentUser.role, "manage_master");

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Catalog"
        subtitle={`${catalogItems.length} items`}
        onBack={back}
        trailing={canManage && (
          <div className="flex items-center gap-2">
            <Btn size="sm" variant="outline" icon="list" onClick={() => setShowCategories(true)}>
              Categories
            </Btn>
            <Btn size="sm" icon="plus" onClick={() => setShowAdd(true)}>
              Add item
            </Btn>
          </div>
        )}
      />

      <div className="border-b border-slate-200 bg-white p-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${category === "all" ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            All
          </button>
          {mergedCategories.map(cat => (
            <button
              key={cat.code}
              onClick={() => setCategory(cat.code)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${category === cat.code ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"} ${cat.activeStatus ? "" : "opacity-60"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <DataListBuilder
          data={filtered}
          keyExtractor={(item) => item.id}
          icon="list"
          emptyTitle="No catalog items found"
          emptyHint="Build your master cargo catalog to start populating loading manifests."
          renderItem={(item) => {
            const rateCount = itemPriceRates.filter(rate => rate.itemId === item.id).length;
            const minPrice = Math.min(...itemPriceRates.filter(rate => rate.itemId === item.id).map(rate => rate.priceTaxInclusive), 99999);
            const categoryLabel = mergedCategories.find(cat => cat.code === item.category)?.name || catalogCategoryLabel(item.category);
            const isSystemItem = isSystemOtherItem(item);
            return (
              <Card className="p-3.5" onClick={() => !isSystemItem && setEditingItemId(item.id)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.itemName}</p>
                      {isSystemItem && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">SYSTEM</span>}
                    </div>
                    <p className="text-xs font-mono text-slate-500">{item.itemCode} • {item.unitType}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isSystemItem ? "Description and price entered per bill line" : `${categoryLabel} • ${rateCount} price level${rateCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ocean-700">{isSystemItem ? "Variable" : `from ${MVR(minPrice === 99999 ? 0 : minPrice)}`}</p>
                    <p className="text-xs text-slate-400">{isSystemItem ? "per entry" : "tax-incl"}</p>
                  </div>
                </div>
              </Card>
            );
          }}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add catalog item">
        <AddCatalogForm
          categories={mergedCategories}
          categoryIconMap={categoryIconMap}
          onAdd={(item, standardPrice) => {
            addCatalogItem(item, standardPrice);
            setShowAdd(false);
            toast({ title: "Item saved", variant: "success" });
          }}
        />
      </Modal>

      <Modal open={Boolean(editingItemId)} onClose={() => setEditingItemId(null)} title="Edit catalog specs & pricing">
        {editingItem && (
          <EditCatalogForm
            item={editingItem}
            categories={mergedCategories}
            categoryIconMap={categoryIconMap}
            currentPrice={currentStandardPrice}
            onSave={(updates, price) => {
              updateCatalogItem(editingItem.id, updates, price);
              setEditingItemId(null);
            }}
            onDelete={() => {
              if (confirm(`Delete ${editingItem.itemName} (${editingItem.itemCode})?`)) {
                deleteCatalogItem(editingItem.id);
                setEditingItemId(null);
              }
            }}
          />
        )}
      </Modal>

      <Modal open={showCategories} onClose={() => setShowCategories(false)} title="Catalog categories">
        <CatalogCategoryManager
          categories={mergedCategories}
          onSyncDefaults={async () => {
            try {
              await syncCatalogCategories();
            } catch (error) {
              toast({
                title: "Categories not synced",
                body: error instanceof Error ? error.message : "Check your access and try again.",
                variant: "error",
              });
            }
          }}
          onSave={async (categoryRecord) => {
            try {
              await saveCatalogCategory(categoryRecord);
              setShowCategories(false);
            } catch (error) {
              toast({
                title: "Category not saved",
                body: error instanceof Error ? error.message : "Check your access and try again.",
                variant: "error",
              });
              throw error;
            }
          }}
        />
      </Modal>
    </div>
  );
}

function EditCatalogForm({
  item,
  categories,
  categoryIconMap,
  currentPrice,
  onSave,
  onDelete,
}: {
  item: CatalogItem;
  categories: CatalogCategoryView[];
  categoryIconMap: Map<string, string>;
  currentPrice: number;
  onSave: (updates: Partial<CatalogItem>, price?: number) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    itemName: item.itemName,
    itemCode: item.itemCode,
    category: item.category,
    unitType: item.unitType,
    defaultTaxRate: item.defaultTaxRate,
    taxInclusive: item.taxInclusive,
    icon: item.icon,
  });
  const [standardPrice, setStandardPrice] = useState(currentPrice);
  const selectedCategory = categories.find(cat => cat.code === form.category);
  const handleNameChange = (itemName: string) => {
    setForm(current => ({
      ...current,
      itemName,
      icon: isCatalogAutoIcon(current.icon, Array.from(categoryIconMap.values())) ? catalogIconForItem(itemName, current.category, selectedCategory?.icon) : current.icon,
    }));
  };
  const handleCategoryChange = (categoryCode: string) => {
    const nextCategory = categories.find(cat => cat.code === categoryCode);
    setForm(current => ({
      ...current,
      category: categoryCode,
      icon: isCatalogAutoIcon(current.icon, Array.from(categoryIconMap.values())) ? catalogIconForItem(current.itemName, categoryCode, nextCategory?.icon) : current.icon,
    }));
  };

  return (
    <div className="space-y-3 p-4 md:p-6">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value.slice(0, 4) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <Field label="Item Name *" value={form.itemName} onChange={handleNameChange} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <Field label="Item Code *" value={form.itemCode} onChange={v => setForm({ ...form, itemCode: v.toUpperCase().replace(/\s/g, "-").slice(0, 12) })} />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Standard Price (MVR)</label>
          <input
            type="number"
            step={0.5}
            value={standardPrice}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setStandardPrice(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {categories.map(cat => (
              <option key={cat.code} value={cat.code}>
                {cat.name}{cat.activeStatus ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Type</label>
          <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value as CatalogItem["unitType"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {(["kg", "ton", "piece", "crate", "sack", "litre", "m3", "trip"] as const).map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">GST Rate %</label>
          <input type="number" value={form.defaultTaxRate} onFocus={e => e.currentTarget.select()} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
        </div>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={form.taxInclusive} onChange={e => setForm({ ...form, taxInclusive: e.target.checked })} />
          Tax Inclusive Pricing
        </label>
      </div>
      <div className="pt-2 space-y-2">
        <Btn fullWidth size="lg" icon="check" disabled={!form.itemName || !form.itemCode} onClick={() => onSave(form, standardPrice)}>
          Save Catalog Item Changes
        </Btn>
        <Btn fullWidth size="lg" variant="danger" icon="trash" onClick={onDelete}>
          Delete Catalog Item Profile
        </Btn>
      </div>
    </div>
  );
}

function AddCatalogForm({
  categories,
  categoryIconMap,
  onAdd,
}: {
  categories: CatalogCategoryView[];
  categoryIconMap: Map<string, string>;
  onAdd: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number) => void;
}) {
  const [form, setForm] = useState({
    itemName: "",
    itemCode: "",
    category: categories.find(category => category.activeStatus)?.code || "general_cargo",
    unitType: "piece" as CatalogItem["unitType"],
    defaultTaxRate: 8,
    taxInclusive: true,
    icon: DEFAULT_CATALOG_ICON,
  });
  const [standardPrice, setStandardPrice] = useState(0);
  const selectedCategory = categories.find(category => category.code === form.category);
  const canSave = Boolean(form.itemName && form.itemCode && standardPrice > 0);
  const handleNameChange = (itemName: string) => {
    setForm(current => ({
      ...current,
      itemName,
      icon: isCatalogAutoIcon(current.icon, Array.from(categoryIconMap.values())) ? catalogIconForItem(itemName, current.category, selectedCategory?.icon) : current.icon,
    }));
  };
  const handleCategoryChange = (categoryCode: string) => {
    const nextCategory = categories.find(category => category.code === categoryCode);
    setForm(current => ({
      ...current,
      category: categoryCode,
      icon: isCatalogAutoIcon(current.icon, Array.from(categoryIconMap.values())) ? catalogIconForItem(current.itemName, categoryCode, nextCategory?.icon) : current.icon,
    }));
  };

  return (
    <div className="space-y-3 p-4 md:p-6">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value.slice(0, 4) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <Field label="Item name *" value={form.itemName} onChange={handleNameChange} placeholder="e.g. Water case" />
      </div>
      <Field label="Item code *" value={form.itemCode} onChange={v => setForm({ ...form, itemCode: v.toUpperCase().replace(/\s/g, "-").slice(0, 12) })} placeholder="WTR-CASE" />
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Standard price (MVR) *</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={standardPrice || ""}
          onFocus={e => e.currentTarget.select()}
          onChange={e => setStandardPrice(Number(e.target.value))}
          placeholder="0.00"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500 font-mono"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {categories.map(category => (
              <option key={category.code} value={category.code}>
                {category.name}{category.activeStatus ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unit</label>
          <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value as CatalogItem["unitType"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {(["kg", "ton", "piece", "crate", "sack", "litre", "m3", "trip"] as const).map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Tax rate %</label>
          <input type="number" value={form.defaultTaxRate} onFocus={e => e.currentTarget.select()} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
        </div>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={form.taxInclusive} onChange={e => setForm({ ...form, taxInclusive: e.target.checked })} />
          Tax inclusive
        </label>
      </div>
      <Card className="border-ocean-200 bg-ocean-50 p-3 text-xs text-ocean-900">
        This saves the standard tax-inclusive price. Customer group, destination, and custom price levels can still be added later.
      </Card>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!canSave}
        onClick={() => onAdd(form, standardPrice)}
      >
        Save item
      </Btn>
    </div>
  );
}

function CatalogCategoryManager({
  categories,
  onSyncDefaults,
  onSave,
}: {
  categories: CatalogCategoryView[];
  onSyncDefaults: () => void;
  onSave: (category: CatalogCategory) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    icon: "📦",
    activeStatus: true,
  });
  const [saving, setSaving] = useState(false);
  const existingCodes = categories.map(category => category.code);
  const previewCode = makeUniqueCatalogCategoryCode(form.name || "category", existingCodes);
  const nextSortOrder = nextCatalogCategorySortOrder(categories);
  const canSave = Boolean(form.name.trim()) && Boolean(form.icon.trim());

  const handleCreate = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        id: previewCode,
        businessProfileId: "",
        code: previewCode,
        name: form.name.trim(),
        icon: form.icon.trim().slice(0, 4) || "📦",
        activeStatus: form.activeStatus,
        sortOrder: nextSortOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setForm({ name: "", icon: "📦", activeStatus: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Fixed code</p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{previewCode}</p>
          </div>
          <Btn size="sm" variant="outline" icon="sync" onClick={onSyncDefaults}>
            Sync defaults
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value.slice(0, 4) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <Field label="Category name *" value={form.name} onChange={name => setForm(current => ({ ...current, name }))} placeholder="e.g. Oversized Cargo" />
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
        <input type="checkbox" checked={form.activeStatus} onChange={e => setForm({ ...form, activeStatus: e.target.checked })} />
        Active
      </label>

      <Btn fullWidth size="lg" icon="check" disabled={!canSave || saving} onClick={() => void handleCreate()}>
        {saving ? "Saving category" : "Save category"}
      </Btn>

      <div className="pt-2">
        <DataListBuilder
          data={categories}
          keyExtractor={category => category.code}
          icon="list"
          emptyTitle="No categories configured"
          emptyHint="Create the first category above."
          renderItem={category => (
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                  {category.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${category.builtIn ? "bg-ocean-100 text-ocean-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {category.builtIn ? (category.synced ? "SYNCED" : "DEFAULT") : "CUSTOM"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{category.code}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${category.activeStatus ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {category.activeStatus ? "Active" : "Inactive"}
                </span>
              </div>
            </Card>
          )}
        />
      </div>
    </div>
  );
}
