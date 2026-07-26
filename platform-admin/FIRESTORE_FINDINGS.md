# Firestore Platform Admin Findings

## Current source

- Firebase project: `cargomv-d41f8`
- Firestore source: `business_profiles/{businessProfileId}`
- Root tenant users: `business_users/{uid}` with `businessProfileId`
- Tenant operational data: nested collections below each business profile
- Existing client realtime pattern: Firebase Web SDK `onSnapshot`

## Access boundary

Existing Firestore rules only authorize a matching tenant member. The supplied
tenant `TFfMS85DpXWk7M1PzzOWRAQgCfC3` is therefore not readable by the current
demo tenant account. Platform access must use a server-issued Firebase Auth
custom claim (`platformAdmin == true`) and trusted callable Functions for every
platform mutation.

## Platform collections

- `platform_admins/{uid}`
- `platform_plans/{planId}`
- `platform_modules/{moduleId}`
- `platform_subscriptions/{subscriptionId}`
- `platform_audit_logs/{eventId}`
- `platform_settings/config`

Platform collections are read-only from the web app. Callable Functions use the
Admin SDK for writes and append an audit event for each mutation.

## Current data verification

On 2026-07-26, an authorized read-only Firebase identity listed three root
`business_profiles` documents in `cargomv-d41f8`; the requested
`TFfMS85DpXWk7M1PzzOWRAQgCfC3` document returned `404 NOT_FOUND`. A read-only
check across all Firebase projects accessible to that identity found no copy of
that document. The platform-admin UI will display the tenant automatically when
the document is present in the configured project; it does not synthesize
missing tenant records.

The six root `business_users` records also reference only the three existing
business profiles; none references the requested tenant ID.

The first platform administrator must be bootstrapped with the deployed
`platformAdminBootstrap` callable. Its runtime allowlist is configured through
`PLATFORM_ADMIN_BOOTSTRAP_EMAIL` or `PLATFORM_ADMIN_BOOTSTRAP_UIDS`; no user can
self-grant the claim without that server-side allowlist.
