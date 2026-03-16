# Super Admin App — Run Instructions

## Prerequisites

- Node.js 20+
- A running Convex deployment with the Insight schema
- A `platform_admins` record seeded for your user (see "Seeding a Super Admin" below)

## Environment Setup

Create `apps/super-admin/.env.local`:

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

Get your Convex URL from the [Convex dashboard](https://dashboard.convex.dev) or by running `npx convex dev` from the project root.

## Running the Dev Server

```bash
cd apps/super-admin
npm run dev
```

The app starts at **http://localhost:5174**.

## Running the Convex Backend

In a separate terminal (from the project root):

```bash
npx convex dev
```

This starts the Convex dev server, syncs your schema, and generates TypeScript types. Both the dev server and `convex dev` must be running simultaneously.

## Seeding a Super Admin

There is no signup flow. You must manually insert a `platform_admins` record.

**Option 1 — Convex Dashboard:**

1. Go to your deployment in the [Convex dashboard](https://dashboard.convex.dev)
2. Navigate to the `users` table, find your user's `_id`
3. Navigate to the `platform_admins` table
4. Insert a new document:
   ```json
   {
     "userId": "<your-user-id>",
     "platformRole": "super_admin",
     "status": "active"
   }
   ```

**Option 2 — Convex CLI:**

```bash
npx convex run --push '
  const userId = "<your-user-id>";
  await db.insert("platform_admins", {
    userId,
    platformRole: "super_admin",
    status: "active",
  });
'
```

## Build for Production

```bash
cd apps/super-admin
npm run build
```

Output goes to `apps/super-admin/dist/`. Serve with any static file host.

## Running Backend Tests

From the project root:

```bash
npm test
```

This runs all 264 backend tests (including the 18 platform admin tests).

To run only platform admin tests:

```bash
npx vitest run convex/platformAdmins.test.ts convex/platformTenants.test.ts convex/platformMetrics.test.ts convex/platformTenantNotes.test.ts
```

## Project Structure

```
apps/super-admin/
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout
│   │   ├── login.tsx               # Login page
│   │   ├── _authenticated.tsx      # Auth guard + sidebar shell
│   │   └── _authenticated/
│   │       ├── dashboard.tsx       # Platform dashboard
│   │       └── tenants/
│   │           ├── index.tsx       # Tenant list
│   │           └── $tenantId.tsx   # Tenant detail
│   ├── components/
│   │   ├── app-sidebar.tsx         # Sidebar navigation
│   │   ├── nav-main.tsx            # Grouped nav items
│   │   ├── nav-user.tsx            # User footer
│   │   ├── stat-card.tsx           # Reusable stat card
│   │   ├── tenant-create-sheet.tsx # New tenant form
│   │   ├── tenant-table/           # TanStack Table components
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/
│   │   └── use-platform-admin.ts   # Auth context hook
│   └── lib/
│       ├── convex.ts               # Convex client
│       └── utils.ts                # cn() helper
```

## Known Deferred Items

- **Auth integration:** Login page currently navigates directly to dashboard without Convex Auth. Wire up when auth provider is configured.
- **Members tab:** Shows placeholder — will display member list in a future iteration.
- **Usage tab:** Shows placeholder — will connect to analytics API in a future iteration.
- **Date range selector:** Dashboard shows all-time data — date filtering to be added.
- **Billing plan:** Tenant creation form omits billing plan — no platform billing schema yet.
