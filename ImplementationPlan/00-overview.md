# Insight Platform — Implementation Plan

## Approach

**Foundation + Priority Domains** — Build a solid cross-cutting foundation (auth, multi-tenancy, data pipeline, core schemas), then build out backend domains in priority order, followed by frontend as a separate stream once APIs are stable.

### Why This Approach

- **Solo developer** — plays to backend strength (C#/Azure), defers React Native learning curve until APIs are proven
- **API-first** — full data platform (Convex + TimescaleDB + Azure Functions + Event Hub) as first milestone
- **IoT designed in from start** — data models and pipeline architecture support FitTrack Integration Device from day one
- **Personal workout experience prioritized** over gym management features

### Infrastructure

- Convex account: provisioned
- Azure subscription: provisioned
- Both ready for immediate schema and service development

---

## Architecture Overview

### Dual-Backend Platform

- **Convex** — operational data (users, tenants, memberships, scheduling, messaging, social, gamification) with real-time subscriptions
- **Azure Functions (C#)** + **TimescaleDB** — performance data (workout metrics, PRs, fitness scores, analytics, equipment telemetry, biometrics)
- **Azure Event Hub** + **IoT Hub** — real-time ingestion pipeline for connected equipment and wearables

### Three Client Applications

- **React Native mobile app** (athletes, coaches) — 8 phases (F1–F6, F8)
- **React web admin** (coaches, gym owners, super admin) — 4 phases (F7, F9–F10)
- **Native watch apps** (Apple Watch, Wear OS) — 1 phase (F8)

---

## Phase Map

### Backend Stream (13 phases)

| # | Phase | Depends On | Priority | Key Spec Files |
|---|-------|------------|----------|----------------|
| B0 | Foundation Platform | — | Critical | 01, 22, 24, 25 |
| B1 | Gym Owner/Tenant Management | B0 | Critical | 04 |
| B2 | Workout & Performance Core | B1 | Critical | 02 (§1-3), 19 |
| B3 | Body Composition, Goals & Content | B2 | High | 02 (§4-5), 19 |
| B4 | Connected Equipment & IoT Pipeline | B2 | High | 12, 02 (§6) |
| B5 | Wearable Integration | B3, B4 | High | 11 |
| B6 | Coach/Trainer Tools | B2 | Medium | 03 |
| B7 | Social, Community & Gamification | B2 | Medium | 14, 21 |
| B8 | Communication & Messaging | B1 | Medium | 08 |
| B9 | Scheduling & Booking | B6, B8 | Lower | 06 |
| B10 | Billing & Payments | B1 | Lower | 07 |
| B11 | Marketing, Reporting & Advanced | B8, B10 | Lower | 09, 10, 13, 15, 20 |
| B12 | Platform Admin, Compliance & API | All | Lower | 05, 16, 23, 24 |

### Frontend Stream (10 phases)

| # | Phase | Platform | Depends On | Priority |
|---|-------|----------|------------|----------|
| F1 | Mobile App Shell & Auth | React Native | B0 | Critical |
| F2 | Workout Logging & Timers | React Native | B2, F1 | Critical |
| F3 | Performance Dashboards | React Native | B2, B3, F2 | High |
| F4 | Profile, Body Comp & Goals | React Native | B3, F1 | High |
| F5 | BLE & Wearable Connectivity | React Native | B4, B5, F2 | High |
| F6 | Social, Leaderboards & Messaging | React Native | B7, B8, F3 | Medium |
| F7 | Web Admin Shell & Dashboard | React | B6, F1 | Medium |
| F8 | Watch/Wearable Companion Apps | Native | B5, F5 | Medium |
| F9 | Web Admin — Classes, Members, Equipment | React | B9, B10, F7 | Lower |
| F10 | Web Admin — Marketing, Reports, Retail, Super Admin | React | B11, B12, F9 | Lower |

---

## Dependency Graph

```
                    B0 (Foundation)
                    │
                    ▼
                    B1 (Tenant/Member Mgmt) ──────────────────────┐
                    │                                              │
                    ├──────────────┬───────────────┐               │
                    ▼              ▼               ▼               ▼
                    B2 (Workout)   B8 (Comms)      B10 (Billing)  F1 (Mobile Shell)
                    │              │               │               │
          ┌────────┼────────┐     │               │               │
          ▼        ▼        ▼     │               │               ▼
          B3       B4       B6    │               │              F2 (Logging)
         (Body)  (IoT)   (Coach)  │               │               │
          │        │        │     │               │          ┌────┼────┐
          ▼        ▼        │     │               │          ▼    ▼    ▼
          B5       │        │     │               │         F3   F4   F5
        (Wearable) │        ▼     ▼               ▼        (Dash)(Body)(BLE)
                   │        B7    B9              B11        │         │
                   │      (Social)(Sched)        (Mktg)      ▼         ▼
                   │        │     │               │         F6        F8
                   │        │     │               │       (Social)  (Watch)
                   │        │     ▼               ▼
                   │        │     F7 ──→ F9 ──→ F10
                   │        │   (Web)  (Admin) (Reports)
                   │        │
                   ▼        ▼
                   B12 (Platform Admin, Compliance, API)
```

---

## Solo Dev Build Order (Recommended)

Interleave backend and frontend once B2 is complete:

```
B0 → B1 → B2 → B3 → B4 → B5     (backend foundation + core athlete experience)
              ↘
               F1 → F2            (start mobile once B2 is stable)
                     ↘
B6 → B7 → B8          F3 → F4 → F5 → F6   (backend + mobile in parallel)
                                        ↘
B9 → B10 → B11 → B12                    F7 → F8 → F9 → F10
```

Start F1/F2 once B2 is complete — this gives you a usable app early while continuing backend work. The interleaving lets you validate APIs with real UI as you build.

---

## Requirements Coverage

All 822+ requirements across 28 specification documents are mapped:

| Spec | Phases |
|------|--------|
| 01 Platform Architecture | B0, B1 |
| 02 User/Athlete | B2, B3, B4, F2, F3, F4 |
| 03 Coach/Trainer | B6, F7 |
| 04 Tenant/Gym Owner | B1, F9 |
| 05 Platform Admin | B12, F10 |
| 06 Scheduling & Booking | B9, F9 |
| 07 Billing & Payments | B10, F9 |
| 08 Communication & Messaging | B8, F6, F10 |
| 09 Marketing & Lead Mgmt | B11, F10 |
| 10 Reporting & Analytics | B11, F10 |
| 11 Wearable & Device Integration | B5, F5, F8 |
| 12 Connected Equipment | B4, F5, F7, F9 |
| 13 Video Upload & Analysis | B6, B11, F7 |
| 14 Social & Community | B7, F6 |
| 15 Retail & Point of Sale | B11, F10 |
| 16 Access Control & Facility | B12, F9 |
| 17 Mobile Application | F1–F6 |
| 18 Desktop/Tablet Admin | F7, F9, F10 |
| 19 Content & Exercise Library | B2, B3 |
| 20 Nutrition & Wellness | B11, F10 |
| 21 Gamification & Motivation | B7, F6 |
| 22 Multi-Tenancy & Data | B0 |
| 23 Integrations & API | B5, B12 |
| 24 Compliance & Legal | B0, B12, F10 |
| 25 Non-Functional Requirements | B0, B2, B4 |
| Tech Stack | B0 (architecture) |

---

## Phase Detail Documents

### Backend
- [B0 — Foundation Platform](backend/B00-foundation-platform.md)
- [B1 — Gym Owner/Tenant Management](backend/B01-gym-owner-tenant-management.md)
- [B2 — Workout & Performance Core](backend/B02-workout-performance-core.md)
- [B3 — Body Composition, Goals & Content](backend/B03-body-composition-goals-content.md)
- [B4 — Connected Equipment & IoT Pipeline](backend/B04-connected-equipment-iot.md)
- [B5 — Wearable Integration](backend/B05-wearable-integration.md)
- [B6 — Coach/Trainer Tools](backend/B06-coach-trainer-tools.md)
- [B7 — Social, Community & Gamification](backend/B07-social-community-gamification.md)
- [B8 — Communication & Messaging](backend/B08-communication-messaging.md)
- [B9 — Scheduling & Booking](backend/B09-scheduling-booking.md)
- [B10 — Billing & Payments](backend/B10-billing-payments.md)
- [B11 — Marketing, Reporting & Advanced](backend/B11-marketing-reporting-advanced.md)
- [B12 — Platform Admin, Compliance & API](backend/B12-platform-admin-compliance-api.md)

### Frontend
- [F1 — Mobile App Shell & Auth](frontend/F01-mobile-app-shell-auth.md)
- [F2 — Workout Logging & Timers](frontend/F02-workout-logging-timers.md)
- [F3 — Performance Dashboards](frontend/F03-performance-dashboards.md)
- [F4 — Profile, Body Comp & Goals](frontend/F04-profile-body-comp-goals.md)
- [F5 — BLE & Wearable Connectivity](frontend/F05-ble-wearable-connectivity.md)
- [F6 — Social, Leaderboards & Messaging](frontend/F06-social-leaderboards-messaging.md)
- [F7 — Web Admin Shell & Dashboard](frontend/F07-web-admin-shell-dashboard.md)
- [F8 — Watch/Wearable Companion Apps](frontend/F08-watch-wearable-companion.md)
- [F9 — Web Admin — Classes, Members, Equipment](frontend/F09-web-admin-classes-members-equipment.md)
- [F10 — Web Admin — Marketing, Reports, Retail, Super Admin](frontend/F10-web-admin-marketing-reports-retail-admin.md)
