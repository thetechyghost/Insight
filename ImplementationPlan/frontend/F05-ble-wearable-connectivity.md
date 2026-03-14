# F5 — BLE & Wearable Connectivity

**Priority:** High
**Platform:** React Native (iOS + Android)
**Depends On:** B4, B5, F2
**Key Spec Files:** 11-wearable-device-integration, 12-connected-equipment, 17-mobile-application

---

## Overview

The hardware bridge. Connects the mobile app to Concept2 machines via Bluetooth LE, pairs heart rate monitors, integrates with Apple HealthKit and Google Health Connect, and manages wearable device connections.

---

## Native Modules Required

### Bluetooth LE

- `react-native-ble-plx` — BLE scanning, connection, characteristic read/write/notify
- Custom BLE manager module wrapping FTMS (Fitness Machine Service) protocol parsing
- Concept2 PM5 BLE protocol implementation (proprietary extensions over standard FTMS)

### Health Platforms

- `react-native-health` — Apple HealthKit read/write (iOS)
- `react-native-health-connect` — Google Health Connect read/write (Android)

### Background Execution

- iOS: Background Modes (bluetooth-central, background-fetch)
- Android: Foreground Service for sustained BLE connections during workouts

---

## Screens — Equipment Connection

### Concept2 BLE Connection (Path C — no FitTrack device)

- Scan screen — discover nearby PM5 monitors, display machine type (RowErg/BikeErg/SkiErg) and serial (FR-CE-013–015)
- Tap to pair — BLE connection with bonding for reconnection
- Connection status indicator — persistent banner showing connected machine and signal strength
- Auto-reconnect — if connection drops mid-workout, attempt reconnect for 30 seconds before prompting user (FR-MA-035)

### Live Workout from BLE

- Real-time data display during rowing/skiing/biking: current pace, stroke rate, watts, distance, elapsed time, calories (FR-MA-036–038)
- Data rendered with <500ms latency from sensor read to screen (NFR-003)
- Heart rate overlay if HR monitor also connected (FR-UA-032)
- Split tracking — auto-capture splits per 500m or per interval (FR-UA-035)
- Workout auto-detection — recognize when PM5 starts a piece, begin capture without user action
- Workout end detection — PM5 idle for configurable period → prompt to save
- Data path: PM5 → BLE → app → HTTPS → Azure Event Hub → TimescaleDB (Path C from tech stack)

### FTMS Equipment (generic gym equipment)

- Scan for FTMS-compatible devices — indoor bikes, treadmills, rowers (FR-CE-016–018)
- Connect and display live metrics per FTMS standard: speed, cadence, power, distance, heart rate
- Session capture and submission through same Event Hub pipeline

---

## Screens — Heart Rate Monitors

### HR Monitor Pairing

- Scan for BLE heart rate devices (chest straps, arm bands) (FR-WD-021–024)
- Display discovered devices with signal strength, last known name
- Pair and save — remembered devices auto-connect on next workout (FR-WD-025)
- Multiple HR monitor support — primary (for recording) and broadcast (for gym display) (FR-WD-026)

### Live HR Display

- Current heart rate — large number with color-coded zone background (FR-WD-028)
- HR zone indicator — zone 1–5 with zone name and percentage of max (FR-WD-029)
- Time-in-zone bar chart — live updating during workout (FR-WD-030)
- HR graph — scrolling line chart of HR over workout duration (FR-WD-031)
- Calorie burn estimate from HR data (FR-WD-032)
- HR data automatically attached to workout log on save (FR-UA-032)

### HR Zone Configuration

- Method picker: age-based max HR / lactate threshold / manual zones (FR-WD-028–030)
- Auto-calculate from age (220 – age) with manual override
- Custom zone boundary editor — drag sliders for each zone (FR-WD-030)
- Zone names and colors customizable

---

## Screens — Wearable Management

### Connected Devices Hub

- List all connected wearable services: Apple Health, Google Health Connect, Garmin, Fitbit, Whoop, Strava, TrainingPeaks (FR-WD-035–069)
- Per service: connection status, last sync time, data types synced, enable/disable toggle
- "Connect" button → OAuth flow for third-party services (opens in-app browser) (FR-WD-035, FR-WD-043, FR-WD-050, FR-WD-058, FR-WD-064)

### Apple HealthKit Integration (iOS)

- Permission request screen — explain each data type and why (FR-WD-001–003)
- Read: workouts, HR, HRV, VO2max, sleep, body comp, active calories, resting HR (FR-WD-004–010)
- Write: completed Insight workouts pushed back to HealthKit (FR-WD-011–012)
- Background sync — periodic background fetch pulls new HealthKit data, posts to Azure Functions (FR-WD-002)
- Dedup: workouts logged in Insight are not re-imported from HealthKit (FR-WD-010)

### Google Health Connect Integration (Android)

- Same permission and data flow as HealthKit but via Health Connect APIs (FR-WD-013–020)
- Read/write same data types
- Background sync via WorkManager

### Third-Party Wearables

- Garmin/Fitbit/Whoop/Strava/TrainingPeaks connection status cards
- Sync status: last sync, pending data, errors
- Manual "Sync Now" button — triggers immediate pull via Azure Function (FR-WD-040, FR-WD-048, FR-WD-055)
- Data conflict resolution display — when same workout from multiple sources, show which source was used and why
- Disconnect with confirmation — warns about data sync stopping

---

## Screens — FitTrack Device Management (Personal Mode)

### My FitTrack Device

- Device pairing — scan for FitTrack device via BLE for initial setup, then Wi-Fi configuration (FR-CE-001–003)
- Device status: online/offline, connected machine type, firmware version, last sync (FR-CE-048)
- Wi-Fi configuration — enter network credentials for device (FR-CE-004)
- Athlete identification setup — configure NFC, set PIN (FR-CE-009–011)
- Workout history from device — view synced sessions, verify all data uploaded (FR-CE-049)
- Firmware update notification — prompt when OTA update available (FR-CE-054)

---

## Key Design Decisions

- **BLE connection persists across app navigation.** Once connected to a PM5 or HR monitor, the connection stays alive regardless of which screen the user is on. A global connection manager holds the BLE state. A persistent banner shows connection status on every screen.
- **<500ms latency is the hard target.** BLE read → parse → render must complete in under 500ms (NFR-003). This means no unnecessary re-renders, direct state updates from BLE callback, and the live data display uses a lightweight component outside the main React tree if needed.
- **HealthKit/Health Connect are the sync backbone for personal wearables.** Rather than building direct integrations with every watch brand, HealthKit (iOS) and Health Connect (Android) aggregate data from Apple Watch, Garmin, Fitbit, Whoop, etc. The third-party API integrations from B5 complement this with data types not available through the health platforms.
- **FitTrack Personal Mode is a simplified path.** Home users pair their FitTrack device once, configure Wi-Fi, and forget about it. Every workout auto-syncs. No athlete identification needed — it's always them. The full gym-mode FitTrack management is a web admin feature (F9).

---

## Requirements Covered

FR-WD-001–077, FR-CE-001–015 (personal mode device setup), FR-CE-048–049 (device status, sync), FR-CE-054 (firmware updates), FR-UA-032 (workout HR data), FR-MA-030–040 (mobile BLE features), NFR-003

## What's Deferred

- FitTrack Gym Mode management (→ F9, web admin)
- IoT Edge gateway configuration (→ F9, web admin)
- In-gym TV display for live data (→ F7)
- Apple Watch companion app (→ F8)
- Wear OS companion app (→ F8)
