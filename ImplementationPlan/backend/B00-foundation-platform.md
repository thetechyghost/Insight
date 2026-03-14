# B0 — Foundation Platform

**Priority:** Critical
**Depends On:** —
**Key Spec Files:** 01-platform-architecture, 22-multi-tenancy-data, 24-compliance-legal-security, 25-non-functional-requirements

---

## Overview

The bedrock everything else builds on. Gets auth, multi-tenancy, core schemas, and the data pipeline wired up end-to-end.

---

## Convex (Operational Data)

### Schemas

- **`users`** — profile, avatar, bio, height, weight, age, gender, training start date, emergency contact, medical info, notification prefs (FR-UA-001 through FR-UA-009)
- **`tenants`** — gym config, branding (logo, colors, typography), custom terminology dictionary, feature toggles, custom domain mapping (FR-PA-001, FR-PA-005, FR-PA-006, FR-PA-012–016)
- **`memberships`** — user-to-tenant join table, role (athlete/coach/owner/admin), status, primary gym flag (FR-PA-002, FR-PA-003, FR-UA-004)
- **`roles_permissions`** — RBAC enforcement, tier-based access control (FR-PA-007–011, FR-MT-006)

### Server Functions

- Auth integration (Apple ID, Google, email/password) (FR-UA-009)
- Tenant provisioning mutation
- Membership CRUD (join, leave, transfer, set primary) (FR-MT-012)
- Privacy settings per tenant per user (FR-MT-011)
- Feature toggle queries

### Key Multi-Tenancy Rules

- Every query scoped by `tenantId` — enforced at the function level, not just the client (FR-MT-001, FR-MT-006)
- Cross-tenant user identity maintained — single auth, multiple memberships (FR-MT-007, FR-MT-008)
- Tenant data exports and deletion requests logged for audit trail (FR-MT-016–022)

---

## TimescaleDB (Performance Data)

### Initial Schema Setup

- Core hypertable: **`workout_metrics`** (partitioned by time) — populated in B2 but schema ships now
- Core hypertable: **`biometric_readings`** (HR, HRV, VO2max, sleep) — populated in B4/B5
- Core hypertable: **`equipment_telemetry`** (Concept2, bikes, treadmills) — populated in B4
- Continuous aggregate scaffolding (daily/weekly/monthly rollups)
- Compression and retention policies
- Tenant isolation via `tenant_id` column on every table + row-level security

---

## Azure Functions (C# API)

### Project Setup

- Solution structure, project scaffolding
- Auth middleware (validate Convex JWT or platform token)
- Tenant-scoping middleware (extract `tenant_id`, enforce on all queries)
- Health check endpoint
- Shared domain models (workout types, metric types, equipment types)
- TimescaleDB connection management (connection pooling, retry logic)

---

## Azure Event Hub + IoT Hub

### Pipeline Wiring

- Event Hub namespace + topics: `workout-events`, `equipment-telemetry`, `biometric-data`
- Partition strategy (by `tenant_id` for isolation)
- IoT Hub device registry structure (ready for FitTrack devices in B4)
- Azure Function trigger: Event Hub → TimescaleDB writer (skeleton — real processing logic in B2/B4)
- Dead letter queue for failed events

---

## Cross-Cutting Concerns

- Environment configuration (dev/staging/prod)
- API versioning strategy
- Error handling patterns
- Logging and observability setup
- Data export endpoint skeleton (FR-MT-016)

---

## Requirements Covered

FR-PA-001–016, FR-MT-001–014, FR-MT-015–022, FR-UA-001–009, FR-CS-001–005 (core security), NFR-008
