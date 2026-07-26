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
- Fixture adapter is the default mode for UI review
- Live adapter uses Firebase Auth with a `platformAdmin` claim and authenticated platform API requests
- No direct client-side privileged Firestore writes

Set `VITE_PLATFORM_ADMIN_DATA_MODE=live` plus Firebase configuration and `VITE_PLATFORM_ADMIN_API_URL` to connect the live adapter.

The existing application, Firebase Functions, Firestore rules, and deployment configuration are outside this directory and remain untouched.
