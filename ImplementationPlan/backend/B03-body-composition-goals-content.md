# B3 — Body Composition, Goals & Content

**Priority:** High
**Depends On:** B2
**Key Spec Files:** 02-user-athlete (§4-5), 19-content-exercise-library

---

## Overview

Rounds out the personal athlete experience with body tracking, goal setting, and a full content library.

---

## Convex Schemas

### New

- **`body_measurements`** — waist, hips, chest, arms, thighs, calves, neck, date recorded (FR-UA-086)
- **`progress_photos`** — photo file refs (Convex file storage), date, body region tags, privacy setting (FR-UA-088–089)
- **`goals`** — user goals: type (strength/body_comp/endurance/consistency/skill), target value, target date, status, linked movement or benchmark (FR-UA-097–101)
- **`habits`** — user-defined daily/weekly habits, tracking records per day (FR-UA-104)
- **`training_programs`** (extended) — add marketplace fields: price, published status, purchase count, ratings, author bio (FR-UA-103)
- **`program_content`** — per-day/per-week content within programs: workout definitions, rest days, notes (FR-EL-013–018)
- **`educational_content`** — articles, tutorials, movement guides, tags, difficulty level (FR-EL-030–036)

### Extended (from B2)

- **`exercises`** — add scaling alternatives, common substitutions, difficulty level, progression paths (FR-EL-005–008)
- **`benchmark_workouts`** — add categories (Hero, Girl, Open, custom), description, intended stimulus (FR-EL-009–012)

---

## TimescaleDB — Biometric Time Series

### Tables Now Active

**`body_composition`** hypertable:
- `user_id, tenant_id, timestamp`
- `weight, body_fat_pct, lean_mass (computed), bmi (computed)` (FR-UA-083–085, FR-UA-087)

**`biometric_readings`** hypertable (schema from B0, now populated):
- `user_id, tenant_id, timestamp, source`
- `metric_type` (resting_hr, blood_pressure_sys, blood_pressure_dia, sleep_duration, sleep_quality, vo2max, hrv)
- `value, unit` (FR-UA-091–095)

### Continuous Aggregates

- Weekly/monthly body weight averages and trends
- Body comp vs performance correlation data (FR-UA-075)

---

## Azure Functions — Body & Goals API

### Body Composition

- `POST /body-comp` — log weight, body fat, measurements
- `GET /body-comp/trends` — weight/bf%/lean mass over time with trend lines (FR-UA-083–085)
- `GET /body-comp/bmi` — auto-calculated from height + latest weight (FR-UA-087)
- `GET /body-comp/correlation` — body metrics vs workout performance overlay (FR-UA-075)

### Biometrics

- `POST /biometrics` — log resting HR, blood pressure, manual entries (FR-UA-091–092)
- `GET /biometrics/trends` — time series for any biometric type
- Smart scale data ingestion endpoint (FR-UA-090) — webhook receiver for supported scale APIs

### Goal Progress

- `GET /goals/{id}/progress` — current value vs target, projected completion date (FR-UA-105)
- `GET /goals/dashboard` — all active goals with progress summaries (FR-UA-105)
- Goal progress calculation pulls latest data from TimescaleDB (strength goals check PR table, endurance goals check best times, consistency goals count workout frequency)

---

## Convex Server Functions

### Goals & Habits

- Goal CRUD — create, update, archive, delete (FR-UA-097–101)
- Habit CRUD — define habits, log daily completion (FR-UA-104)
- Goal auto-detection — when a PR or body comp entry satisfies a goal, mark complete + trigger notification
- Habit streak tracking — consecutive days/weeks completed

### Content Library

- Exercise library CRUD (platform-level, seeded with initial data) (FR-EL-001–008)
- Benchmark workout CRUD (FR-EL-009–012)
- Training program CRUD + marketplace listing (FR-EL-013–018)
- Program purchase/enrollment flow (FR-UA-103)
- Educational content CRUD + tagging + search (FR-EL-030–036)
- Content search with filters (category, difficulty, equipment, muscle group)

### Progress Photos

- Upload via Convex file storage (FR-UA-088)
- Timeline query — chronological photo feed (FR-UA-089)
- Side-by-side comparison — return two photos by date selection (FR-UA-088)
- Privacy enforcement — photos never visible to other users unless explicitly shared

---

## Requirements Covered

FR-UA-083–105, FR-EL-001–036, FR-UA-075 (body comp vs performance)

## What's Deferred

- Wearable-sourced biometrics (auto-import of sleep, HRV, VO2max) → B5
- Nutrition tracking → B11
- Coach-assigned goals → B6
- Program marketplace payments → B10
