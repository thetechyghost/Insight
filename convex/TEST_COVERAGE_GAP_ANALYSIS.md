# Test Coverage Gap Analysis — Requirements vs Test Cases

## Executive Summary

The Insight platform has **822+ functional requirements** across 28 spec files. Of those, approximately **536 requirements** map to Convex server functions (the rest are frontend-only, Azure Functions/TimescaleDB, or infrastructure concerns). Current test coverage: **150 tests across 24 files**, covering approximately **85 requirements** — a **16% coverage rate** against Convex-scoped requirements.

This document maps every requirement domain to existing tests, identifies gaps, and recommends priority additions.

---

## Coverage Scorecard

| Domain | Req IDs | Convex-Scoped | Tested | Partially | Untested | Coverage |
|--------|---------|---------------|--------|-----------|----------|----------|
| B0 Foundation (PA, MT, CS) | 76 | 42 | 12 | 5 | 25 | 29% |
| B1 Tenant Mgmt (TG) | 24 | 22 | 8 | 3 | 11 | 36% |
| B2 Workouts (UA §1-3, EL) | 152 | 80 | 24 | 4 | 52 | 30% |
| B3 Body Comp (UA §4-5) | 23 | 20 | 11 | 0 | 9 | 55% |
| B4 Equipment (CE) | 55 | 15 | 10 | 0 | 5 | 67% |
| B5 Wearables (WD) | 77 | 18 | 0 | 0 | 18 | 0% |
| B6 Coach Tools (CT) | 81 | 65 | 6 | 0 | 59 | 9% |
| B7 Social (SC, GM) | 74 | 60 | 16 | 0 | 44 | 27% |
| B8 Communication (CM) | 56 | 40 | 10 | 0 | 30 | 25% |
| B9 Scheduling (SB) | 34 | 34 | 0 | 0 | 34 | 0% |
| B10 Billing (BP) | 37 | 30 | 5 | 0 | 25 | 17% |
| B11 Marketing (misc) | 30 | 25 | 0 | 0 | 25 | 0% |
| B12 Platform Admin (AD, AF) | 41 | 35 | 5 | 0 | 30 | 14% |
| **TOTAL** | **760** | **486** | **107** | **12** | **367** | **22%** |

---

## Detailed Gap Analysis by Domain

### B0 — Foundation

#### Tested (12 requirements)
| Req ID | Description | Test File | Status |
|--------|-------------|-----------|--------|
| FR-PA-002 | User belongs to multiple gyms | memberships.test.ts | TESTED |
| FR-PA-003 | Cross-tenant user identity | memberships.test.ts | TESTED |
| FR-PA-004 | Tenant data isolation | tenants.test.ts #11 | TESTED |
| FR-PA-006 | Feature toggles | featureFlags.test.ts | TESTED |
| FR-PA-011 | Tier-based access control | memberships.test.ts (RBAC) | TESTED |
| FR-PA-012 | Custom branding | tenants.test.ts #7-9 | TESTED |
| FR-MT-001 | Per-tenant data isolation | tenants.test.ts, memberships.test.ts | TESTED |
| FR-MT-006 | Query/API scoping | All tenant* tests | TESTED |
| FR-MT-007 | Single identity multi-gym | memberships.test.ts #2-3 | TESTED |
| FR-UA-001 | User registration | users.test.ts #3-4 | TESTED |
| FR-UA-002 | Profile maintenance | users.test.ts #5 | TESTED |
| FR-UA-008 | Notification preferences | users.test.ts #8 | TESTED |

#### Partially Tested (5 requirements)
| Req ID | Description | What's Tested | What's Missing |
|--------|-------------|---------------|----------------|
| FR-PA-001 | Tenant provisioning | Tenant creation + owner membership | Full provisioning workflow, setup wizard |
| FR-PA-005 | Terminology dictionary | updateTerminology function exists | No test for CRUD or application |
| FR-MT-004 | Branding/theming | updateBranding RBAC tested | Logo upload, typography, full branding |
| FR-TG-003 | Membership status tracking | Join/leave status changes | Full lifecycle (trial→active→at-risk→cancelled) |
| FR-CS-020 | RBAC enforcement | Role hierarchy tested | Granular permission checks |

