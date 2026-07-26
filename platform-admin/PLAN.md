# Standalone Platform Admin App

This directory contains an independent web-only platform administration console for AtollCargo.

## Scope

- Tenant approval, blocking, suspension, and reactivation
- Tenant details, subscription plan assignment, and module entitlements
- Subscription plans and tenant lifecycle status
- Platform admin invitations and status controls
- Audit log and platform settings
- Responsive desktop and mobile layouts

## Architecture

- React, TypeScript, Vite, and Tailwind CSS
- `src/adapters/contracts.ts` defines the backend boundary
- Fixture adapter is available by setting `VITE_PLATFORM_ADMIN_DATA_MODE=fixtures`
- Live adapter uses Firebase Auth with a `platformAdmin` claim, realtime Firestore listeners, and authenticated callable Functions
- No direct client-side privileged Firestore writes

Set `VITE_PLATFORM_ADMIN_DATA_MODE=live` plus the Firebase configuration to connect the live adapter. The live adapter listens to `business_profiles`, root `business_users`, tenant `summary_reports`, and platform collections in the same Firestore database.

Configure `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` or `PLATFORM_ADMIN_BOOTSTRAP_UIDS` on the Functions runtime before issuing the first platform-admin claim through `platformAdminBootstrap`.

For the same Firebase Hosting site, build the existing web app first, then run `npm run build:hosting` in this directory. The output is placed at `dist/platform-admin` and is served at `/platform-admin/` by the root Hosting rewrites.

The existing application source remains separate from this app. Live mode requires the platform-admin callable Functions, Firestore claim rules, and Hosting rewrites that are maintained outside this directory; fixture mode remains available without those backend prerequisites.
