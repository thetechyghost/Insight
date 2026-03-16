# Integration Test Coverage Matrix

Maps integration test suites to requirement specification domains.

## Coverage Status

| Test Suite | Requirement Domains | Spec Files | Status |
|-----------|---------------------|------------|--------|
| **Foundation** | | | |
| `foundation/auth` | FR-PA, FR-CS | 01, 24 | Active |
| `foundation/tenancy` | FR-MT | 22 | Active |
| `foundation/rbac` | FR-CS, FR-PA | 01, 24 | Active |
| `foundation/user-management` | FR-UA (profile) | 02 | Active |
| **Workout & Performance** | | | |
| `workout/exercise-library` | FR-EL | 19 | Active |
| `workout/workout-logging` | FR-UA (§1-3) | 02 | Active |
| `workout/benchmarks` | FR-EL (benchmarks) | 19 | Active |
| `workout/training-programs` | FR-EL, FR-CT | 19, 03 | Active |
| **Gym Management** | | | |
| `gym-management/member-management` | FR-TG (§1) | 04 | Active |
| `gym-management/staff-operations` | FR-TG (§2) | 04 | Active |
| `gym-management/invitations` | FR-TG | 04 | Active |
| `gym-management/waivers-compliance` | FR-CS, FR-TG | 04, 24 | Active |
| **Classes & Scheduling** | | | |
| `classes-scheduling/class-lifecycle` | FR-SB, FR-CT | 06, 03 | Active |
| `classes-scheduling/booking-flow` | FR-SB | 06 | Active |
| `classes-scheduling/schedule-templates` | FR-SB | 06 | Active |
| **Social & Gamification** | | | |
| `social-gamification/activity-feed` | FR-SC | 14 | Active |
| `social-gamification/challenges` | FR-SC, FR-GM | 14, 21 | Active |
| `social-gamification/badges-streaks` | FR-GM | 21 | Active |
| `social-gamification/leaderboards` | FR-SC | 14 | Active |
| **Communication** | | | |
| `communication/messaging` | FR-CM | 08 | Active |
| `communication/notifications` | FR-CM | 08 | Active |
| **Billing** | | | |
| `billing/membership-plans` | FR-BP | 07 | Active |
| `billing/subscriptions` | FR-BP | 07 | Active |
| `billing/invoices` | FR-BP | 07 | Active |
| **Body & Goals** | | | |
| `body-goals/body-measurements` | FR-UA (§4) | 02 | Active |
| `body-goals/goals` | FR-UA (§5) | 02 | Active |
| `body-goals/habits` | FR-NW | 20 | Active |
| **Equipment** | | | |
| `equipment/device-management` | FR-CE | 12 | Active |
| `equipment/wearables` | FR-WD | 11 | Active |
| **Platform Admin** | | | |
| `platform-admin/platform-config` | FR-AD | 05 | Active |
| `platform-admin/feature-flags` | FR-AD | 05 | Active |
| `platform-admin/audit-logging` | FR-CS | 24 | Active |
| `platform-admin/data-requests` | FR-MT, FR-CS | 22, 24 | Active |

## Deferred Domains (Not Integration Tested)

| Domain | Reason |
|--------|--------|
| FR-WD (HealthKit/Health Connect device sync) | Requires physical devices |
| FR-CE (BLE/FTMS real-time streaming) | Requires physical equipment |
| FR-VA (Video Upload & Analysis) | Requires video infrastructure |
| FR-RP (Retail & POS) | B11, not yet implemented |
| FR-ML (Marketing & Lead Mgmt) | B11, not yet implemented |
| FR-RA (Reporting & Analytics) | B11, not yet implemented (TimescaleDB-dependent) |
| FR-MA (Mobile Application UI) | Covered by future Playwright E2E tests |
| FR-DA (Desktop/Tablet Admin UI) | Covered by future Playwright E2E tests |
| NFR (Non-Functional Requirements) | Separate performance/load testing concern |

## Test Personas

| Name | Email Pattern | Role | Tenant |
|------|--------------|------|--------|
| Alice | alice+{prefix}@test.insight.app | Owner | CrossFit Alpha |
| Bob | bob+{prefix}@test.insight.app | Coach | CrossFit Alpha |
| Carol | carol+{prefix}@test.insight.app | Admin | CrossFit Alpha |
| Dave | dave+{prefix}@test.insight.app | Athlete | CrossFit Alpha |
| Eve | eve+{prefix}@test.insight.app | Athlete | CrossFit Alpha |
| Frank | frank+{prefix}@test.insight.app | Athlete | Both (multi-gym) |
| Grace | grace+{prefix}@test.insight.app | Owner | CrossFit Beta |

## Running Tests

```bash
# Run unit tests only (existing convex-test, in-memory)
npm run test:unit

# Run integration tests against Convex dev deployment
npm run test:integration

# Run integration tests against pre-prod
npm run test:integration:preprod

# Run both unit and integration tests
npm run test:all
```

## Configuration

1. Copy `.env.test.example` to `.env.test`
2. Set `CONVEX_URL` to your Convex dev deployment URL
3. Set `TEST_API_KEY` to match the `ENABLE_TEST_ENDPOINTS` env var on the deployment
4. For pre-prod: also set `CONVEX_PREPROD_URL`