#### Untested — Critical (11 requirements)
| Req ID | Description | Priority | Reason |
|--------|-------------|----------|--------|
| FR-MT-016 | User self-service data export | CRITICAL | GDPR compliance |
| FR-MT-017 | Tenant admin data export | CRITICAL | GDPR compliance |
| FR-MT-019 | Right-to-deletion (GDPR) | CRITICAL | Legal requirement |
| FR-MT-022 | Export/deletion audit logging | CRITICAL | Compliance trail |
| FR-MT-018 | Data retention policies | HIGH | Regulatory |
| FR-MT-021 | Consent-aware export filtering | HIGH | GDPR |
| FR-CS-001 | GDPR compliance enforcement | HIGH | Legal |
| FR-CS-007 | Data retention enforcement | HIGH | Legal |
| FR-CS-009 | Right-to-access workflow | HIGH | Legal |
| FR-CS-010 | Right-to-deletion workflow | HIGH | Legal |
| FR-CS-024 | Comprehensive audit logging | HIGH | Security |

#### Untested — Medium (14 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-PA-010 | Super admin tier | No super admin tests exist |
| FR-PA-014 | Custom domain mapping | Convex function exists, no test |
| FR-PA-015 | Branded email templates | Deferred to B8 |
| FR-PA-016 | Terminology application | Depends on FR-PA-005 |
| FR-MT-008 | In-app gym switching | No gym-switcher query test |
| FR-MT-009 | Per-gym workout history segregation | Tested implicitly via isolation |
| FR-MT-011 | Per-gym privacy settings | No test |
| FR-MT-012 | Membership transfer between gyms | No transfer function/test |
| FR-MT-013 | Drop-in/visitor access | No test |
| FR-MT-014 | Cross-gym benchmarks (anonymized) | No test |
| FR-MT-015 | Users as data owners | Conceptual; tested via ownership checks |
| FR-MT-020 | Data migration/import tools | No test |
| FR-CS-012 | Digital waiver presentation | Schema bugs fixed, needs retest |
| FR-CS-018 | Guardian consent for minors | ageVerification exists, no test |

---

### B1 — Gym / Tenant Management

#### Tested (8 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-TG-001 (partial) | Member invite flow | invitations.test.ts |
| FR-TG-006 | Digital waivers & e-signature | waivers.test.ts |
| FR-TG-007 (partial) | Member notes | memberNotes.test.ts |
| FR-TG-008 | Check-in attendance | checkIns.test.ts |
| FR-TG-015 | Staff profiles | staff.test.ts |
| FR-TG-016 | Role-based access control | memberships.test.ts, rolesPermissions.test.ts |
| FR-TG-017 | Permission configuration | rolesPermissions.test.ts |
| FR-TG-058-060 | Waiver templates + signing | waivers.test.ts |

#### Untested (11 requirements)
| Req ID | Description | Priority |
|--------|-------------|----------|
| FR-TG-001 | Member roster search/filter/sort | HIGH |
| FR-TG-002 | Member profile history (attendance+billing+performance) | HIGH |
| FR-TG-004 | Configurable membership types | MEDIUM |
| FR-TG-005 | Contract/agreement management | MEDIUM |
| FR-TG-009 | Freeze/hold management with policy | HIGH |
| FR-TG-010 | Inactivity detection (configurable threshold) | HIGH |
| FR-TG-011 | Bulk member operations (import, status change) | MEDIUM |
| FR-TG-012 | CSV import/export | MEDIUM |
| FR-TG-013 | Automated lifecycle management | MEDIUM |
| FR-TG-018 | Staff scheduling | LOW |
| FR-TG-023 | Staff certification tracking | LOW |

---

### B2 — Workout & Performance

#### Tested (24 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-UA-010-024 | Workout types (implicit) | workoutLogs.test.ts (workoutType field) |
| FR-UA-036 | Scaling designation (Rx/Rx+/Scaled) | workoutLogs.test.ts #1 |
| FR-UA-037 | RPE tracking | workoutLogs.test.ts #1 |
| FR-UA-039 | Free-text notes | workoutLogs.test.ts #1 |
| FR-UA-044 | Previous scores lookup | workoutLogs.test.ts #9 |
| FR-UA-053 | Auto-save drafts | workoutLogs.test.ts #3-4 |
| FR-EL-001-003 | Exercise library with categories | exercises.test.ts #1-4 |
| FR-EL-007 | Scaling alternatives | exercises.test.ts (create args) |
| FR-EL-008 | Equipment tagging | exercises.test.ts (create args) |
| FR-EL-010 | Difficulty levels | exercises.test.ts (create args) |
| FR-EL-012 | Exercise search autocomplete | exercises.test.ts #4 |
| FR-EL-013 | Tenant-specific custom exercises | exercises.test.ts #5-8 |

