# Super Admin Page — Design Spec

## Context

The Insight platform needs a super admin interface for platform-level management. The backend has 150+ Convex modules with a mature multi-tenant architecture, but no frontend exists yet. The `super_admin` role is defined in the type system (`convex/lib/tenancy.ts`) but lacks enforcement — platform functions like `platformConfig.set()`, `securityEvents.list()`, and `dataRequests.listAll()` have no role checks. This spec covers the first iteration: app shell, dashboard, and tenant management.

## Scope

**In scope (this iteration):**
- Standalone super admin frontend app (`apps/super-admin/`)
- Authentication flow (email/password, no signup)
- Platform dashboard with operational stats + growth charts
- Tenant management: list, detail, basic creation, suspend/reactivate

**Out of scope (future iterations):**
- Content management (exercise library, benchmarks, templates)
- Compliance & data privacy (GDPR/CCPA, consent, legal docs)
- Integration & API management (webhooks, API keys, OAuth)
- Full 6-step tenant provisioning wizard
- System health monitoring (deep metrics, alerting)
- Migrating existing platform modules (`platformConfig`, `securityEvents`, `legalDocuments`, `dataRequests`) to use `platformQuery`/`platformMutation` — tracked as a separate security hardening task

## Architecture

### App Structure

Standalone Vite + React 19 app at `apps/super-admin/`:
- **UI framework:** shadcn/ui with Base UI foundation (`--base base --preset a2fC`), translucent menus
- **Layout:** sidebar-07 block — collapsible sidebar that collapses to icons
- **Routing:** TanStack Router (file-based)
- **Server state:** Convex React hooks for real-time data, TanStack Query for analytics/external APIs
- **Tables:** TanStack Table for tenant list
- **Forms:** TanStack Form for tenant creation
- **Charts:** Recharts for growth trend visualizations

### Authentication & Authorization

**No signup.** Super admin accounts are pre-created in the database.

#### `platform_admins` table (new)

```
platform_admins {
  userId: v.id("users"),              // reference to users table
  platformRole: v.union(
    v.literal("super_admin"),
    v.literal("platform_support"),
    v.literal("platform_ops")
  ),
  status: v.union(v.literal("active"), v.literal("suspended")),
  lastLoginAt: v.optional(v.number()),
  // _creationTime provided automatically by Convex
}
// Indexes: by_userId
```

#### `platform_tenant_notes` table (new)

```
platform_tenant_notes {
  tenantId: v.id("tenants"),
  authorId: v.id("users"),            // the platform admin who wrote the note
  content: v.string(),
  updatedAt: v.optional(v.number()),
  // _creationTime provided automatically by Convex
}
// Indexes: by_tenantId
```

#### Auth Flow

1. Super admin navigates to app → login form (email + password)
2. Convex Auth authenticates → returns identity
3. Server-side: `getUserFromAuth()` resolves user → checks `platform_admins` table for userId
4. If not in `platform_admins` or status !== "active" → reject with generic "Unauthorized" (no information leakage)
5. If found → inject `ctx.platformAdmin` and `ctx.platformRole` into handler context

#### Backend Wrappers (new)

```typescript
// convex/lib/platformFunctions.ts

export const platformQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const platformAdmin = await ctx.db
      .query("platform_admins")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!platformAdmin || platformAdmin.status !== "active") {
      throw new ConvexError("Unauthorized");
    }
    return {
      ctx: { user, userId, platformAdmin, platformRole: platformAdmin.platformRole },
      args: {},
    };
  },
});

export const platformMutation = customMutation(mutation, {
  // Same pattern as platformQuery
});
```

#### Security Requirements

- Every platform endpoint must use `platformQuery`/`platformMutation` — never raw `query`/`mutation`
- Login page shows no indication that it's a super admin app (generic branding)
- Failed auth returns generic error — no hint about `platform_admins` table
- All mutations log to `platform_audit_log` via `ctx.scheduler.runAfter`
- Session timeout: enforce via Convex Auth token expiry

### Frontend Auth Guard

```typescript
// Route-level guard in TanStack Router
const platformAdminRoute = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const admin = await context.convex.query(api.platformAdmins.getMe);
    if (!admin) throw redirect({ to: "/login" });
    return { platformAdmin: admin };
  },
});
```

## Navigation Structure

Grouped sidebar using sidebar-07 (collapses to icons):

```
Overview
  ├── Dashboard          /dashboard

Operations
  ├── Tenants            /tenants
  └── Billing            /billing (placeholder — future)

System
  ├── Settings           /settings (placeholder — future)
  └── Audit Log          /audit-log (placeholder — future)
```

- Sidebar header: Insight logo + "Platform Admin" label
- Sidebar footer: admin email + avatar + dropdown (logout, account)
- No team-switcher (single platform context)
- Placeholder items render as disabled links with "Coming soon" tooltip

