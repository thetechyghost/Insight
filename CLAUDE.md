# Insight Platform — Development Rules

## Development Workflow (Mandatory Order)

Every feature, bugfix, or change MUST follow this four-phase sequence. Do NOT skip phases or reorder them.

### Phase 1: Backend
- Implement Convex server functions (queries, mutations, actions) first
- Follow existing patterns in `convex/lib/customFunctions.ts` — use `tenantQuery`, `tenantMutation`, `authedQuery`, `authedMutation`
- Every public function must enforce authentication and tenant isolation
- Every mutation that requires elevated access must call `enforceRole(ctx.role, "minimum_role")`
- Always define `args` and `returns` validators on every function
- Use `.withIndex()` for all queries — never `.filter()` in production
- Actions (external API calls) go in separate files with `"use node"` directive

### Phase 2: Backend Tests
- Write tests using `convex-test` + `vitest` BEFORE moving to frontend
- Test file goes alongside source: `convex/moduleName.test.ts`
- Use `t.withIdentity()` for authenticated calls — never pass auth as a third argument
- Every test file must cover:
  - CRUD happy path
  - Authentication enforcement (unauthenticated calls rejected)
  - RBAC enforcement (insufficient role rejected)
  - Tenant isolation (cross-tenant data never leaks)
  - Ownership enforcement where applicable
- Run `npx vitest run` and confirm ALL tests pass before proceeding
- Do NOT move to Phase 3 with failing tests

### Phase 3: Frontend
- Build UI components only after backend functions are tested and passing
- React Native (mobile): athletes and coaches
- React 19 + shadcn/ui (web admin): coaches, gym owners, platform admin
- Use Convex React hooks (`useQuery`, `useMutation`) to call backend functions
- Always pass `tenantId` from context for tenant-scoped operations

#### TanStack Ecosystem (Web Admin)
The web admin app uses the TanStack ecosystem as its primary frontend tooling:

- **TanStack Router** — file-based, type-safe routing with loader/action patterns
  - Define routes under `src/routes/`; use `createFileRoute` for each page
  - Use route loaders to prefetch Convex data before render
  - Use `useNavigate()` and `<Link>` for all navigation — never raw `<a>` tags for internal links
- **TanStack Query** — server state management layered on top of Convex subscriptions
  - Use for non-real-time data (analytics, reports, Azure Function responses, external APIs)
  - Convex `useQuery` remains the default for real-time subscribed data
  - Use `queryOptions()` factory pattern for reusable query definitions
  - Always set `staleTime` and `gcTime` appropriate to the data (real-time: 0, reports: 5m+)
- **TanStack Table** — headless, type-safe data tables
  - Use for all list/grid/table views (members, classes, invoices, logs, etc.)
  - Define column defs with `createColumnHelper<T>()`
  - Always enable sorting, filtering, and pagination for tables with >20 rows
  - Use server-side pagination for large datasets (>100 rows)
- **TanStack Form** — type-safe form management
  - Use for all forms — never uncontrolled inputs or ad-hoc `useState` form state
  - Define form schemas with validators matching Convex arg validators
  - Use `form.Field` for each input; connect validation to Convex `ConvexError` responses
- **TanStack Pacer** — rate limiting and debouncing
  - Use `createPacer()` for search inputs, autosave, and any user-triggered API calls
  - Default debounce: 300ms for search, 1000ms for autosave
  - Use `createThrottler()` for scroll-based loading and real-time position updates

### Phase 4: Playwright E2E Tests
- Write Playwright tests after frontend is functional
- Test complete user flows end-to-end (login → action → verify)
- Cover critical paths: auth flow, workout logging, class booking, billing
- Run `npx playwright test` and confirm all pass before considering the feature complete

## Architecture

### Dual Backend
- **Convex** — operational data (users, tenants, memberships, scheduling, messaging, social, gamification) with real-time subscriptions
- **Azure Functions (C#) + TimescaleDB** — performance data (workout metrics, PRs, fitness scores, analytics, equipment telemetry)

### Multi-Tenancy
- Every Convex query MUST be scoped by `tenantId` (enforced via `tenantQuery`/`tenantMutation` wrappers)
- Cross-tenant data access is never allowed
- Users can belong to multiple tenants (gyms) via the `memberships` table

### Web Admin Frontend Stack
- **React 19** + **shadcn/ui** — UI layer
- **TanStack Router** — type-safe file-based routing
- **TanStack Query** — async server state (non-real-time data, external APIs)
- **TanStack Table** — headless data tables with sort/filter/pagination
- **TanStack Form** — type-safe form state and validation
- **TanStack Pacer** — debounce/throttle for search, autosave, scroll events
- **Convex React** — real-time subscriptions (`useQuery`, `useMutation`)

### Role Hierarchy
`super_admin > owner > admin > coach > athlete`

### Key Files
- `convex/schema.ts` — source of truth for all table definitions
- `convex/lib/customFunctions.ts` — auth + tenant enforcement wrappers
- `convex/lib/auth.ts` — identity → user resolution
- `convex/lib/tenancy.ts` — membership verification + role hierarchy
- `convex/lib/rbac.ts` — permission constants + checks
- `convex/lib/validators.ts` — shared validators
- `convex/test/setup.ts` — test helpers (seedUserWithTenant, etc.)

## Code Standards

- Always read the schema before writing or modifying server functions
- Always read existing source files before modifying them
- Schema is the source of truth — if source code writes fields not in the schema, fix the schema or fix the source
- Keep functions concise — one responsibility per function
- Use `ConvexError` for all error cases with descriptive messages
- Internal functions (`internalMutation`, `internalAction`) for system operations that bypass auth
- Scheduled side effects via `ctx.scheduler.runAfter` to keep primary mutations fast

## Implementation Plan Reference
- Phase documents: `ImplementationPlan/backend/B00-B12` and `ImplementationPlan/frontend/F01-F10`
- Requirements: `requirements/` directory (28 spec files, 822+ requirements)
- Build order: B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9 → B10 → B11 → B12
- Frontend starts after B2: F1 → F2 (then interleave with backend)
