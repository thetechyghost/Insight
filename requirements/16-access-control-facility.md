# Access Control & Facility Management -- Functional Requirements

This document defines the functional requirements for the Access Control & Facility Management domain of the Insight fitness platform. The Access Control & Facility Management domain encompasses all capabilities related to member check-in systems, physical facility access control, and facility operations management including room booking, equipment tracking, maintenance, and capacity compliance.

All requirements use the identifier format **FR-AF-NNN** (Functional Requirement -- Access & Facility).

---

## 1. Check-In Systems

FR-AF-001
The system shall provide self-service kiosk check-in via a tablet-based interface at the front desk, allowing members to check in upon arrival without staff assistance.

FR-AF-002
The system shall support mobile app check-in using QR code scanning, enabling members to present a QR code on their device for verification at a check-in station.

FR-AF-003
The system shall support mobile app check-in using NFC (Near Field Communication), enabling members to tap their device against an NFC reader to complete check-in.

FR-AF-004
The system shall support mobile app check-in using geofencing, automatically detecting when a member arrives at the facility and prompting or completing check-in based on proximity.

FR-AF-005
The system shall provide coach and staff manual check-in capability, allowing authorized staff members to check in a member on their behalf.

FR-AF-006
The system shall validate each check-in attempt against the member's current booking, class reservation, or active membership status, denying check-in when no valid entitlement exists.

FR-AF-007
The system shall send real-time check-in notifications to designated staff members when a member checks in, configurable by notification channel and recipient.

FR-AF-008
The system shall maintain a complete check-in history and audit trail, recording the member identity, timestamp, check-in method, location, and validation result for every check-in attempt.

---

## 2. Facility Access Control

FR-AF-009
The system shall support 24/7 app-based door and gate access, allowing members to unlock facility entry points using their mobile device without requiring staff presence.

FR-AF-010
The system shall support access scheduling, enabling administrators to restrict facility access to specific hours based on membership type, tier, or access group.

FR-AF-011
The system shall support access group management, allowing administrators to define groups of members and assign each group permissions to access specific areas, doors, or zones within the facility.

FR-AF-012
The system shall support multi-door and multi-zone access control, managing access permissions independently for each entry point and restricted area across the facility.

FR-AF-013
The system shall maintain a comprehensive access log and audit trail, recording the member identity, timestamp, access point, access method, and authorization result for every access attempt.

FR-AF-014
The system shall provide emergency override capabilities, allowing authorized personnel to unlock or lock all access points immediately in response to emergency situations.

FR-AF-015
The system shall integrate with physical access control hardware, including electronic door strikes, turnstiles, and gate controllers, via standard access control protocols and APIs.

FR-AF-016
The system shall support visitor and guest access management, allowing staff to issue temporary access credentials to non-members with configurable expiration times and restricted area permissions.

---

## 3. Facility Management

FR-AF-017
The system shall provide room and space management with booking capabilities, allowing administrators and authorized users to reserve rooms, training areas, and other facility spaces for classes, events, or private use.

FR-AF-018
The system shall support equipment inventory tracking, maintaining a catalog of all facility equipment with details including name, category, serial number, purchase date, location, and current status.

FR-AF-019
The system shall support equipment maintenance scheduling, allowing administrators to define recurring and one-off maintenance tasks for each piece of equipment with configurable intervals and responsible parties.

FR-AF-020
The system shall support equipment maintenance logging, recording all maintenance activities performed on each piece of equipment including date, description of work, technician, parts used, and cost.

FR-AF-021
The system shall support cleaning schedule management, allowing administrators to define, assign, and track recurring cleaning tasks for each room, zone, and common area within the facility.

FR-AF-022
The system shall support facility capacity management for compliance purposes, tracking real-time occupancy against configured maximum capacity limits per room or zone and alerting staff when capacity thresholds are approached or exceeded.
