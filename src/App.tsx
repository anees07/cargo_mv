import { useState, type ReactElement } from "react";
import { AppProvider } from "./store";
import { useApp } from "./useApp";
import { AppShell, DesktopNav, Icon, NavigationItem, Toast } from "./components/ui";
import { Drawer } from "./components/Drawer";
import { SplashScreen, WelcomeScreen, LoginScreen, RegisterScreen, BusinessSetupScreen, SelectProfileScreen } from "./screens/AuthScreens";
import { DashboardScreen, TripsScreen, TripDetailScreen } from "./screens/DashboardScreens";
import { OperationScreen } from "./screens/OperationScreen";
import { BillingScreen, InvoicePreviewScreen } from "./screens/BillingScreens";
import { PaymentsScreen } from "./screens/PaymentScreen";
import { DestinationsScreen, CustomersScreen, CatalogScreen, PriceLevelsScreen } from "./screens/MasterScreens";
import { ReportsScreen, SettingsScreen, UsersScreen, AuditLogsScreen, ProfileScreen } from "./screens/ManagementScreens";
import { NotificationPanel } from "./screens/NotificationScreen";
import { CustomerDetailScreen, DestinationDetailScreen, CreateTripScreen } from "./screens/DetailScreens";
import { PdfDocumentsScreen, SyncConflictsScreen } from "./screens/SystemScreens";
import { DocumentPreviewScreen } from "./screens/DocumentPreviewScreen";
import { APP_RELEASE_LABEL } from "./appVersion";
import { AppUpdatePrompt } from "./components/AppUpdatePrompt";

