# B6 — Coach/Trainer Tools

**Priority:** Medium
**Depends On:** B2
**Key Spec Files:** 03-coach-trainer

---

## Overview

Gives coaches everything they need to program workouts, monitor athletes, run classes, and provide video feedback. Builds on the athlete data from B2–B5.

---

## Convex Schemas

### New

- **`programs_coach`** — coach-authored multi-week programs: name, tenant, author, periodization type (linear/undulating/conjugate/block), phase labels, published status, track (Competitors/Fitness/Endurance/Foundations) (FR-CT-001–010)
- **`program_days`** — per-day content within a program: workout definition ref, coach notes, intended stimulus, scaling guidance, warm-up, cool-down (FR-CT-013–016)
- **`daily_wod`** — published workout of the day per tenant per track: date, workout definition, coach notes, stimulus description, scaling options, publish time, auto-publish schedule (FR-CT-011–019)
- **`program_revisions`** — undo/revision history for program changes (FR-CT-010)
- **`classes`** — class definitions: tenant, name, recurring schedule (days, time, duration), capacity, coach, track, location (FR-CT-038–041)
- **`class_sessions`** — individual instances of a class: date, coach (supports substitutes), workout ref, status (scheduled/in-progress/complete), linked equipment session IDs (FR-CT-047, FR-CT-072)
- **`class_registrations`** — athlete-to-session: status (registered/waitlisted/attended/no-show/late-cancel), check-in time, check-out time (FR-CT-040–043)
- **`video_submissions`** — athlete-submitted videos: file ref, movement tag, status (pending/reviewed/returned), submitted date (FR-CT-049, FR-CT-057)
- **`video_annotations`** — per-video: frame timestamp, annotation type (drawing/text/voice-over), content/file ref, annotation template ref (FR-CT-051–053, FR-CT-058)
- **`annotation_templates`** — reusable correction patterns: name, movement category, content (FR-CT-058)
- **`coach_notes`** — private per-athlete notes, not visible to athlete (FR-CT-035)
- **`class_notes`** — post-class summaries per session (FR-CT-048)

### Extended (from B2)

- **`workout_definitions`** — add fields: intended_stimulus, scaling_guidance, warm_up_ref, cool_down_ref, movement_demo_video_refs (FR-CT-006, FR-CT-014–017)
- **`exercises`** — add demo video file refs for linking to published workouts (FR-CT-017)

---

## Azure Functions — Coach Analytics API

### Programming Analysis

- `GET /coach/programming/coverage` — domain and modality balance analysis over configurable window (FR-CT-020)
- `GET /coach/programming/time-domains` — duration distribution of programmed workouts (FR-CT-021)
- `GET /coach/programming/movement-frequency` — how often each movement appears (FR-CT-022)
- `GET /coach/programming/gaps` — movements/modalities/domains missing for extended periods, with alerts (FR-CT-023)
- `GET /coach/programming/comparison` — coach's distribution vs balanced reference benchmarks (FR-CT-024)
- `GET /coach/programming/load-trends` — aggregate volume and intensity over time (FR-CT-025)

### Athlete Monitoring

- `GET /coach/athlete/{id}/summary` — full training history, fitness scores, domain breakdown (FR-CT-026–027)
- `GET /coach/athlete/{id}/volume` — volume, frequency, intensity over configurable periods (FR-CT-028)
- `GET /coach/athlete/{id}/body-comp` — body composition and nutrition data (FR-CT-032)
- `GET /coach/athlete/{id}/readiness` — wearable-sourced recovery/readiness metrics (FR-CT-037)
- `GET /coach/athlete/{id}/progress` — historical trend views of key metrics (FR-CT-031)
- `GET /coach/athletes/inactive` — athletes below configurable attendance threshold (FR-CT-029)
- `GET /coach/athletes/at-risk` — churn prediction flags (FR-CT-030)

### Class Analytics

