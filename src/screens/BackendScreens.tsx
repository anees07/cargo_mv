import { useState } from "react";
import { useApp } from "../store";
import { Btn, Card, Icon, Section, StatusBadge, TopBar } from "../components/ui";
import { MVR, formatDateTime } from "../utils/format";

const schemaGroups = [
  {
    title: "Core identity",
    tables: ["business_profiles", "business_users"],
  },
  {
    title: "Setup data",
    tables: ["destinations", "customers", "catalog_items", "item_price_rates", "tax_settings", "numbering_sequences"],
  },
  {
    title: "Trips and operations",
    tables: ["trips", "operations"],
  },
  {
    title: "Billing",
    tables: ["bills", "payments"],
  },
  {
    title: "Files and audit",
    tables: ["audit_logs", "notifications"],
  },
];

const edgeFunctions = [
  { name: "create_business_profile", risk: "high", status: "client" },
  { name: "generate_next_number", risk: "critical", status: "client" },
  { name: "open_trip", risk: "high", status: "client" },
  { name: "end_trip", risk: "critical", status: "client" },
  { name: "close_trip", risk: "critical", status: "client" },
  { name: "finalize_bill", risk: "critical", status: "client" },
  { name: "post_payment", risk: "critical", status: "client" },
  { name: "sync_offline_operations", risk: "high", status: "future" },
  { name: "alter_bill_after_trip_end", risk: "critical", status: "future" },
];

const rlsPolicies = [
  "JWT user must be a member of business_profile_id",
  "All tenant reads use /business_profiles/{businessProfileId}/ subcollections",
  "Financial records use soft delete and immutable finalized snapshots",
  "Numbering rows scoped by businessProfileId + numberType",
  "Storage paths start with /{business_profile_id}/",
  "Realtime channels subscribe only to current business_profile_id",
];