#### Untested — High Priority (20 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-UA-043 | Quick-log (pre-populate from history) | Function exists, no test |
| FR-UA-048 | Movement search autocomplete | exercises.search tested, but not from workoutLogs context |
| FR-UA-052 | Copy previous workout as template | No duplicate/copy test for logs |
| FR-UA-054-059 | PR detection, PR board, 1RM estimation | PR storage in Convex untested |
| FR-EL-009-012 | Benchmark workouts (CRUD) | benchmarkWorkouts.ts exists, no test |
| FR-EL-014 | Exercise favorites | Not implemented |
| FR-EL-015 | Recently used exercises | Not implemented |
| FR-EL-025-031 | Training program library | trainingPrograms.test.ts covers basic CRUD only |
| FR-EL-032-036 | Educational content | educationalContent.ts exists, no test |

#### Untested — Medium (32 requirements)
All FR-UA-060 through FR-UA-082 (fitness scoring, trends, comparative analytics) — these compute in Azure Functions/TimescaleDB, but Convex stores/serves results. No query tests exist for analytics data retrieval.

---

### B3 — Body Composition, Goals & Content

#### Tested (11 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-UA-086 | Body measurements CRUD | bodyMeasurements.test.ts |
| FR-UA-097-101 | Goal types (strength/body_comp/endurance/consistency/skill) | goals.test.ts |
| FR-UA-097 | Goal lifecycle (active→completed→abandoned) | goals.test.ts #5-6 |

#### Untested (9 requirements)
| Req ID | Description | Priority |
|--------|-------------|----------|
| FR-UA-083-085 | Weight/body fat/lean mass logging with trends | MEDIUM |
| FR-UA-088-089 | Progress photos upload + timeline | MEDIUM |
| FR-UA-104 | Daily/weekly habit tracking | MEDIUM — habits.ts exists, no test |
| FR-UA-102-103 | Program enrollment + marketplace | MEDIUM |
| FR-UA-105 | Goal progress dashboards | LOW (query) |
| FR-EL-032-036 | Educational content CRUD | LOW |

---

### B4 — Connected Equipment

#### Tested (10 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-CE-001 | Device registration | devices.test.ts |
| FR-CE-002 | Device status tracking | devices.test.ts #3 |
| FR-CE-029-032 | Equipment session management | equipmentSessions.test.ts |

#### Untested (5 requirements)
| Req ID | Description | Priority |
|--------|-------------|----------|
| FR-UA-106-116 | Concept2 performance tracking | MEDIUM — concept2Streaks.ts exists, no test |
| FR-CE-041-055 | FitTrack device provisioning/OTA | LOW (Azure-heavy) |

---

### B5 — Wearable Integration

#### Untested — ALL (18 Convex-scoped requirements)
| Req ID | Description | Priority |
|--------|-------------|----------|
| FR-WD-001-006 | Wearable OAuth connection CRUD | HIGH |
| FR-WD-007-012 | Sync status management | HIGH |
| FR-WD-013-018 | HR zone configuration | MEDIUM |

**Files exist but have zero tests:** `wearableConnections.ts`, `hrZones.ts`

---

### B6 — Coach / Trainer Tools

#### Tested (6 requirements — classRegistrations only)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-CT-041 | Class capacity enforcement | classRegistrations.test.ts #2 |
| FR-CT-042 | Waitlist auto-promote | classRegistrations.test.ts #6 |
| FR-CT-043 | No-show tracking | classRegistrations.test.ts #5 |
| FR-CT-040 | Attendance tracking | classRegistrations.test.ts #4 |

