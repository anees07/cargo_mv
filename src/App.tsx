import { useState, type ReactElement } from "react";
import { AppProvider, useApp } from "./store";
import { Icon, Toast } from "./components/ui";
import { Drawer } from "./components/Drawer";
import { SplashScreen, WelcomeScreen, LoginScreen, RegisterScreen, BusinessSetupScreen, SelectProfileScreen } from "./screens/AuthScreens";
import { DashboardScreen, TripsScreen, TripDetailScreen } from "./screens/DashboardScreens";
import { OperationScreen } from "./screens/OperationScreen";
import { BillingScreen, InvoicePreviewScreen } from "./screens/BillingScreens";
import { PaymentsScreen } from "./screens/PaymentScreen";
import { DestinationsScreen, CustomersScreen, CatalogScreen } from "./screens/MasterScreens";
import { ReportsScreen, SettingsScreen, UsersScreen, AuditLogsScreen, ProfileScreen } from "./screens/ManagementScreens";
import { NotificationPanel } from "./screens/NotificationScreen";
import { CustomerDetailScreen, DestinationDetailScreen, CreateTripScreen } from "./screens/DetailScreens";
import { BackendScreen, PdfDocumentsScreen, SyncConflictsScreen } from "./screens/BackendScreens";

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
  const hideOn = ["splash", "welcome", "login", "register", "business_setup", "invoice_preview", "customer_detail", "destination_detail", "create_trip", "notifications"];
  if (hideOn.includes(screen)) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-lg no-print safe-bottom">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(t => {
          const isActive =
            screen === t.id ||
            (t.id === "trips" && (screen === "trip_detail" || screen === "create_trip")) ||
            (t.id === "billing" && (screen === "invoice_preview" || screen === "payments"));
          return (
            <button
              key={t.id}
              onClick={() => t.action ? t.action() : navigate(t.id as any)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 pb-3"
            >
              {t.id === "operation" ? (
                <div className={`-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-all ${activeTripId ? "bg-gradient-to-br from-ocean-500 to-ocean-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                  <Icon name={t.icon} className="h-5 w-5" />
                </div>
              ) : (
                <Icon
                  name={t.icon}
                  className={`h-5 w-5 transition-colors ${isActive ? "text-ocean-700" : "text-slate-400"}`}
                />
              )}
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-ocean-700" : "text-slate-500"} ${t.id === "operation" ? "-mt-0.5" : ""}`}>
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
    <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${isOnline ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
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
function ResponsiveAppShell({ children }: { children: React.ReactNode }) {
  const { screen, navigate, businessProfile, currentUser } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Exclude splash, login, auth screens from having the app shell chrome
  const isAuthScreen = ["splash", "welcome", "login", "register", "business_setup", "select_profile"].includes(screen);
  
  if (isAuthScreen) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50">{children}</div>;
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
    ]},
    { group: "Reports & Admin", items: [
      { id: "reports", label: "Reports", icon: "chart" },
      { id: "users", label: "Users & Roles", icon: "shield" },
      { id: "audit_logs", label: "Audit Log", icon: "log" },
      { id: "notifications", label: "Notifications", icon: "bell" },
      { id: "settings", label: "Settings", icon: "settings" },
    ]},
    { group: "Production Tools", items: [
      { id: "backend", label: "Backend Console", icon: "database" },
      { id: "sync_conflicts", label: "Sync Conflicts", icon: "sync" },
      { id: "pdf_documents", label: "PDF Documents", icon: "file" },
    ]},
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {/* Desktop/Tablet Sidebar (Hidden on mobile) */}
      <nav className="hidden w-64 flex-col bg-slate-900 text-white lg:flex">
        <div className="flex h-16 items-center gap-3 px-5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-600 text-lg">{businessProfile.logoEmoji}</div>
          <span className="font-bold tracking-tight">AtollCargo</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
          {navItems.map((group, groupIdx) => (
            <div key={group.group}>
              {groupIdx !== 0 && <div className="my-2 border-t border-white/10" />}
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.group}</p>
              {group.items.map(item => {
                const isActive = screen === item.id || (item.id === "trips" && screen.startsWith("trip_")) || (item.id === "billing" && screen.startsWith("invoice_")) || (item.id === "customers" && screen === "customer_detail") || (item.id === "destinations" && screen === "destination_detail");
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id as any)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-ocean-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                    {item.label}
                  </button>
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
              <p className="truncate text-[10px] text-slate-400 capitalize">{currentUser.role.replace("_", " ")}</p>
            </div>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-slate-50 md:border-l md:border-slate-200">
        <ConnectivityBanner />
        
        {/* Page Content */}
        <div className="relative flex-1 overflow-hidden">
          {children}
        </div>

        {/* Mobile Bottom Tab (Hidden on Desktop) */}
        <div className="lg:hidden">
          <BottomTab onDrawerOpen={() => setDrawerOpen(true)} />
        </div>
      </main>

      {/* Mobile Navigation Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

// ============================================================================
// Screen Router
// ============================================================================
function ScreenRouter() {
  const { screen, isAuthed, toasts, dismissToast } = useApp();

  if (screen === "splash") return <SplashScreen />;
  if (screen === "welcome") return <WelcomeScreen />;
  if (screen === "login") return <LoginScreen />;
  if (screen === "register") return <RegisterScreen />;
  if (screen === "business_setup") return <BusinessSetupScreen />;

  if (!isAuthed) return <WelcomeScreen />;

  if (screen === "select_profile") return <SelectProfileScreen />;

  const screenMap: Record<string, ReactElement> = {
    dashboard: <DashboardScreen onMenuOpen={() => {}} />,
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
    reports: <ReportsScreen />,
    settings: <SettingsScreen />,
    users: <UsersScreen />,
    audit_logs: <AuditLogsScreen />,
    profile: <ProfileScreen />,
    notifications: <NotificationPanel onClose={() => {}} />,
    backend: <BackendScreen />,
    sync_conflicts: <SyncConflictsScreen />,
    pdf_documents: <PdfDocumentsScreen />,
  };

  return (
    <div className="relative h-full w-full max-w-5xl mx-auto bg-slate-50 md:shadow-lg md:border-x md:border-slate-200">
      <div className="absolute inset-0 flex flex-col">
        {screenMap[screen] || <DashboardScreen onMenuOpen={() => {}} />}
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
      <ResponsiveAppShell>
        <ScreenRouter />
      </ResponsiveAppShell>
    </AppProvider>
  );
}