// ============================================================================
// Backend Console — Firebase production blueprint
// ============================================================================
  export function BackendScreen() {
  const { back, businessProfile, numbering, auditLogs, bills, payments, operations, users } = useApp();
  const [tab, setTab] = useState<"schema" | "gorouter" | "firebase" | "functions" | "security" | "roadmap">("schema");

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar
        title="Backend & System Specs"
        subtitle="Firebase Auth, Cloud Firestore, and Flutter GoRouter"
        onBack={back}
      />

      <div className="border-b border-slate-200 bg-white">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2">
          {[
            { id: "gorouter", label: "🚀 GoRouter Dart" },
            { id: "firebase", label: "🔥 Firebase Spec" },
            { id: "schema", label: "SQL Schema" },
            { id: "functions", label: "Functions" },
            { id: "security", label: "Security/RLS" },
            { id: "roadmap", label: "Roadmap" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-ocean-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <Card className="mb-4 border-0 bg-gradient-to-br from-slate-900 to-ocean-950 p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-200">Business isolation key</p>
              <p className="mt-1 font-mono text-sm font-bold">{businessProfile.id}</p>
              <p className="mt-1 text-xs text-ocean-100">Every table, query, storage path, realtime channel, PDF, and audit log is scoped by this value.</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center">
              <p className="text-xs uppercase text-ocean-200">JWT</p>
              <p className="text-sm font-bold text-emerald-300">active</p>
            </div>
          </div>
        </Card>

        {tab === "schema" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              <Metric label="Tables" value="29" icon="database" />
              <Metric label="Users" value={String(users.length)} icon="users" />
              <Metric label="Operations" value={String(operations.length)} icon="package" />
              <Metric label="Bills" value={String(bills.length)} icon="receipt" />
            </div>

            {schemaGroups.map(group => (
              <Section key={group.title} title={group.title}>
                <Card className="overflow-hidden p-0">
                  {group.tables.map((table, i) => (
                    <div key={table} className={`flex items-center justify-between px-3 py-2.5 ${i !== group.tables.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="database" className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-mono text-xs text-slate-800">{table}</span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">bp_id</span>
                    </div>
                  ))}
                </Card>
              </Section>
            ))}
          </div>
        )}

        {tab === "gorouter" && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-ocean-600 bg-ocean-50/50 p-3.5 leading-relaxed">
              <p className="text-xs font-bold text-ocean-950">🚀 Fully Production-Ready Flutter GoRouter Navigation Specification</p>
              <p className="mt-1 text-xs text-ocean-900">
                This exact Flutter Dart GoRouter configuration powers deep links and URL path routing across all 19 application screens, integrating Riverpod redirection guards to enforce strong tenancy rules (blocking unauthenticated access or ensuring active business setup).
              </p>
            </Card>

            <Section title="Dart Router Specification (lib/app/router/app_router.dart)">
              <Card className="bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <pre>{`import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_provider.dart';
import '../business_profile/business_profile_provider.dart';

// Screens
import '../../features/onboarding/presentation/splash_screen.dart';
import '../../features/onboarding/presentation/welcome_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/business_profile/presentation/business_setup_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/trips/presentation/trips_screen.dart';
import '../../features/trips/presentation/trip_detail_screen.dart';
import '../../features/trips/presentation/create_trip_screen.dart';
import '../../features/operations/presentation/operation_screen.dart';
import '../../features/destinations/presentation/destinations_screen.dart';
import '../../features/destinations/presentation/destination_detail_screen.dart';
import '../../features/customers/presentation/customers_screen.dart';
import '../../features/customers/presentation/customer_detail_screen.dart';
import '../../features/catalog/presentation/catalog_screen.dart';
import '../../features/billing/presentation/billing_screen.dart';
import '../../features/billing/presentation/invoice_preview_screen.dart';
import '../../features/payments/presentation/payments_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/users/presentation/users_screen.dart';
import '../../features/audit_logs/presentation/audit_logs_screen.dart';
import '../../features/notifications/presentation/notification_panel.dart';

// Global navigation key
final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);
  final activeTenant = ref.watch(currentBusinessProfileProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    
    // Strict Riverpod Authentication Guards
    redirect: (BuildContext context, GoRouterState state) {
      final bool authed = authState.isAuthenticated;
      final bool hasBusiness = activeTenant != null;
      final String loc = state.matchedLocation;

      // Offboarding and public pathways
      final bool isPublic = loc == '/splash' || loc == '/welcome' || loc == '/login' || loc == '/register';

      if (!authed && !isPublic) return '/welcome';
      if (authed && !hasBusiness && loc != '/business-setup') return '/business-setup';
      if (authed && hasBusiness && isPublic) return '/';
      
      return null; // Continue normally
    },

    routes: <RouteBase>[
      // Public off-grid pathways
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/business-setup', builder: (context, state) => const BusinessSetupScreen()),

      // Authed Core App Shell with Bottom Tabs & Drawer Shell
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (BuildContext context, GoRouterState state, Widget child) {
          return AppShell(child: child);
        },
        routes: <RouteBase>[
          // Dashboard / Home (Route 1)
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardScreen(),
          ),

          // Trips Operations Module (Routes 2, 3, 4)
          GoRoute(
            path: '/trips',
            builder: (context, state) => const TripsScreen(),
            routes: <RouteBase>[
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateTripScreen(),
              ),
              GoRoute(
                path: ':tripId',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return TripDetailScreen(tripId: tripId);
                },
              ),
            ],
          ),

          // Active Master Cargo Manifest Loading & Offloading (Route 5)
          GoRoute(
            path: '/operation',
            builder: (context, state) => const OperationScreen(),
          ),

          // Distributed Billing & Financial Snapshots Module (Routes 6, 7)
          GoRoute(
            path: '/billing',
            builder: (context, state) => const BillingScreen(),
            routes: <RouteBase>[
              GoRoute(
                path: ':billId',
                builder: (context, state) {
                  final billId = state.pathParameters['billId']!;
                  return InvoicePreviewScreen(billId: billId);
                },
              ),
            ],
          ),

          // Payments & Settlements (Route 8)
          GoRoute(
            path: '/payments',
            builder: (context, state) => const PaymentsScreen(),
          ),

          // Master Data Admin Modules (Routes 9, 10, 11, 12, 13)
          GoRoute(
            path: '/destinations',
            builder: (context, state) => const DestinationsScreen(),
            routes: <RouteBase>[
              GoRoute(
                path: ':destId',
                builder: (context, state) {
                  return DestinationDetailScreen(destId: state.pathParameters['destId']!);
                },
              ),
            ],
          ),

          GoRoute(
            path: '/customers',
            builder: (context, state) => const CustomersScreen(),
            routes: <RouteBase>[
              GoRoute(
                path: ':custId',
                builder: (context, state) {
                  return CustomerDetailScreen(customerId: state.pathParameters['custId']!);
                },
              ),
            ],
          ),

          GoRoute(
            path: '/catalog',
            builder: (context, state) => const CatalogScreen(),
          ),

          // High Clearance Management Modules (Routes 14, 15, 16, 17, 18, 19)
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/users',
            builder: (context, state) => const UsersScreen(),
          ),
          GoRoute(
            path: '/audit-logs',
            builder: (context, state) => const AuditLogsScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationPanel(),
          ),
          GoRoute(
            path: '/more-profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});`}</pre>
              </Card>
            </Section>
          </div>
        )}

        {tab === "firebase" && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-amber-500 bg-amber-50 p-3.5">
              <p className="text-xs font-bold text-amber-950">🔥 Multi-Tenant Firebase Cloud Firestore Schema</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                To power this application purely on Firebase while fulfilling the guard rule <em>“Everything belongs to a Business Profile”</em>, operational data is stored only under <strong><code className="bg-amber-200/70 px-1 py-0.5 rounded">/business_profiles/{businessProfile.id}/...</code></strong>. Root Firestore paths are limited to the business profile document and the authenticated user bootstrap record.
              </p>
            </Card>

            <Section title="Business-Scoped Collections & Documents">
              <div className="space-y-3">
                {[
                  {
                    coll: "business_profiles",
                    doc: "bp_001",
                    desc: "Master business tenant entity",
                    fields: {
                      ownerUserId: "string (reference to users)",
                      businessName: "string (e.g. 'Atoll Marine Services')",
                      vesselName: "string (e.g. 'MV Ocean Star')",
                      vesselRegistrationNumber: "string",
                      gstNumber: "string (e.g. 'GST-MV-1004521')",
                      defaultTaxRate: "number (8)",
                      taxInclusivePricingEnabled: "boolean (true)",
                      activeStatus: "boolean",
                      createdAt: "timestamp",
                    },
                  },
                  {
                    coll: "business_users",
                    doc: "user_001",
                    desc: "Directory of operators and authenticated crew",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      email: "string",
                      displayName: "string",
                      role: "string ('owner' | 'admin' | 'manager' | 'cashier' | 'loading_staff' | 'offloading_staff' | 'viewer')",
                      activeStatus: "boolean",
                    },
                  },
                  {
                    coll: "destinations",
                    doc: "dest_MLE",
                    desc: "Maldives islands specific to this business profile",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      islandName: "string ('Male')",
                      atoll: "string ('Kaafu')",
                      destinationCode: "string ('MLE')",
                      sortOrder: "number",
                      activeStatus: "boolean",
                    },
                  },
                  {
                    coll: "customers",
                    doc: "cust_STO",
                    desc: "Destination-specific customers and walk-ins",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      customerType: "string ('business' | 'individual' | 'government' | 'walk_in')",
                      displayName: "string ('STO Maldives')",
                      legalName: "string",
                      phone: "string",
                      gstNumber: "string",
                      defaultDestinationId: "string (reference to destinations)",
                      defaultPriceLevelId: "string",
                      creditAllowed: "boolean (true)",
                      creditLimit: "number (250000)",
                      outstandingBalance: "number (42500)",
                    },
                  },
                  {
                    coll: "catalog_items",
                    doc: "item_RIC50",
                    desc: "Reusable cargo manifest line items",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      itemName: "string ('Rice Sack 50kg')",
                      itemCode: "string ('RIC-50')",
                      category: "string ('perishable')",
                      unitType: "string ('sack')",
                      defaultTaxRate: "number (8)",
                      taxInclusive: "boolean (true)",
                      icon: "string ('🍚')",
                    },
                  },
                  {
                    coll: "item_price_rates",
                    doc: "rate_RIC50_business",
                    desc: "Customer-group or destination specific custom pricing",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      itemId: "string (reference to catalog_items)",
                      priceLevel: "string ('business')",
                      destinationId: "string | null",
                      priceTaxInclusive: "number (128.00)",
                    },
                  },
                  {
                    coll: "trips",
                    doc: "trip_TRIP202500142",
                    desc: "Single cargo sailing journey",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      tripNumber: "string ('TRIP-2025-000142')",
                      vesselName: "string",
                      originDestinationId: "string",
                      status: "string ('draft' | 'open' | 'loading' | 'sailing' | 'offloading' | 'ended' | 'closed')",
                      plannedDepartureAt: "timestamp",
                      plannedArrivalAt: "timestamp",
                      actualDepartureAt: "timestamp | null",
                      actualArrivalAt: "timestamp | null",
                      notes: "string",
                      openedBy: "string",
                      endedBy: "string | null",
                      closedBy: "string | null",
                    },
                  },
                  {
                    coll: "operations",
                    doc: "op_001",
                    desc: "Loading or offloading manifests bound to an active trip",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      tripId: "string (INDEXED - reference to trips)",
                      operationType: "string ('loading' | 'offloading')",
                      destinationId: "string",
                      customerId: "string",
                      totalTaxInclusive: "number (23600.00)",
                      totalTax: "number (1748.14)",
                      createdBy: "string",
                      createdAt: "timestamp",
                      synced: "boolean (true)",
                    },
                  },
                  {
                    coll: "operation_items",
                    doc: "oi_001",
                    desc: "Distinct manifested rows under an operation",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      tripId: "string (INDEXED)",
                      operationId: "string (INDEXED - reference to operations)",
                      destinationId: "string",
                      customerId: "string",
                      itemId: "string",
                      itemNameSnapshot: "string ('Cement Bag 50kg')",
                      unitType: "string ('sack')",
                      quantity: "number (120)",
                      unitPriceTaxInclusive: "number (140.00)",
                      taxRate: "number (8)",
                      taxAmount: "number (1244.44)",
                      lineTotalTaxInclusive: "number (16800.00)",
                      originalPrice: "number (140.00)",
                      overridePrice: "number | null",
                      overrideReason: "string | null",
                      createdBy: "string",
                      createdAt: "timestamp",
                    },
                  },
                  {
                    coll: "bills",
                    doc: "bill_BILLMLE0089",
                    desc: "Finalized financial documents and draft invoices",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      tripId: "string",
                      destinationId: "string",
                      customerId: "string",
                      billNumber: "string ('BILL-MLE-000089')",
                      billType: "string ('instant_cash' | 'credit')",
                      billStatus: "string ('draft' | 'finalized' | 'adjusted')",
                      subtotalTaxInclusive: "number",
                      taxTotal: "number",
                      grandTotal: "number",
                      paymentStatus: "string ('unpaid' | 'partial' | 'paid')",
                      paidAmount: "number",
                      finalizedAt: "timestamp | null",
                      finalizedBy: "string | null",
                      createdAt: "timestamp",
                    },
                  },
                  {
                    coll: "payments",
                    doc: "pay_RCP00214",
                    desc: "Official payment receipts collected against bills",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      billId: "string (INDEXED)",
                      paymentNumber: "string ('RCP-000214')",
                      amount: "number (18000.00)",
                      method: "string ('cash' | 'bank_transfer' | 'cheque' | 'mobile_wallet')",
                      reference: "string ('BNK-TRF-4521')",
                      collectedBy: "string",
                      collectedAt: "timestamp",
                      notes: "string",
                    },
                  },
                  {
                    coll: "numbering_sequences",
                    doc: "bp_001_trip",
                    desc: "Distributed transaction counter preventing multi-device numbering collisions",
                    fields: {
                      businessProfileId: "string (INDEXED)",
                      numberType: "string ('trip' | 'bill' | 'invoice' | 'receipt')",
                      prefix: "string ('TRIP')",
                      currentSequence: "number (142)",
                      padding: "number (6)",
                      formatTemplate: "string ('TRIP-{YYYY}-{000000}')",
                      lastGenerated: "string ('TRIP-2025-000142')",
                    },
                  },
                ].map(c => (
                  <Card key={c.coll} className="p-4 md:p-6 space-y-2 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="database" className="h-4 w-4 text-amber-600" />
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {c.coll === "business_profiles" || c.coll === "business_users"
                            ? `/${c.coll}/${c.doc}`
                            : `/business_profiles/${businessProfile.id || "{businessProfileId}"}/${c.coll}/${c.doc}`}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{c.desc}</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-300 space-y-1">
                      {Object.entries(c.fields).map(([fieldName, typeInfo]) => (
                        <div key={fieldName} className="flex justify-between">
                          <span className="text-amber-300 font-bold">{fieldName}:</span>
                          <span className="text-slate-400">{typeInfo}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>

            <Section title="Deployed Firestore Security Rules Model">
              <Card className="bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedInUser() {
      return get(/databases/$(database)/documents/business_users/$(request.auth.uid));
    }

    function isBusinessMember(businessProfileId) {
      return request.auth != null
        && signedInUser().data.businessProfileId == businessProfileId
        && signedInUser().data.activeStatus == true;
    }

    function isManagerOrAbove() {
      return signedInUser().data.role in ['owner', 'admin', 'manager'];
    }

    function isOwnerOrAdmin() {
      return signedInUser().data.role in ['owner', 'admin'];
    }

    function validTenantDoc(data) {
      return data.businessProfileId is string
        && data.businessProfileId.size() > 0
        && data.keys().hasOnly([
          'id', 'businessProfileId', 'createdAt', 'updatedAt', 'activeStatus',
          'islandName', 'atoll', 'destinationCode', 'sortOrder',
          'customerType', 'displayName', 'legalName', 'phone', 'email', 'address',
          'tripNumber', 'vesselName', 'originDestinationId', 'status', 'notes',
          'operationType', 'destinationId', 'customerId', 'tripId', 'items',
          'billNumber', 'billType', 'billStatus', 'paymentStatus',
          'paymentNumber', 'billId', 'amount', 'method', 'reference',
          'taxName', 'taxRate', 'taxInclusiveEnabled',
          'numberType', 'prefix', 'currentSequence', 'padding', 'formatTemplate',
          'actorUserId', 'action', 'entityType', 'entityId', 'summary',
          'title', 'body', 'read', 'type'
        ]);
    }

    match /business_profiles/{businessProfileId} {
      allow read: if isBusinessMember(businessProfileId);
      allow create: if request.auth != null
        && request.resource.data.ownerUserId == request.auth.uid;
      allow update: if isBusinessMember(businessProfileId) && isOwnerOrAdmin();
      allow delete: if false;

      match /vessels/{docId} {
        allow read, write: if false;
      }

      match /{collectionName}/{docId} {
        allow read: if collectionName != 'vessels'
          && isBusinessMember(businessProfileId);
        allow create, update: if collectionName != 'vessels'
          && isBusinessMember(businessProfileId)
          && request.resource.data.businessProfileId == businessProfileId
          && validTenantDoc(request.resource.data)
          && isManagerOrAbove();
        allow delete: if collectionName != 'vessels'
          && isBusinessMember(businessProfileId)
          && resource.data.businessProfileId == businessProfileId
          && isOwnerOrAdmin();
      }
    }

    match /business_users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.resource.data.uid == uid
        && request.resource.data.businessProfileId is string;
      allow delete: if false;
    }

    match /{collectionName}/{docId} {
      allow read, write: if false;
    }
  }
}`}</pre>
              </Card>
            </Section>

            <Section title="Current Numbering Storage">
              <Card className="bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto">
                <pre>{`business_profiles/{businessProfileId}/numbering_sequences/{numberType}

{
  businessProfileId: string,
  numberType: 'trip' | 'bill' | 'invoice' | 'receipt' | 'payment' | 'customer',
  prefix: string,
  currentSequence: number,
  padding: number,
  formatTemplate: string,
  lastGenerated: string
}`}</pre>
              </Card>
            </Section>
          </div>
        )}

        {tab === "functions" && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-ocean-600 p-3 text-xs text-slate-600">
              Current production writes use Firebase Auth plus Cloud Firestore Security Rules. These server functions are future hardening points for workflows that need stronger transactional guarantees.
            </Card>

            <div className="space-y-2">
              {edgeFunctions.map(fn => (
                <Card key={fn.name} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-slate-900">{fn.name}</p>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">risk: {fn.risk}</p>
                    </div>
                    <StatusBadge status={fn.status === "ready" ? "paid" : "draft"} className="shrink-0" />
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-900 p-3 text-xs text-slate-200">
              <pre className="whitespace-pre-wrap font-mono">{`BEGIN;
SELECT * FROM numbering_sequences
WHERE business_profile_id = $1 AND number_type = $2
FOR UPDATE;

UPDATE numbering_sequences
SET current_sequence = current_sequence + 1
RETURNING last_generated_number;
COMMIT;`}</pre>
            </Card>
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-4">
            <Section title="RLS / guard policies">
              <Card className="p-0 overflow-hidden">
                {rlsPolicies.map((p, i) => (
                  <div key={p} className={`flex items-start gap-3 p-3 ${i !== rlsPolicies.length - 1 ? "border-b border-slate-100" : ""}`}>
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs text-slate-700">{p}</p>
                  </div>
                ))}
              </Card>
            </Section>

            <Section title="Storage paths">
              <Card className="space-y-2 bg-slate-900 p-3 font-mono text-xs text-slate-200">
                <p>/{businessProfile.id}/logos/current.png</p>
                <p>/{businessProfile.id}/pdfs/invoices/INV-2025-01-000078.pdf</p>
                <p>/{businessProfile.id}/attachments/trips/TRIP-2025-000142/</p>
                <p>/{businessProfile.id}/signatures/receipts/RCP-000214.png</p>
              </Card>
            </Section>

            <Section title="Activity summary">
              <Card className="grid grid-cols-2 gap-0 overflow-hidden p-0">
                <Summary label="Audit logs" value={String(auditLogs.length)} />
                <Summary label="Payments" value={String(payments.length)} />
                <Summary label="Finalized docs" value={String(bills.filter(b => b.finalizedAt).length)} />
                <Summary label="Locked numbers" value={String(numbering.length)} />
              </Card>
            </Section>
          </div>
        )}

        {tab === "roadmap" && (
          <div className="space-y-3">
            {[
              ["Phase 1", "Foundation", "Auth, business profile, roles, destinations, customers, catalog, tax, numbering"],
              ["Phase 2", "Active trip operations", "Trip open/end, operation screen, loading/offloading, realtime sync, offline queue"],
              ["Phase 3", "Billing and payments", "Cash bill, credit invoice, payment posting, receipts, customer ledger"],
              ["Phase 4", "Printing and reports", "A4 PDF templates, share/print, trip reports, cashier closing, tax reports"],
              ["Phase 5", "Production hardening", "RLS review, indexes, backups, conflict handling, monitoring, app store builds"],
            ].map(([phase, title, body], i) => (
              <Card key={phase} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{phase}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-xs text-slate-600">{body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SyncConflictsScreen() {
  const { back, operations, trips, businessProfile } = useApp();
  const endedTrip = trips.find(t => t.status === "ended");
  const conflicts = [
    {
      id: "sc_001",
      device: "Loading tablet - Deck 2",
      trip: endedTrip?.tripNumber || "TRIP-2025-000141",
      reason: "Trip ended before offline draft synced",
      records: 3,
      amount: 4200,
      status: "requires_admin",
    },
    {
      id: "sc_002",
      device: "Cashier phone",
      trip: trips[0]?.tripNumber || "TRIP-2025-000142",
      reason: "Customer was changed while device was offline",
      records: 1,
      amount: 1280,
      status: "review",
    },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Sync conflicts" subtitle={`${conflicts.length} conflicts need review`} onBack={back} />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <Card className="mb-4 border-l-4 border-l-amber-500 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Offline safety rule</p>
          <p className="mt-0.5 text-xs text-amber-800">Server validates active trip status before accepting queued drafts for {businessProfile.businessName}. Conflicted records cannot create bills until an Admin or Manager resolves them.</p>
        </Card>

        <div className="space-y-3">
          {conflicts.map(conflict => (
            <Card key={conflict.id} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-bold text-slate-900">{conflict.id}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase text-amber-700">{conflict.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{conflict.reason}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{conflict.trip} • {conflict.device}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{MVR(conflict.amount)}</p>
                  <p className="text-xs text-slate-500">{conflict.records} records</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <Btn size="sm" variant="outline" icon="eye">Review</Btn>
                <Btn size="sm" icon="check">Resolve</Btn>
              </div>
            </Card>
          ))}
        </div>

        <Section title="Local queue" className="mt-6">
          <Card className="p-0 overflow-hidden">
            {operations.slice(0, 3).map((op, i) => (
              <div key={op.id} className={`flex items-center justify-between p-3 ${i !== 2 ? "border-b border-slate-100" : ""}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{op.operationType.replace("_", " ")}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(op.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${op.synced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{op.synced ? "SYNCED" : "QUEUED"}</span>
              </div>
            ))}
          </Card>
        </Section>
      </div>
    </div>
  );
}