#### Untested — High Priority (25 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-CT-001-010 | Workout programming (create, copy, calendar, revision history) | coachPrograms.ts exists, no test |
| FR-CT-011-012 | Daily WOD publishing + multi-track | dailyWod.ts exists, no test |
| FR-CT-013-015 | Coaching notes, stimulus, scaling guidance | coachNotes.ts exists, no test |
| FR-CT-026-031 | Athlete monitoring (history, volume, churn prediction) | Functions exist, no test |
| FR-CT-035 | Private coach-only notes | coachNotes.ts exists, no test |
| FR-CT-038-039 | Class session management | classSessions.ts exists, no test |
| FR-CT-047 | Substitute coach assignment | classSessions.assignCoach exists, no test |
| FR-CT-048 | Class notes/summaries | classNotes.ts exists, no test |

#### Untested — Medium (34 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-CT-049-059 | Video review system | videoSubmissions.ts, videoAnnotations.ts, annotationTemplates.ts exist, no tests |
| FR-CT-060-066 | Coach communication tools | Covered by B8 messaging |
| FR-CT-067-081 | FitTrack machine dashboard | Mostly Azure-side |

---

### B7 — Social, Community & Gamification

#### Tested (16 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-SC-027-029 | Challenge create/join/leave | challenges.test.ts |
| FR-SC-033 | Challenge standings | challenges.test.ts #5 |
| FR-GM-001-002 | Badge framework + awards | badges.test.ts |
| FR-GM-008 | Badge catalog display | badges.test.ts #4 |
| FR-GM-009 | Workout streaks | streaks.test.ts |
| FR-GM-012 | Streak freeze | streaks.test.ts #4 |

#### Untested — High Priority (15 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-SC-001-006 | Activity feed (gym, personal, global, filters) | activityFeed.ts exists, no test |
| FR-SC-007-008 | Reactions + comments | reactions.ts, comments.ts exist, no tests |
| FR-SC-013-014 | Follow system | follows.ts exists, no test |
| FR-SC-016-025 | Leaderboards (daily, benchmark, global) | leaderboards.ts exists, no test |
| FR-GM-015-017 | Points system + rewards redemption | points.ts, rewards.ts exist, no tests |

#### Untested — Medium (29 requirements)
| Req ID | Description |
|--------|-------------|
| FR-SC-030-032 | Inter-gym/team competitions |
| FR-SC-034-035 | Prize/reward management |
| FR-SC-036-040 | Milestone detection (workouts, PRs, streaks) |
| FR-SC-041-048 | Concept2 rankings + challenges |
| FR-GM-003-007 | Specific badge types (streak, PR, benchmark, community, seasonal) |
| FR-GM-013 | Streak leaderboards |
| FR-GM-014 | Streak at-risk notifications |
| FR-GM-018-019 | Challenge points, point balance display |
| FR-GM-020-026 | Motivation features (quotes, shout-outs, year-in-review) |

---

### B8 — Communication & Messaging

#### Tested (10 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-CM-001-002 | Direct messaging | conversations.test.ts, messages.test.ts |
| FR-CM-003-004 | Group messaging | conversations.test.ts #1 |
| FR-CM-006 | Read receipts | messages.test.ts #3 |
| FR-CM-020 | Notification preferences | users.test.ts #8 |

#### Untested — High Priority (12 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-CM-005 | Unified inbox | No aggregation test |
| FR-CM-007-009 | File/image/video attachments | No attachment test |
| FR-CM-012-019 | Push notification triggers (WOD, booking, PR, billing) | notifications.ts exists, no test |
| FR-CM-039-049 | Automation workflows (welcome, birthday, re-engagement) | automationWorkflows.ts exists, no test |

#### Untested — Medium (18 requirements)
All email campaign (FR-CM-024-031), SMS (FR-CM-032-038), and Concept2-specific notification requirements (FR-CM-050-056).

---

### B9 — Scheduling & Booking

#### Untested — ALL (34 requirements)
**No test files exist for any scheduling functionality.**

| Priority | Req IDs | Description |
|----------|---------|-------------|
| HIGH | FR-SB-001-002 | Schedule template CRUD |
| HIGH | FR-SB-004-005 | Capacity + waitlist (partially tested via classRegistrations) |
| HIGH | FR-SB-008 | Scheduling conflict detection |
| HIGH | FR-SB-009 | Holiday/closure calendar |
| HIGH | FR-SB-011-014 | Self-service booking + cancellation policies |
| HIGH | FR-SB-021-028 | Personal training scheduling |
| MEDIUM | FR-SB-029-034 | Events, competitions, workshops |

