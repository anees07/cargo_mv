import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import type { PlatformAdminService } from "./contracts";
import type { AdminStatus, PlatformAdminSession, PlatformAdminUser, PlatformSettings, PlatformSnapshot, SubscriptionPlan, Tenant, TenantStatus } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!Object.values(firebaseConfig).every(Boolean)) throw new Error("Firebase configuration is missing. Add VITE_FIREBASE_* values to live mode.");
  app ??= getApps()[0] ?? initializeApp(firebaseConfig);
  auth ??= getAuth(app);
  return auth;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_PLATFORM_ADMIN_API_URL as string | undefined;
  if (!baseUrl) throw new Error("VITE_PLATFORM_ADMIN_API_URL is required for live mode.");
  const user = getFirebaseAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new Error((await response.text()) || `Platform API request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export class LivePlatformAdminService implements PlatformAdminService {
  async getSession(): Promise<PlatformAdminSession | null> {
    const firebaseAuth = getFirebaseAuth();
    await firebaseAuth.authStateReady();
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    const token = await user.getIdTokenResult();
    if (token.claims.platformAdmin !== true) throw new Error("This account is not authorized for platform administration.");
    return { id: user.uid, name: user.displayName || user.email?.split("@")[0] || "Platform admin", email: user.email || "", role: (token.claims.platformRole as PlatformAdminSession["role"]) || "platform_admin", platformAdmin: true };
  }

  async signIn(email: string, password: string): Promise<PlatformAdminSession> {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    const session = await this.getSession();
    if (!session) throw new Error("Platform admin session could not be established.");
    return session;
  }

  async signOut(): Promise<void> { await signOut(getFirebaseAuth()); }
  async getSnapshot(): Promise<PlatformSnapshot> { return apiRequest<PlatformSnapshot>("/snapshot"); }
  async getEvents(): Promise<PlatformSnapshot["auditEvents"]> { return apiRequest<PlatformSnapshot["auditEvents"]>("/audit-events"); }
  async updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant> { return apiRequest<Tenant>(`/tenants/${tenantId}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
  async assignPlan(tenantId: string, planId: string): Promise<Tenant> { return apiRequest<Tenant>(`/tenants/${tenantId}/subscription`, { method: "POST", body: JSON.stringify({ planId }) }); }
  async updateModuleEntitlement(tenantId: string, moduleId: string, enabled: boolean): Promise<Tenant> { return apiRequest<Tenant>(`/tenants/${tenantId}/modules/${moduleId}`, { method: "POST", body: JSON.stringify({ enabled }) }); }
  async createPlan(input: Omit<SubscriptionPlan, "id" | "subscribers">): Promise<SubscriptionPlan> { return apiRequest<SubscriptionPlan>("/plans", { method: "POST", body: JSON.stringify(input) }); }
  async inviteAdmin(input: Pick<PlatformAdminUser, "name" | "email" | "role">): Promise<PlatformAdminUser> { return apiRequest<PlatformAdminUser>("/admins/invitations", { method: "POST", body: JSON.stringify(input) }); }
  async updateAdminStatus(adminId: string, status: AdminStatus): Promise<PlatformAdminUser> { return apiRequest<PlatformAdminUser>(`/admins/${adminId}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
  async updateSettings(settings: PlatformSettings): Promise<PlatformSettings> { return apiRequest<PlatformSettings>("/settings", { method: "PUT", body: JSON.stringify(settings) }); }
}