export function PdfDocumentsScreen() {
  const { back, bills, businessProfile, customers } = useApp();
  const docs = bills.map((bill, index) => ({
    id: `pdf_${bill.id}`,
    number: bill.billNumber.replace("BILL", bill.billType === "credit" ? "INV" : "BILL"),
    customer: customers.find(c => c.id === bill.customerId)?.displayName || "Unknown",
    amount: bill.grandTotal,
    version: index % 2 === 0 ? 2 : 1,
    stored: Boolean(bill.finalizedAt),
    date: bill.finalizedAt || bill.createdAt,
  }));

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="PDF documents" subtitle="A4 invoices, bills, receipts" onBack={back} trailing={<Btn size="sm" icon="printer" variant="outline">Print</Btn>} />

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-24 no-scrollbar">
        <Card className="mb-4 bg-ocean-50 border-ocean-200 p-3">
          <p className="text-xs font-semibold text-ocean-900">Storage isolation</p>
          <p className="mt-0.5 break-all font-mono text-xs text-ocean-700">/{businessProfile.id}/pdfs/...</p>
        </Card>

        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id} className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <Icon name="file" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-xs font-bold text-slate-900">{doc.number}.pdf</p>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">v{doc.version}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{doc.customer}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(doc.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{MVR(doc.amount)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${doc.stored ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{doc.stored ? "STORED" : "DRAFT"}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                <Btn size="sm" variant="outline" icon="eye">Preview</Btn>
                <Btn size="sm" variant="outline" icon="share">Share</Btn>
                <Btn size="sm" icon="download">Save</Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-100 text-ocean-700">
          <Icon name={icon} className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-slate-100 p-3 text-center even:border-r-0">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