**Files exist but have zero tests:** `scheduleTemplates.ts`, `scheduleExceptions.ts`, `bookingPolicies.ts`, `ptSessions.ts`, `ptBookings.ts`, `events.ts`, `eventRegistrations.ts`, `calendarSync.ts`

---

### B10 — Billing & Payments

#### Tested (5 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-BP-001 | Subscription management | subscriptions.test.ts |
| FR-BP-006 | Plan change (upgrade/downgrade) | subscriptions.test.ts #2 |
| FR-BP-007 | Membership freeze | subscriptions.test.ts #3 |

#### Untested — High Priority (12 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-BP-002-003 | Autopay + multiple payment methods | paymentMethods.ts exists, no test |
| FR-BP-005 | Proration calculation | No test |
| FR-BP-011 | Free trial management | trials.ts exists, no test |
| FR-BP-013 | Failed payment retry | No test |
| FR-BP-022-024 | Invoice generation + line items | invoices.ts exists, no test |
| FR-BP-030-031 | Drop-in + punch card sales | punchCards.ts exists, no test |
| FR-BP-037 | Promo codes/coupons | promoCodes.ts exists, no test |

#### Untested — Medium (13 requirements)
FR-BP-008-009 (family/corporate billing), FR-BP-014-015 (dunning/late fees), FR-BP-025-029 (credits/adjustments/batch invoicing), FR-BP-032-036 (PT packages, retail, gift cards, events, programs).

---

### B11 — Marketing, Reporting & Advanced

#### Untested — ALL (25 Convex-scoped requirements)
**No test files exist for any marketing/reporting functionality.**

| Priority | Files | What's Missing |
|----------|-------|----------------|
| MEDIUM | leads.ts | Lead pipeline CRUD + assignment + conversion |
| MEDIUM | trials.ts | Trial lifecycle (create→convert→expire) |
| MEDIUM | referrals.ts | Referral tracking + reward fulfillment |
| LOW | products.ts, orders.ts, inventory.ts | Retail product CRUD + order lifecycle |
| LOW | foodLog.ts, nutritionTargets.ts | Nutrition tracking CRUD |
| LOW | savedReports.ts | Report management + export generation |

---

### B12 — Platform Admin, Compliance & API

#### Tested (5 requirements)
| Req ID | Description | Test File |
|--------|-------------|-----------|
| FR-AD-018 | Feature flag management | featureFlags.test.ts |

#### Untested — High Priority (12 requirements)
| Req ID | Description | Notes |
|--------|-------------|-------|
| FR-AD-001-002 | Tenant provisioning | tenantProvisioning.ts exists, no test |
| FR-AD-005-007 | Tenant suspension/termination | No test |
| FR-CS-009-010 | Right-to-access/deletion workflows | dataRequests.ts exists, no test |
| FR-CS-024 | Comprehensive audit logging | platformAuditLog.ts exists, no test |
| FR-AF-001-008 | Check-in systems (QR/NFC/PIN) | checkInSystems.ts exists, no test |
| FR-AF-010-013 | Facility access rules + audit trail | facilityAccessRules.ts, accessLog.ts exist, no tests |

#### Untested — Medium (18 requirements)
| Req ID | Description |
|--------|-------------|
| FR-AD-014-015 | Global exercise/benchmark library management |
| FR-AD-016-017 | Platform announcements + moderation |
| FR-AD-019 | Content management audit log |
| FR-CS-012-017 | Waiver/contract version management |
| FR-CS-018/034-038 | Minor/guardian consent workflows |
| FR-AF-017-022 | Room booking, equipment inventory, cleaning, capacity |

---

## Recommended Test Additions — Prioritized

### Tier 1: Critical (Legal/Compliance) — 20 new tests

| # | Test File to Create | Tests | Requirements Covered |
|---|---------------------|-------|---------------------|
| 1 | `consentRecords.test.ts` | 4 | FR-CS-001, FR-CS-006 |
| 2 | `dataRequests.test.ts` | 5 | FR-MT-016, FR-MT-019, FR-CS-009, FR-CS-010 |
| 3 | `platformAuditLog.test.ts` | 4 | FR-MT-022, FR-CS-024 |
| 4 | `legalDocuments.test.ts` | 4 | FR-CS-005, FR-CS-015, FR-CS-016 |
| 5 | `ageVerification.test.ts` | 3 | FR-CS-018, FR-CS-034, FR-CS-035 |

