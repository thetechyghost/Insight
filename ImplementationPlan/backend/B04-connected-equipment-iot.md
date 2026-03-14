# B4 — Connected Equipment & IoT Pipeline

**Priority:** High
**Depends On:** B2
**Key Spec Files:** 12-connected-equipment, 02-user-athlete (§6)

---

## Overview

The differentiator. Wires up the full IoT pipeline from Concept2 machines through FitTrack devices to TimescaleDB, plus BLE/FTMS equipment support.

---

## Azure IoT Hub — Device Management

### Device Registry

- FitTrack Integration Device registration: device ID, tenant ID, machine type (RowErg/BikeErg/SkiErg), mode (Personal/Gym), location label, firmware version (FR-CE-001–005)
- IoT Edge gateway registration: one per gym location, tenant scoped (FR-CE-006)
- Device twin for each device: config state, last-seen timestamp, connection status, assigned workout (FR-CE-048)
- Certificate-based mTLS authentication per device (FR-CE-007)
- Device provisioning service for zero-touch onboarding (FR-CE-008)

### Cloud-to-Device Commands

- `PUSH_WORKOUT` — send workout definition to PM5 via FitTrack device (FR-CE-051)
- `RESET` — return PM5 to idle state
- `START_CLASS` — synchronized start across multiple machines
- `PAUSE_CLASS` — hold signal to all class machines
- `SET_ATHLETE` — assign athlete identity to a machine session
- `REQUEST_STATUS` — poll device state
- `REQUEST_LIVE_DATA` — begin real-time telemetry stream
- Command retry logic: 3 attempts before surfacing error (NFR-010)
- Command acknowledgment within 3 seconds target (NFR-005)

### OTA Firmware

- Firmware distribution pipeline via IoT Hub (NFR-025, FR-CE-054)
- Staged rollout support (canary → percentage → full)

---

## Azure Event Hub — Ingestion Pipeline

### Topics (extending B0 skeleton)

- `equipment-telemetry` — real-time metrics from FitTrack and FTMS devices
- `workout-events` — session start/stop/complete events
- Partitioned by `tenant_id` for isolation and parallel processing

### Three Ingestion Paths

```
Path A: BLE/FTMS Equipment
  Equipment → IoT Edge Gateway → IoT Hub → Event Hub → Azure Function → TimescaleDB

Path B: Concept2 via FitTrack Device
  PM5 (USB) → FitTrack Device (Wi-Fi/LTE) → IoT Hub → Event Hub → Azure Function → TimescaleDB

Path C: Concept2 via Mobile BLE (no FitTrack)
  PM5 (BLE) → Mobile App → HTTPS → Event Hub → Azure Function → TimescaleDB
```

---

## Azure Functions — Event Processing

### Stream Processors (Event Hub triggers)

- **`EquipmentTelemetryProcessor`** — receives raw telemetry, normalizes to common schema, writes to TimescaleDB (pace, stroke rate, watts, distance, calories, HR, elapsed time)
- **`WorkoutSessionProcessor`** — detects session start/stop, creates workout_log in Convex, associates metrics in TimescaleDB
- **`LiveDataBroadcaster`** — forwards real-time data to Convex for live leaderboard subscriptions (NFR-002: <1s latency)
- Dead letter handling for malformed/failed events

### Equipment API Endpoints

- `GET /equipment/{tenant_id}/status` — all machines with real-time status (Idle/Active/Cooldown/Offline) (FR-CE-048, FR-CT-067)
- `GET /equipment/{device_id}/live` — current live metrics for a single machine (FR-CT-069)
- `GET /equipment/{device_id}/session` — current or most recent session data
- `POST /equipment/{device_id}/command` — send cloud-to-device command (FR-CT-079)
- `POST /equipment/class/{class_id}/command` — batch command to all machines in a class (FR-CT-073–074)

### Concept2-Specific Endpoints

