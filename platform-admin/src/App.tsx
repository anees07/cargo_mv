import { useCallback, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { platformAdminService, dataMode } from "./adapters";
import type { AppRoute } from "./components/AppShell";
import { AppShell } from "./components/AppShell";
import { Alert, Button, Input } from "./components/ui";
import { AdminsPage } from "./pages/AdminsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ModulesPage } from "./pages/ModulesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { TenantsPage } from "./pages/TenantsPage";
import type { PlatformAdminSession, PlatformSnapshot, Tenant, TenantStatus } from "./types";

const validRoutes: AppRoute[] = ["dashboard", "tenants", "subscriptions", "modules", "admins", "audit", "settings"];

export default function App() {
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [session, setSession] = useState<PlatformAdminSession | null>(null);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [nextSession, nextSnapshot] = await Promise.all([platformAdminService.getSession(), platformAdminService.getSnapshot()]);
    setSession(nextSession);
    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load the platform console." )).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onHashChange = () => setRoute(getInitialRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigate = (nextRoute: AppRoute) => { window.location.hash = nextRoute; setRoute(nextRoute); };
  const runMutation = async (operation: () => Promise<unknown>, success: string) => { try { await operation(); await refresh(); setToast(success); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "The action could not be completed."); } };

  if (loading) return <LoadingScreen />;
  if (!session || !snapshot) return <AuthGate error={error} onSignIn={async (email, password) => { setLoading(true); setError(null); try { const nextSession = await platformAdminService.signIn(email, password); setSession(nextSession); setSnapshot(await platformAdminService.getSnapshot()); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Sign-in failed."); } finally { setLoading(false); } }} />;

  return <AppShell route={route} onRouteChange={navigate} session={session} mode={dataMode}><div>{error ? <div className="mb-5"><Alert tone="danger"><span className="flex-1">{error}</span><button className="font-bold underline" onClick={() => { setError(null); void refresh(); }}>Retry</button></Alert></div> : null}{renderPage(route, snapshot, navigate, (operation, success) => void runMutation(operation, success), setSnapshot)}{toast ? <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#15252f] px-4 py-3 text-sm font-semibold text-white shadow-xl"><span className="mr-2 text-[#9de6c4]">✓</span>{toast}</div> : null}</div></AppShell>;
}

function renderPage(route: AppRoute, snapshot: PlatformSnapshot, navigate: (route: AppRoute) => void, mutate: (operation: () => Promise<unknown>, success: string) => void, setSnapshot: (snapshot: PlatformSnapshot) => void) {
  const refreshLocal = async () => setSnapshot(await platformAdminService.getSnapshot());
  const updateStatus = (tenant: Tenant, status: TenantStatus) => mutate(() => platformAdminService.updateTenantStatus(tenant.id, status), `${tenant.name} is now ${status}.`);
  const updatePlan = (tenantId: string, planId: string) => mutate(() => platformAdminService.assignPlan(tenantId, planId), "Subscription plan updated.");
  const updateModule = (tenantId: string, moduleId: string, enabled: boolean) => mutate(() => platformAdminService.updateModuleEntitlement(tenantId, moduleId, enabled), `Module ${enabled ? "enabled" : "disabled"}.`);
  if (route === "dashboard") return <DashboardPage snapshot={snapshot} onTenantStatus={updateStatus} onOpenTenant={() => navigate("tenants")} onRouteChange={navigate} />;
  if (route === "tenants") return <TenantsPage snapshot={snapshot} onTenantStatus={updateStatus} onAssignPlan={updatePlan} onModuleToggle={updateModule} />;
  if (route === "subscriptions") return <SubscriptionsPage snapshot={snapshot} onAssignPlan={updatePlan} onCreatePlan={(plan) => mutate(async () => { await platformAdminService.createPlan(plan); await refreshLocal(); }, "Subscription plan created.")} />;
  if (route === "modules") return <ModulesPage snapshot={snapshot} onModuleToggle={updateModule} />;
  if (route === "admins") return <AdminsPage snapshot={snapshot} onInvite={(input) => mutate(() => platformAdminService.inviteAdmin(input), "Invitation sent to the new platform admin.")} onStatusChange={(adminId, status) => mutate(() => platformAdminService.updateAdminStatus(adminId, status), `Admin ${status === "active" ? "reactivated" : "suspended"}.`)} />;
  if (route === "audit") return <AuditLogPage snapshot={snapshot} />;
  return <SettingsPage snapshot={snapshot} onSave={(settings) => mutate(() => platformAdminService.updateSettings(settings), "Platform settings saved.")} />;
}

function getInitialRoute(): AppRoute { const candidate = window.location.hash.replace(/^#/, "") as AppRoute; return validRoutes.includes(candidate) ? candidate : "dashboard"; }

function LoadingScreen() { return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f8]"><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm"><LoaderCircle className="h-5 w-5 animate-spin text-[#13845e]" />Loading platform control center</div></div>; }

function AuthGate({ error, onSignIn }: { error: string | null; onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return <div className="flex min-h-screen items-center justify-center bg-[#15252f] px-4 py-8"><div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9"><div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff8eb] text-[#08754e]"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-base font-bold text-slate-900">AtollCargo</p><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#13845e]">Platform admin</p></div></div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Sign in to control center</h1><p className="mt-2 text-sm leading-6 text-slate-500">Platform access requires an authorized administrator account and the required security claims.</p>{error ? <div className="mt-5"><Alert tone="danger">{error}</Alert></div> : null}<form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); await onSignIn(email, password); setSubmitting(false); }}><label className="block text-xs font-bold text-slate-700">Work email<Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1" placeholder="admin@company.com" /></label><label className="block text-xs font-bold text-slate-700">Password<Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" /></label><Button type="submit" variant="primary" className="mt-2 w-full" loading={submitting}>Continue<ArrowRight className="h-4 w-4" /></Button></form><p className="mt-6 text-center text-[11px] leading-5 text-slate-400">For production, authentication is enforced by Firebase Auth and the platform-admin claim.</p></div></div>;
}
