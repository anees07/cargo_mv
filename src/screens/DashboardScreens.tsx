import { useState } from "react";
import { useApp } from "../useApp";
import { Btn, Card, Icon, Modal, Section, Stat, StatusBadge, TopBar, DataListBuilder } from "../components/ui";
import type { Trip, TripStatus } from "../types";
import { MVR, MVRShort, formatDate, formatDateTime, formatTime, relativeTime, statusLabel } from "../utils/format";
import { hasPermission } from "../utils/permissions";
import { isUnfinishedTrip } from "../utils/trips";
import { describeCompleteTripRoute } from "../utils/tripRoute";
import { getOutstandingCustomerCount, getTotalOutstanding } from "../utils/billingSummary";
import { unreadNotificationCountForUser } from "../utils/notifications";
import { buildTripEndBillSummary, buildTripEndBillSummaryA4Document, buildTripEndDestinationBillSummaryA4Document, type TripEndBillSummary, type TripEndDestinationSummary } from "../utils/tripEndReport";
import { printA4Document, shareA4PdfDocument } from "../utils/documentActions";

// ============================================================================
// Dashboard
// ============================================================================
export function DashboardScreen({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { businessProfile, trips, bills, customers, destinations, activeTripId, navigate, currentUser, auditLogs, users, notifications } = useApp();
  const activeTrip = trips.find(t => t.id === activeTripId);
  const activeTripRoute = activeTrip ? describeCompleteTripRoute(activeTrip, destinations) : "";
  const recentBills = bills.slice(0, 4);
  const outstanding = getTotalOutstanding(bills);
  const outstandingCustomers = getOutstandingCustomerCount(bills);
  const todayRevenue = bills.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + b.paidAmount, 0);
  const onlineCount = users.filter(u => u.online).length;
  const unreadNotifs = unreadNotificationCountForUser(notifications, currentUser.id);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title={`Welcome, ${currentUser.name.split(" ")[0]}`}
        subtitle={`${businessProfile.businessName} • ${businessProfile.vesselName}`}
        leading={
          <button onClick={onMenuOpen} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
            <Icon name="menu" className="h-5 w-5 text-slate-700" />
          </button>
        }
        trailing={
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate("notifications")} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 relative">
              <Icon name="bell" className="h-5 w-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold leading-none text-white">
                  {unreadNotifs}
                </span>
              )}
            </button>
            <button onClick={() => navigate("profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 text-sm font-semibold text-white shadow-sm">
              {currentUser.avatar}
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Active Trip Hero Card */}
        {activeTrip && (
          <div className="px-4 pt-4">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-ocean-700 via-ocean-800 to-ocean-900 p-0 text-white shadow-lg shadow-ocean-200">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ocean-100">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Active trip
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{activeTrip.tripNumber}</h2>
                    <p className="mt-1 text-sm text-ocean-100">{activeTrip.notes}</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold uppercase">
                    {statusLabel(activeTrip.status)}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Icon name="island" className="h-4 w-4 text-ocean-200" />
                  <span className="min-w-0 flex-1 font-medium leading-5">{activeTripRoute}</span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-center">
                  <div className="rounded-lg bg-white/10 p-2">
                    <p className="text-xs uppercase text-ocean-100">Departure</p>
                    <p className="mt-0.5 text-xs font-semibold">{formatTime(activeTrip.actualDepartureAt || activeTrip.plannedDepartureAt)}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2">
                    <p className="text-xs uppercase text-ocean-100">ETA</p>
                    <p className="mt-0.5 text-xs font-semibold">{formatTime(activeTrip.plannedArrivalAt)}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2">
                    <p className="text-xs uppercase text-ocean-100">Crew</p>
                    <p className="mt-0.5 text-xs font-semibold">{onlineCount} online</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <Btn variant="secondary" size="sm" icon="package" onClick={() => navigate("operation")} className="!bg-white !text-ocean-900 hover:!bg-ocean-50">
                    Operation
                  </Btn>
                  <Btn variant="secondary" size="sm" icon="receipt" onClick={() => navigate("billing")} className="!bg-white !text-ocean-900 hover:!bg-ocean-50">
                    Bills
                  </Btn>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 px-4 pt-4">
          <Stat label="Today Revenue" value={MVRShort(todayRevenue)} sub="4 paid bills" icon="cash" color="emerald" />
          <Stat label="Outstanding" value={MVRShort(outstanding)} sub={`${outstandingCustomers} customers`} icon="receipt" color="amber" />
          <Stat label="Active Trip" value={activeTrip?.tripNumber.split("-").pop() || "—"} sub={activeTrip?.status.toUpperCase() || "—"} icon="ship" color="ocean" />
          <Stat label="Destinations" value={String(10)} sub="across Maldives" icon="island" color="violet" />
        </div>

        {/* Quick actions */}
        <Section title="Quick actions" className="mt-6 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: "package", label: "Load", screen: "operation" as const, color: "bg-orange-100 text-orange-700", disabled: !activeTripId },
              { icon: "truck", label: "Offload", screen: "operation" as const, color: "bg-rose-100 text-rose-700", disabled: !activeTripId },
              { icon: "receipt", label: "Bill", screen: "billing" as const, color: "bg-ocean-100 text-ocean-700" },
              { icon: "cash", label: "Payment", screen: "payments" as const, color: "bg-emerald-100 text-emerald-700" },
              { icon: "island", label: "Island", screen: "destinations" as const, color: "bg-violet-100 text-violet-700" },
              { icon: "users", label: "Customer", screen: "customers" as const, color: "bg-amber-100 text-amber-700" },
              { icon: "list", label: "Catalog", screen: "catalog" as const, color: "bg-indigo-100 text-indigo-700" },
              { icon: "chart", label: "Reports", screen: "reports" as const, color: "bg-slate-100 text-slate-700" },
            ].map((a) => (
              <button
                key={a.label}
                disabled={a.disabled}
                onClick={() => navigate(a.screen)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 transition-colors ${a.disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-slate-50 active:bg-slate-100"}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.color}`}>
                  <Icon name={a.icon} className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-slate-700">{a.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Recent Bills */}
        <Section title="Recent bills" className="mt-6 px-4" action={<button onClick={() => navigate("billing")} className="text-xs font-semibold text-ocean-700">View all</button>}>
          <div className="space-y-2">
            {recentBills.map(b => {
              const customer = customers.find(c => c.id === b.customerId);
              return (
                <Card key={b.id} className="p-3" onClick={() => { useApp; navigate("invoice_preview"); }}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{customer?.displayName}</p>
                        <StatusBadge status={b.paymentStatus} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{b.billNumber} • {b.itemCount} items</p>
                    </div>
                    <p className="ml-2 text-right text-sm font-semibold text-slate-900">{MVR(b.grandTotal)}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* Activity */}
        <Section title="Activity" className="mt-6 px-4" action={<button onClick={() => navigate("audit_logs")} className="text-xs font-semibold text-ocean-700">All logs</button>}>
          <Card className="p-0">
            {auditLogs.slice(0, 5).map((log, i) => {
              const actor = users.find(u => u.id === log.actorUserId);
              return (
                <div key={log.id} className={`flex items-start gap-3 p-3 ${i !== auditLogs.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {actor?.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700">
                      <strong className="text-slate-900">{actor?.name}</strong> {log.summary.toLowerCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{relativeTime(log.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ============================================================================
// Trips List + Detail
// ============================================================================
export function TripsScreen() {
  const { trips, navigate, selectTrip, toast } = useApp();
  const unfinishedTrip = trips.find(isUnfinishedTrip);
  const handleNewTrip = () => {
    if (unfinishedTrip) {
      selectTrip(unfinishedTrip.id);
      toast({ title: "Trip already open", body: unfinishedTrip.tripNumber, variant: "warning" });
      navigate("trip_detail");
      return;
    }
    navigate("create_trip");
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Trips"
        subtitle={`${trips.length} total`}
        onBack={() => navigate("dashboard")}
        trailing={<Btn size="sm" icon={unfinishedTrip ? "ship" : "plus"} onClick={handleNewTrip}>{unfinishedTrip ? "Current trip" : "New trip"}</Btn>}
      />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 no-scrollbar">
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-ocean-700">{trips.filter(isUnfinishedTrip).length}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">Ended</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{trips.filter(t => t.status === "ended").length}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">Closed</p>
            <p className="mt-1 text-2xl font-bold text-slate-400">{trips.filter(t => t.status === "closed").length}</p>
          </Card>
        </div>

        <DataListBuilder
          data={trips}
          keyExtractor={(trip) => trip.id}
          icon="ship"
          emptyTitle="No trips found"
          emptyHint="Create a new trip to start manifesting cargo."
          renderItem={(trip) => (
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { selectTrip(trip.id); navigate("trip_detail"); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{trip.tripNumber}</p>
                    <StatusBadge status={trip.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{trip.vesselName}</p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-1">{trip.notes}</p>
                </div>
                <Icon name="chevron_right" className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Icon name="calendar" className="h-3 w-3" />
                  {formatDate(trip.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="clock" className="h-3 w-3" />
                  {formatTime(trip.actualDepartureAt || trip.plannedDepartureAt)}
                </div>
              </div>
            </Card>
          )}
        />
      </div>
    </div>
  );
}

export function TripDetailScreen() {
  const { trips, selectedTripId, activeTripId, navigate, openTrip, endTrip, closeTrip, updateTripStatus, updateTripNotes, deleteTrip, customers, bills, operations, currentUser, destinations, businessProfile, toast } = useApp();
  const trip = trips.find(t => t.id === (selectedTripId || activeTripId));
  const [showEditStatus, setShowEditStatus] = useState(false);
  const [showEditSpecs, setShowEditSpecs] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const [sharingDestinationId, setSharingDestinationId] = useState<string | null>(null);

  if (!trip) return null;
  const tripOps = operations.filter(o => o.tripId === trip.id);
  const tripBills = bills.filter(b => b.tripId === trip.id);
  const tripEndSummary = buildTripEndBillSummary(trip, tripBills, destinations);
  const tripRevenue = tripBills.reduce((s, b) => s + b.grandTotal, 0);
  const tripItems = tripOps.reduce((s, o) => s + o.items.length, 0);
  const canOperate = ["open", "loading", "sailing", "offloading"].includes(trip.status);
  const tripEndReportDocument = () => buildTripEndBillSummaryA4Document({
    trip,
    summary: tripEndSummary,
    businessProfile,
    customers,
  });
  const handlePrintTripEndReport = () => {
    if (!printA4Document(tripEndReportDocument())) {
      toast({ title: "Print unavailable", body: "This device cannot open the print dialog.", variant: "error" });
    }
  };
  const handleShareTripEndReport = async () => {
    try {
      setSharingReport(true);
      const result = await shareA4PdfDocument(tripEndReportDocument());
      if (result === "clipboard") {
        toast({ title: "PDF sharing unavailable", body: "A text copy was copied because this device cannot share PDF files.", variant: "warning" });
      } else if (result === "unsupported") {
        toast({ title: "Share unavailable", body: "This device cannot share PDF files. Use Print on web, or update the mobile app.", variant: "error" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: "Share failed", body: "Try again from this device.", variant: "error" });
    } finally {
      setSharingReport(false);
    }
  };
  const destinationReportDocument = (destinationSummary: TripEndDestinationSummary) => buildTripEndDestinationBillSummaryA4Document({
    trip,
    destinationSummary,
    businessProfile,
    customers,
  });
  const handlePrintDestinationReport = (destinationSummary: TripEndDestinationSummary) => {
    if (!printA4Document(destinationReportDocument(destinationSummary))) {
      toast({ title: "Print unavailable", body: "This device cannot open the print dialog.", variant: "error" });
    }
  };
  const handleShareDestinationReport = async (destinationSummary: TripEndDestinationSummary) => {
    try {
      setSharingDestinationId(destinationSummary.destinationId);
      const result = await shareA4PdfDocument(destinationReportDocument(destinationSummary));
      if (result === "clipboard") {
        toast({ title: "PDF sharing unavailable", body: "A text copy was copied because this device cannot share PDF files.", variant: "warning" });
      } else if (result === "unsupported") {
        toast({ title: "Share unavailable", body: "This device cannot share PDF files. Use Print on web, or update the mobile app.", variant: "error" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: "Share failed", body: "Try again from this device.", variant: "error" });
    } finally {
      setSharingDestinationId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title={trip.tripNumber}
        subtitle={trip.vesselName}
        onBack={() => navigate("trips")}
        trailing={
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} title="Print Manifest" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 text-slate-500">
              <Icon name="printer" className="h-4 w-4" />
            </button>
            {hasPermission(currentUser.role, "manage_trip") ? (
              <button onClick={() => setShowEditStatus(true)} title="Switch status hover">
                <StatusBadge status={trip.status} />
              </button>
            ) : (
              <StatusBadge status={trip.status} />
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <Card className="overflow-hidden p-0 border-0 bg-gradient-to-br from-ocean-700 to-ocean-900 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowEditSpecs(true)}>
          <div className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider text-ocean-200">Trip manifest details</p>
              <span className="text-xs text-ocean-200 flex items-center gap-1 hover:underline"><Icon name="edit" className="h-3.5 w-3.5" /> Edit notes</span>
            </div>
            <h2 className="mt-1 text-xl font-semibold">{trip.tripNumber}</h2>
            <p className="mt-1 text-sm text-ocean-100">{trip.notes}</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-xs uppercase text-ocean-200">Departure</p>
                <p className="mt-0.5 text-xs font-semibold">{formatDateTime(trip.actualDepartureAt || trip.plannedDepartureAt)}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-xs uppercase text-ocean-200">Arrival</p>
                <p className="mt-0.5 text-xs font-semibold">{formatDateTime(trip.actualArrivalAt || trip.plannedArrivalAt)}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          <Stat label="Operations" value={String(tripOps.length)} sub={`${tripItems} items`} icon="package" />
          <Stat label="Bills" value={String(tripBills.length)} sub={`${tripBills.filter(b => b.paymentStatus === "paid").length} paid`} icon="receipt" color="emerald" />
          <Stat label="Revenue" value={MVRShort(tripRevenue)} sub="trip total" icon="cash" color="amber" />
        </div>

        {canOperate && hasPermission(currentUser.role, "manage_ops") && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            <Btn variant="primary" size="lg" icon="package" onClick={() => navigate("operation")} fullWidth>
              Open Operation
            </Btn>
            {hasPermission(currentUser.role, "create_bill") && (
              <Btn variant="outline" size="lg" icon="receipt" onClick={() => navigate("billing")} fullWidth>
                Generate Bill
              </Btn>
            )}
          </div>
        )}

        {trip.status === "draft" && hasPermission(currentUser.role, "manage_trip") && (
          <div className="mt-4">
            <Btn variant="primary" size="lg" fullWidth icon="check" onClick={() => openTrip(trip.id)}>
              Open trip for loading
            </Btn>
          </div>
        )}

        {canOperate && hasPermission(currentUser.role, "manage_trip") && (
          <div className="mt-3">
            <Btn variant="outline" size="lg" fullWidth icon="x" onClick={() => {
              if (confirm("End this trip? New loading and bills will be blocked. Admin can still adjust with audit log.")) {
                endTrip(trip.id);
                navigate("trips");
              }
            }}>
              End trip
            </Btn>
          </div>
        )}

        {trip.status === "ended" && hasPermission(currentUser.role, "manage_trip") && (
          <div className="mt-4 space-y-2">
            <Card className="border-l-4 border-l-amber-500 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">Trip ended</p>
              <p className="text-xs text-amber-700 mt-0.5">New loading/offloading and bills are blocked. Admin/Owner can still adjust existing bills — every change is audit-logged.</p>
            </Card>
            <TripEndBillSummaryCard
              summary={tripEndSummary}
              onPrint={handlePrintTripEndReport}
              onShare={handleShareTripEndReport}
              sharing={sharingReport}
              sharingDestinationId={sharingDestinationId}
              onPrintDestination={handlePrintDestinationReport}
              onShareDestination={handleShareDestinationReport}
            />
            <Btn variant="secondary" size="lg" fullWidth icon="save" onClick={() => {
              if (confirm("Close this trip for archive? This action is permanent.")) {
                closeTrip(trip.id);
                navigate("trips");
              }
            }}>
              Close & archive trip
            </Btn>
          </div>
        )}

        {trip.status === "closed" && (
          <div className="mt-4">
            <TripEndBillSummaryCard
              summary={tripEndSummary}
              onPrint={handlePrintTripEndReport}
              onShare={handleShareTripEndReport}
              sharing={sharingReport}
              sharingDestinationId={sharingDestinationId}
              onPrintDestination={handlePrintDestinationReport}
              onShareDestination={handleShareDestinationReport}
            />
          </div>
        )}

        <Section title="Operations on this trip" className="mt-6">
          {tripOps.length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate-500">No operations yet.</Card>
          ) : tripOps.map(op => {
            return (
              <Card key={op.id} className="mb-2 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{op.operationType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500">{op.items.length} items • created {relativeTime(op.createdAt)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{MVR(op.totalTaxInclusive)}</p>
                </div>
              </Card>
            );
          })}
        </Section>

        <Section title="Bills on this trip" className="mt-6">
          {tripBills.length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate-500">No bills yet.</Card>
          ) : tripBills.map(b => {
            const c = customers.find(x => x.id === b.customerId);
            return (
              <Card key={b.id} className="mb-2 p-3" onClick={() => { useApp; navigate("invoice_preview"); }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{b.billNumber}</p>
                    <p className="text-xs text-slate-500">{c?.displayName}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.paymentStatus} />
                    <p className="mt-1 text-sm font-semibold text-slate-900">{MVR(b.grandTotal)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </Section>
      </div>

      <Modal open={showEditStatus} onClose={() => setShowEditStatus(false)} title="Change trip status">
        <SwitchTripStatusForm
          currentStatus={trip.status}
          onSelect={(status) => {
            updateTripStatus(trip.id, status);
            setShowEditStatus(false);
          }}
        />
      </Modal>

      <Modal open={showEditSpecs} onClose={() => setShowEditSpecs(false)} title="Edit trip manifest & specs">
        <EditTripSpecsForm
          trip={trip}
          onSave={(notes) => {
            updateTripNotes(trip.id, notes);
            setShowEditSpecs(false);
          }}
          onDelete={() => {
            if (confirm(`Completely void trip manifest ${trip.tripNumber}?`)) {
              deleteTrip(trip.id);
              setShowEditSpecs(false);
              navigate("trips");
            }
          }}
        />
      </Modal>
    </div>
  );
}

function TripEndBillSummaryCard({
  summary,
  onPrint,
  onShare,
  sharing,
  sharingDestinationId,
  onPrintDestination,
  onShareDestination,
}: {
  summary: TripEndBillSummary;
  onPrint: () => void;
  onShare: () => void;
  sharing: boolean;
  sharingDestinationId: string | null;
  onPrintDestination: (destinationSummary: TripEndDestinationSummary) => void;
  onShareDestination: (destinationSummary: TripEndDestinationSummary) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Trip end accounting report</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Bill summary by destination</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {summary.billCount} active bills grouped across {summary.destinations.length} destinations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Btn size="sm" variant="outline" icon="printer" onClick={onPrint}>
              Print
            </Btn>
            <Btn size="sm" icon="share" loading={sharing} onClick={onShare}>
              PDF
            </Btn>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total billed</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{MVR(summary.grandTotal)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">GST</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{MVR(summary.taxTotal)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Paid</p>
            <p className="mt-1 text-sm font-bold text-emerald-900">{MVR(summary.paidAmount)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Balance</p>
            <p className="mt-1 text-sm font-bold text-amber-900">{MVR(summary.balanceDue)}</p>
          </div>
        </div>
      </div>

      {summary.destinations.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">No active bills are linked to this trip.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {summary.destinations.map(group => (
            <div key={group.destinationId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {group.destinationName}
                    {group.destinationCode ? <span className="ml-1 font-mono text-xs text-slate-500">({group.destinationCode})</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {group.billCount} bills • {group.itemCount} line items{group.atoll ? ` • ${group.atoll} Atoll` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{MVR(group.grandTotal)}</p>
                  <p className="text-xs text-slate-500">GST {MVR(group.taxTotal)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="block text-slate-500">Paid</span>
                  <strong className="text-slate-900">{MVR(group.paidAmount)}</strong>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="block text-slate-500">Balance</span>
                  <strong className="text-slate-900">{MVR(group.balanceDue)}</strong>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="block text-slate-500">Bills</span>
                  <strong className="text-slate-900">{group.billCount}</strong>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="block text-slate-500">Items</span>
                  <strong className="text-slate-900">{group.itemCount}</strong>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn size="sm" variant="outline" icon="printer" onClick={() => onPrintDestination(group)}>
                  Print destination
                </Btn>
                <Btn
                  size="sm"
                  icon="share"
                  loading={sharingDestinationId === group.destinationId}
                  onClick={() => onShareDestination(group)}
                >
                  PDF destination
                </Btn>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {group.bills.slice(0, 5).map(bill => (
                  <span key={bill.id} className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
                    {bill.billNumber}
                  </span>
                ))}
                {group.bills.length > 5 && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                    +{group.bills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EditTripSpecsForm({
  trip,
  onSave,
  onDelete,
}: {
  trip: Trip;
  onSave: (notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(trip.notes);

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Trip Manifest Number</label>
        <input value={trip.tripNumber} disabled className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono font-bold text-slate-500 outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Vessel Assigned</label>
        <input value={trip.vesselName} disabled className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Live Manifest Notes & Projections</label>
        <textarea
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter operational cargo notes..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ocean-500 resize-none"
        />
      </div>
      <div className="pt-2 space-y-2">
        <Btn fullWidth size="lg" icon="check" onClick={() => onSave(notes)}>
          Save Trip Projections
        </Btn>
        <Btn fullWidth size="lg" variant="danger" icon="trash" onClick={onDelete}>
          Delete Sailing Manifest
        </Btn>
      </div>
    </div>
  );
}

function SwitchTripStatusForm({
  currentStatus,
  onSelect,
}: {
  currentStatus: TripStatus;
  onSelect: (status: TripStatus) => void;
}) {
  const statuses: { id: TripStatus; label: string; desc: string }[] = [
    { id: "draft", label: "Draft", desc: "Editable setup state before sailing." },
    { id: "open", label: "Open", desc: "Available for loading and destination additions." },
    { id: "loading", label: "Loading", desc: "Active cargo loading operations at origin." },
    { id: "sailing", label: "Sailing / In transit", desc: "Vessel is actively sailing to destination." },
    { id: "offloading", label: "Offloading", desc: "Active offloading operations at island." },
    { id: "ended", label: "Ended", desc: "Trip finished. New bills & loading blocked." },
    { id: "closed", label: "Closed / Locked", desc: "Archived and locked for reporting and audit." },
  ];

  return (
    <div className="space-y-1.5 p-4 max-h-80 overflow-y-auto">
      {statuses.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${currentStatus === s.id ? "border-ocean-500 bg-ocean-50/70 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
        >
          <div>
            <p className={`text-xs font-bold capitalize ${currentStatus === s.id ? "text-ocean-900" : "text-slate-900"}`}>{s.label}</p>
            <p className="text-xs text-slate-500">{s.desc}</p>
          </div>
          {currentStatus === s.id && <Icon name="check" className="h-4 w-4 text-ocean-700 shrink-0" />}
        </button>
      ))}
    </div>
  );
}