- `GET /concept2/pbs` — personal bests for all standard C2 distances per machine type (FR-UA-107)
- `GET /concept2/pbs/{distance}/history` — PB progression chart data (FR-UA-108)
- `GET /concept2/pbs/{distance}/last-attempt` — time since last attempt with 90-day flag (FR-UA-109)
- `GET /concept2/erg-score` — Erg Fitness Score 0–100 with trend and breakdown (FR-UA-111)
- `GET /concept2/workouts` — filtered by machine type, workout type, date range, verified status (FR-UA-114)
- `POST /concept2/manual-entry` — manual C2 workout with optional PM5 verification code (FR-UA-113)

---

## TimescaleDB — Equipment Telemetry

### Tables Now Active

**`equipment_telemetry`** hypertable:
- `device_id, user_id, tenant_id, session_id, timestamp`
- `metric_type` (pace_500m, stroke_rate, watts, distance, calories, heart_rate, drag_factor, elapsed_time)
- `value, unit`

**`concept2_sessions`** — per-session summary:
- `user_id, tenant_id, device_id, machine_type, session_id`
- `total_distance, total_time, avg_pace, avg_stroke_rate, avg_watts, calories`
- `verified` (boolean — FitTrack-captured or PM5 verification code) (FR-UA-112)
- `splits` (JSONB — per-interval split data)

**`concept2_pbs`** — materialized view per user per machine type per standard distance:
- Updated on each session completion
- Unverified workouts excluded from rankings (FR-UA-112)

### Continuous Aggregates

- Daily/weekly training volume per machine type
- Pace improvement trends across standard distances (feeds Erg Fitness Score)

---

## Convex Schemas

### New

- **`devices`** — device registry mirror: device ID, tenant, machine type, mode, human-readable name, location label, firmware version, online status (FR-CT-070)
- **`device_maintenance`** — maintenance log entries per device (FR-CT-071)
- **`equipment_sessions`** — live session state: device, athlete, workout definition, status (active/complete), start time (FR-CT-068)
- **`concept2_streaks`** — consecutive days/weeks with C2 workout per user (FR-UA-115)

### Real-Time Subscriptions

- Live machine status dashboard (coaches subscribe to `devices` + `equipment_sessions`) (FR-CT-067)
- Live leaderboard data (Azure Function pushes updates to Convex, clients subscribe) (FR-CT-046, NFR-002)
- Post-workout summary rendering within 1.5s of completion (NFR-001)

---

## Athlete Identification on Machines

Four methods, tried in order (FR-CE-009–012):
1. **NFC tap** — phone or fob on FitTrack reader → resolves user ID
2. **QR code** — scan displayed QR with phone camera
3. **PIN entry** — 4-digit PIN on FitTrack display
4. **Coach assignment** — coach assigns athlete to machine from dashboard

---

## Key Design Decisions

- **Verified vs Unverified:** Only FitTrack-captured or PM5-verification-code workouts count for official rankings. Manual entries are tracked but excluded from leaderboards (FR-UA-112).
- **Store-and-forward:** FitTrack devices buffer 30 days locally (NFR-007). On reconnect, buffered sessions sync through the same Event Hub pipeline with historical timestamps.
- **Live data path:** Equipment → Event Hub → Azure Function → Convex mutation (for real-time UI). This keeps Convex as the real-time subscription layer while TimescaleDB handles persistence and analytics.
- **Offline resilience:** IoT Edge gateways continue local operation during cloud outages, broadcasting to in-gym displays via local WebSocket (tech stack §5.1).

---

## Requirements Covered

FR-UA-106–116, FR-CE-001–055, FR-CT-067–081, NFR-001–003, NFR-005–007, NFR-009–010, NFR-018–025

## What's Deferred

- BLE direct from mobile app to non-Concept2 equipment (→ F5)
- Heart rate monitor pairing (→ B5)
- In-gym TV display mode (→ F7)
- Shareable workout summary card generation (→ F2/F6)
