import type { PlatformSnapshot } from "../types";

export const fixtureSnapshot: PlatformSnapshot = {
  tenants: [
    { id: "bp_manta", name: "Manta Logistics", slug: "manta-logistics", contactName: "Areef Hassan", email: "ops@manta.mv", phone: "+960 777 1842", island: "Male'", status: "active", joinedAt: "2026-05-12", lastActiveAt: "2026-07-26T08:42:00Z", users: 18, shipments: 1248, mrr: 249, planId: "growth", renewalDate: "2026-08-12", enabledModules: ["dispatch", "billing", "reports", "api"], risk: "low" },
    { id: "bp_seagull", name: "Seagull Trading Co.", slug: "seagull-trading", contactName: "Hana Mohamed", email: "hana@seagull.mv", phone: "+960 765 9011", island: "Hulhumale'", status: "pending", joinedAt: "2026-07-25", lastActiveAt: "2026-07-25T16:14:00Z", users: 4, shipments: 0, mrr: 0, planId: "starter", renewalDate: "2026-08-25", enabledModules: ["dispatch"], risk: "medium" },
    { id: "bp_coral", name: "Coral Bay Imports", slug: "coral-bay", contactName: "Ibrahim Shareef", email: "finance@coralbay.mv", phone: "+960 799 2204", island: "Addu City", status: "active", joinedAt: "2026-03-03", lastActiveAt: "2026-07-26T06:08:00Z", users: 9, shipments: 682, mrr: 99, planId: "starter", renewalDate: "2026-08-03", enabledModules: ["dispatch", "billing"], risk: "low" },
    { id: "bp_oceanic", name: "Oceanic Forwarders", slug: "oceanic-forwarders", contactName: "Mariyam Ali", email: "hello@oceanic.mv", phone: "+960 778 4420", island: "Kulhudhuffushi", status: "suspended", joinedAt: "2026-01-19", lastActiveAt: "2026-07-02T11:20:00Z", users: 27, shipments: 2401, mrr: 399, planId: "scale", renewalDate: "2026-07-19", enabledModules: ["dispatch", "billing", "reports", "api", "multi_branch"], risk: "high" },
    { id: "bp_atoll", name: "Atoll Supply House", slug: "atoll-supply", contactName: "Fathimath Nisha", email: "admin@atollsupply.mv", phone: "+960 765 8890", island: "Thinadhoo", status: "active", joinedAt: "2026-06-08", lastActiveAt: "2026-07-25T19:37:00Z", users: 7, shipments: 318, mrr: 99, planId: "starter", renewalDate: "2026-08-08", enabledModules: ["dispatch", "billing", "reports"], risk: "low" },
    { id: "bp_lagoon", name: "Lagoon Cargo", slug: "lagoon-cargo", contactName: "Ahmed Rauf", email: "team@lagooncargo.mv", phone: "+960 790 1120", island: "Maafushi", status: "blocked", joinedAt: "2026-02-10", lastActiveAt: "2026-06-18T09:02:00Z", users: 2, shipments: 71, mrr: 0, planId: "starter", renewalDate: "2026-07-10", enabledModules: ["dispatch"], risk: "high" },
  ],
  plans: [
    { id: "starter", name: "Starter", description: "For small teams getting their first operations online.", price: 99, billingPeriod: "monthly", trialDays: 14, features: ["Dispatch workspace", "Up to 5 users", "Basic reports"], active: true, subscribers: 12, accent: "blue" },
    { id: "growth", name: "Growth", description: "The operating system for a growing cargo business.", price: 249, billingPeriod: "monthly", trialDays: 14, features: ["Everything in Starter", "Unlimited users", "Billing & collections", "Advanced reports"], active: true, subscribers: 8, accent: "mint" },
    { id: "scale", name: "Scale", description: "Multi-branch control and integrations at scale.", price: 399, billingPeriod: "monthly", trialDays: 30, features: ["Everything in Growth", "Multi-branch operations", "API access", "Priority support"], active: true, subscribers: 4, accent: "amber" },
  ],
  subscriptions: [
    { id: "sub_manta", tenantId: "bp_manta", planId: "growth", status: "active", startedAt: "2026-05-12", renewalDate: "2026-08-12", amount: 249, paymentMethod: "Visa ending 4820", lastPayment: "2026-07-12" },
    { id: "sub_coral", tenantId: "bp_coral", planId: "starter", status: "active", startedAt: "2026-03-03", renewalDate: "2026-08-03", amount: 99, paymentMethod: "Mastercard ending 1192", lastPayment: "2026-07-03" },
    { id: "sub_oceanic", tenantId: "bp_oceanic", planId: "scale", status: "past_due", startedAt: "2026-01-19", renewalDate: "2026-07-19", amount: 399, paymentMethod: "Visa ending 9044", lastPayment: "2026-06-19" },
    { id: "sub_atoll", tenantId: "bp_atoll", planId: "starter", status: "trial", startedAt: "2026-06-08", renewalDate: "2026-08-08", amount: 99, paymentMethod: "Not added", lastPayment: "Pending" },
  ],
  modules: [
    { id: "dispatch", name: "Dispatch workspace", description: "Plan, assign, and track cargo movements across islands.", category: "operations", enabledFor: 6, status: "available", adoption: 100, monthlyValue: 0 },
    { id: "billing", name: "Billing & collections", description: "Invoices, receipts, customer balances, and GST-ready reports.", category: "finance", enabledFor: 4, status: "available", adoption: 67, monthlyValue: 496 },
    { id: "reports", name: "Advanced reporting", description: "Operational trends, margin visibility, and exportable insights.", category: "growth", enabledFor: 3, status: "available", adoption: 50, monthlyValue: 0 },
    { id: "api", name: "API access", description: "Connect cargo operations to external tools and partner systems.", category: "platform", enabledFor: 2, status: "beta", adoption: 33, monthlyValue: 0 },
    { id: "multi_branch", name: "Multi-branch controls", description: "Manage multiple operating locations under one business profile.", category: "operations", enabledFor: 1, status: "available", adoption: 17, monthlyValue: 0 },
    { id: "customer_portal", name: "Customer portal", description: "Let customers check shipment status and download documents.", category: "growth", enabledFor: 0, status: "beta", adoption: 0, monthlyValue: 0 },
  ],
  admins: [
    { id: "adm_001", name: "Anees Mohamed", email: "anees@atollcargo.mv", role: "platform_owner", status: "active", lastActiveAt: "2026-07-26T08:50:00Z", twoFactorEnabled: true },
    { id: "adm_002", name: "Sarah Ibrahim", email: "sarah@atollcargo.mv", role: "platform_admin", status: "active", lastActiveAt: "2026-07-25T17:32:00Z", twoFactorEnabled: true },
    { id: "adm_003", name: "Support desk", email: "support@atollcargo.mv", role: "support", status: "invited", lastActiveAt: "2026-07-20T10:12:00Z", twoFactorEnabled: false },
  ],
  auditEvents: [
    { id: "evt_001", actor: "Anees Mohamed", action: "Approved tenant", target: "Manta Logistics", description: "Business profile approved for production access.", timestamp: "2026-07-26T08:44:00Z", tone: "success" },
    { id: "evt_002", actor: "Sarah Ibrahim", action: "Changed subscription", target: "Oceanic Forwarders", description: "Plan changed from Growth to Scale.", timestamp: "2026-07-25T17:18:00Z", tone: "neutral" },
    { id: "evt_003", actor: "Anees Mohamed", action: "Blocked tenant", target: "Lagoon Cargo", description: "Access blocked after repeated payment failures.", timestamp: "2026-07-24T13:06:00Z", tone: "danger" },
    { id: "evt_004", actor: "Sarah Ibrahim", action: "Enabled module", target: "Coral Bay Imports", description: "Billing & collections enabled for the tenant.", timestamp: "2026-07-24T09:42:00Z", tone: "success" },
    { id: "evt_005", actor: "Anees Mohamed", action: "Invited admin", target: "Support desk", description: "Platform support invitation sent.", timestamp: "2026-07-23T15:27:00Z", tone: "neutral" },
  ],
  settings: { requireApproval: true, allowTrials: true, requireTwoFactor: true, maintenanceMode: false, defaultTrialDays: 14, supportEmail: "support@atollcargo.mv" },
};
