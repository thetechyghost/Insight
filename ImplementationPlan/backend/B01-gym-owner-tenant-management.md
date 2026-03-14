# B1 — Gym Owner/Tenant Management

**Priority:** Critical
**Depends On:** B0
**Key Spec Files:** 04-tenant-gym-owner

---

## Overview

Makes the platform usable — a gym owner can set up their gym, invite staff, and onboard members. Without this, there's no one in the system to log workouts or coach classes.

---

## Convex Schemas

### New

- **`staff`** — staff profiles linked to memberships, job title, hire date, permissions, status (active/inactive), assigned roles (FR-TG-013–016)
- **`invitations`** — email-based invite tokens for staff and members, role assignment, expiry (FR-TG-001, FR-UA-001)
- **`member_notes`** — owner/coach private notes on members (FR-TG-007)
- **`waivers`** — legal document templates, member signature records, version tracking (FR-TG-058–060)
- **`check_ins`** — attendance records per member per visit (FR-TG-008)

### Extended (from B0)

- **`users`** — add onboarding status, membership type, join date, referral source
- **`tenants`** — add business hours, timezone, location/address, contact info, cancellation policies
- **`memberships`** — add membership plan reference, start/end dates, status (active/frozen/cancelled)

---

## Server Functions

### Member Management

- Invite member (email/SMS with onboarding link) (FR-TG-001)
- Bulk member import from CSV (FR-TG-002)
- Member search and filtering (name, status, membership type, join date) (FR-TG-003)
- Member profile view (owner sees full profile + attendance + notes) (FR-TG-004–007)
- Freeze/unfreeze membership (FR-TG-009)
- Cancel membership with configurable policy enforcement (FR-TG-010)
- Member attendance history query (FR-TG-008)
- Inactivity detection — flag members with no check-in within configurable threshold (FR-TG-011)

### Staff Operations

- Add/remove staff members (FR-TG-013)
- Assign roles and permissions (owner, manager, coach, front-desk) (FR-TG-014–015)
- Staff schedule management (FR-TG-016)
- Role-based access enforcement on all mutations (FR-TG-015)

### Gym Configuration

- Update branding (logo, colors, fonts) (FR-PA-012–013)
- Configure terminology dictionary (FR-PA-005)
- Enable/disable feature modules (FR-PA-006)
- Set business hours, timezone, policies (FR-TG-017)
- Waiver template CRUD + member signature capture (FR-TG-058–060)

### Data & Compliance

- Member data export (per-tenant, respects consent) (FR-MT-017)
- Member deletion request processing (FR-MT-019)
- Export/deletion audit logging (FR-MT-022)
- At-risk member identification — basic churn signals (no attendance, membership approaching expiry) (FR-CT-030, FR-TG-011)

---

## Key Design Decisions

- **Invitation flow:** Convex mutation creates invite record → triggers Convex action to send email → recipient clicks link → auth flow → membership created. No external email service yet (use Convex's built-in HTTP actions or a simple SendGrid action). Full email infrastructure comes in B8.
- **Role hierarchy:** Owner > Manager > Coach > Front-desk > Athlete. Each level inherits permissions of levels below. Enforced server-side on every mutation.
- **Bulk import:** Parse CSV server-side in a Convex action, create user stubs + memberships in batch, send invites async via scheduled function.

---

## Requirements Covered

FR-TG-001–017, FR-TG-058–060, FR-PA-005–006, FR-PA-012–015, FR-MT-017, FR-MT-019, FR-MT-022, FR-CT-030 (basic churn detection)

## What's Deferred

- Financial operations, invoicing (→ B10)
- Marketing, feedback surveys (→ B11)
- Facility/equipment management (→ B12)
- Full email/SMS campaigns (→ B8)
