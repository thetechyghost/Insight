# F2 — Workout Logging & Timers

**Priority:** Critical
**Platform:** React Native (iOS + Android)
**Depends On:** B2, F1
**Key Spec Files:** 02-user-athlete (§2), 17-mobile-application

---

## Overview

The core daily interaction. Athletes log workouts, use timers, track sets, and see their results. This is where the app becomes useful.

---

## Screens — Workout Logging

### Daily WOD Screen

- Display today's programmed workout with full detail: movements, rep scheme, weight prescriptions, coach notes, intended stimulus, scaling guidance (FR-CT-011–016)
- Show movement demo video thumbnails — tap to play (FR-CT-017)
- "Start Workout" one-tap button — opens logging screen pre-populated with WOD (FR-UA-051)
- Multi-track selector if gym offers multiple tracks (Competitors/Fitness/etc.) (FR-CT-012)
- Display user's previous score if re-logging a benchmark (FR-UA-044)

### Workout Logger

- Workout type selector: ForTime, AMRAP, EMOM, Tabata, Max Effort, Max Reps, Rounds for Time, Strength, Endurance, Interval, Custom, Multi-part (FR-UA-010–021)
- Per-type input fields:
  - ForTime → time input (mm:ss.ms) (FR-UA-025)
  - AMRAP → rounds + remaining reps (FR-UA-026)
  - EMOM → rounds completed + weights (FR-UA-012)
  - Tabata → lowest round + total reps (FR-UA-013)
  - Max Effort → weight input with plate math helper (FR-UA-014)
  - Strength → set/rep/weight grid with batch entry (FR-UA-017, FR-UA-049)
  - Endurance → distance, time, pace auto-calculated (FR-UA-018)
  - Interval → per-interval logging with work/rest inputs (FR-UA-019)
  - Multi-part → tabbed sections (warm-up/strength/metcon/cooldown) (FR-UA-021)
- Movement search with autocomplete — type to find, shows recent movements first (FR-UA-048)
- Scaling designation: Rx / Rx+ / Scaled with notes field (FR-UA-036)
- RPE slider (1–10) (FR-UA-037)
- Movement substitution logging with reason (FR-UA-038)
- Free-text notes field (FR-UA-039)
- Rest period tracking between sets (FR-UA-040)
- Tempo notation input (eccentric/pause/concentric/pause) (FR-UA-041)
- Band/assistance level selector for gymnastics (FR-UA-042)
- Auto-save draft every 10 seconds (FR-UA-053)
- Copy from previous workout button (FR-UA-052)

### Quick Log

- Benchmark workout picker — search/browse named workouts (FR-UA-022)
- Pre-populated fields from last attempt (FR-UA-043)
- Previous score displayed prominently with date (FR-UA-044)
- Minimal input — just the result (time, reps, weight) + optional RPE and notes

### Open Gym Logger

- Unstructured session — free-form movement/set/rep logging (FR-UA-024)
- Add movements ad-hoc, no predefined structure
- Running timer optional

---

## Screens — Timers

### Timer Suite

- Countdown timer — set duration, start, audible beep at finish (FR-UA-045)
- Count-up timer — stopwatch with lap splits (FR-UA-045)
- EMOM timer — configurable minute intervals, beep on each minute, round counter (FR-UA-045)
- Tabata timer — 20s work / 10s rest (configurable), round counter, beep on transitions (FR-UA-045)
- Custom interval timer — configurable work/rest durations, round count (FR-UA-045)
- Timer persists in background — audio cues continue when screen is off or app is backgrounded
- Timer overlay — semi-transparent overlay on logging screen so timer and logging coexist

### Barbell Calculator

- Input target weight → display plate configuration per side (FR-UA-046)
- Configurable bar weight (45lb/35lb/20kg/15kg)
- Configurable available plates
- Percentage calculator — input % of 1RM, auto-lookup user's 1RM for selected movement, display target weight + plates (FR-UA-047)

---

## Screens — Workout History

- Scrollable history list — filterable by date range, workout type, movement, benchmark (FR-UA-114)
- Workout detail view — full metrics, splits, HR data if available, notes, scaling
- Edit past workout — reopen logger with saved data, update and re-submit
- Delete workout with confirmation

---

## Screens — Post-Workout

### Post-Workout Summary

- Renders within 1.5s of completion (NFR-001)
- Key stats hero card (FR-UA-106 pattern, generalized for all workout types)
- PR flags with celebratory animation if new personal records detected (FR-UA-058)
- Comparison to previous attempt for benchmarks
- HR zone breakdown if wearable data available (FR-UA-032)
- Share button → generates styled summary card image for social media (FR-UA-116)
- "Post to Feed" toggle — share to gym activity feed (FR-SC-001)
- RPE prompt if not entered during workout

---

## Voice Logging

- Hands-free mode — activate via button or "Hey Siri" / Google Assistant shortcut (FR-UA-050)
- Voice commands: "Log 10 reps at 135 pounds", "Set done", "Start rest timer"
- Speech-to-text via platform native APIs (iOS Speech, Android SpeechRecognizer)
- Confirmation display after each voice input — tap to correct if misheard

---

## Data Flow

```
User taps "Complete Workout"
  → Convex mutation: save workout_log (metadata, draft=false)
  → Convex action → Azure Function POST /workouts
      → Write metrics to TimescaleDB
      → PR detection (server-side, NFR-012)
      → Fitness score update
      → Return: summary + new PRs + percentile
  → Convex mutation: store PR flags, create feed item, trigger notifications
  → UI: render post-workout summary with PR celebrations
```

---

## Offline Support

- Draft workouts saved locally (AsyncStorage) when offline
- On reconnect, auto-submit pending drafts via Convex mutation queue
- Timer functionality works fully offline — no network dependency
- Barbell calculator works fully offline

---

## Key Design Decisions

- **Timer is a first-class citizen.** Athletes interact with the timer more than any other feature during a workout. It runs in a foreground service (Android) / background mode (iOS) with audio cues. Never interrupted by navigation or screen lock.
- **Logger adapts to workout type.** Instead of one generic form, the logger reshapes its input fields based on the selected workout type. AMRAP shows rounds+reps. Strength shows the set grid. Endurance shows distance/time/pace. Less cognitive overhead for the athlete.
- **Post-workout is the dopamine moment.** PR celebrations, comparisons, share cards — this is where engagement happens. The 1.5s render target (NFR-001) ensures the moment isn't lost to loading spinners.
- **Voice logging is stretch but designed in.** The architecture supports it from day one (simple command parsing). Initial implementation can be basic and improve over time.

---

## Requirements Covered

FR-UA-010–053 (all workout tracking & logging UX), FR-UA-058 (PR celebration), FR-UA-106 (post-workout summary pattern), FR-UA-116 (share card), FR-MA-006–015 (mobile UX features), NFR-001

## What's Deferred

- Concept2 BLE direct connection (→ F5)
- HR overlay during workout (→ F5, needs wearable connection)
- Guided/follow-along video workouts (→ F4)