- `GET /coach/class/{id}/post-summary` — all results side-by-side, PBs flagged, average pace, class stats (FR-CT-076)
- `GET /coach/class/{id}/export` — CSV export with splits and PB indicators (FR-CT-077)
- `GET /coach/class/analytics` — attendance rates, pace/wattage trends, utilization stats over time (FR-CT-081)
- `GET /coach/class/{id}/leaderboard-image` — generates shareable leaderboard image (FR-CT-078)

---

## Convex Server Functions

### Workout Programming

- Workout builder CRUD — create/edit workout definitions with drag-and-drop data model (ordered component list) (FR-CT-001–002)
- Program CRUD — multi-week programs with periodization (FR-CT-003–004)
- Percentage-based load auto-calc — reads athlete's latest 1RM from TimescaleDB via action, returns prescribed weights (FR-CT-005)
- Copy/duplicate workouts across days and weeks (FR-CT-007)
- Import programs from templates or shared coaches (FR-CT-008)
- Programming calendar — ordered workout assignments by date with reordering support (FR-CT-009)
- Revision history — snapshot on each save, revert to previous version (FR-CT-010)
- Multi-track management — CRUD for program tracks, assign daily WODs per track (FR-CT-012)
- Scheduled publishing — Convex cron triggers publish at configured time, sends push notification (FR-CT-018–019)

### Class Management

- Class definition CRUD with recurrence patterns (FR-CT-038)
- Assign workout to class session (FR-CT-039)
- Registration with capacity enforcement (FR-CT-041)
- Waitlist auto-promotion on cancellation (FR-CT-042)
- Check-in/check-out mutations (FR-CT-040)
- Late cancel and no-show tracking (FR-CT-043)
- Class roster real-time subscription (FR-CT-044)
- Substitute coach assignment per session (FR-CT-047)
- Link class session to equipment sessions for live leaderboard (FR-CT-072)

### Video Review

- Video upload to Convex file storage (FR-CT-049)
- Video submission queue — real-time subscription for pending reviews (FR-CT-057)
- Annotation CRUD — drawings, text, voice-over per frame/time range (FR-CT-051–053)
- Annotation template management (FR-CT-058)
- Side-by-side comparison — return two video refs for client-side rendering (FR-CT-054)
- Video tagging by movement type (FR-CT-059)
- Send annotated feedback back to athlete — mutation updates status, triggers notification (FR-CT-056)

### Athlete Management

- Coach view of any member's workout history (scoped to tenant) (FR-CT-026)
- Set individualized goals for athletes (FR-CT-033)
- Assign workouts/programs to individual athletes (FR-CT-034)
- Private coach notes CRUD (FR-CT-035)
- Attendance tracking queries (FR-CT-036)
- Comment on athlete workout logs (FR-CT-063)
- Milestone celebration triggers — Convex scheduled function detects new PRs, generates shout-out (FR-CT-064)

---

## Key Design Decisions

- **Programming is Convex-native:** Workout definitions, programs, calendar scheduling, revision history — all live in Convex with real-time subscriptions. Coaches see instant updates. Analytics (coverage, gaps, load trends) query TimescaleDB via Azure Functions since they're aggregation-heavy.
- **Class ↔ Equipment bridge:** A class session links to equipment sessions from B4. When a coach starts a class, the system creates equipment sessions for registered machines and subscribes to live telemetry. The live leaderboard is a Convex real-time subscription fed by the Azure Function `LiveDataBroadcaster` from B4.
- **Video storage:** Raw video in Convex file storage (simple, integrated). Annotations are structured data in Convex. Frame-by-frame playback and drawing overlays are client-side rendering concerns (F7/F9).
- **No client-side coach UI yet:** This phase produces APIs and server functions. Coach mobile UI comes with F3/F6, web admin UI comes with F7.

---

## Requirements Covered

FR-CT-001–081, FR-VA-001–035 (video backend infrastructure)

## What's Deferred

- Email/SMS campaign tools for coaches (→ B8)
- Automated announcements (→ B8)
- In-class timer TV display mode (→ F7)
- Video playback controls, slow-mo, zoom (→ F7 client-side)
- Drag-and-drop UI for workout builder (→ F7)
