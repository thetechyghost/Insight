# F4 — Profile, Body Comp & Goals

**Priority:** High
**Platform:** React Native (iOS + Android)
**Depends On:** B3, F1
**Key Spec Files:** 02-user-athlete (§4-5), 17-mobile-application

---

## Overview

Personal profile management, body composition tracking with progress photos, goal setting, habit tracking, and training programs.

---

## Screens — Profile

### My Profile

- Avatar, name, bio, training age display (FR-UA-002, FR-UA-005)
- Edit profile — all fields from onboarding plus emergency contact, medical conditions/injury history with coach visibility toggle (FR-UA-006–007)
- Badge showcase — user-selected featured badges displayed on profile (FR-GM-006)
- Stats summary row: total workouts, active streak, fitness score, member since
- Public profile preview — see what other members see based on privacy settings (FR-UA-003)

### Privacy Settings (per gym)

- Toggle visibility: performance data, workout history, body comp, profile (FR-UA-003, FR-MT-011)
- Per-gym granularity — different privacy settings per tenant (FR-MT-011)
- Coach data access toggle — allow/deny coach access to medical info (FR-UA-007)
- Comparison opt-in — enable/disable side-by-side comparison requests (FR-UA-081)

### Account Management

- Linked auth methods — manage Apple ID, Google, email/password connections (FR-UA-009)
- Multi-gym memberships list — all tenants, primary gym designation, join/leave (FR-UA-004)
- Membership transfer request (FR-MT-012)
- Data export — request full personal data download (FR-MT-016)
- Account deletion — initiate GDPR deletion request with confirmation flow (FR-MT-019)
- Unit preferences — lbs/kg, miles/km, °F/°C (FR-UA-002)

---

## Screens — Body Composition

### Body Weight Tracker

- Weight log input — manual entry or auto-imported from smart scale/wearable (FR-UA-083, FR-UA-090)
- Weight trend chart — line graph with moving average smoothing, goal line overlay (FR-UA-083)
- BMI auto-calculated and displayed (FR-UA-087)

### Body Fat & Lean Mass

- Body fat % input — manual or imported (FR-UA-084)
- Lean mass auto-calculated, charted over time (FR-UA-085)
- Dual-axis chart: weight + bf% trends overlaid

### Body Measurements

- Input screen for: waist, hips, chest, arms, thighs, calves, neck (FR-UA-086)
- Measurement history — per-site trend chart
- Summary view — all measurements at latest date vs previous entry, delta shown

### Progress Photos

- Camera capture or photo library import (FR-UA-088)
- Tag photo: front / side / back / custom label
- Photo timeline — scrollable chronological strip (FR-UA-089)
- Side-by-side comparison — pick two dates, overlay or adjacent display (FR-UA-088)
- Photos stored in Convex file storage, never shared unless user explicitly posts to feed
- Pinch-to-zoom, swipe between comparison pairs

### Biometrics Dashboard

- Resting heart rate trend chart (FR-UA-091)
- Blood pressure log and trend (FR-UA-092)
- Sleep duration/quality chart — imported from wearables (FR-UA-093)
- VO2max trend (FR-UA-094)
- HRV trend (FR-UA-095)
- Each metric: latest value, 7-day average, 30-day trend arrow
- Source labels — shows which wearable/integration provided each data point

---

## Screens — Goals

### Goal Dashboard

- Active goals list — each card shows: type icon, target, current progress bar, projected completion date (FR-UA-105)
- Completed goals section — archived achievements
- "Add Goal" flow:
  - Strength goal — pick movement, set target weight (FR-UA-097)
  - Body comp goal — target weight and/or target bf% (FR-UA-098)
  - Endurance goal — pick distance, set target time (FR-UA-099)
  - Consistency goal — target workouts per week (FR-UA-100)
  - Skill goal — pick target movement (e.g., "first muscle-up") (FR-UA-101)
- Goal detail — full progress chart, milestones along the way, related workout history

### Habit Tracker

- Daily habits checklist — user-defined habits, tap to complete (FR-UA-104)
- Weekly view — grid showing completion per day per habit
- Streak display per habit
- "Add Habit" — name, frequency (daily/X per week), reminder time

---

## Screens — Training Programs

### My Programs

- Active program display — current week, today's prescribed workout, overall progress bar (FR-UA-102)
- Program calendar — week view showing each day's workout, completed days checked
- Tap day → view workout detail, option to log it (links to F2 logger pre-populated)
- Coach-assigned programs highlighted with coach name (FR-UA-102)

### Program Marketplace

- Browse/search published programs — filter by goal (strength/endurance/competition), duration, difficulty, author (FR-UA-103)
- Program detail — description, week-by-week overview, author bio, ratings, purchase count
- Purchase/enroll flow — free programs instant enroll, paid programs via Stripe Checkout from B10 (FR-UA-103)
- Guided/follow-along workouts — video playback with metric overlay for programs that include video content (FR-UA-023)

---

## Key Design Decisions

- **Body comp is private by default.** All body composition data, progress photos, and biometrics are visible only to the athlete unless they explicitly enable coach access. No gym owner access to body data — ever. This is a trust boundary.
- **Photos never leave Convex file storage without explicit action.** No auto-sharing, no coach access to photos. If the athlete wants to share a progress photo, they post it to the feed themselves.
- **Goals are smart about data sources.** A strength goal for deadlift automatically pulls the latest PR from TimescaleDB. A body comp goal pulls from the weight log. A consistency goal counts from the workout log. No manual progress updates needed — goals track themselves.
- **Programs bridge coach and athlete.** A coach assigns a program (B6), it appears in the athlete's "My Programs" with daily workouts ready to log. The athlete taps the day, the logger opens pre-populated, they complete and submit. Tight loop.

---

## Requirements Covered

FR-UA-002–008 (profile), FR-UA-083–105 (body comp, biometrics, goals, habits, programs), FR-UA-023 (guided workouts), FR-MT-011–012 (privacy, transfers), FR-MT-016, FR-MT-019 (data export/deletion), FR-GM-006 (badge showcase)

## What's Deferred

- Smart scale direct BLE pairing (→ F5)
- Coach-side view of athlete body comp and goals (→ F7/F9)
- Program creation/authoring UI (→ F7, coach web tool)
