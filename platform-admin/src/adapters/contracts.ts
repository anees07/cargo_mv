import type {
  AdminStatus,
  PlatformAdminSession,
  PlatformAdminUser,
  PlatformSettings,
  PlatformSnapshot,
  SubscriptionPlan,
  Tenant,
  TenantStatus,
} from "../types";

export interface PlatformAdminAuthAdapter {
  getSession(): Promise<PlatformAdminSession | null>;
  signIn(email: string, password: string): Promise<PlatformAdminSession>;
  signInWithGoogle(): Promise<PlatformAdminSession>;
  bootstrap(): Promise<void>;
  signOut(): Promise<void>;
}

export interface PlatformAdminQueryAdapter {
  getSnapshot(): Promise<PlatformSnapshot>;
  subscribeSnapshot(onSnapshot: (snapshot: PlatformSnapshot) => void, onError: (error: Error) => void): () => void;
}

export interface PlatformAdminMutationAdapter {
  updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant>;
  assignPlan(tenantId: string, planId: string): Promise<Tenant>;
  updateModuleEntitlement(tenantId: string, moduleId: string, enabled: boolean): Promise<Tenant>;
  createPlan(plan: Omit<SubscriptionPlan, "id" | "subscribers">): Promise<SubscriptionPlan>;
  inviteAdmin(input: Pick<PlatformAdminUser, "name" | "email" | "role">): Promise<PlatformAdminUser>;
  updateAdminStatus(adminId: string, status: AdminStatus): Promise<PlatformAdminUser>;
  updateSettings(settings: PlatformSettings): Promise<PlatformSettings>;
}

export interface PlatformAdminAuditAdapter {
  getEvents(): Promise<PlatformSnapshot["auditEvents"]>;
}

export type PlatformAdminService = PlatformAdminAuthAdapter &
  PlatformAdminQueryAdapter &
  PlatformAdminMutationAdapter &
  PlatformAdminAuditAdapter;
