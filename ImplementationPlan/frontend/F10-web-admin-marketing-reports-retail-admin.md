# F10 — Web Admin — Marketing, Reports, Retail & Super Admin

**Priority:** Lower
**Platform:** React 19+ (Desktop/Tablet Web)
**Depends On:** B11, B12, F9
**Key Spec Files:** 09-marketing-lead-management, 10-reporting-analytics, 15-retail-point-of-sale, 20-nutrition-wellness, 05-platform-administration, 24-compliance-legal-security, 23-integrations-api

---

## Overview

The final frontend phase. Lead management, business reporting, retail POS, nutrition oversight, and the platform super admin interface.

---

## Screens — Lead Management & CRM

### Lead Pipeline

- Kanban board view: columns for New → Contacted → Trial → Converted → Lost (FR-ML-004–005)
- Drag leads between stages
- Lead cards: name, source, score, days in stage, assigned staff
- Click card → lead detail panel
- Bulk import leads from CSV (FR-ML-003)

### Lead Detail

- Contact info, source, UTM data (FR-ML-001–002)
- Activity timeline — all touchpoints: emails sent, calls logged, visits, trial status (FR-ML-008)
- Lead score with contributing factors (FR-ML-007)
- Notes editor — staff notes per interaction
- Actions: send email, schedule follow-up, start trial, convert to member, mark lost (FR-ML-005–006)
- Assigned staff with reassignment dropdown (FR-ML-006)

### Lead Sources

- Source configuration — UTM mapping, landing page tracking setup (FR-ML-009–011)
- Embeddable lead capture form builder — drag fields, customize styling with gym branding, generate embed code (FR-ML-009)
- Source performance dashboard — leads per source, conversion rate per source (FR-RA-035–037)

### Trial Management

- Active trials list — member name, start date, days remaining, engagement level (FR-ML-015–016)
- Trial conversion funnel — visual funnel: started → engaged → offered plan → converted (FR-ML-016)
- Expiring trials alert — trials ending in next 7 days with no conversion action (FR-ML-018)
- Trial settings — duration, included access, auto-convert plan, follow-up sequence (FR-ML-017–020)

### Referral Program

- Program configuration — reward type, value, conditions, terms (FR-ML-026)
- Referral dashboard — total referrals, conversion rate, pending rewards, top referrers (FR-ML-030, FR-RA-039–040)
- Reward fulfillment queue — pending rewards to approve and issue (FR-ML-028–029)
- Member referral link generator for sharing (FR-ML-025)

### Promotions

- Promotion builder — name, terms, valid dates, target audience, linked promo code (FR-ML-031–033)
- Active promotions list with performance metrics (FR-ML-034–036)
- Promotion calendar — visual timeline of overlapping promos

---

## Screens — Communication Campaigns (Extending F7)

### Email Campaign Builder

- Template selector — pre-built templates with gym branding applied (FR-CM-046)
- Rich text editor with merge fields: {first_name}, {gym_name}, {membership_plan}, etc. (FR-CM-047)
- Audience segment builder — filter members by status, plan, attendance, tags, join date (FR-CM-047)
- Preview — rendered email with sample member data
- Schedule send or send immediately (FR-CM-048)
- Campaign analytics — sent, delivered, opened, clicked, unsubscribed, per-link click tracking (FR-CM-050)

### SMS Campaigns

- Same audience builder as email (FR-CM-051–052)
- Character count with segment indicator
- Opt-in compliance enforcement — only send to opted-in members (FR-CM-053)
- Delivery analytics (FR-CM-053)

### Automation Workflow Manager

- List of all automated workflows with enable/disable toggles (FR-CM-040)
- Click workflow → editor: trigger event, delay, template, audience filter
- Execution log — recent sends with status, click to see recipient detail (FR-CM-045)
- Workflow performance — send count, open rate, click rate per workflow

---

## Screens — Business Reporting & Analytics

### Report Dashboard

- Pre-built report cards arranged in a grid, each showing key metric + sparkline trend:
  - Revenue (MRR, ARR, growth rate) (FR-RA-001–005)
  - Membership (active, new, cancelled, net growth) (FR-RA-006–010)
  - Attendance (class fill rate, peak hours, utilization) (FR-RA-011–015)
  - Retention (cohort curves, churn rate, LTV) (FR-RA-016–018)
  - Engagement (engagement score distribution, activity levels) (FR-RA-019–022)
  - Staff (coach class counts, PT hours, revenue per coach) (FR-RA-029–031)
  - Capacity (fill rates, waitlist frequency, scheduling suggestions) (FR-RA-032–034)
  - Marketing (lead pipeline, conversion rates, campaign ROI) (FR-RA-035–042)
- Click any card → full report drill-down

### Report Drill-Down

- Configurable date range with presets and custom picker
- Grouping options — by week/month/quarter, by plan, by coach, by class, by source
- Chart types — line, bar, stacked bar, pie, cohort table — auto-selected by report type, toggleable
- Data table below chart — sortable, filterable, exportable
- Comparison mode — overlay previous period (this month vs last month)

### Custom Report Builder

- Metric selector — pick from available metrics across all domains (FR-RA-046)
- Filter builder — compose conditions (membership plan = X AND joined after Y) (FR-RA-047)
- Grouping selector — choose dimensions to group by
- Preview results inline
- Save report — name, add to dashboard (FR-RA-046)
- Schedule report — daily/weekly/monthly email delivery to selected recipients (FR-RA-050)
- Export — CSV or PDF download (FR-RA-048)

### Member Progress Reports (aggregate)

