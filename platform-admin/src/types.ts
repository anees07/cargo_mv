export type TenantStatus = "pending" | "active" | "suspended" | "blocked";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";
export type AdminStatus = "active" | "invited" | "suspended";
export type AdminRole = "platform_owner" | "platform_admin" | "support" | "billing";
export type ActionTone = "neutral" | "success" | "warning" | "danger";

export interface PlatformAdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  platformAdmin: true;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  contactName: string;
  email: string;
  phone: string;
  island: string;
  status: TenantStatus;
  joinedAt: string;
  lastActiveAt: string;
  users: number;
  shipments: number;
  mrr: number;
  planId: string;
  renewalDate: string;
  enabledModules: string[];
  risk: "low" | "medium" | "high";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: "monthly" | "annual";
  trialDays: number;
  features: string[];
  active: boolean;
  subscribers: number;
  accent: "mint" | "blue" | "amber";
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  renewalDate: string;
  amount: number;
  paymentMethod: string;
  lastPayment: string;
}

export interface PlatformModule {
  id: string;
  name: string;
  description: string;
  category: "operations" | "finance" | "growth" | "platform";
  enabledFor: number;
  status: "available" | "beta" | "sunset";
  adoption: number;
  monthlyValue: number;
}

export interface PlatformAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastActiveAt: string;
  twoFactorEnabled: boolean;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  description: string;
  timestamp: string;
  tone: ActionTone;
}

export interface PlatformSettings {
  requireApproval: boolean;
  allowTrials: boolean;
  requireTwoFactor: boolean;
  maintenanceMode: boolean;
  defaultTrialDays: number;
  supportEmail: string;
}

export interface PlatformSnapshot {
  tenants: Tenant[];
  plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  modules: PlatformModule[];
  admins: PlatformAdminUser[];
  auditEvents: AuditEvent[];
  settings: PlatformSettings;
}
