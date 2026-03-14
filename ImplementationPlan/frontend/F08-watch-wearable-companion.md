# F8 — Watch & Wearable Companion Apps

**Priority:** Medium
**Platform:** Native (Swift/SwiftUI for Apple Watch, Kotlin/Compose for Wear OS)
**Depends On:** B5, F5
**Key Spec Files:** 17-mobile-application (§watch), 11-wearable-device-integration

---

## Overview

Native companion apps for Apple Watch and Wear OS. Focused on workout tracking, live metrics, and quick interactions — not full app replicas.

---

## Apple Watch App

### Technology

- WatchKit with SwiftUI (native, not React Native bridge)
- WatchConnectivity framework for iPhone ↔ Watch communication
- HealthKit direct integration on-watch
- CoreBluetooth for direct HR monitor connection from wrist

### Screens — Workout

**Active Workout** — the primary screen during training:
- Large timer display (count-up or countdown synced with phone) (FR-MA-041)
- Current heart rate — large number, zone color background (FR-MA-042)
- Swipe/crown scroll between metric pages: HR, calories, elapsed time, current set info
- Haptic alerts: timer complete, zone change, round transition (FR-MA-043)
- "Log Set" button — tap to record current set as complete, auto-advances to next (FR-MA-044)
- "Finish" button — ends workout, syncs to phone

**Quick Start** — watch face complication tap:
- Start today's WOD with one tap (FR-MA-041)
- Start open gym timer
- Start Concept2 session (if PM5 BLE in range)

**Workout Summary** — post-workout on wrist:
- Duration, calories, average HR, peak HR, time in zones
- PR flag if detected (synced from phone after server processing)

### Screens — Metrics

**Today's Stats** — glanceable:
- Workout streak status
- Today's activity: workouts completed, calories
- Next scheduled class with time countdown
- Resting HR (latest reading)

**Heart Rate** — live:
- Current HR from watch sensor
- Zone indicator
- Session HR graph (during workout)
- Broadcasts HR to phone app → phone forwards to platform (as wearable HR data source)

### Screens — Notifications

Actionable notifications on wrist:
- Class reminder → "Check In" button (FR-MA-045)
- WOD published → preview first movement
- PR achieved → celebration haptic
- Streak at risk → "Log Workout" shortcut
- Message received → read + quick reply (canned responses)

### Complications

- Workout streak count
- Next class countdown
- Today's fitness score
- Active HR (during workouts)

### Data Flow

```
Watch sensor (HR) → WatchConnectivity → iPhone app → Azure Event Hub
Watch "Log Set" → WatchConnectivity → iPhone app → Convex mutation
iPhone notification → WatchConnectivity → Watch display
```

---

## Wear OS App

### Technology

- Jetpack Compose for Wear OS (native Kotlin)
- Data Layer API for phone ↔ watch communication
- Health Services API for HR and workout tracking
- Companion app communicates with React Native Android app via Data Layer

### Screens — Same feature set as Apple Watch

- Active Workout with timer, HR, set logging (FR-MA-041–044)
- Quick Start via tile
- Workout Summary
- Today's Stats
- Heart Rate live view
- Actionable notifications (FR-MA-045)

### Tiles (Wear OS equivalent of complications)

- Workout streak
- Next class
- Quick start workout

### Data Flow

```
Watch sensor (HR) → Data Layer API → Android app → Azure Event Hub
Watch "Log Set" → Data Layer API → Android app → Convex mutation
Android notification → Data Layer API → Watch display
```

---

## Shared Design Principles (Both Platforms)

### What the watch does

- Display live workout metrics (timer, HR, zones, calories)
- Quick set/rep logging via taps (no typing)
- HR data capture and broadcast to phone
- Receive and act on notifications
- Glanceable daily stats

### What the watch does NOT do

- Full workout logging with movement details (phone handles this)
- Analytics dashboards or charts (screen too small)
- Messaging beyond canned quick replies
- Configuration or settings (phone handles this)
- BLE connection to equipment (phone handles this, watch only does HR)

---

## Implementation Approach

### Apple Watch

- Native Swift/SwiftUI project embedded in the React Native iOS workspace
- Shared data via WatchConnectivity — phone sends workout context, watch sends HR and set completions
- HealthKit workout session started on watch mirrors to phone
- Independent operation: if phone is out of range, watch records HR and set taps locally, syncs when reconnected

### Wear OS

- Separate Kotlin project, linked to React Native Android app via Data Layer
- Same sync pattern — phone is the brain, watch is the sensor + display
- Health Services workout session for background HR tracking
- Offline buffering when phone not connected

---

## Key Design Decisions

- **Native, not React Native.** Watch platforms have tiny screens, limited memory, and platform-specific APIs (HealthKit, Health Services, complications, tiles). React Native bridges add overhead and complexity for very little code sharing. Native gives the best UX and battery life.
- **Phone is the brain.** The watch never talks to Convex or Azure Functions directly. All data flows through the phone app. This keeps the watch app simple, battery-efficient, and offline-resilient.
- **HR broadcast is the killer feature.** During a workout, the watch continuously streams HR to the phone, which forwards it to the platform. This means every workout automatically has HR data without wearing a separate chest strap. For most athletes, this is the primary reason to use the watch app.
- **Minimal interaction design.** Large tap targets, no text input, haptic feedback for state changes. Athletes are mid-workout with sweaty hands — every interaction must work with a single gloved tap.

---

## Requirements Covered

FR-MA-041–046 (watch/wearable companion), FR-WD-001–012 (HealthKit on-watch), FR-WD-013–020 (Health Connect on-watch)

## What's Deferred

- Watch face/tile design refinement (iterative post-launch)
- Standalone watch operation without phone (future — requires direct network API calls)
- Third-party watch faces (future)