## Dashboard (`/dashboard`)

### Layout

1. **Page header:** "Platform Dashboard" + subtitle + date range selector (Last 7d / 30d / 90d)
2. **Stat cards row (4 cards):**
   - Total Tenants (count + new this month)
   - Total Users (count + new this month)
   - Total Workouts (count this month — from workout_logs table aggregate)
   - Active Today (users with a `security_events` login event in the last 24h)
3. **Charts row (2/3 + 1/3 split):**
   - Tenant & User Growth — line/area chart (Recharts) showing new tenants and new users over time (derived from `_creationTime` timestamps in Convex)
   - System Status — service health indicators for Convex, Azure Functions, TimescaleDB, Event Hub (hardcoded/mocked for first iteration — real health checks are future scope)
4. **Tenant Health table:**
   - Flagged tenants with issues: payment failures, low activity, pending support tickets
   - Columns: tenant name, issue type, since date, action link

### Data Sources

| Widget | Source | Hook |
|--------|--------|------|
| Stat cards | `convex/platformMetrics.getOverview` — aggregates from tenants, users, memberships, workout_logs, security_events tables | `useQuery` (real-time) |
| Growth charts | `convex/platformMetrics.getGrowthTrends` — counts by _creationTime bucketed by month | `useQuery` (real-time) |
| System status | Hardcoded "Operational" for first iteration — future: health check endpoints via TanStack Query | Static |
| Tenant health | `convex/platformMetrics.getTenantHealthFlags` — tenants with `tenant_provisioning.status === "suspended"` or low membership activity | `useQuery` (real-time) |

### Backend Functions (new)

```
convex/platformMetrics.ts:
  - getOverview: platformQuery → aggregate counts from tenants, users, memberships, workout_logs, security_events tables
  - getGrowthTrends: platformQuery → new tenants and users per month (last 12 months) by bucketing _creationTime fields
  - getTenantHealthFlags: platformQuery → query tenants joined with tenant_provisioning for status, and memberships for low activity detection
```

## Tenant Management

### Tenant List (`/tenants`)

**TanStack Table** with:
- **Columns:** Name (+ slug + logo), Status (badge — from `tenant_provisioning.status`), Members (count), Created date, Actions
- **Search:** debounced text search on name/slug (TanStack Pacer, 300ms)
- **Filters:** Status dropdown (Active, Suspended, Pending, All)
- **Sorting:** clickable column headers (default: name ascending)
- **Pagination:** server-side, 20 per page
- **Row click:** navigates to tenant detail

**Backend:**
```
convex/platformTenants.ts:
  - list: platformQuery → paginated tenant list with member counts (joined via memberships table)
  - getById: platformQuery → single tenant with full details + tenant_provisioning status
  - create: platformMutation → create tenant + tenant_provisioning record (status: "active") + create owner membership + seed defaults via scheduler
  - suspend: platformMutation → update tenant_provisioning.status to "suspended", log to platform_audit_log with reason
  - reactivate: platformMutation → update tenant_provisioning.status to "active", log to platform_audit_log
```

**Tenant status:** Lifecycle status lives on the existing `tenant_provisioning` table (status: pending | approved | active | suspended), not on the `tenants` table directly. All status reads and writes go through `tenant_provisioning`. The `tenants` table stores configuration; `tenant_provisioning` stores lifecycle.

### Tenant Detail (`/tenants/$tenantId`)

**Header:** Logo + name + slug + status badge + "Active since" date + action buttons (Suspend, Edit)

**Tabbed content:**

| Tab | Content | Implementation |
|-----|---------|----------------|
| Overview | Stat cards (members breakdown by status, owner info), recent activity timeline | `useQuery` |
| Configuration | Branding, feature toggles, business hours, timezone | Read-only view for now |
| Members | Member list (top 10 + link to full list) | `useQuery` with limit |
| Usage | Login frequency, feature utilization, storage | TanStack Query (analytics API) |
| Notes | Internal notes by platform admins (uses `platform_tenant_notes` table) | `useQuery` + `useMutation` |

**Suspend/Reactivate flow:**
1. Click "Suspend" → confirmation dialog with reason field (required)
2. Mutation: updates `tenant_provisioning.status` to "suspended", logs to `platform_audit_log` with reason
3. All tenant members see "Gym temporarily suspended" on next app load (tenant-scoped queries check provisioning status)
4. "Reactivate" reverses — sets status back to "active", same confirmation flow with reason

### New Tenant (`/tenants/new`)

**Sheet/dialog form** (not a separate page) with TanStack Form:

