# B11 — Marketing, Reporting & Advanced Features

**Priority:** Lower
**Depends On:** B8, B10
**Key Spec Files:** 09-marketing-lead-management, 10-reporting-analytics, 13-video-upload-analysis, 15-retail-point-of-sale, 20-nutrition-wellness

---

## Overview

Bundles the remaining business and athlete features: lead management, business reporting, retail/POS, nutrition tracking, and video analysis polish.

---

## Convex Schemas

### New — Marketing & Leads

- **`leads`** — prospective members: name, email, phone, source (web form/referral/walk-in/social/ad), status (new/contacted/trial/converted/lost), assigned staff, tenant, notes, score (FR-ML-001–008)
- **`lead_sources`** — tracking source configuration: UTM mappings, landing page refs, integration refs (FR-ML-009–011)
- **`trials`** — trial memberships: lead ref, start date, end date, plan, status (active/converted/expired), conversion follow-up schedule (FR-ML-015–020)
- **`referrals`** — referral tracking: referrer user, referred lead/user, status (pending/converted), reward status (pending/paid), reward type (FR-ML-025–030)
- **`referral_programs`** — per-tenant config: reward type (credit/discount/free_month), reward value, conditions (FR-ML-026)
- **`promotions`** — time-limited offers: tenant, name, terms, valid dates, target audience segment, linked promo code ref from B10 (FR-ML-031–036)

### New — Retail & POS

- **`products`** — retail inventory: tenant, name, description, SKU, category, price, variants (size/color), stock quantity, images, active flag (FR-RP-001–006)
- **`product_categories`** — taxonomy for retail items (FR-RP-002)
- **`orders`** — purchase records: user, tenant, line items, subtotal, tax, total, payment ref, status (pending/paid/fulfilled/refunded), fulfillment method (in-person/shipped) (FR-RP-010–015)
- **`inventory_log`** — stock movement: product, quantity change, reason (sale/restock/adjustment/return), timestamp (FR-RP-007–009)

### New — Nutrition

- **`food_log`** — daily nutrition entries: user, date, meal (breakfast/lunch/dinner/snack), food item, calories, protein, carbs, fat, fiber (FR-NW-001–005)
- **`nutrition_targets`** — per-user daily macro targets: calories, protein, carbs, fat, set by user or coach (FR-NW-006–008)
- **`food_database`** — searchable food items: name, serving size, macros per serving, source (platform/user-created) (FR-NW-003)

### New — Reporting

- **`saved_reports`** — custom report definitions: tenant, name, report type, filters, grouping, date range, schedule (FR-RA-046–050)
- **`report_exports`** — generated report files: saved report ref, format (CSV/PDF), file ref, generated date (FR-RA-048)

---

## TimescaleDB — Nutrition Time Series

### New Table

**`daily_nutrition`** hypertable:
- `user_id, tenant_id, date`
- `total_calories, protein_g, carbs_g, fat_g, fiber_g`
- Aggregated daily from food_log entries
- (FR-NW-009–012)

### Continuous Aggregates

- Weekly/monthly macro averages
- Nutrition compliance rate (days hitting targets vs missing)
- Nutrition vs performance correlation data (FR-NW-013)

---

## Azure Functions — Reporting & Analytics API

### Business Analytics

- `GET /reports/revenue` — MRR, ARR, revenue trends, plan breakdown, churn revenue impact (FR-RA-001–005)
- `GET /reports/membership` — active members, new signups, cancellations, net growth, retention rate by cohort (FR-RA-006–010)
- `GET /reports/attendance` — class attendance rates, peak hours, utilization by class type, coach, day of week (FR-RA-011–015)
- `GET /reports/retention` — member lifetime value, churn risk distribution, retention curves (FR-RA-016–018)

### Member Analytics (for gym owners)

- `GET /reports/member-engagement` — engagement scoring, activity distribution, segment breakdown (FR-RA-019–022)
- `GET /reports/member-progress` — aggregate performance trends across membership (FR-RA-023–025)

### Operational Analytics

- `GET /reports/equipment-utilization` — machine usage rates, peak times, maintenance due (FR-RA-026–028)
- `GET /reports/staff` — coach class counts, PT hours, revenue per coach (FR-RA-029–031)
- `GET /reports/capacity` — class fill rates, waitlist frequency, optimal scheduling suggestions (FR-RA-032–034)

### Marketing Analytics

- `GET /reports/leads` — lead pipeline, conversion rates by source, time to convert (FR-RA-035–038)
- `GET /reports/referrals` — referral program performance, top referrers, conversion rate (FR-RA-039–040)
- `GET /reports/campaigns` — email/SMS campaign performance, ROI (FR-RA-041–042)

### Fitness Analytics (platform-wide)

