# B5 — Wearable Integration

**Priority:** High
**Depends On:** B3, B4
**Key Spec Files:** 11-wearable-device-integration

---

## Overview

Connects the platform to the wearable ecosystem — Apple Watch, Garmin, Fitbit, Whoop, Strava, TrainingPeaks — and heart rate monitors used in-gym.

---

## Third-Party API Integrations

### Health Platform Sync (bidirectional where supported)

- **Apple HealthKit** — workouts, HR, HRV, VO2max, sleep, body comp, active calories (FR-WD-001–012)
- **Google Health Connect** — same data categories for Android users (FR-WD-013–020)

### Wearable Vendor APIs (inbound sync)

- **Garmin Connect** — activity sync, HR, sleep, body battery, training status (FR-WD-035–042)
- **Fitbit Web API** — activity, HR, sleep, SpO2, active zone minutes (FR-WD-043–049)
- **Whoop API** — strain, recovery, sleep, HRV, journal entries (FR-WD-050–057)

### Training Platforms (bidirectional)

- **Strava** — push completed workouts, pull activity data (FR-WD-058–063)
- **TrainingPeaks** — push workout results, pull planned workouts (FR-WD-064–069)

### Heart Rate Monitors (real-time via BLE)

- ANT+ and Bluetooth LE chest straps and arm bands (FR-WD-021–034)
- Real-time HR broadcast during workouts — data flows through IoT Edge gateway (gym) or directly from phone (home)
- HR zone calculation: configurable zones per user (max HR based, lactate threshold based, or custom) (FR-WD-028–030)

---

## Azure Functions — Wearable Data API

### Sync Endpoints

- `POST /wearables/connect` — initiate OAuth flow for vendor APIs (Garmin, Fitbit, Whoop, Strava, TrainingPeaks)
- `POST /wearables/disconnect` — revoke access, stop sync
- `GET /wearables/status` — connection status per provider per user
- `POST /wearables/webhook/{provider}` — webhook receivers for push-based APIs (Garmin, Whoop push data on activity completion)

### Data Processing

- **`WearableSyncProcessor`** — scheduled Azure Function that polls pull-based APIs (Fitbit, HealthKit backfill) on configurable intervals
- **`WearableWebhookProcessor`** — Event Hub triggered, processes incoming webhook payloads
- Normalization layer — maps each vendor's data format to common schema before TimescaleDB write
- Duplicate detection — cross-source dedup when same workout appears from multiple sources (e.g., Apple Watch + Strava) (NFR-011)
- Conflict resolution — configurable source priority per data type (e.g., prefer Whoop for HRV, prefer platform for workout metrics)

### Heart Rate Endpoints

- `POST /hr/live` — real-time HR data ingestion from BLE monitors (via mobile app or IoT Edge)
- `GET /hr/workout/{workout_id}` — HR time series for a specific workout (FR-UA-032)
- `GET /hr/zones/{workout_id}` — time in each HR zone for a workout
- `GET /hr/resting/trends` — resting HR over time (FR-UA-091)
- `GET /hr/hrv/trends` — HRV over time (FR-UA-095)

### Export (outbound)

- `POST /wearables/export/strava/{workout_id}` — push a completed workout to Strava (FR-WD-060)
- `POST /wearables/export/trainingpeaks/{workout_id}` — push to TrainingPeaks (FR-WD-066)
- HealthKit/Health Connect write-back handled client-side in F5 (native API requirement)

---

## TimescaleDB — Wearable Data

### Tables Now Active (populating B0/B3 schemas)

**`biometric_readings`** — now receiving data from wearable sync:
- HRV, VO2max, resting HR, sleep duration, sleep quality, recovery scores
- `source` column tracks origin (apple_health, garmin, fitbit, whoop, manual)

**`heart_rate_data`** hypertable (new):
- `user_id, tenant_id, workout_id, timestamp`
- `heart_rate, source_device`
- High frequency — one reading per second during workouts

**`sleep_data`** hypertable (new):
- `user_id, tenant_id, date, source`
- `total_duration, deep_sleep, light_sleep, rem_sleep, awake_time, sleep_score`
- (FR-UA-093)

### Continuous Aggregates

- Daily resting HR average
- Weekly HRV trends
- Sleep quality moving averages
- Recovery readiness composite (feeds into coach athlete monitoring in B6)

---

## Convex Schemas

### New

- **`wearable_connections`** — per-user: provider, OAuth tokens (encrypted), sync status, last sync timestamp, enabled data types (FR-WD-035, FR-WD-043, FR-WD-050, FR-WD-058, FR-WD-064)
- **`hr_zones`** — per-user HR zone configuration: method (max HR / lactate / custom), zone boundaries (FR-WD-028–030)

### Extended

- **`users`** — add max HR, lactate threshold, preferred HR zone method

---

## Convex Server Functions

- Wearable connection management (CRUD, OAuth token refresh scheduling)
- HR zone configuration (auto-calculate from age or manual input)
- Sync status dashboard queries
- Scheduled function: token refresh for OAuth providers (runs daily)
- Scheduled function: trigger pull-based sync for active connections (configurable interval)

---

## Key Design Decisions

- **Normalization is non-negotiable:** Every vendor uses different units, schemas, and naming. All data passes through a normalization layer before hitting TimescaleDB. One common schema, many adapters.
- **Source priority:** When the same metric comes from multiple sources (e.g., calories from Apple Watch and from Concept2 machine), a configurable priority order determines which is authoritative. Equipment-reported values take precedence over estimates.
- **OAuth token storage:** Encrypted at rest in Convex. Refresh tokens handled by a scheduled Convex function that rotates tokens before expiry.
- **Rate limiting:** Each vendor has API rate limits. The sync scheduler respects per-vendor quotas and backs off on 429 responses.
- **HealthKit/Health Connect are client-side:** Apple and Google require on-device SDK access. The mobile app (F5) handles read/write. Data is posted to Azure Functions for persistence.

---

## Requirements Covered

FR-WD-001–077, FR-UA-032 (workout HR), FR-UA-091–095 (biometric tracking), FR-CT-037 (athlete readiness data for coaches)

## What's Deferred

- BLE pairing UI and on-device HealthKit/Health Connect SDK work (→ F5)
- Apple Watch / Wear OS companion apps (→ F8)
- MyFitnessPal nutrition sync (→ B11)
- Coach-facing readiness dashboards (→ B6)