| Field | Type | Validation |
|-------|------|-----------|
| Gym Name | text input | required, 2-100 chars |
| Slug | text input (auto-generated from name) | required, unique, lowercase-alphanumeric-hyphens |
| Owner Email | email input | required, valid email |
| Timezone | select dropdown | required, IANA timezone |

Note: Billing plan field is deferred — no platform-level billing plan table exists yet. Will be added when the billing/Stripe Connect integration is built.

**On submit:**
1. `platformTenants.create` mutation:
   - Creates tenant record
   - Creates or finds user by email
   - Creates membership (role: "owner", status: "active")
   - Seeds default data (exercises, templates) via `ctx.scheduler.runAfter`
   - Logs creation to `platform_audit_log`
2. On success: close sheet, navigate to new tenant detail page

## File Structure

```
apps/super-admin/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── components.json                   # shadcn Base UI config
├── src/
│   ├── main.tsx                      # App entry point
│   ├── App.tsx                       # Providers (Convex, TanStack Router/Query)
│   ├── routeTree.gen.ts              # TanStack Router generated tree
│   ├── routes/
│   │   ├── __root.tsx                # Root layout
│   │   ├── login.tsx                 # Login page (unauthenticated)
│   │   ├── _authenticated.tsx        # Auth guard layout
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx         # Platform dashboard
│   │   │   ├── tenants/
│   │   │   │   ├── index.tsx         # Tenant list
│   │   │   │   └── $tenantId.tsx     # Tenant detail
│   ├── components/
│   │   ├── app-sidebar.tsx           # sidebar-07 adapted for super admin
│   │   ├── nav-main.tsx              # Grouped navigation
│   │   ├── nav-user.tsx              # User footer with dropdown
│   │   ├── stat-card.tsx             # Reusable stat card
│   │   ├── tenant-create-sheet.tsx   # New tenant sheet form
│   │   ├── tenant-table/
│   │   │   ├── columns.tsx           # TanStack Table column defs
│   │   │   └── data-table.tsx        # Table component
│   │   └── ui/                       # shadcn generated components
│   ├── lib/
│   │   ├── convex.ts                 # Convex client setup
│   │   └── utils.ts                  # cn() and helpers
│   └── hooks/
│       └── use-platform-admin.ts     # Auth context hook
```

## Backend Changes Summary

### New files:
- `convex/lib/platformFunctions.ts` — `platformQuery`, `platformMutation`, `platformAction` wrappers
- `convex/platformAdmins.ts` — `getMe` query, `updateLastLogin` internal mutation
- `convex/platformMetrics.ts` — `getOverview`, `getGrowthTrends`, `getTenantHealthFlags`
- `convex/platformTenants.ts` — `list`, `getById`, `create`, `suspend`, `reactivate`
- `convex/platformTenantNotes.ts` — `listByTenant`, `create`, `update`, `remove`

### Schema changes (`convex/schema.ts`):
- Add `platform_admins` table with `by_userId` index
- Add `platform_tenant_notes` table with `by_tenantId` index
- Add `by_tenantId` index to existing `tenant_provisioning` table (currently only has `by_status`)

### Existing files to update:
- `convex/lib/validators.ts` — add platform role validator

### Explicit non-changes (future scope):
- Existing `platformConfig.ts`, `securityEvents.ts`, `legalDocuments.ts`, `dataRequests.ts` are NOT migrated to `platformQuery`/`platformMutation` in this iteration — tracked as separate security hardening work

## Security Checklist

- [ ] Every platform endpoint uses `platformQuery`/`platformMutation` wrapper
- [ ] Login page reveals nothing about super admin nature (generic UI)
- [ ] Failed auth returns identical error regardless of reason
- [ ] All state-changing operations log to `platform_audit_log`
- [ ] Tenant suspension includes required reason field
- [ ] Slug uniqueness enforced server-side (explicit check-then-insert in mutation — Convex indexes don't enforce uniqueness)
- [ ] Owner email validated server-side
- [ ] No client-side role checks for access control (server-enforced only)
- [ ] CORS configured to only allow super admin domain

## Verification Plan

1. **Backend tests** (vitest):
   - `platformAdmins.test.ts`: auth enforcement, non-admin rejection, suspended admin rejection
   - `platformTenants.test.ts`: CRUD, auth enforcement, slug uniqueness, audit log entries
   - `platformMetrics.test.ts`: aggregation accuracy, auth enforcement

2. **Frontend manual testing:**
   - Login with non-admin account → rejected
   - Login with suspended admin → rejected
   - Login with active admin → dashboard loads
   - Dashboard stat cards show correct data
   - Tenant list: search, filter, sort, paginate
   - Tenant detail: all tabs render, suspend/reactivate works
   - New tenant: form validation, slug auto-generation, successful creation

3. **E2E (Playwright — future):**
   - Full auth flow
   - Tenant CRUD lifecycle
