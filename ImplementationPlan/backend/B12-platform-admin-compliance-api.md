# B12 — Platform Admin, Compliance & Public API

**Priority:** Lower
**Depends On:** All previous backend phases
**Key Spec Files:** 05-platform-administration, 16-access-control-facility, 23-integrations-api, 24-compliance-legal-security

---

## Overview

The final backend phase. Super admin tools, third-party integrations, compliance infrastructure, facility management, and the public API for external developers.

---

## Convex Schemas

### New — Platform Administration

- **`platform_config`** — global platform settings: default feature toggles, global announcement, maintenance mode flag, platform-wide terms version (FR-AD-001–003)
- **`tenant_provisioning`** — tenant onboarding records: requested by, status (pending/approved/active/suspended), provisioning checklist state, Stripe Connect onboarding status (FR-AD-004–007)
- **`platform_audit_log`** — super admin actions: who, what, when, target entity, before/after values (FR-AD-008)
- **`platform_content`** — platform-managed content: default exercise library, benchmark workout library, default templates, managed separately from tenant content (FR-AD-012–015)
- **`platform_metrics`** — aggregated platform health: total tenants, total users, total workouts logged, MRR across platform (FR-AD-009–011)
- **`feature_flags`** — platform-level feature flags: name, status (enabled/disabled/percentage_rollout), target tenants or user segments (FR-AD-016)

### New — Compliance & Legal

- **`consent_records`** — per-user consent tracking: type (terms/privacy/marketing/data_sharing), version accepted, timestamp, IP address (FR-CS-001–005)
- **`data_requests`** — GDPR/CCPA requests: user, type (access/export/deletion/rectification), status (received/processing/completed), submitted date, completed date, audit trail (FR-CS-006–012)
- **`legal_documents`** — platform and tenant legal docs: type (terms_of_service/privacy_policy/waiver), version, content, effective date, tenant (null for platform-level) (FR-CS-013–016)
- **`security_events`** — login attempts, password changes, suspicious activity, IP addresses, device fingerprints (FR-CS-030–035)
- **`age_verification`** — parental consent records for minors: user, parent/guardian contact, consent status, verification method (FR-CS-036–040)

### New — Access Control & Facility

- **`check_in_systems`** — per-tenant check-in config: method (QR/NFC/PIN/barcode), device registration, location (FR-AF-001–005)
- **`facility_areas`** — rooms, zones, courts within a gym: name, capacity, equipment list, booking rules (FR-AF-010–014)
- **`facility_access_rules`** — per-membership-plan access rights: which areas, which hours, blackout dates (FR-AF-006–009)
- **`facility_hours`** — operating hours per tenant per day, holiday overrides (FR-AF-015–017)
- **`access_log`** — entry/exit records: user, facility area, timestamp, method, granted/denied (FR-AF-018–020)

### New — Integrations

- **`api_keys`** — per-tenant API keys for public API access: key hash, name, scopes, rate limit tier, created date, last used, active flag (FR-IA-040–045)
- **`webhooks_outbound`** — tenant-configured outbound webhooks: URL, events subscribed, secret, status, failure count (FR-IA-046–048)
- **`integration_connections`** — third-party business integrations: tenant, provider, status, credentials (encrypted), sync config (FR-IA-001–010)

---

## Azure Functions — Platform API

### Public REST API

- API key authentication + rate limiting middleware (FR-IA-040–042)
- Scoped access — API keys grant access only to the issuing tenant's data (FR-IA-043)
- **Endpoints exposed:**
  - `/api/v1/members` — CRUD, search, filter (FR-IA-044)
  - `/api/v1/workouts` — log, query, update (FR-IA-044)
  - `/api/v1/classes` — schedule, bookings, attendance (FR-IA-044)
  - `/api/v1/billing` — subscriptions, invoices, payments (FR-IA-044)
  - `/api/v1/leads` — pipeline management (FR-IA-044)
  - `/api/v1/equipment` — status, sessions, telemetry (FR-IA-044)
- Pagination, filtering, field selection on all list endpoints
- Webhook delivery — on key events, POST to registered URLs with signed payload (FR-IA-046–048)
- Rate limiting: configurable per tier (free: 100/min, standard: 1000/min, premium: 10000/min) (FR-IA-042)
- API versioning via URL path (`/v1/`) (FR-IA-045)
- OpenAPI/Swagger documentation auto-generated (FR-IA-049)

### Business Integrations

