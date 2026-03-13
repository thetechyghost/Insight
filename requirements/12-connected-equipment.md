# 12. Connected Equipment Integration

This document defines the functional requirements for the Connected Equipment Integration domain of the Insight fitness platform. This domain encompasses all capabilities related to real-time connectivity with gym equipment, standardized and proprietary communication protocols, live workout data streaming, class broadcast displays, and session management. It ensures that athletes, coaches, and gym owners can leverage connected fitness equipment for real-time performance tracking, live leaderboards, and automated workout logging.

---

## 12.1 Proprietary Equipment Connectivity Protocol

**FR-CE-001**
The system shall stream real-time workout data from connected gym equipment to the platform with minimal latency.

**FR-CE-002**
The system shall display user workout metrics in near real-time during an active class session.

**FR-CE-003**
The system shall generate and display a live class leaderboard populated from connected equipment data during a class session.

**FR-CE-004**
The system shall provide a coach dashboard that simultaneously displays data from all connected equipment units within an active class.

**FR-CE-005**
The system shall automatically log completed workouts from equipment session data without requiring manual entry by the athlete.

**FR-CE-006**
The system shall support equipment pairing, allowing a user's device to be associated with a specific equipment unit for the duration of a session.

---

## 12.2 Concept2 Equipment (Rower, SkiErg, BikeErg)

**FR-CE-007**
The system shall connect to Concept2 equipment via the FitTrack Integration Device (physical PM5 connection) as the primary method, and via direct Bluetooth FTMS from the mobile application as a secondary method for personal users without a FitTrack device.

**FR-CE-008**
The system shall capture and display the following real-time data from Concept2 equipment: pace (per 500m and per km), stroke rate or cadence, power in watts, distance, calories, heart rate, elapsed time, split times, drag factor, drive length, drive time, and stroke count.

**FR-CE-009**
The system shall integrate with the Concept2 Logbook API to synchronize historical workout data for users with linked Concept2 accounts.

**FR-CE-010**
The system shall retrieve and display Concept2 season rankings for users with linked Concept2 accounts.

**FR-CE-011**
The system shall track and display lifetime meters accumulated on Concept2 equipment for users with linked Concept2 accounts.

**FR-CE-012**
The system shall provide a live race view during class sessions on Concept2 equipment, visually representing each participant's progress in real time.

**FR-CE-013**
The system shall support a pace boat or virtual competitor feature during Concept2 sessions, allowing athletes to race against a configurable target pace.

**FR-CE-014**
The system shall display an interval summary at the conclusion of each interval during Concept2 class sessions.

---

## 12.3 Indoor Bikes

**FR-CE-015**
The system shall connect to indoor bikes via the Bluetooth FTMS standard.

**FR-CE-016**
The system shall support connectivity with the following indoor bike equipment: Stages, Wahoo KICKR, Peloton (via FTMS), Keiser M3i, Assault bikes, Echo bikes, Schwinn IC, and Life Fitness IC.

**FR-CE-017**
The system shall capture and display the following real-time data from connected indoor bikes: power in watts, cadence in RPM, speed, distance, calories, heart rate, resistance level, and elapsed time.

**FR-CE-018**
The system shall support FTP (Functional Threshold Power) testing on connected indoor bikes and track FTP values over time for each athlete.

**FR-CE-019**
The system shall display power zone training information during indoor bike sessions based on the athlete's configured FTP value.

**FR-CE-020**
The system shall estimate calorie expenditure from power output data captured from connected indoor bikes.

**FR-CE-021**
The system shall support virtual ride and virtual race modes on connected indoor bikes, enabling athletes to participate in simulated cycling events.

---

## 12.4 Treadmills & Running Equipment

**FR-CE-022**
The system shall connect to treadmills and running equipment via the Bluetooth FTMS standard.

**FR-CE-023**
The system shall capture and display the following real-time data from connected treadmills and running equipment: speed, incline or grade, distance, pace, calories, heart rate, elapsed time, and elevation gain.

---

## 12.5 Other Cardio Equipment

**FR-CE-024**
The system shall support connectivity with elliptical trainers via the Bluetooth FTMS standard.

**FR-CE-025**
The system shall support connectivity with stair climbers that implement a supported communication protocol.

**FR-CE-026**
The system shall support connectivity with Assault and Echo runners.

**FR-CE-027**
The system shall support connectivity with non-Concept2 ski trainers that implement a supported communication protocol.

**FR-CE-028**
The system shall provide a general FTMS-compatible equipment fallback mode, enabling basic data capture and display for any equipment that implements the Bluetooth FTMS standard but is not explicitly supported as a named equipment type.

---

## 12.6 Real-Time Data Architecture

**FR-CE-029**
The system shall establish BLE FTMS connections from equipment to a local gateway device for data acquisition.

