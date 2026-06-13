import { useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Modal, TopBar, FirestoreListBuilder } from "../components/ui";
import { MVR, MVRShort } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import type { CatalogItem, Customer } from "../types";

// ============================================================================
// Destinations
// ============================================================================
export function DestinationsScreen() {
  const { destinations, customers, navigate, addDestination, selectDestination, toast, back, currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = destinations.filter(d => d.islandName.toLowerCase().includes(search.toLowerCase()) || d.destinationCode.toLowerCase().includes(search.toLowerCase()));

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

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <FirestoreListBuilder
          data={filtered}
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
                    <p className="text-[10px] text-slate-500">{d.atoll} Atoll</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Icon name="users" className="h-3 w-3" /> {customerCount} customers</span>
                  <span className="font-mono">#{d.sortOrder}</span>
                </div>
              </Card>
            );
          }}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add destination">
        <AddDestForm onAdd={(d) => {
          addDestination(d.islandName, d.atoll, d.code);
          setShowAdd(false);
          toast({ title: "Destination saved", body: d.islandName, variant: "success" });
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
    <div className="p-4 space-y-3">
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
  const { customers, destinations, navigate, selectCustomer, addCustomer, back, toast, currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = customers.filter(c => {
    const matchesSearch = c.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.customerType === typeFilter;
    return matchesSearch && matchesType;
  });
  const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

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

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <FirestoreListBuilder
          data={filtered}
          keyExtractor={(c) => c.id}
          icon="users"
          emptyTitle="No customers found"
          emptyHint="No registered client ledgers match your search criteria."
          renderItem={(c) => {
            const d = destinations.find(d => d.id === c.defaultDestinationId);
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
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">CREDIT</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 capitalize">{c.customerType.replace("_", " ")} • {d?.islandName}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Icon name="pin" className="h-3 w-3" /> {d?.destinationCode}</span>
                      <span className="flex items-center gap-0.5"><Icon name="chart" className="h-3 w-3" /> {c.defaultPriceLevelId}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.outstandingBalance > 0 ? (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Due</p>
                        <p className="text-sm font-bold text-rose-600">{MVR(c.outstandingBalance)}</p>
                        <p className="text-[10px] text-slate-400">/ {MVRShort(c.creditLimit)}</p>
                      </>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">CLEAR</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          }}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add customer">
        <AddCustomerForm
          destinations={destinations}
          onAdd={(customer) => {
            const saved = addCustomer(customer);
            setShowAdd(false);
            toast({ title: "Customer saved", body: saved.displayName, variant: "success" });
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
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Customer type</label>
        <div className="grid grid-cols-2 gap-2">
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={form.creditAllowed} onChange={e => setForm({ ...form, creditAllowed: e.target.checked })} />
          Credit allowed
        </label>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Credit limit</label>
          <input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
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
// Catalog
// ============================================================================
export function CatalogScreen() {
  const { catalogItems, itemPriceRates, addCatalogItem, updateCatalogItem, deleteCatalogItem, toast, back, currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const editingItem = catalogItems.find(i => i.id === editingItemId);
  const currentStandardPrice = itemPriceRates.find(r => r.itemId === editingItemId && r.priceLevel === "standard")?.priceTaxInclusive || 100;
  const filtered = catalogItems.filter(i =>
    (category === "all" || i.category === category) &&
    (i.itemName.toLowerCase().includes(search.toLowerCase()) || i.itemCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Catalog"
        subtitle={`${catalogItems.length} items`}
        onBack={back}
        trailing={hasPermission(currentUser.role, "manage_master") && <Btn size="sm" icon="plus" onClick={() => setShowAdd(true)}>Add item</Btn>}
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
          {["all", "perishable", "construction", "fuel", "vehicle", "general_cargo"].map(t => (
            <button
              key={t}
              onClick={() => setCategory(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize ${category === t ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <FirestoreListBuilder
          data={filtered}
          keyExtractor={(item) => item.id}
          icon="list"
          emptyTitle="No catalog items found"
          emptyHint="Build your master cargo catalog to start populating loading manifests."
          renderItem={(item) => {
            const rateCount = itemPriceRates.filter(r => r.itemId === item.id).length;
            const minPrice = Math.min(...itemPriceRates.filter(r => r.itemId === item.id).map(r => r.priceTaxInclusive), 99999);
            return (
              <Card className="p-3.5" onClick={() => setEditingItemId(item.id)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.itemName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.itemCode} • {item.unitType}</p>
                    <p className="mt-1 text-[10px] text-slate-400 capitalize">{item.category.replace("_", " ")} • {rateCount} price level{rateCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-ocean-700">from {MVR(minPrice === 99999 ? 0 : minPrice)}</p>
                    <p className="text-[10px] text-slate-400">tax-incl</p>
                  </div>
                </div>
              </Card>
            );
          }}
        />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add catalog item">
        <AddCatalogForm
          onAdd={(item) => {
            const saved = addCatalogItem(item);
            setShowAdd(false);
            toast({ title: "Catalog item saved", body: saved.itemName, variant: "success" });
          }}
        />
      </Modal>

      <Modal open={Boolean(editingItemId)} onClose={() => setEditingItemId(null)} title="Edit catalog specs & pricing">
        {editingItem && (
          <EditCatalogForm
            item={editingItem}
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
    </div>
  );
}

function EditCatalogForm({
  item,
  currentPrice,
  onSave,
  onDelete,
}: {
  item: CatalogItem;
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

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value.slice(0, 2) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <Field label="Item Name *" value={form.itemName} onChange={v => setForm({ ...form, itemName: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Item Code *" value={form.itemCode} onChange={v => setForm({ ...form, itemCode: v.toUpperCase().replace(/\s/g, "-").slice(0, 12) })} />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Standard Price (MVR)</label>
          <input type="number" step={0.5} value={standardPrice} onChange={e => setStandardPrice(Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-ocean-500 font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as CatalogItem["category"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500 capitalize">
            {(["general_cargo", "perishable", "construction", "fuel", "vehicle", "other"] as const).map(cat => <option key={cat} value={cat}>{cat.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Type</label>
          <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value as CatalogItem["unitType"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {(["kg", "ton", "piece", "crate", "sack", "litre", "m3", "trip"] as const).map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">GST Rate %</label>
          <input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
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
  onAdd,
}: {
  onAdd: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">) => void;
}) {
  const [form, setForm] = useState({
    itemName: "",
    itemCode: "",
    category: "general_cargo" as CatalogItem["category"],
    unitType: "piece" as CatalogItem["unitType"],
    defaultTaxRate: 8,
    taxInclusive: true,
    icon: "📦",
  });

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value.slice(0, 2) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <Field label="Item name *" value={form.itemName} onChange={v => setForm({ ...form, itemName: v })} placeholder="e.g. Water case" />
      </div>
      <Field label="Item code *" value={form.itemCode} onChange={v => setForm({ ...form, itemCode: v.toUpperCase().replace(/\s/g, "-").slice(0, 12) })} placeholder="WTR-CASE" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as CatalogItem["category"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            <option value="general_cargo">General cargo</option>
            <option value="perishable">Perishable</option>
            <option value="construction">Construction</option>
            <option value="fuel">Fuel</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unit</label>
          <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value as CatalogItem["unitType"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {(["kg", "ton", "piece", "crate", "sack", "litre", "m3", "trip"] as const).map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Tax rate %</label>
          <input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500" />
        </div>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={form.taxInclusive} onChange={e => setForm({ ...form, taxInclusive: e.target.checked })} />
          Tax inclusive
        </label>
      </div>
      <Card className="border-ocean-200 bg-ocean-50 p-3 text-xs text-ocean-900">
        Prices for this item can be configured later by customer group, destination, or custom price level.
      </Card>
      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!form.itemName || !form.itemCode}
        onClick={() => onAdd(form)}
      >
        Save item
      </Btn>
    </div>
  );
}