- **QuickBooks** sync — push invoices and payments, pull chart of accounts (FR-IA-001–003)
- **Xero** sync — same as QuickBooks (FR-IA-004–005)
- **Zapier** — webhook triggers for key events, enabling no-code automation (FR-IA-010)
- **Slack** — post notifications to configured channels (class published, new member, PR achieved) (FR-IA-011)
- **Mailchimp** — sync member lists and segments for external email marketing (FR-IA-012–013)
- **Shopify** — sync product catalog and orders for gyms with existing Shopify stores (FR-IA-014–015)
- **Facebook/Instagram** — lead ad integration, post workout summaries (FR-IA-016–018)
- **Google/Apple Calendar** — already built in B9, but API-accessible here (FR-IA-020)

---

## Convex Server Functions

### Super Admin

- Tenant provisioning workflow — create tenant, set up Stripe Connect, seed default data (exercises, templates, legal docs), activate (FR-AD-004–007)
- Tenant suspension/reactivation (FR-AD-006)
- Platform monitoring dashboard queries — aggregate metrics across all tenants (FR-AD-009–011)
- Global content management — manage platform exercise library, benchmark workouts, default templates that all tenants inherit (FR-AD-012–015)
- Feature flag management — toggle features platform-wide or per-tenant (FR-AD-016)
- Platform announcement broadcast — push to all tenants (FR-AD-017)
- Audit log queries with filtering (FR-AD-008)
- Tenant health checks — flag tenants with payment issues, low activity, support tickets (FR-AD-018–019)

### Compliance & Data Privacy

- Consent collection — on registration and on terms update, record acceptance with version (FR-CS-001–003)
- Terms update detection — when legal doc version changes, prompt re-acceptance on next login (FR-CS-004)
- GDPR data access request — Convex action assembles full user data export (Convex data + TimescaleDB query via Azure Function), packages as JSON/CSV, delivers via email (FR-CS-006–008)
- GDPR deletion request — cascading delete across Convex + TimescaleDB, anonymize aggregates, log completion (FR-CS-009–011, FR-MT-019)
- CCPA opt-out handling — disable data sharing, exclude from analytics (FR-CS-012)
- Data retention enforcement — scheduled function purges data beyond tenant-configured retention period (FR-MT-018)
- Consent withdrawal — remove specific consent, adjust data processing accordingly (FR-CS-005)
- Minor/parental controls — age gate on registration, parental consent workflow, restricted content access (FR-CS-036–040)

### Security

- Login attempt tracking — rate limit after X failures, account lockout after Y (FR-CS-030–031)
- Suspicious activity detection — login from new device/location triggers notification (FR-CS-032)
- Session management — concurrent session limits, forced logout (FR-CS-033)
- Password policy enforcement — minimum complexity, rotation reminders (FR-CS-034)
- Security event log queries for admin review (FR-CS-035)
- Two-factor authentication support (FR-CS-041)
- IP allowlisting for admin access (FR-CS-042)

### Facility Management

- Check-in system configuration per tenant (FR-AF-001–003)
- Check-in processing — validate membership, check access rules, log entry (FR-AF-004–005)
- Access rule enforcement — membership plan determines facility area access by time of day (FR-AF-006–009)
- Facility area CRUD (FR-AF-010–012)
- Facility hours management with holiday overrides (FR-AF-015–017)
- Access log queries and reporting (FR-AF-018–020)
- Capacity monitoring — real-time occupancy per area (FR-AF-021–022)

### Integration Management

- API key generation, rotation, revocation (FR-IA-040–041)
- Outbound webhook management — CRUD, test ping, failure monitoring with auto-disable after consecutive failures (FR-IA-046–048)
- Integration connection management — OAuth flows for business integrations, sync status monitoring (FR-IA-001–010)
- Scheduled sync functions for pull-based integrations (QuickBooks, Mailchimp) (FR-IA-003)

---

## Key Design Decisions

- **Public API mirrors internal structure.** The API endpoints map cleanly to the internal Convex/Azure Functions data layer. No separate API data model — the public API is a thin authenticated, rate-limited, scoped proxy.
- **Compliance is event-sourced.** Every consent, data request, and deletion is an immutable record. Deletions don't remove the audit trail — they remove the personal data and log that it happened. This satisfies GDPR's accountability principle.
- **Facility access is simple.** Check-in validates membership + access rules + facility hours. No physical access control hardware integration (door locks, turnstiles) in this phase — that's a future hardware partnership opportunity similar to FitTrack.
- **Integration sync is idempotent.** All third-party syncs use idempotency keys and last-sync timestamps. Re-running a sync produces the same result. Failed syncs retry automatically with exponential backoff.

---

## Requirements Covered

FR-AD-001–019, FR-CS-001–043, FR-AF-001–022, FR-IA-001–050, FR-MT-018 (retention policies)

## What's Deferred

- Physical access control hardware (future)
- SOC 2 certification process (operational, not code)
- HIPAA BAA agreements (legal, not code)
- PCI DSS — handled by Stripe, no card data touches our systems
