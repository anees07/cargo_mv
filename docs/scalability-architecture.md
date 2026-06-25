# Scalability architecture

This app must treat transaction history as unbounded. A tenant can eventually have millions of trips, operations, bills, payments, audit logs, and notifications, so neither the backend nor the UI should assume a full collection can be loaded, sorted, searched, or rendered on a client.

## Backend access rules

- Keep tenant data under `business_profiles/{businessProfileId}/{collectionName}/{docId}`.
- Load high-volume collections through indexed, bounded windows only.
- Use the `numbering_sequences` document as the source of truth for sequence counters. Do not scan all bills, trips, or payments to find the maximum number.
- Keep transaction list queries ordered by immutable time fields:
  - `trips.createdAt`
  - `operations.createdAt`
  - `bills.createdAt`
  - `payments.collectedAt`
  - `audit_logs.createdAt`
  - `notifications.createdAt`
- Add composite indexes before introducing server-side filters by status, customer, destination, method, trip, or entity.
- Store summary documents for dashboard totals, tax periods, destination/customer outstanding balances, and daily cashier closing. Do not compute long-range reporting by loading raw transaction rows into the web or Android app.

## Frontend rendering rules

- Lists must render in pages or windows. Initial screen paint should stay around 50 visible records.
- Search and filters can narrow the current client window, but production search over all history must be server-indexed or delegated to a search service.
- Android WebView must not render thousands of cards or receipt rows at once.
- Keep master-data pickers scoped by destination, status, search text, or a recent/outstanding window before rendering options.
- Preserve existing offline-friendly local state for active trip, operation, billing, and payment workflows. Scaling changes should reduce background history, not remove the active workflow data needed by operators.

## Current implementation

- `src/store.tsx` caps high-volume Firestore load/subscription windows.
- `src/components/ui.tsx` exposes `ListPageControls` for mobile-safe incremental rendering.
- Billing, payments, trips, customers, destinations, and audit logs use bounded rendering.
- `firestore.indexes.json` defines the composite indexes expected for common production filters.

## Next production step

For a true 100M+ transaction deployment, move dashboard/report totals into Cloud Functions or another backend worker that maintains aggregate documents on every write. The app should read those aggregate documents for totals and only fetch raw rows for the current page, active trip, selected bill, or selected customer.
