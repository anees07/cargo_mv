import { useState, useMemo } from "react";
import { useApp } from "../useApp";
import { Btn, Card, Icon, Modal, Section, StatusBadge, TopBar } from "../components/ui";
import { MVR } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import { buildOffloadAvailability, hasLockedBillForOperation, type OffloadAvailability } from "../utils/operationFlow";
import { calculatePriceFromStandard } from "../data/customerPriceLevels";
import { DEFAULT_CATALOG_CATEGORY_DEFINITIONS, catalogCategoryLabel } from "../data/catalogCategories";
import { isSystemOtherItem } from "../data/systemCatalogItems";
import { catalogIconForItem, DEFAULT_CATALOG_ICON, isCatalogAutoIcon } from "../utils/catalogIcons";
import {
  cleanWalkInDetails,
  customerMatchesDestination,
  emptyWalkInDetails,
  isWalkInCustomer,
  isWalkInDetailsComplete,
} from "../utils/walkInDetails";
import type { CatalogItem, Customer, WalkInDetails } from "../types";

// ============================================================================
// Operation Screen — Loading & Offloading for the active trip
// ============================================================================
export function OperationScreen() {
  const {
    trips, activeTripId, customers, destinations, catalogItems, catalogCategories, itemPriceRates,
    priceLevels,
    businessProfile, addOperationItem, addOperationItems, removeOperationItem, operations, bills, addCustomer, addDestination, back, toast,
    createBillFromOperation, currentUser, addCatalogItem,
  } = useApp();
  const activeTrip = trips.find(t => t.id === activeTripId);

  const [opType, setOpType] = useState<"loading" | "offloading" | "cargo_handling">("loading");
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddDest, setShowAddDest] = useState(false);
  const [showOpTypePicker, setShowOpTypePicker] = useState(false);
  const [walkInByDestination, setWalkInByDestination] = useState<Record<string, WalkInDetails>>({});

  const dest = destinations.find(d => d.id === selectedDestId);
  const customer = customers.find(c => c.id === selectedCustomerId);
  const selectedWalkInDetails = selectedDestId ? walkInByDestination[selectedDestId] || emptyWalkInDetails : emptyWalkInDetails;
  const selectedCustomerIsWalkIn = isWalkInCustomer(customer);
  const currentOperations = useMemo(
    () => operations
      .filter(o =>
        o.tripId === activeTripId &&
        o.operationType === opType &&
        o.destinationId === selectedDestId &&
        o.customerId === selectedCustomerId
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [operations, activeTripId, opType, selectedDestId, selectedCustomerId]
  );
  const currentOp = currentOperations[0];
  const currentItems = useMemo(() => currentOperations.flatMap(operation => operation.items), [currentOperations]);
  const currentTotalTaxInclusive = useMemo(
    () => Number(currentOperations.reduce((sum, operation) => sum + operation.totalTaxInclusive, 0).toFixed(2)),
    [currentOperations]
  );
  const currentTotalTax = useMemo(
    () => Number(currentOperations.reduce((sum, operation) => sum + operation.totalTax, 0).toFixed(2)),
    [currentOperations]
  );
  const currentOpHasLockedBill = currentOperations.some(operation => hasLockedBillForOperation(operation, bills));
  const offloadAvailability = useMemo(
    () => buildOffloadAvailability(operations, activeTripId, selectedDestId, selectedCustomerId, bills),
    [operations, activeTripId, selectedDestId, selectedCustomerId, bills]
  );
  const offloadRows = useMemo(
    () => Object.values(offloadAvailability)
      .map(availability => ({
        item: catalogItems.find(item => item.id === availability.source.itemId),
        availability,
      }))
      .filter((row): row is { item: CatalogItem; availability: OffloadAvailability } => Boolean(row.item)),
    [catalogItems, offloadAvailability]
  );
  const filteredCustomers = useMemo(
    () => customers.filter(c => customerMatchesDestination(c, selectedDestId)),
    [customers, selectedDestId]
  );
  const canAddItem = Boolean(selectedCustomerId && selectedDestId) &&
    isWalkInDetailsComplete(customer, selectedWalkInDetails) &&
    (opType !== "offloading" || offloadRows.length > 0);

  const getItemPrice = (item: CatalogItem, cust?: Customer) => {
    if (opType === "offloading") {
      const loaded = offloadAvailability[item.id]?.source;
      if (loaded) return loaded.unitPriceTaxInclusive;
    }
    const standardRate = itemPriceRates.find((r) => r.itemId === item.id && r.priceLevel === "standard" && !r.destinationId);
    const standardPrice = standardRate?.priceTaxInclusive ?? item.defaultTaxRate * 10;
    const priceLevel = cust ? priceLevels.find((level) => level.code === cust.defaultPriceLevelId) : null;
    return calculatePriceFromStandard(standardPrice, priceLevel);
  };

  const handleSelectDest = (id: string) => {
    setSelectedDestId(id);
    setSelectedCustomerId(null);
  };

  const updateWalkInDetail = (field: keyof WalkInDetails, value: string) => {
    if (!selectedDestId) return;
    setWalkInByDestination(current => ({
      ...current,
      [selectedDestId]: {
        ...emptyWalkInDetails,
        ...current[selectedDestId],
        [field]: value,
      },
    }));
  };

  const resetOperationForm = () => {
    setSelectedDestId(null);
    setSelectedCustomerId(null);
    setShowCustomerPicker(false);
    setShowItemPicker(false);
    setShowAddCustomer(false);
    setShowAddDest(false);
    setShowOpTypePicker(false);
  };

  const saveOffloadTally = (entries: Array<{ item: CatalogItem; quantity: number; availability: OffloadAvailability }>) => {
    if (!activeTrip || !selectedDestId || !selectedCustomerId || entries.length === 0) return;
    addOperationItems(entries.map(entry => ({
        tripId: activeTrip.id,
        operationId: currentOp?.id || "pending",
        operationType: "offloading",
        destinationId: selectedDestId,
        customerId: selectedCustomerId,
        itemId: entry.item.id,
        itemNameSnapshot: entry.availability.source.itemNameSnapshot || entry.item.itemName,
        unitType: entry.availability.source.unitType || entry.item.unitType,
        quantity: entry.quantity,
        unitPriceTaxInclusive: entry.availability.source.unitPriceTaxInclusive,
        taxRate: entry.availability.source.taxRate || businessProfile.defaultTaxRate,
        lineDescription: entry.availability.source.lineDescription,
        sourceOperationItemId: entry.availability.source.id,
        originalPrice: entry.availability.source.unitPriceTaxInclusive,
        walkInDetails: selectedCustomerIsWalkIn ? cleanWalkInDetails(selectedWalkInDetails) : undefined,
      })));
    toast({
      title: "Offload tally saved",
      body: `${entries.length} item${entries.length !== 1 ? "s" : ""} recorded`,
      variant: "success",
    });
  };

  const handleAddItem = (item: CatalogItem, qty: number, price: number, lineDescription?: string) => {
    if (!activeTrip || !selectedDestId || !selectedCustomerId) return;
    if (!isWalkInDetailsComplete(customer, selectedWalkInDetails)) {
      toast({ title: "Walk-in details required", body: "Add name and phone number before adding cargo.", variant: "warning" });
      return;
    }
    const taxRate = businessProfile.defaultTaxRate;
    addOperationItem({
      tripId: activeTrip.id,
      operationId: currentOp?.id || "pending",
      operationType: opType,
      destinationId: selectedDestId,
      customerId: selectedCustomerId,
      itemId: item.id,
      itemNameSnapshot: item.itemName,
      unitType: item.unitType,
      quantity: qty,
      unitPriceTaxInclusive: price,
      taxRate,
      lineDescription: lineDescription?.trim() || undefined,
      originalPrice: getItemPrice(item, customer),
      overridePrice: price !== getItemPrice(item, customer) ? price : undefined,
      overrideReason: price !== getItemPrice(item, customer) ? "Manual override" : undefined,
      walkInDetails: selectedCustomerIsWalkIn ? cleanWalkInDetails(selectedWalkInDetails) : undefined,
    });
    setShowItemPicker(false);
    toast({ title: "Item added", body: `${qty} added`, variant: "success" });
  };

  if (!activeTrip) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Icon name="ship" className="h-12 w-12 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">No active trip</p>
        <p className="mt-1 text-xs text-slate-500">Open a trip before recording operations.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Operation"
        subtitle={`${activeTrip.tripNumber} • ${opType.replace("_", " ")}`}
        onBack={back}
        trailing={
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 pb-32 md:p-6 md:pb-32 lg:p-8 lg:pb-32 no-scrollbar">
        {/* Active trip banner */}
        <Card className="mb-3 border-l-4 border-l-emerald-500 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-sm font-semibold text-slate-900">Live trip</p>
            <StatusBadge status={activeTrip.status} />
          </div>
          <p className="mt-1 text-xs text-slate-600">{activeTrip.notes}</p>
        </Card>

        {/* Operation type selector */}
        <Section title="Operation type">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
            {[
              { id: "loading" as const, icon: "package", label: "Loading", color: "from-orange-500 to-orange-600" },
              { id: "offloading" as const, icon: "truck", label: "Offload", color: "from-rose-500 to-rose-600" },
              { id: "cargo_handling" as const, icon: "layers", label: "Handling", color: "from-violet-500 to-violet-600" },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => setOpType(o.id)}
                className={`relative overflow-hidden rounded-xl p-3 text-left transition-all ${opType === o.id ? `bg-gradient-to-br ${o.color} text-white shadow-md` : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
              >
                <Icon name={o.icon} className={`h-5 w-5 ${opType === o.id ? "text-white" : "text-slate-500"}`} />
                <p className={`mt-2 text-xs font-semibold capitalize ${opType === o.id ? "text-white" : "text-slate-800"}`}>{o.label}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Destination picker */}
        <Section title="Destination" className="mt-5">
          <button
            onClick={() => setShowOpTypePicker(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white p-3 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-100 text-ocean-700">
                <Icon name="island" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{dest?.islandName || "Select destination"}</p>
                <p className="text-xs text-slate-500">{dest ? `${dest.atoll} Atoll • ${dest.destinationCode}` : "Choose destination"}</p>
              </div>
            </div>
            <Icon name="chevron_down" className="h-5 w-5 text-slate-400" />
          </button>
        </Section>

        {/* Customer picker */}
        <Section title="Customer" className="mt-5" action={
          <button onClick={() => setShowAddCustomer(true)} className="text-xs font-semibold text-ocean-700">+ Add new</button>
        }>
          <button
            onClick={() => setShowCustomerPicker(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white p-3 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Icon name="users" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{customer?.displayName || "Select customer"}</p>
                <p className="text-xs text-slate-500 capitalize">{customer ? `${customer.customerType.replace("_", " ")} • ${customer.defaultPriceLevelId}` : "Choose customer"}</p>
              </div>
            </div>
            <Icon name="chevron_down" className="h-5 w-5 text-slate-400" />
          </button>
        </Section>

        {selectedCustomerIsWalkIn && (
          <Section title="Walk-in customer details" className="mt-5">
            <Card className="p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Name *</label>
                  <input
                    value={selectedWalkInDetails.name}
                    onChange={event => updateWalkInDetail("name", event.target.value)}
                    placeholder="Customer name"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Phone *</label>
                  <input
                    value={selectedWalkInDetails.phone}
                    onChange={event => updateWalkInDetail("phone", event.target.value)}
                    placeholder="Phone number"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={selectedWalkInDetails.description || ""}
                  onChange={event => updateWalkInDetail("description", event.target.value)}
                  rows={3}
                  placeholder="Optional cargo or customer note"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ocean-500"
                />
              </div>
            </Card>
          </Section>
        )}

        {/* Live items list */}
        {opType !== "offloading" && currentItems.length > 0 && (
          <Section title={`Items (${currentItems.length})`} className="mt-5">
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {currentItems.map((it, idx) => {
                  const isOverridden = it.overridePrice && it.overridePrice !== it.originalPrice;
                  return (
                    <div key={it.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">#{currentItems.length - idx}</span>
                            <p className="truncate text-sm font-semibold text-slate-900">{it.itemNameSnapshot}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {it.quantity} {it.unitType} × {MVR(it.unitPriceTaxInclusive)}
                            {isOverridden && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">OVERRIDE</span>}
                          </p>
                          {it.lineDescription && (
                            <p className="mt-1 text-xs text-slate-600">{it.lineDescription}</p>
                          )}
                          {isOverridden && (
                            <p className="mt-1 text-xs text-amber-700">Original: {MVR(it.originalPrice!)} • {it.overrideReason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{MVR(it.lineTotalTaxInclusive)}</p>
                          <p className="text-xs text-slate-500">tax {MVR(it.taxAmount)}</p>
                          <button onClick={() => removeOperationItem(it.id)} className="mt-1 text-rose-600 hover:text-rose-700">
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-dashed border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal (tax-inclusive)</span>
                  <span className="font-semibold text-slate-900">{MVR(currentTotalTaxInclusive)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>GST 8% (extracted)</span>
                  <span>{MVR(currentTotalTax)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-ocean-700">{MVR(currentTotalTaxInclusive)}</span>
                </div>
              </div>
            </Card>
          </Section>
        )}

        {/* Add item button */}
        {opType === "offloading" && selectedCustomerId && selectedDestId && offloadRows.length === 0 && (
          <Card className="mt-5 border-amber-200 bg-amber-50 p-3">
            <div className="flex gap-2">
              <Icon name="warning" className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">No cargo available to offload</p>
                <p className="mt-0.5 text-xs text-amber-800">Select a customer and destination with loaded manifest items, or record loading first.</p>
              </div>
            </div>
          </Card>
        )}
        {opType === "offloading" && selectedCustomerId && selectedDestId && offloadRows.length > 0 && (
          <Section title="Loaded cargo available to offload" className="mt-5">
            <OffloadTally
              rows={offloadRows}
              onSave={saveOffloadTally}
            />
          </Section>
        )}
        {opType !== "offloading" && (
          <div className="mt-5">
            <Btn
              fullWidth
              size="lg"
              icon="plus"
              disabled={!canAddItem}
              onClick={() => setShowItemPicker(true)}
            >
              Add item
            </Btn>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Operation total</p>
            <p className="text-lg font-bold text-slate-900">{MVR(currentTotalTaxInclusive)}</p>
          </div>
          {opType === "loading" && hasPermission(currentUser.role, "create_bill") && (
            <Btn
              size="lg"
              icon="receipt"
              disabled={currentItems.length === 0 || currentOpHasLockedBill}
              onClick={async () => {
                let billCreated = false;
                for (const operation of [...currentOperations].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
                  const bill = await createBillFromOperation(operation.id, "loading_bill");
                  if (bill) {
                    billCreated = true;
                  }
                }
                if (billCreated) resetOperationForm();
              }}
            >
              {currentOpHasLockedBill ? "Bill already exists" : "Generate bill"}
            </Btn>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={showOpTypePicker} onClose={() => setShowOpTypePicker(false)} title="Choose destination">
        <div className="p-2">
          {destinations.map(d => (
            <button
              key={d.id}
              onClick={() => { handleSelectDest(d.id); setShowOpTypePicker(false); }}
              className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-100 text-xs font-bold text-ocean-700">{d.destinationCode}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{d.islandName}</p>
                  <p className="text-xs text-slate-500">{d.atoll} Atoll</p>
                </div>
              </div>
              {selectedDestId === d.id && <Icon name="check" className="h-4 w-4 text-emerald-600" />}
            </button>
          ))}
          <div className="border-t border-slate-200 p-3">
            <Btn variant="outline" fullWidth icon="plus" onClick={() => { setShowOpTypePicker(false); setShowAddDest(true); }}>
              Add new destination
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} title="Choose customer">
        <div className="p-2">
          {filteredCustomers.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">No customers for this destination.</p>
          )}
          {filteredCustomers.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCustomerId(c.id); setShowCustomerPicker(false); }}
              className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                  c.customerType === "government" ? "bg-amber-100 text-amber-700" :
                  c.customerType === "walk_in" ? "bg-slate-100 text-slate-700" :
                  c.customerType === "business" ? "bg-ocean-100 text-ocean-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {c.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">{c.displayName}</p>
                  <p className="text-xs text-slate-500 capitalize">{c.customerType.replace("_", " ")} • {c.defaultPriceLevelId}</p>
                </div>
              </div>
              {selectedCustomerId === c.id && <Icon name="check" className="h-4 w-4 text-emerald-600" />}
            </button>
          ))}
          <div className="border-t border-slate-200 p-3">
            <Btn variant="outline" fullWidth icon="plus" onClick={() => { setShowCustomerPicker(false); setShowAddCustomer(true); }}>
              Add instant customer
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showItemPicker} onClose={() => setShowItemPicker(false)} title="Pick catalog item">
        <ItemPicker
          items={catalogItems}
          catalogCategories={catalogCategories}
          customer={customer}
          getPrice={getItemPrice}
          operationType={opType}
          availability={offloadAvailability}
          onPick={handleAddItem}
          onAddCatalogItem={(item, standardPrice) => {
            const newItem = addCatalogItem(item, standardPrice);
            toast({ title: "Catalog item saved", body: newItem.itemName, variant: "success" });
            return newItem;
          }}
        />
      </Modal>

      <Modal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Add instant customer">
        <AddInstantCustomerForm
          destinationId={selectedDestId}
          onAdd={(newC) => {
            const c = addCustomer(newC);
            setSelectedCustomerId(c.id);
            setShowAddCustomer(false);
            toast({ title: "Customer added", variant: "success" });
          }}
        />
      </Modal>

      <Modal open={showAddDest} onClose={() => setShowAddDest(false)} title="Add new destination">
        <AddInstantDestForm
          onAdd={(d) => {
            const newD = addDestination(d.islandName, d.atoll, d.code);
            setSelectedDestId(newD.id);
            setShowAddDest(false);
            toast({ title: "Island added", variant: "success" });
          }}
        />
      </Modal>
    </div>
  );
}

function OffloadTally({
  rows,
  onSave,
}: {
  rows: Array<{ item: CatalogItem; availability: OffloadAvailability }>;
  onSave: (entries: Array<{ item: CatalogItem; quantity: number; availability: OffloadAvailability }>) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const entries = rows
    .map(row => ({
      ...row,
      quantity: Math.min(Math.max(Number(quantities[row.availability.key] || 0), 0), row.availability.remaining),
    }))
    .filter(row => row.quantity > 0);
  const tallyTotal = entries.reduce((sum, row) => sum + row.quantity * row.availability.source.unitPriceTaxInclusive, 0);
  const canSave = entries.length > 0;

  const updateQuantity = (itemId: string, remaining: number, value: number) => {
    const quantity = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), remaining);
    setQuantities(current => ({ ...current, [itemId]: quantity }));
  };

  const save = () => {
    if (!canSave) return;
    onSave(entries);
    setQuantities({});
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-slate-100">
        {rows.map(({ item, availability }) => {
          const value = quantities[availability.key] || "";
          const source = availability.source;
          return (
            <div key={availability.key} className="p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{source.itemNameSnapshot || item.itemName}</p>
                  {source.lineDescription && <p className="mt-0.5 text-xs text-slate-600">{source.lineDescription}</p>}
                  <p className="mt-0.5 text-xs text-slate-500">
                    Loaded {availability.loadedQuantity} {source.unitType || item.unitType}
                    {availability.offloadedQuantity > 0 && ` • already offloaded ${availability.offloadedQuantity}`}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-2 py-1">
                      <p className="font-semibold text-slate-900">{availability.loadedQuantity}</p>
                      <p className="text-slate-500">loaded</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1">
                      <p className="font-semibold text-slate-900">{availability.offloadedQuantity}</p>
                      <p className="text-slate-500">offloaded</p>
                    </div>
                    <div className="rounded-lg bg-ocean-50 px-2 py-1">
                      <p className="font-semibold text-ocean-800">{availability.remaining}</p>
                      <p className="text-slate-500">remaining</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Offload now</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={availability.remaining}
                      step={1}
                      value={value}
                      onFocus={event => event.currentTarget.select()}
                      onChange={event => updateQuantity(availability.key, availability.remaining, Number(event.target.value))}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-ocean-500"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(availability.key, availability.remaining, availability.remaining)}
                      className="h-11 shrink-0 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-ocean-700 hover:bg-ocean-50"
                    >
                      All
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{source.unitType || item.unitType} • {MVR(source.unitPriceTaxInclusive)} each</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">Tally total</span>
          <span className="font-bold text-ocean-800">{MVR(tallyTotal)}</span>
        </div>
        <Btn fullWidth size="lg" icon="check" disabled={!canSave} onClick={save}>
          Save offload tally
        </Btn>
      </div>
    </Card>
  );
}

function ItemPicker({ items, catalogCategories, customer, getPrice, operationType, availability, onPick, onAddCatalogItem }: {
  items: CatalogItem[];
  catalogCategories: Array<{ code: string; name: string; activeStatus: boolean; sortOrder: number }>;
  customer?: Customer;
  getPrice: (item: CatalogItem, cust?: Customer) => number;
  operationType: "loading" | "offloading" | "cargo_handling";
  availability: Record<string, OffloadAvailability>;
  onPick: (item: CatalogItem, qty: number, price: number, lineDescription?: string) => void;
  onAddCatalogItem: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number) => CatalogItem;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [lineDescription, setLineDescription] = useState("");

  const filtered = items.filter(i =>
    (category === "all" || i.category === category) &&
    (i.itemName.toLowerCase().includes(search.toLowerCase()) || i.itemCode.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = useMemo(() => {
    const defaults = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(definition => {
      const saved = catalogCategories.find(category => category.code === definition.code);
      return {
        code: definition.code,
        name: saved?.name || definition.name,
        activeStatus: saved?.activeStatus ?? definition.activeStatus,
        sortOrder: saved?.sortOrder ?? definition.sortOrder,
      };
    });
    const custom = catalogCategories
      .filter(category => !DEFAULT_CATALOG_CATEGORY_DEFINITIONS.some(definition => definition.code === category.code))
      .map(category => ({
        code: category.code,
        name: category.name,
        activeStatus: category.activeStatus,
        sortOrder: category.sortOrder,
      }));
    return [
      { code: "all", name: "All", activeStatus: true, sortOrder: 0 },
      ...[...defaults, ...custom]
        .filter(category => category.activeStatus || items.some(item => item.category === category.code))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    ];
  }, [catalogCategories, items]);

  const addableCategories = categories.filter(category => category.code !== "all");

  if (showAddItem) {
    return (
      <InlineCatalogItemForm
        categories={addableCategories}
        onCancel={() => setShowAddItem(false)}
        onAdd={(item, standardPrice) => {
          const newItem = onAddCatalogItem(item, standardPrice);
          setShowAddItem(false);
          setSelected(newItem);
          setPrice(standardPrice);
          setSearch("");
          setCategory("all");
        }}
      />
    );
  }

  if (selected) {
    const defaultPrice = getPrice(selected, customer);
    const isOther = isSystemOtherItem(selected);
    const maxQty = operationType === "offloading" ? availability[selected.id]?.remaining || 0 : undefined;
    const safeQty = maxQty ? Math.min(qty, maxQty) : qty;
    const effectivePrice = price || (isOther ? 0 : defaultPrice);
    const canAddSelected = operationType === "offloading"
      ? Boolean(maxQty)
      : isOther
        ? lineDescription.trim().length > 0 && safeQty > 0 && effectivePrice > 0
        : effectivePrice > 0;
    return (
      <div className="p-4">
        <button onClick={() => { setSelected(null); setPrice(0); setLineDescription(""); }} className="mb-3 flex items-center gap-1 text-xs text-ocean-700 font-semibold">
          <Icon name="back" className="h-3 w-3" /> Back to items
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-3xl shadow-sm">{selected.icon}</div>
          <div>
            <p className="font-semibold text-slate-900">{selected.itemName}</p>
            <p className="text-xs text-slate-500">{selected.itemCode} • {selected.unitType}</p>
            <p className="mt-1 text-xs font-semibold text-ocean-700">
              {isOther ? "Enter custom description, quantity, and price for this bill line" : `Default: ${MVR(defaultPrice)} / ${selected.unitType}`}
            </p>
          </div>
        </div>
        {isOther && operationType !== "offloading" && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description *</label>
            <textarea
              value={lineDescription}
              onChange={e => setLineDescription(e.target.value)}
              rows={3}
              placeholder="Describe the cargo or service for this bill line"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ocean-500"
            />
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Quantity ({selected.unitType}){isOther ? " *" : ""}</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={safeQty}
              onFocus={e => e.currentTarget.select()}
              onChange={e => {
                const next = Math.max(1, Number(e.target.value));
                setQty(maxQty ? Math.min(next, maxQty) : next);
              }}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
            />
            {maxQty !== undefined && (
              <p className="mt-1 text-xs text-slate-500">Remaining to offload: {maxQty} {selected.unitType}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{isOther ? "Price tax-incl (MVR) *" : "Unit price (tax-incl)"}</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={isOther ? (price || "") : (price || defaultPrice)}
              onFocus={e => e.currentTarget.select()}
              onChange={e => setPrice(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
            />
            {!isOther && price !== defaultPrice && price > 0 && (
              <p className="mt-1 text-xs text-amber-700">⚠ Price override (audit will be logged)</p>
            )}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-ocean-200 bg-ocean-50 p-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Line total (tax-incl)</span><span className="font-semibold text-ocean-700">{MVR(safeQty * effectivePrice)}</span></div>
          <div className="mt-1 flex justify-between text-xs text-slate-500"><span>GST extracted</span><span>{MVR((safeQty * effectivePrice) - (safeQty * effectivePrice) / 1.08)}</span></div>
        </div>
        <Btn fullWidth size="lg" className="mt-4" icon="plus" disabled={!canAddSelected} onClick={() => onPick(selected, safeQty, effectivePrice, isOther ? lineDescription : undefined)}>
          {operationType === "offloading" ? "Confirm offload" : "Add to operation"}
        </Btn>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {/* QR Barcode Simulation shortcut */}
      <div className="px-2 pt-1">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <button
            onClick={() => {
              const scannedItem = items.find(i => i.itemCode === "FLR-50") || items[1] || items[0];
              if (scannedItem) {
                setSelected(scannedItem);
                setPrice(getPrice(scannedItem, customer));
              }
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ocean-400 bg-ocean-50/60 px-3 py-2.5 text-xs font-bold text-ocean-900 hover:bg-ocean-100/80 active:bg-ocean-200"
          >
            <span className="text-base">📷</span> Scan QR Manifest / Barcode (Simulate: FLR-50)
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100"
          >
            <Icon name="plus" className="h-4 w-4 text-ocean-700" />
            Add item
          </button>
        </div>
      </div>

      <div className="px-2">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items manifest…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 py-2">
        {categories.map(c => (
          <button
            key={c.code}
            onClick={() => setCategory(c.code)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${category === c.code ? "bg-ocean-700 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {c.name || catalogCategoryLabel(c.code)}
          </button>
        ))}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {filtered.map(item => {
          const p = getPrice(item, customer);
          const remaining = availability[item.id]?.remaining;
          const isOther = isSystemOtherItem(item);
          return (
            <button
              key={item.id}
              onClick={() => { setSelected(item); setPrice(isOther ? 0 : p); setLineDescription(""); }}
              className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl">{item.icon}</div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-slate-900">{item.itemName}</p>
                <p className="text-xs text-slate-500">{item.itemCode} • {item.unitType}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-ocean-700">{isOther ? "Variable" : MVR(p)}</p>
                <p className="text-xs text-slate-500">
                  {isOther ? "per entry" : operationType === "offloading" && remaining !== undefined ? `${remaining} left` : customer?.defaultPriceLevelId || "standard"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineCatalogItemForm({
  categories,
  onCancel,
  onAdd,
}: {
  categories: Array<{ code: string; name: string; activeStatus: boolean; sortOrder: number }>;
  onCancel: () => void;
  onAdd: (item: Omit<CatalogItem, "id" | "businessProfileId" | "activeStatus" | "createdAt">, standardPrice: number) => void;
}) {
  const activeCategories = categories.filter(category => category.activeStatus);
  const [form, setForm] = useState({
    itemName: "",
    itemCode: "",
    category: activeCategories[0]?.code || categories[0]?.code || "general_cargo",
    unitType: "piece" as CatalogItem["unitType"],
    defaultTaxRate: 8,
    taxInclusive: true,
    icon: DEFAULT_CATALOG_ICON,
  });
  const [standardPrice, setStandardPrice] = useState(0);
  const categoryIcons = categories.map(category => DEFAULT_CATALOG_CATEGORY_DEFINITIONS.find(definition => definition.code === category.code)?.icon).filter(Boolean) as string[];
  const canSave = Boolean(form.itemName.trim() && form.itemCode.trim() && standardPrice > 0);

  const updateName = (itemName: string) => {
    setForm(current => ({
      ...current,
      itemName,
      icon: isCatalogAutoIcon(current.icon, categoryIcons)
        ? catalogIconForItem(itemName, current.category, DEFAULT_CATALOG_CATEGORY_DEFINITIONS.find(definition => definition.code === current.category)?.icon)
        : current.icon,
    }));
  };

  const updateCategory = (categoryCode: string) => {
    const categoryIcon = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.find(definition => definition.code === categoryCode)?.icon;
    setForm(current => ({
      ...current,
      category: categoryCode,
      icon: isCatalogAutoIcon(current.icon, categoryIcons)
        ? catalogIconForItem(current.itemName, categoryCode, categoryIcon)
        : current.icon,
    }));
  };

  return (
    <div className="space-y-3 p-4">
      <button onClick={onCancel} className="flex items-center gap-1 text-xs font-semibold text-ocean-700">
        <Icon name="back" className="h-3 w-3" /> Back to items
      </button>

      <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-3">
        <p className="text-sm font-bold text-ocean-950">Add catalog item</p>
        <p className="mt-0.5 text-xs text-ocean-900">Save a new standard item and add it to this operation immediately.</p>
      </div>

      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Icon</label>
          <input
            value={form.icon}
            onChange={event => setForm({ ...form, icon: event.target.value.slice(0, 4) || DEFAULT_CATALOG_ICON })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-center text-xl outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Item name *</label>
          <input
            value={form.itemName}
            onChange={event => updateName(event.target.value)}
            placeholder="e.g. Water case"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Item code *</label>
          <input
            value={form.itemCode}
            onChange={event => setForm({ ...form, itemCode: event.target.value.toUpperCase().replace(/\s/g, "-").slice(0, 12) })}
            placeholder="WTR-CASE"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono outline-none focus:border-ocean-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Standard price *</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={standardPrice || ""}
            onFocus={event => event.currentTarget.select()}
            onChange={event => setStandardPrice(Number(event.target.value))}
            placeholder="0.00"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-ocean-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select value={form.category} onChange={event => updateCategory(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {categories.map(category => (
              <option key={category.code} value={category.code}>
                {category.name || catalogCategoryLabel(category.code)}{category.activeStatus ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unit</label>
          <select value={form.unitType} onChange={event => setForm({ ...form, unitType: event.target.value as CatalogItem["unitType"] })} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500">
            {(["kg", "ton", "piece", "crate", "sack", "litre", "m3", "trip"] as const).map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Tax rate %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.defaultTaxRate}
            onFocus={event => event.currentTarget.select()}
            onChange={event => setForm({ ...form, defaultTaxRate: Number(event.target.value) })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 sm:mt-5">
          <input type="checkbox" checked={form.taxInclusive} onChange={event => setForm({ ...form, taxInclusive: event.target.checked })} />
          Tax inclusive
        </label>
      </div>

      <Btn
        fullWidth
        size="lg"
        icon="check"
        disabled={!canSave}
        onClick={() => onAdd({
          ...form,
          itemName: form.itemName.trim(),
          itemCode: form.itemCode.trim(),
          icon: form.icon.trim() || DEFAULT_CATALOG_ICON,
        }, standardPrice)}
      >
        Save and add item
      </Btn>
    </div>
  );
}

function AddInstantCustomerForm({ destinationId, onAdd }: {
  destinationId: string | null;
  onAdd: (c: Omit<Customer, "id" | "businessProfileId" | "outstandingBalance" | "activeStatus" | "createdAt">) => void;
}) {
  const [form, setForm] = useState({
    customerType: "walk_in" as Customer["customerType"],
    displayName: "",
    legalName: "",
    phone: "",
    nationalIdOrRegNo: "-",
    defaultDestinationId: destinationId || "",
    defaultPriceLevelId: "walk_in" as Customer["defaultPriceLevelId"],
    creditAllowed: false,
    creditLimit: 0,
  });
  return (
    <div className="p-4 md:p-6 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Display name *</label>
        <input
          value={form.displayName}
          onChange={e => setForm({ ...form, displayName: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
        <input
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Customer type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {(["business", "individual", "government", "walk_in"] as const).map(t => (
            <button
              key={t}
              onClick={() => setForm({ ...form, customerType: t, defaultPriceLevelId: t === "walk_in" ? "walk_in" : (t as any) })}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize ${form.customerType === t ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-slate-200 text-slate-700"}`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <Btn fullWidth size="lg" icon="check" disabled={!form.displayName} onClick={() => onAdd({ ...form, legalName: form.displayName })}>
        Save customer
      </Btn>
    </div>
  );
}

function AddInstantDestForm({ onAdd }: { onAdd: (d: { islandName: string; atoll: string; code: string }) => void }) {
  const [islandName, setIslandName] = useState("");
  const [atoll, setAtoll] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="p-4 md:p-6 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Island name *</label>
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
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">3-letter code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="e.g. HAN"
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
        />
      </div>
      <Btn fullWidth size="lg" icon="check" disabled={!islandName || !code} onClick={() => onAdd({ islandName, atoll, code })}>
        Save destination
      </Btn>
    </div>
  );
}
