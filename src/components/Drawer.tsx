import { useApp, type Screen } from "../store";
import { Icon } from "./ui";
import { MVR, roleLabel, roleColor } from "../utils/format";
import { APP_RELEASE_DETAIL } from "../appVersion";

// ============================================================================
// Side Drawer — mirrors Flutter Drawer / NavigationDrawer
// Slides in from left. Contains business profile header, navigation links
// for settings, reports, users, audit logs, and secondary modules.
// ============================================================================

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

export function Drawer({ open, onClose }: DrawerProps) {
  const {
    currentUser,
    businessProfile,
    navigate,
    isOnline,
    pendingSyncCount,
    toggleOnline,
    notifications,
    trips,
    activeTripId,
    customers,
    destinations,
    users,
  } = useApp();

  const unreadNotifications = notifications.filter(n => !n.read && !(n.readBy || []).includes(currentUser.id)).length;
  const activeTrip = trips.find(t => t.id === activeTripId);
  const outstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

  const goTo = (screen: Screen) => {
    navigate(screen);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel — slides from left */}
      <div className="relative z-10 flex h-full w-80 max-w-full flex-col bg-white shadow-2xl animate-drawer-in">
        {/* ── Profile header ── */}
        <div className="bg-gradient-to-br from-ocean-800 via-ocean-900 to-ocean-950 px-5 pb-5 pt-8 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl backdrop-blur-sm shadow-inner sm:h-14 sm:w-14 sm:text-3xl">
              {businessProfile.logoEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{businessProfile.businessName}</p>
              <p className="truncate text-xs text-ocean-200">{businessProfile.vesselName} • {businessProfile.vesselRegistrationNumber}</p>
            </div>
          </div>

          {/* User row */}
          <button
            onClick={() => goTo("profile")}
            className="mt-4 flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-left hover:bg-white/15 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 text-sm font-bold shadow-sm">
              {currentUser.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="truncate text-xs text-ocean-200">{currentUser.email}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${roleColor(currentUser.role).replace("bg-", "bg-white/10 border-white/20 text-ocean-100 ")}`}>
              {roleLabel(currentUser.role)}
            </span>
          </button>

          {/* Active trip indicator */}
          {activeTrip && (
            <button
              onClick={() => goTo("trip_detail")}
              className="mt-3 flex w-full items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-left"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{activeTrip.tripNumber}</p>
                <p className="truncate text-xs text-emerald-200 capitalize">{activeTrip.status.replace("_", " ")}</p>
              </div>
              <Icon name="chevron_right" className="h-4 w-4 text-emerald-300" />
            </button>
          )}
        </div>

        {/* ── Menu sections ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Primary nav */}
          <div className="px-3 pt-4 pb-2">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Navigation</p>
            <NavItem icon="home" label="Dashboard" onClick={() => goTo("dashboard")} />
            <NavItem icon="ship" label="Trips" badge={trips.filter(t => ["open","loading","sailing","offloading"].includes(t.status)).length || undefined} onClick={() => goTo("trips")} />
            <NavItem icon="package" label="Operation" color="text-orange-600" onClick={() => goTo("operation")} />
            <NavItem icon="receipt" label="Billing" onClick={() => goTo("billing")} />
            <NavItem icon="cash" label="Payments" onClick={() => goTo("payments")} />
          </div>

          <div className="mx-5 border-t border-slate-200" />

          {/* Master data */}
          <div className="px-3 pt-3 pb-2">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Master Data</p>
            <NavItem icon="island" label="Destinations" badge={destinations.length} onClick={() => goTo("destinations")} />
            <NavItem icon="users" label="Customers" badge={customers.length} onClick={() => goTo("customers")} />
            <NavItem icon="list" label="Catalog" onClick={() => goTo("catalog")} />
          </div>

          <div className="mx-5 border-t border-slate-200" />

          {/* Reports & settings */}
          <div className="px-3 pt-3 pb-2">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Reports & Admin</p>
            <NavItem icon="chart" label="Reports" onClick={() => goTo("reports")} />
            <NavItem icon="shield" label="Users & Roles" badge={users.length} onClick={() => goTo("users")} />
            <NavItem icon="log" label="Audit Log" onClick={() => goTo("audit_logs")} />
            <NavItem icon="bell" label="Notifications" badge={unreadNotifications || undefined} badgeColor="bg-rose-500" onClick={() => goTo("notifications")} />
            <NavItem icon="settings" label="Settings" onClick={() => goTo("settings")} />
          </div>

          <div className="mx-5 border-t border-slate-200" />

          <div className="px-3 pt-3 pb-2">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Tools</p>
            <NavItem icon="sync" label="Sync Conflicts" badge={2} badgeColor="bg-amber-100 text-amber-700" onClick={() => goTo("sync_conflicts")} />
            <NavItem icon="file" label="PDF Documents" onClick={() => goTo("pdf_documents")} />
          </div>

          <div className="mx-5 border-t border-slate-200" />

          {/* Quick stats at bottom */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">Outstanding</p>
                <p className="mt-0.5 text-sm font-bold text-rose-700">{MVR(outstanding)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">Islands</p>
                <p className="mt-0.5 text-sm font-bold text-ocean-700">{destinations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          {/* Online / offline toggle */}
          <button
            onClick={toggleOnline}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 transition-colors"
          >
            <Icon
              name={isOnline ? "wifi" : "wifi_off"}
              className={`h-4 w-4 ${isOnline ? "text-emerald-600" : "text-rose-500"}`}
            />
            <span className="flex-1 text-xs font-medium text-slate-700">
              {isOnline ? "Connected" : "Offline mode"}
            </span>
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
            {pendingSyncCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700">
                {pendingSyncCount}
              </span>
            )}
          </button>

          <p className="mt-2 text-center text-xs text-slate-400">
            AtollCargo • {APP_RELEASE_DETAIL}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Nav item helper ──
function NavItem({
  icon,
  label,
  badge,
  badgeColor = "bg-slate-200 text-slate-700",
  color,
  onClick,
}: {
  icon: string;
  label: string;
  badge?: number;
  badgeColor?: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 active:bg-slate-200"
    >
      <Icon name={icon} className={`h-5 w-5 shrink-0 ${color || "text-slate-500"}`} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{label}</span>
      {badge !== undefined && (
        <span className={`min-w-5 shrink-0 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
