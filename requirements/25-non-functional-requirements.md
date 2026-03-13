# Non-Functional Requirements

This document defines the non-functional requirements for the Insight fitness platform, covering performance targets, reliability guarantees, data integrity constraints, scalability targets, and hardware specifications for the FitTrack Integration Device. These requirements apply cross-functionally across all domains.

All requirements use the identifier format **NFR-NNN** (Non-Functional Requirement).

---

## 25.1 Performance

**NFR-001**
The system shall render the post-workout summary screen within 1.5 seconds of workout completion notification.

**NFR-002**
The system shall propagate live class leaderboard updates within 1 second of new data arriving from any connected machine.

**NFR-003**
The system shall display real-time data received via Bluetooth LE from a Concept2 PM5 with less than 500 milliseconds latency from sensor reading to screen render.

**NFR-004**
The system shall load performance analytics dashboards within 2 seconds for athletes with up to 5,000 historical workouts.

**NFR-005**
The system shall deliver cloud-to-device commands (PUSH_WORKOUT, RESET) and receive acknowledgment from the FitTrack Integration Device within 3 seconds under normal network conditions.

---

## 25.2 Reliability

**NFR-006**
The system shall achieve zero workout data loss; every workout completed on a connected Concept2 machine shall be persisted to the platform regardless of connectivity interruptions.

**NFR-007**
The FitTrack Integration Device shall buffer workout data locally for a minimum of 30 days when internet connectivity is unavailable, and shall synchronize all buffered data automatically when connectivity is restored. (Cross-ref: FR-CE-049)

**NFR-008**
The platform cloud services shall maintain a minimum of 99.9% uptime measured monthly.

**NFR-009**
The system shall detect and flag a FitTrack Integration Device as offline within 5 minutes of the device's last communication with the platform.

**NFR-010**
The system shall retry failed cloud-to-device commands a minimum of 3 times before surfacing an error to the coach or administrator.

---

## 25.3 Data Integrity

**NFR-011**
The system shall implement duplicate workout prevention, ensuring that the same workout session is not stored more than once regardless of capture method (FitTrack device, Bluetooth, or manual entry).

**NFR-012**
The system shall perform all personal best calculations server-side to ensure consistency and prevent client-side manipulation.

**NFR-013**
The system shall store all workout times at second precision and perform all internal pace calculations at millisecond precision.

**NFR-014**
The system shall validate split data consistency by verifying that the sum of individual split distances equals the total workout distance within an acceptable rounding tolerance.

---

## 25.4 Scalability

**NFR-015**
The system shall support athletes with up to 20 years of historical workout data (approximately 10,000+ workouts per athlete) without degradation in query performance.

**NFR-016**
The system shall support concurrent live class sessions across 1,000 or more gym locations without degradation in real-time leaderboard or dashboard performance.

**NFR-017**
The system shall serve leaderboard and ranking queries to 50,000 or more concurrent users at peak load without degradation.

---

## 25.5 FitTrack Integration Device Hardware Requirements

**NFR-018**
The FitTrack Integration Device shall support Wi-Fi 802.11 b/g/n (2.4 GHz minimum) connectivity, with optional LTE cellular fallback for gym-tier deployments.

**NFR-019**
The FitTrack Integration Device shall connect to the Concept2 PM5 Performance Monitor via its USB data port.

**NFR-020**
The FitTrack Integration Device shall provide a minimum of 4 GB local storage for workout data buffering.

**NFR-021**
The FitTrack Integration Device shall include an NFC reader for athlete identification via phone tap or NFC key fob.

**NFR-022**
The FitTrack Integration Device shall include a small display (e-ink or LCD) for status indication, PIN entry, and athlete confirmation.

**NFR-023**
The FitTrack Integration Device shall draw power from the PM5 USB port in personal mode, with support for independent power supply in gym mode.

**NFR-024**
The FitTrack Integration Device shall operate within a temperature range of 0°C to 50°C to accommodate gym environments.

**NFR-025**
The FitTrack Integration Device shall support over-the-air (OTA) firmware updates delivered from the cloud platform. (Cross-ref: FR-CE-054, FR-CS-040)