- `GET /reports/fitness/benchmarks` — platform-wide benchmark distributions, percentile curves (FR-RA-043)
- `GET /reports/fitness/trends` — aggregate fitness score trends across platform (FR-RA-044)

### Custom Reports

- `POST /reports/custom` — execute custom report with user-defined filters, grouping, metrics (FR-RA-046)
- `POST /reports/export` — generate CSV or PDF export, return file URL (FR-RA-048)
- Report scheduling — Convex scheduled function triggers Azure Function, stores result, emails via B8 (FR-RA-050)

### Nutrition API

- `GET /nutrition/daily/{date}` — full food log for a day with macro totals (FR-NW-009)
- `GET /nutrition/trends` — macro intake over time with target compliance (FR-NW-010–011)
- `GET /nutrition/correlation` — nutrition vs workout performance analysis (FR-NW-013)
- `GET /nutrition/recommendations` — basic macro targets based on goals and activity level (FR-NW-014)

---

## Convex Server Functions

### Lead Management

- Lead CRUD — create from web form submission, walk-in, manual entry (FR-ML-001–003)
- Lead assignment — auto-assign to staff round-robin or manual (FR-ML-006)
- Lead scoring — configurable rules: source quality, engagement signals, responsiveness (FR-ML-007–008)
- Lead status pipeline — mutations to advance through stages (FR-ML-004–005)
- Lead-to-member conversion — create user account + membership from lead record (FR-ML-010)
- Lead follow-up automation via B8 workflows: new lead → welcome email → follow-up at day 1, 3, 7 (FR-ML-012–014)
- Web form builder — configurable lead capture form fields per tenant, embeddable (FR-ML-009)

### Trial Management

- Trial creation from lead (FR-ML-015)
- Trial-to-paid conversion flow — linked to B10 subscription creation (FR-ML-017)
- Trial expiry handling — scheduled function sends conversion nudges via B8, expires if not converted (FR-ML-018–020)
- Trial analytics — conversion rate, average trial duration, drop-off points (FR-ML-016)

### Referral Program

- Referral link generation per user (FR-ML-025)
- Referral tracking — attribute new lead/member to referrer (FR-ML-027)
- Reward fulfillment — on conversion, apply credit/discount to referrer via B10 (FR-ML-028–029)
- Referral dashboard queries — my referrals, pending rewards, earned rewards (FR-ML-030)

### Retail & POS

- Product catalog CRUD (FR-RP-001–006)
- Inventory management — stock tracking, low stock alerts, restock mutations (FR-RP-007–009)
- In-person sale — create order, process payment via Stripe terminal or manual entry (FR-RP-010–012)
- Online sale — Stripe Checkout for product purchase, shipping info collection (FR-RP-013–015)
- Order fulfillment tracking (FR-RP-016)
- Inventory adjustment mutations with reason logging (FR-RP-009)

### Nutrition

- Food log CRUD — add, edit, delete entries (FR-NW-001–002)
- Food search with autocomplete from food_database (FR-NW-003)
- Custom food item creation (FR-NW-004)
- Nutrition target setting — user or coach sets daily macro targets (FR-NW-006–008)
- Daily summary calculation — aggregate macros from food_log entries (FR-NW-005)
- MyFitnessPal sync — Convex action polls MFP API for logged foods (FR-NW-015)
- Coach nutrition view — coaches see athlete nutrition data when permitted (FR-NW-016)

### Video Analysis (completing B6)

- Shareable annotated video link generation (FR-VA-030)
- Video comparison library — retrieve past videos by movement tag for athlete progress review (FR-VA-032–035)
- Storage quota management per tenant (FR-VA-031)

---

## Key Design Decisions

- **Reporting queries hit TimescaleDB.** Business analytics are aggregation-heavy queries over time series data. Continuous aggregates pre-compute the expensive rollups. Azure Functions serve as the query layer with caching for frequently-accessed reports.
- **Lead management is Convex-native.** Leads are operational data with real-time state — perfect for Convex. No need for a separate CRM system at this stage.
- **Nutrition is lightweight.** Basic macro tracking with a food database, not a full nutrition platform. MyFitnessPal integration covers users who want deeper tracking. YAGNI — keep it simple.
- **Retail is minimal viable.** Product catalog + Stripe checkout + basic inventory. No warehouse management, shipping integrations, or complex variant systems. Shopify integration deferred to B12 for gyms that need more.

---

## Requirements Covered

FR-ML-001–036, FR-RA-001–050, FR-RP-001–027, FR-NW-001–022, FR-VA-030–035

## What's Deferred

- Shopify integration for advanced retail (→ B12)
- Facebook/Instagram ad integration (→ B12)
- A/B testing for campaigns (future)
- Advanced nutrition features (meal planning, recipes) (future)
- Report visual builder UI (→ F9)