**FR-CE-030**
The system shall relay equipment data from the local gateway device to the platform via WebSocket connections.

**FR-CE-031**
The system shall distribute received equipment data to all relevant dashboards, including coach views, athlete devices, and broadcast displays.

**FR-CE-032**
The system shall maintain an end-to-end data latency of less than 2 seconds from equipment data capture to dashboard display.

**FR-CE-033**
The system shall support a class broadcast mode in which all connected equipment streams data to a shared dashboard simultaneously.

**FR-CE-034**
The system shall provide a coach view within class broadcast mode that displays metrics for all athletes in the class simultaneously.

**FR-CE-035**
The system shall support output to TV or projector displays for class broadcast mode, rendering class-wide metrics in a format suitable for large-screen viewing.

**FR-CE-036**
The system shall display individual athlete metrics on their own personal device during a class session while broadcast mode is active.

**FR-CE-037**
The system shall allow a user to pair with a specific equipment unit at the start of a class session.

**FR-CE-038**
The system shall automatically detect session start and session end events based on equipment activity.

**FR-CE-039**
The system shall provide a manual override capability for session start and session end, allowing coaches or athletes to explicitly begin or terminate a session.

**FR-CE-040**
The system shall detect and resolve equipment pairing conflicts when multiple users attempt to pair with the same equipment unit, preventing duplicate assignments.

---

## 12.7 FitTrack Integration Device

**FR-CE-041**
The system shall support a proprietary FitTrack Integration Device that connects physically to the Concept2 PM5 Performance Monitor and relays workout data to the cloud platform in real time via Wi-Fi (primary) or cellular (optional, gym-tier).

**FR-CE-042**
The FitTrack Integration Device shall operate in two modes: Personal Mode (single-owner, home use, Wi-Fi only, limited command set) and Gym Mode (multi-user, gym-administered, Wi-Fi with optional cellular fallback, full command set).

**FR-CE-043**
In Personal Mode, the FitTrack Integration Device shall automatically associate all captured workout sessions with the device owner's athlete profile without requiring identification at the machine.

**FR-CE-044**
In Gym Mode, the FitTrack Integration Device shall support athlete identification via NFC tap (phone or key fob), QR code scan (via FitTrack mobile app), PIN entry (on the device display), or coach assignment from the gym dashboard.

**FR-CE-045**
In Gym Mode, when no athlete identification is provided, the FitTrack Integration Device shall capture the workout session as an anonymous session linked to the machine and timestamp.

**FR-CE-046**
The system shall support retroactive workout claiming, allowing an athlete to claim an anonymous session captured on a gym machine within a configurable time window (default 24 hours) by matching machine, time, and optional PM5 confirmation code.

**FR-CE-047**
The system shall support machine registration by gym administrators, including assigning a human-readable label (e.g., "Rower 3 — Bay A"), physical location, and machine type to each FitTrack device.

**FR-CE-048**
The system shall track and display the real-time status of each registered FitTrack device with states: Idle, Active (with current athlete if identified), Cooldown, and Offline.

**FR-CE-049**
The FitTrack Integration Device shall buffer workout data locally for a minimum of 30 days when internet connectivity is unavailable. (Cross-ref: NFR-007)

**FR-CE-050**
The FitTrack Integration Device shall implement store-and-forward behavior, automatically uploading all locally buffered workout data when internet connectivity is restored, preserving the original timestamps and session integrity.

**FR-CE-051**
The system shall support the following bi-directional commands between the cloud platform and the FitTrack Integration Device in Gym Mode: PUSH_WORKOUT (send a pre-configured workout to the PM5), RESET (return PM5 to ready state), SET_ATHLETE (associate a session with an athlete profile), START_CLASS (synchronize start across all machines in a class), PAUSE_CLASS (send hold signal to all class machines), REQUEST_STATUS (poll current machine state), and REQUEST_LIVE_DATA (initiate real-time data stream for dashboard display).

**FR-CE-052**
The system shall support FitTrack device provisioning for Personal Mode via the mobile application, using Bluetooth LE to transfer Wi-Fi credentials, register the device with the cloud platform, and link it to the athlete's account.

**FR-CE-053**
The system shall support FitTrack device provisioning for Gym Mode via the web-based gym administration dashboard, including Wi-Fi configuration, gym association, machine labeling, and location assignment.

**FR-CE-054**
The system shall support over-the-air (OTA) firmware updates for the FitTrack Integration Device, initiated and managed from the cloud platform. (Cross-ref: FR-CS-040, NFR-025)

**FR-CE-055**
The FitTrack Integration Device shall auto-detect the connected Concept2 machine type (RowErg, BikeErg, or SkiErg) from the PM5 data stream and report it to the platform during device registration and at each session start.
