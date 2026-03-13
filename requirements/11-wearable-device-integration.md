# Wearable & Device Integration Requirements

This document defines the functional requirements for the Wearable & Device Integration domain of the Insight fitness platform. This domain governs all integrations with wearable hardware, health data platforms, Bluetooth peripherals, and third-party fitness services. It covers bidirectional health data synchronization, real-time biometric streaming, companion watch applications, heart rate monitor connectivity, and cross-platform data exchange with external fitness ecosystems.

---

## 11.1 Apple Watch / HealthKit Integration

| ID | Requirement |
|----|-------------|
| FR-WD-001 | The system shall read real-time heart rate data from HealthKit, including instantaneous heart rate, resting heart rate, and walking heart rate average. |
| FR-WD-002 | The system shall read active energy burned and basal energy burned data from HealthKit. |
| FR-WD-003 | The system shall read step count data from HealthKit. |
| FR-WD-004 | The system shall read distance data from HealthKit, including walking/running distance, cycling distance, and swimming distance with stroke count. |
| FR-WD-005 | The system shall read VO2 max estimation data from HealthKit. |
| FR-WD-006 | The system shall read heart rate variability (HRV) data from HealthKit. |
| FR-WD-007 | The system shall read respiratory rate data from HealthKit. |
| FR-WD-008 | The system shall read blood oxygen saturation data from HealthKit. |
| FR-WD-009 | The system shall read body composition data from HealthKit, including body mass/weight and body fat percentage. |
| FR-WD-010 | The system shall read sleep analysis data from HealthKit. |
| FR-WD-011 | The system shall read completed workout session data from HealthKit. |
| FR-WD-012 | The system shall read activity summary data from HealthKit, including move, exercise, and stand ring progress. |
| FR-WD-013 | The system shall read flights climbed data from HealthKit. |
| FR-WD-014 | The system shall read advanced cycling metrics from HealthKit, including cycling power and cadence. |
| FR-WD-015 | The system shall read advanced running metrics from HealthKit, including running power, cadence, stride length, and ground contact time. |
| FR-WD-016 | The system shall write workout session data to HealthKit so that platform-logged workouts appear in the user's Apple Health record. |
| FR-WD-017 | The system shall write body measurement data to HealthKit, including weight and body composition entries recorded within the platform. |
| FR-WD-018 | The system shall write nutrition data to HealthKit, including caloric intake and macronutrient breakdowns logged within the platform. |
| FR-WD-019 | The system shall support live heart rate streaming from Apple Watch during active workout sessions, delivering updates to the companion iOS application in real time. |
| FR-WD-020 | The system shall support live calorie burn updates from Apple Watch during active workout sessions. |
| FR-WD-021 | The system shall support workout session state management on Apple Watch, including the ability to start, pause, resume, and end workout sessions with state synchronized to the iOS companion application. |
| FR-WD-022 | The system shall support background heart rate delivery from Apple Watch, receiving heart rate updates even when the application is not in the foreground. |
| FR-WD-023 | The system shall provide a standalone Apple Watch application capable of logging workouts independently without requiring the companion iPhone to be in proximity. |
| FR-WD-024 | The system shall display real-time workout metrics on the Apple Watch during an active session, including heart rate, elapsed time, calories burned, and activity-specific metrics. |
| FR-WD-025 | The system shall provide Apple Watch complications that surface key fitness data on the user's watch face. |
| FR-WD-026 | The system shall deliver haptic notifications on Apple Watch for configurable events, including workout cues, heart rate zone transitions, and timer alerts. |
| FR-WD-027 | The system shall provide quick-log actions on Apple Watch, enabling users to record common activities or data points with minimal interaction. |

---

## 11.2 Google Watch / Wear OS / Health Connect Integration

| ID | Requirement |
|----|-------------|
| FR-WD-028 | The system shall read and write step count data via Health Connect on Android devices. |
| FR-WD-029 | The system shall read and write heart rate data via Health Connect on Android devices. |
| FR-WD-030 | The system shall read and write distance data via Health Connect on Android devices. |
| FR-WD-031 | The system shall read and write calorie data via Health Connect on Android devices. |
| FR-WD-032 | The system shall read and write exercise session data via Health Connect on Android devices. |
| FR-WD-033 | The system shall read and write speed and power data via Health Connect on Android devices. |
| FR-WD-034 | The system shall read and write cycling cadence data via Health Connect on Android devices. |
| FR-WD-035 | The system shall read and write body composition data via Health Connect, including weight and body fat percentage. |
| FR-WD-036 | The system shall read and write sleep data via Health Connect on Android devices. |
| FR-WD-037 | The system shall read and write blood pressure and oxygen saturation data via Health Connect on Android devices. |
| FR-WD-038 | The system shall read and write respiratory rate data via Health Connect on Android devices. |
| FR-WD-039 | The system shall read and write hydration data via Health Connect on Android devices. |
| FR-WD-040 | The system shall read and write nutrition data via Health Connect on Android devices. |
| FR-WD-041 | The system shall provide a Wear OS companion application capable of tracking workouts directly on the watch. |
| FR-WD-042 | The system shall display real-time workout metrics on Wear OS devices during an active session, including heart rate, elapsed time, calories burned, and activity-specific metrics. |
| FR-WD-043 | The system shall provide Wear OS tile complications that surface key fitness data on the user's watch face. |
| FR-WD-044 | The system shall support notification mirroring on Wear OS devices, delivering platform notifications from the paired Android phone to the watch. |