### Tier 2: High Priority (Core UX) — 45 new tests

| # | Test File to Create | Tests | Requirements Covered |
|---|---------------------|-------|---------------------|
| 6 | `benchmarkWorkouts.test.ts` | 5 | FR-EL-009-012, FR-EL-016-024 |
| 7 | `wearableConnections.test.ts` | 5 | FR-WD-001-006 |
| 8 | `hrZones.test.ts` | 4 | FR-WD-013-018 |
| 9 | `coachPrograms.test.ts` | 6 | FR-CT-001-010 |
| 10 | `dailyWod.test.ts` | 5 | FR-CT-011-012, FR-CT-018 |
| 11 | `classSessions.test.ts` | 5 | FR-CT-038-039, FR-CT-047 |
| 12 | `activityFeed.test.ts` | 5 | FR-SC-001-006 |
| 13 | `follows.test.ts` | 4 | FR-SC-013-014 |
| 14 | `points.test.ts` | 3 | FR-GM-015-016 |
| 15 | `rewards.test.ts` | 3 | FR-GM-017 |

### Tier 3: Medium Priority (Business Operations) — 50 new tests

| # | Test File to Create | Tests | Requirements Covered |
|---|---------------------|-------|---------------------|
| 16 | `scheduleTemplates.test.ts` | 5 | FR-SB-001-002, FR-SB-008 |
| 17 | `bookingPolicies.test.ts` | 3 | FR-SB-012-014 |
| 18 | `ptSessions.test.ts` | 4 | FR-SB-021-025 |
| 19 | `events.test.ts` | 4 | FR-SB-029-030 |
| 20 | `invoices.test.ts` | 5 | FR-BP-022-024 |
| 21 | `promoCodes.test.ts` | 5 | FR-BP-037 |
| 22 | `punchCards.test.ts` | 3 | FR-BP-031 |
| 23 | `paymentMethods.test.ts` | 3 | FR-BP-002-003 |
| 24 | `notifications.test.ts` | 5 | FR-CM-012-019 |
| 25 | `leads.test.ts` | 4 | FR-TG-011, marketing pipeline |
| 26 | `trials.test.ts` | 3 | FR-BP-011 |
| 27 | `tenantProvisioning.test.ts` | 3 | FR-AD-001-002, FR-AD-005 |
| 28 | `facilityAccessRules.test.ts` | 3 | FR-AF-010-013 |

### Tier 4: Lower Priority (Enhancement) — 30 new tests

| # | Test File to Create | Tests | Requirements Covered |
|---|---------------------|-------|---------------------|
| 29 | `videoSubmissions.test.ts` | 4 | FR-CT-049-057 |
| 30 | `coachNotes.test.ts` | 3 | FR-CT-035 |
| 31 | `educationalContent.test.ts` | 4 | FR-EL-032-036 |
| 32 | `habits.test.ts` | 3 | FR-UA-104 |
| 33 | `progressPhotos.test.ts` | 4 | FR-UA-088-089 |
| 34 | `concept2Streaks.test.ts` | 3 | FR-UA-115 |
| 35 | `reactions.test.ts` | 3 | FR-SC-007 |
| 36 | `comments.test.ts` | 3 | FR-SC-008 |
| 37 | `leaderboards.test.ts` | 4 | FR-SC-016-025 |
| 38 | `orders.test.ts` | 3 | FR-BP-033 |

---

## Summary

| Metric | Current | After Tier 1 | After Tier 1+2 | After All |
|--------|---------|-------------|----------------|-----------|
| Test files | 24 | 29 | 39 | 48 |
| Test cases | 150 | 170 | 215 | 295 |
| Requirements covered | ~107 | ~135 | ~210 | ~340 |
| Coverage rate | 22% | 28% | 43% | 70% |

**Remaining 30% uncovered** are primarily: frontend-triggered flows, Azure Function computations (PR detection, fitness scoring, analytics), third-party integrations (Stripe webhooks, SendGrid, wearable OAuth), and infrastructure concerns (encryption, rate limiting, monitoring).
