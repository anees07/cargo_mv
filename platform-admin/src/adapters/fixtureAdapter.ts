import { fixtureSnapshot } from "../data/fixtures";
import type { PlatformAdminService } from "./contracts";
import type { AdminStatus, PlatformAdminSession, PlatformAdminUser, PlatformSettings, PlatformSnapshot, SubscriptionPlan, Tenant, TenantStatus } from "../types";

const clone = <T,>(value: T): T => structuredClone(value);

export class FixturePlatformAdminService implements PlatformAdminService {
  private snapshot: PlatformSnapshot = clone(fixtureSnapshot);

  async getSession(): Promise<PlatformAdminSession | null> {
    return { id: "adm_001", name: "Anees Mohamed", email: "anees@atollcargo.mv", role: "platform_owner", platformAdmin: true };
  }

  async signIn(): Promise<PlatformAdminSession> {
    const session = await this.getSession();
    if (!session) throw new Error("Unable to start the fixture session.");
    return session;
  }

  async signInWithGoogle(): Promise<PlatformAdminSession> {
    const session = await this.getSession();
    if (!session) throw new Error("Unable to start the fixture session.");
    return session;
  }

  async bootstrap(): Promise<void> {
    return Promise.resolve();
  }

  async signOut(): Promise<void> {
    return Promise.resolve();
  }

  async getSnapshot(): Promise<PlatformSnapshot> {
    return clone(this.snapshot);
  }

  subscribeSnapshot(onSnapshot: (snapshot: PlatformSnapshot) => void): () => void {
    onSnapshot(clone(this.snapshot));
    return () => undefined;
  }

  async getEvents(): Promise<PlatformSnapshot["auditEvents"]> {
    return clone(this.snapshot.auditEvents);
  }

  async updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    const tenant = this.findTenant(tenantId);
    tenant.status = status;
    this.record("Updated tenant status", tenant.name, `Tenant status changed to ${status}.`, status === "blocked" ? "danger" : "success");
    return clone(tenant);
  }

  async assignPlan(tenantId: string, planId: string): Promise<Tenant> {
    const tenant = this.findTenant(tenantId);
    const plan = this.snapshot.plans.find((item) => item.id === planId);
    if (!plan) throw new Error("Subscription plan not found.");
    tenant.planId = plan.id;
    tenant.mrr = plan.price;
    this.record("Changed subscription", tenant.name, `Assigned the ${plan.name} plan.`, "neutral");
    return clone(tenant);
  }

  async updateModuleEntitlement(tenantId: string, moduleId: string, enabled: boolean): Promise<Tenant> {
    const tenant = this.findTenant(tenantId);
    tenant.enabledModules = enabled
      ? Array.from(new Set([...tenant.enabledModules, moduleId]))
      : tenant.enabledModules.filter((id) => id !== moduleId);
    const module = this.snapshot.modules.find((item) => item.id === moduleId);
    if (module) module.enabledFor = Math.max(0, this.snapshot.tenants.filter((item) => item.enabledModules.includes(moduleId)).length);
    this.record(enabled ? "Enabled module" : "Disabled module", tenant.name, `${module?.name ?? moduleId} ${enabled ? "enabled" : "disabled"}.`, enabled ? "success" : "warning");
    return clone(tenant);
  }

  async createPlan(input: Omit<SubscriptionPlan, "id" | "subscribers">): Promise<SubscriptionPlan> {
    const plan: SubscriptionPlan = { ...input, id: input.name.toLowerCase().replace(/\s+/g, "-"), subscribers: 0 };
    this.snapshot.plans.push(plan);
    this.record("Created plan", plan.name, "A new subscription plan was created.", "success");
    return clone(plan);
  }

  async inviteAdmin(input: Pick<PlatformAdminUser, "name" | "email" | "role">): Promise<PlatformAdminUser> {
    const admin: PlatformAdminUser = { ...input, id: `adm_${Date.now()}`, status: "invited", lastActiveAt: new Date().toISOString(), twoFactorEnabled: false };
    this.snapshot.admins.push(admin);
    this.record("Invited admin", admin.name, "A platform administrator invitation was sent.", "neutral");
    return clone(admin);
  }

  async updateAdminStatus(adminId: string, status: AdminStatus): Promise<PlatformAdminUser> {
    const admin = this.snapshot.admins.find((item) => item.id === adminId);
    if (!admin) throw new Error("Platform admin not found.");
    admin.status = status;
    this.record("Updated admin status", admin.name, `Admin status changed to ${status}.`, status === "suspended" ? "warning" : "success");
    return clone(admin);
  }

  async updateSettings(settings: PlatformSettings): Promise<PlatformSettings> {
    this.snapshot.settings = clone(settings);
    this.record("Updated platform settings", "Platform settings", "Approval and security settings were updated.", "neutral");
    return clone(settings);
  }

  private findTenant(id: string): Tenant {
    const tenant = this.snapshot.tenants.find((item) => item.id === id);
    if (!tenant) throw new Error("Tenant not found.");
    return tenant;
  }

  private record(action: string, target: string, description: string, tone: PlatformSnapshot["auditEvents"][number]["tone"]): void {
    this.snapshot.auditEvents.unshift({ id: `evt_${Date.now()}`, actor: "Anees Mohamed", action, target, description, timestamp: new Date().toISOString(), tone });
  }
}