---

## 11.3 Heart Rate Monitor Integration

| ID | Requirement |
|----|-------------|
| FR-WD-045 | The system shall support Bluetooth Low Energy (BLE) heart rate monitor connectivity using the standard GATT Heart Rate Service (0x180D). |
| FR-WD-046 | The system shall receive real-time BPM streaming data from connected BLE heart rate monitors. |
| FR-WD-047 | The system shall receive R-R interval data from connected BLE heart rate monitors for heart rate variability (HRV) calculation. |
| FR-WD-048 | The system shall detect and report sensor contact status from connected BLE heart rate monitors, indicating whether the sensor is properly positioned on the user. |
| FR-WD-049 | The system shall receive energy expended data from connected BLE heart rate monitors that support this measurement. |
| FR-WD-050 | The system shall support pairing with BLE chest strap heart rate monitors, including but not limited to Polar H10, Garmin HRM-Pro, Wahoo TICKR, and MyZone devices. |
| FR-WD-051 | The system shall support pairing with BLE optical arm band heart rate monitors, including but not limited to Polar Verity Sense, Whoop, and Scosche Rhythm+ devices. |
| FR-WD-052 | The system shall support heart rate data from wrist-based monitors, including Apple Watch, Garmin, and Fitbit wearables. |
| FR-WD-053 | The system shall allow users to configure custom heart rate zone thresholds, defining the BPM boundaries for each training zone. |
| FR-WD-054 | The system shall provide auto-calculated heart rate zones based on the user's profile data, using standard formulas (e.g., percentage of maximum heart rate or heart rate reserve). |
| FR-WD-055 | The system shall display a zone-based training interface during active workouts that shows the user's current heart rate zone in real time. |
| FR-WD-056 | The system shall track and record cumulative time spent in each heart rate zone during a workout session. |
| FR-WD-057 | The system shall deliver heart rate zone transition alerts via haptic feedback and/or visual notification when the user enters or exits a configured heart rate zone. |

---

## 11.4 Third-Party Platform Sync

| ID | Requirement |
|----|-------------|
| FR-WD-058 | The system shall support bidirectional workout synchronization with Garmin Connect, allowing workouts created on either platform to appear on the other. |
| FR-WD-059 | The system shall import activity and health metrics from Garmin Connect, including daily activity data and physiological measurements. |
| FR-WD-060 | The system shall import training status and training load data from Garmin Connect. |
| FR-WD-061 | The system shall import activity data from Fitbit, including step counts, active minutes, and calorie expenditure. |
| FR-WD-062 | The system shall import sleep data from Fitbit, including sleep stages and duration. |
| FR-WD-063 | The system shall import heart rate data from Fitbit, including resting heart rate and intraday heart rate measurements. |
| FR-WD-064 | The system shall import recovery score data from Whoop. |
| FR-WD-065 | The system shall import strain score data from Whoop. |
| FR-WD-066 | The system shall import sleep performance data from Whoop, including sleep quality and duration metrics. |
| FR-WD-067 | The system shall import heart rate variability (HRV) data from Whoop. |
| FR-WD-068 | The system shall export completed workout data to Strava. |
| FR-WD-069 | The system shall import activity data from Strava, including workout details and performance metrics. |
| FR-WD-070 | The system shall support social sharing of workout summaries to Strava from within the platform. |
| FR-WD-071 | The system shall support bidirectional nutrition data synchronization with MyFitnessPal, allowing food logs and nutritional data to be exchanged between platforms. |
| FR-WD-072 | The system shall import calorie and macronutrient data from MyFitnessPal. |
| FR-WD-073 | The system shall export workout data to TrainingPeaks. |
| FR-WD-074 | The system shall import training load metrics from TrainingPeaks, including Training Stress Score (TSS), Chronic Training Load (CTL), and Acute Training Load (ATL). |
