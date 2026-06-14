# Firestore Security Audit

Date: 2026-06-14
Project: `cargomv-d41f8`
Database: `(default)`, Standard edition, Native mode

## Current Data Model

- Root `business_profiles/{businessProfileId}` stores the tenant profile and the single vessel for that business.
- Root `business_users/{uid}` stores the authenticated user's bootstrap membership.
- Operational data is stored under `business_profiles/{businessProfileId}/{collectionName}/{docId}`.
- The `business_profiles/{businessProfileId}/vessels/{docId}` subcollection is explicitly denied. A business has one vessel through fields on the business profile document.

## Live Verification

The live smoke test in `scripts/live-firestore-smoke.mjs` passed against Firebase Auth and Firestore rules:

- Created, updated, and deleted app-shaped documents in `destinations`, `customers`, `catalog_items`, `item_price_rates`, `trips`, `operations`, `bills`, and `payments`.
- Verified realtime delivery through `onSnapshot` on tenant notifications.
- Verified root tenant collection reads are denied.
- Verified writes to an extra `vessels` subcollection are denied.
- Verified writes with a mismatched `businessProfileId` are denied.

## Attack Test

Tested owner bootstrap privilege escalation with a temporary Firebase Auth user:

- Attempted to create `business_users/{temporaryUid}` with role `owner` and `businessProfileId = bp_demo_atollcargo`.
- Result: denied by Firestore rules.
- Created a temporary profile owned by the same temporary UID.
- Created the matching root and nested owner user records for that temporary profile.
- Result: allowed.
- Temporary Auth user and Firestore documents were deleted after the test.

## Rule Fix Applied

Root `business_users/{uid}` owner creation now requires:

- `request.auth.uid == uid`
- `request.resource.data.role == 'owner'`
- `ownsBusinessProfile(request.resource.data.businessProfileId)`

This prevents a newly authenticated user from assigning themselves to another business profile.