- Platform-wide fitness trends — average fitness score over time (FR-RA-043–044)
- PR frequency — how often members are hitting PRs
- Benchmark participation rates
- Training volume trends across membership

---

## Screens — Retail & POS

### Product Catalog

- Product grid/list view with images, price, stock level (FR-RP-001–002)
- Product editor — name, description, SKU, category, price, variants (size/color), images, active toggle (FR-RP-003–006)
- Category management — create, reorder, archive (FR-RP-002)
- Low stock alerts — highlighted products below configurable threshold (FR-RP-008)
- Inventory adjustment — manual stock changes with reason logging (FR-RP-009)

### Point of Sale

- Quick sale screen — search/scan product, add to cart, adjust quantity (FR-RP-010)
- Member lookup — attach sale to member for history tracking (FR-RP-011)
- Payment — Stripe terminal for card, manual entry for cash (FR-RP-012)
- Receipt — email receipt option (FR-RP-013)
- Discount application — percentage or fixed, reason required (FR-RP-014)
- Return/refund processing (FR-RP-015)

### Online Store

- Storefront settings — enable/disable, shipping options, pickup option (FR-RP-016)
- Order management — incoming orders, fulfillment status tracking (FR-RP-017–020)
- Order detail — line items, customer info, payment status, fulfillment actions

### Retail Reports

- Sales by product, category, period (FR-RP-022–025)
- Inventory value report
- Top sellers
- Revenue breakdown — in-person vs online

---

## Screens — Nutrition Coach View

### Member Nutrition Overview

- Searchable member list filtered to those with nutrition data (FR-NW-016)
- Per-member: daily macro summary, compliance rate, trend charts
- Coach-set nutrition targets — edit macro targets per athlete (FR-NW-007–008)
- Nutrition vs performance correlation view — overlay macros with workout results (FR-NW-013)
- Flag athletes consistently under/over targets

---

## Screens — Platform Super Admin

### Tenant Management

- Tenant list — name, status, member count, MRR, created date, health status (FR-AD-004)
- Provision new tenant wizard:
  - Business info, primary contact
  - Plan/tier selection
  - Stripe Connect onboarding initiation
  - Seed default data (exercises, templates, legal docs)
  - Activate tenant (FR-AD-004–007)
- Tenant detail: configuration, usage stats, support notes
- Suspend/reactivate tenant (FR-AD-006)

### Platform Monitoring

- Aggregate dashboard: total tenants, total users, total workouts, platform MRR (FR-AD-009–011)
- Tenant health table — flagged tenants: payment issues, low activity, support tickets (FR-AD-018–019)
- System status — service health for Convex, Azure Functions, TimescaleDB, Event Hub, IoT Hub

### Global Content Management

- Platform exercise library editor — manage the master exercise database that tenants inherit (FR-AD-012–013)
- Platform benchmark workout management (FR-AD-014)
- Default template management — notification templates, email templates, waiver templates (FR-AD-015)

### Feature Flag Management

- Platform-wide feature flags — toggle features globally or per-tenant (FR-AD-016)
- Percentage rollout controls — gradual feature enablement
- Tenant override — force enable/disable per tenant

### Compliance Dashboard

- Data requests queue: pending GDPR/CCPA access/export/deletion requests (FR-CS-006–012)
- Request processing — execute export or deletion, mark complete
- Consent audit trail — searchable log of all consent events (FR-CS-001–005)
- Legal document version management — update terms/privacy policy, track re-acceptance rates (FR-CS-013–016)
- Age verification queue — pending parental consent requests (FR-CS-036–040)

### Security Dashboard

- Failed login attempts — spike detection, per-user lockout status (FR-CS-030–031)
- Suspicious activity alerts — new device/location logins (FR-CS-032)
- Active sessions overview — concurrent sessions per user (FR-CS-033)
- 2FA adoption rate (FR-CS-041)
- API key management — platform-level keys, usage monitoring (FR-IA-040–041)

### Integration Management

- Platform-wide integration status — health of all third-party connections
- Webhook delivery log — successes, failures, retry status (FR-IA-046–048)
- API usage analytics — requests per tenant, rate limit hits, error rates (FR-IA-042)
- OpenAPI documentation hosting (FR-IA-049)

---

## Key Design Decisions

- **Lead pipeline is Kanban.** CRM users expect this interaction pattern. Dragging a lead from "Contacted" to "Trial" triggers the trial creation flow. Stage transitions can trigger automated workflows from B8. Simple, visual, effective.
- **Report builder is the power tool.** Most gym owners use pre-built reports. The custom builder serves advanced users who want specific cross-cuts of their data. Keep the pre-built reports excellent and the builder as a progressive disclosure option.
- **POS is minimal.** Gym retail is simple — protein bars, t-shirts, water bottles. The POS needs to handle a quick sale at the front desk, not manage a complex retail operation. Gyms with serious retail needs use Shopify (integrated in B12).
- **Super admin is a separate nav context.** Not mixed into the gym admin. Super admins switch to a platform-level context (like switching tenants but to a "platform" view). This prevents accidental cross-tenant actions and keeps the mental model clean.

---

## Requirements Covered

FR-ML-001–036 (marketing/leads UI), FR-RA-001–050 (reporting UI), FR-RP-001–027 (retail/POS UI), FR-NW-007–008, FR-NW-013, FR-NW-016 (nutrition coach view), FR-AD-001–019 (super admin), FR-CS-001–043 (compliance UI), FR-CM-046–053 (campaign UI), FR-IA-040–049 (API/integration management UI)
