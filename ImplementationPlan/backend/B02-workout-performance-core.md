# B2 — Workout & Performance Core

**Priority:** Critical
**Depends On:** B1
**Key Spec Files:** 02-user-athlete (§1-3), 19-content-exercise-library

---

## Overview

The heart of the platform. After this phase, athletes can log any workout type, track PRs, see fitness scores, and query their performance history.

---

## Convex Schemas

### New

- **`exercises`** — movement library: name, category (weightlifting/gymnastics/monostructural), equipment, muscle groups, demo video refs, aliases for search (FR-EL-001–008)
- **`benchmark_workouts`** — named workouts (Fran, Murph, etc.), workout type, prescribed movements, time caps, scoring method (FR-UA-022, FR-EL-009–012)
- **`workout_definitions`** — structured workout templates: type (ForTime/AMRAP/EMOM/Tabata/etc.), components, movements, rep schemes, scaling options (FR-UA-010–024)
- **`workout_logs`** — metadata per logged session: user, tenant, workout definition ref, date, workout type, scaling designation (Rx/Rx+/Scaled), RPE, notes, draft status (FR-UA-036–039, FR-UA-053)
- **`training_programs`** — multi-week program containers: name, description, author (coach or platform), weeks, phase labels (FR-UA-102–103)
- **`program_assignments`** — user-to-program links, start date, current week (FR-UA-102)

### Extended (from B0/B1)

- **`users`** — add unit preferences (lbs/kg, miles/km), default scaling level

---

## TimescaleDB — Workout Metrics

### Tables Now Active

**`workout_metrics`** hypertable — one row per metric per set/interval:
- `user_id, tenant_id, workout_log_id, timestamp`
- `metric_type` (time, reps, weight, distance, calories, pace, power, cadence, stroke_rate, split_time)
- `value, unit, set_number, round_number, interval_number, movement_id`
- (FR-UA-025–035, FR-UA-040–042)

**`personal_records`** — materialized/computed table:
- `user_id, movement_id, benchmark_workout_id, record_type (1RM, max_reps, best_time, best_distance, best_pace, max_power)`
- `value, unit, achieved_at, workout_log_id`
- (FR-UA-054–059)

### Continuous Aggregates

- Weekly/monthly training volume (total reps, total tonnage) (FR-UA-068)
- Weekly/monthly workout frequency (FR-UA-067)
- Movement frequency distribution (FR-UA-070)
- Time domain distribution (FR-UA-071)
- Modality distribution (FR-UA-072)
- Intensity distribution over time (FR-UA-076)

---

## Azure Functions — Performance API

### Workout Logging Endpoints

- `POST /workouts` — receive workout log + metrics, write to Convex (metadata) + TimescaleDB (metrics) in a coordinated flow
- `PUT /workouts/{id}` — update/edit a logged workout
- `GET /workouts` — query with filters (date range, workout type, movement, benchmark) (FR-UA-114)
- `GET /workouts/{id}/summary` — full workout detail with all metrics

### PR Detection & Management

- PR detection runs server-side on every workout log write (NFR-012)
- `GET /prs` — full PR board by movement and benchmark (FR-UA-055)
- `GET /prs/{movement}/history` — PR progression timeline (FR-UA-057)
- Estimated 1RM calculation from rep-max data (Epley, Brzycki) (FR-UA-059)
- PR notification trigger → pushes event to Convex for notification delivery (FR-UA-058)

### Fitness Scoring

- `GET /fitness-score` — composite 0–100 score across 10 physical domains (FR-UA-060–061)
- `GET /fitness-score/breakdown` — spider/radar chart data (FR-UA-062)
- Score updates dynamically per logged workout (FR-UA-063)
- `GET /fitness-score/percentile` — rank vs platform population, with age/gender adjustment (FR-UA-064–065)
- Fitness tier classification (Beginner/Intermediate/Advanced/Elite) (FR-UA-066)

### Trend & Progress Analytics

- `GET /analytics/volume` — training volume over time (FR-UA-068)
- `GET /analytics/frequency` — workouts per week/month (FR-UA-067)
- `GET /analytics/consistency` — calendar/heatmap data (FR-UA-069)
- `GET /analytics/movements` — movement frequency analysis (FR-UA-070)
- `GET /analytics/time-domains` — duration distribution (FR-UA-071)
- `GET /analytics/modalities` — modality breakdown (FR-UA-072)
- `GET /analytics/movement/{id}/history` — historical performance chart (FR-UA-073)
- `GET /analytics/1rm-trends` — estimated 1RM over time (FR-UA-074)
- `GET /analytics/intensity` — intensity distribution (FR-UA-076)
- `GET /analytics/recovery` — session gaps, volume spike flags (FR-UA-077)

### Comparative Analytics

- `GET /compare/gym-average/{workout_id}` — user vs gym average (FR-UA-078)
- `GET /compare/global/{workout_id}` — user vs platform community (FR-UA-079)
- `GET /compare/percentile/{workout_id}` — percentile rank with age/gender/bodyweight filters (FR-UA-080–082)
- `GET /compare/athlete/{other_user_id}` — side-by-side (requires mutual consent check via Convex) (FR-UA-081)

---

## Convex Server Functions (Workout UX Support)

- Quick-log: pre-populate from workout history (FR-UA-043)
- Previous scores lookup for benchmark re-logs (FR-UA-044)
- Movement search with autocomplete (FR-UA-048)
- Copy previous workout as template (FR-UA-052)
- Auto-save draft workouts (FR-UA-053)
- Batch set entry helper (FR-UA-049)

---

## Data Flow Pattern

```
Client (log workout)
    → Convex mutation (save workout_log metadata, draft=false)
    → Convex action → Azure Function POST /workouts
        → Write metrics to TimescaleDB
        → Run PR detection
        → Update fitness score
        → Return summary + any new PRs
    → Convex mutation (store PR flags, trigger notifications)
```

---

## Key Design Decisions

- **Dual write coordination:** Convex owns the workout log record (metadata, social, UX state). TimescaleDB owns the metrics. The Azure Function is the authority for PR calculations and analytics — never computed client-side (NFR-012).
- **Time precision:** All times stored at second precision, pace calculations at millisecond (NFR-013).
- **Duplicate prevention:** Each workout_log gets a client-generated idempotency key. TimescaleDB enforces uniqueness on `(user_id, idempotency_key)` (NFR-011).

---

## Requirements Covered

FR-UA-010–082, FR-EL-001–012 (basic exercise/benchmark library), NFR-001, NFR-004, NFR-011–014

## What's Deferred

- Workout timers, barbell calculator, voice logging (→ F2, client-side)
- Body composition vs. performance correlation (→ B3)
- Concept2-specific tracking (→ B4)
- Coach programming tools (→ B6)