// ============================================================================
// Bottom Tab Bar — mirrors Flutter BottomNavigationBar
// ============================================================================
function BottomTab({ onDrawerOpen }: { onDrawerOpen: () => void }) {
  const { screen, navigate, activeTripId } = useApp();
  const tabs: { id: string; label: string; icon: string; action?: () => void }[] = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "trips", label: "Trips", icon: "ship" },
    { id: "operation", label: "Load", icon: "package" },
    { id: "billing", label: "Bills", icon: "receipt" },
    { id: "drawer", label: "More", icon: "menu", action: onDrawerOpen },
  ];

  // Hide on specific screens
  const hideOn = ["splash", "welcome", "login", "register", "business_setup", "invoice_preview", "customer_detail", "destination_detail", "create_trip", "notifications", "document_preview"];
  if (hideOn.includes(screen)) return null;

  return (
    <div className="relative z-30 shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-lg no-print app-bottom-safe safe-x">
      <div className="mx-auto grid w-full max-w-screen-sm grid-cols-5">
        {tabs.map(t => {
          const isActive =
            screen === t.id ||
            (t.id === "trips" && (screen === "trip_detail" || screen === "create_trip")) ||
            (t.id === "billing" && (screen === "invoice_preview" || screen === "payments"));
          return (
            <button
              key={t.id}
              onClick={() => t.action ? t.action() : navigate(t.id as any)}
              className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5"
            >
              {t.id === "operation" ? (
                <div className={`-mt-2 flex h-10 w-10 items-center justify-center rounded-xl shadow-md transition-all sm:h-11 sm:w-11 ${activeTripId ? "bg-gradient-to-br from-ocean-500 to-ocean-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                  <Icon name={t.icon} className="h-5 w-5" />
                </div>
              ) : (
                <Icon
                  name={t.icon}
                  className={`h-5 w-5 transition-colors ${isActive ? "text-ocean-700" : "text-slate-400"}`}
                />
              )}
              <span className={`max-w-full truncate text-xs font-medium leading-4 transition-colors ${isActive ? "text-ocean-700" : "text-slate-500"} ${t.id === "operation" ? "-mt-0.5" : ""}`}>
                {t.label}
              </span>
              {isActive && t.id !== "operation" && t.id !== "drawer" && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ocean-700" />
              )}
              {t.id === "trips" && activeTripId && (
                <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Connectivity Banner
// ============================================================================
function ConnectivityBanner() {
  const { isOnline, pendingSyncCount } = useApp();
  if (isOnline && pendingSyncCount === 0) return null;
  return (
    <div className={`flex min-w-0 items-center gap-2 px-4 py-2 text-xs font-medium md:text-sm ${isOnline ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
      <Icon name={isOnline ? "sync" : "wifi_off"} className="h-3.5 w-3.5" />
      {isOnline
        ? `${pendingSyncCount} operations pending sync…`
        : "Offline mode — drafts will sync when reconnected"
      }
    </div>
  );
}

// ============================================================================
// Master Responsive App Shell
// ============================================================================
function ResponsiveAppShell() {
  const { screen, navigate, businessProfile, currentUser } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const routedScreen = <ScreenRouter onMenuOpen={() => setDrawerOpen(true)} />;

  // Exclude splash, login, auth screens from having the app shell chrome
  const isAuthScreen = ["splash", "welcome", "login", "register", "business_setup", "select_profile"].includes(screen);
  
  if (isAuthScreen) {
    return <div className="flex h-[var(--app-height)] w-full items-center justify-center bg-slate-50 safe-area">{routedScreen}</div>;
  }

  const navItems = [
    { group: "Core", items: [
      { id: "dashboard", label: "Dashboard", icon: "home" },
      { id: "trips", label: "Trips", icon: "ship" },
      { id: "operation", label: "Operation", icon: "package" },
      { id: "billing", label: "Billing", icon: "receipt" },
      { id: "payments", label: "Payments", icon: "cash" },
    ]},
    { group: "Master Data", items: [
      { id: "destinations", label: "Destinations", icon: "island" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "catalog", label: "Catalog", icon: "list" },
      { id: "price_levels", label: "Price Levels", icon: "chart" },
    ]},
    { group: "Reports & Admin", items: [
      { id: "reports", label: "Reports", icon: "chart" },
      { id: "users", label: "Users & Roles", icon: "shield" },
      { id: "audit_logs", label: "Audit Log", icon: "log" },
      { id: "notifications", label: "Notifications", icon: "bell" },
      { id: "settings", label: "Settings", icon: "settings" },
    ]},
    { group: "Tools", items: [
      { id: "sync_conflicts", label: "Sync Conflicts", icon: "sync" },
      { id: "pdf_documents", label: "PDF Documents", icon: "file" },
    ]},
  ];

  return (
    <AppShell
      sidebar={
      <DesktopNav>
        <div className="flex min-h-16 min-w-0 items-center gap-3 px-5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-600 text-lg">{businessProfile.logoEmoji}</div>
          <div className="min-w-0">
            <span className="block truncate font-bold tracking-tight">AtollCargo</span>
            <span className="block truncate text-xs text-slate-400">{APP_RELEASE_LABEL}</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
          {navItems.map((group, groupIdx) => (
            <div key={group.group}>
              {groupIdx !== 0 && <div className="my-2 border-t border-white/10" />}
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">{group.group}</p>
              {group.items.map(item => {
                const isActive = screen === item.id || (item.id === "trips" && screen.startsWith("trip_")) || (item.id === "billing" && screen.startsWith("invoice_")) || (item.id === "customers" && screen === "customer_detail") || (item.id === "destinations" && screen === "destination_detail");
                return (
                  <NavigationItem
                    key={item.id}
                    active={isActive}
                    onClick={() => navigate(item.id as any)}
                    icon={<Icon name={item.icon} className="h-4 w-4" />}
                  >
                    {item.label}
                  </NavigationItem>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-4">
          <button onClick={() => navigate("profile")} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-2 transition-colors hover:bg-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-700 text-xs font-bold text-white">{currentUser.avatar}</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium text-white">{currentUser.name}</p>
              <p className="truncate text-xs text-slate-400 capitalize">{currentUser.role.replace("_", " ")}</p>
            </div>
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">{APP_RELEASE_LABEL} • Production</p>
        </div>
      </DesktopNav>
      }
      drawer={<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    >

      {/* Main Content Area */}
      <ConnectivityBanner />
        
      {/* Page Content */}
      <div className="relative flex-1 overflow-hidden safe-x">
        {routedScreen}
      </div>

      {/* Mobile Bottom Tab (Hidden on Desktop) */}
      <div className="shrink-0 lg:hidden">
        <BottomTab onDrawerOpen={() => setDrawerOpen(true)} />
      </div>
    </AppShell>
  );
}

// ============================================================================
// Screen Router
// ============================================================================
function ScreenRouter({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { screen, isAuthed, toasts, dismissToast } = useApp();

  if (screen === "splash") return <SplashScreen />;
  if (screen === "welcome") return <WelcomeScreen />;
  if (screen === "login") return <LoginScreen />;
  if (screen === "register") return <RegisterScreen />;
  if (screen === "business_setup") return <BusinessSetupScreen />;

  if (!isAuthed) return <WelcomeScreen />;

  if (screen === "select_profile") return <SelectProfileScreen />;

  const screenMap: Record<string, ReactElement> = {
    dashboard: <DashboardScreen onMenuOpen={onMenuOpen} />,
    trips: <TripsScreen />,
    trip_detail: <TripDetailScreen />,
    create_trip: <CreateTripScreen />,
    operation: <OperationScreen />,
    billing: <BillingScreen />,
    invoice_preview: <InvoicePreviewScreen />,
    payments: <PaymentsScreen />,
    destinations: <DestinationsScreen />,
    customers: <CustomersScreen />,
    customer_detail: <CustomerDetailScreen />,
    destination_detail: <DestinationDetailScreen />,
    catalog: <CatalogScreen />,
    price_levels: <PriceLevelsScreen />,
    reports: <ReportsScreen />,
    settings: <SettingsScreen />,
    users: <UsersScreen />,
    audit_logs: <AuditLogsScreen />,
    profile: <ProfileScreen />,
    notifications: <NotificationPanel onClose={() => {}} />,
    sync_conflicts: <SyncConflictsScreen />,
    pdf_documents: <PdfDocumentsScreen />,
    document_preview: <DocumentPreviewScreen />,
  };

  return (
    <div className="relative h-full w-full min-w-0 bg-slate-50">
      <div className="absolute inset-0 flex flex-col">
        {screenMap[screen] || <DashboardScreen onMenuOpen={onMenuOpen} />}
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ============================================================================
// App Root
// ============================================================================
export default function App() {
  return (
    <AppProvider>
      <ResponsiveAppShell />
      <AppUpdatePrompt />
    </AppProvider>
  );
}
