# Scheduling & Booking -- Functional Requirements

This document defines the functional requirements for the Scheduling & Booking domain of the Insight fitness platform. The Scheduling & Booking domain encompasses all capabilities related to class schedule creation and management, member booking and reservations, personal training and appointment scheduling, and special event and workshop management.

All requirements use the identifier format **FR-SB-NNN** (Functional Requirement -- Scheduling & Booking).

---

## 1. Class Scheduling

FR-SB-001
The system shall support recurring class schedule creation using weekly templates that define repeating class times, coaches, and rooms.

FR-SB-002
The system shall support one-off class and event scheduling independent of weekly templates.

FR-SB-003
The system shall support multi-room and multi-resource scheduling, allowing administrators to assign classes to specific rooms, equipment zones, or other bookable resources.

FR-SB-004
The system shall enforce class capacity limits, preventing bookings from exceeding the configured maximum number of participants for each class.

FR-SB-005
The system shall provide waitlist management for classes that have reached capacity, automatically promoting the next waitlisted member when a spot becomes available.

FR-SB-006
The system shall support class series and session packages, allowing members to purchase or enroll in a defined set of related class sessions.

FR-SB-007
The system shall provide a color-coded calendar view with the ability to filter and color-code by class type, coach, and room.

FR-SB-008
The system shall detect and alert administrators to scheduling conflicts when creating or modifying classes, including overlapping room bookings and double-booked coaches.

FR-SB-009
The system shall support a holiday and closure calendar that automatically cancels or hides classes on designated closure dates.

FR-SB-010
The system shall support schedule publishing workflows, notifying members when a new or updated schedule becomes available.

---

## 2. Booking & Reservations

FR-SB-011
The system shall provide member self-service class booking through both mobile and web interfaces.

FR-SB-012
The system shall support configurable advance booking windows, defining how far in advance members may book a class and how close to class start time bookings remain open.

FR-SB-013
The system shall enforce late cancellation policies, including the ability to assess fees or apply booking restrictions when a member cancels within a configured window before class start time.

FR-SB-014
The system shall track member no-shows and enforce configurable no-show policies, including fees, warnings, and temporary booking restrictions for repeat offenders.

FR-SB-015
The system shall send booking confirmation notifications to members via push notification, email, and SMS upon successful class booking.

FR-SB-016
The system shall send booking reminder notifications to members at configurable intervals before class start time.

FR-SB-017
The system shall support guest and drop-in booking, allowing non-members to reserve a spot in a class without requiring a full membership.

FR-SB-018
The system shall support intro and trial class booking with a dedicated booking flow that captures new prospect information and applies trial-specific pricing or restrictions.

FR-SB-019
The system shall support recurring booking, allowing members to automatically reserve the same class at the same time each week.

FR-SB-020
The system shall notify waitlisted members when a spot becomes available and provide a time-limited window to confirm the booking before the spot is offered to the next person on the waitlist.

---

## 3. Personal Training / Appointments

FR-SB-021
The system shall support scheduling of one-on-one personal training sessions between a coach and a client.

FR-SB-022
The system shall provide coach availability management, allowing coaches to define and maintain their available time slots for appointments.

FR-SB-023
The system shall support appointment type configuration, including duration, price, and location for each type of appointment offered.

FR-SB-024
The system shall allow clients to self-book available appointment slots with their preferred coach through the member-facing interface.

FR-SB-025
The system shall support recurring appointment scheduling, allowing a client and coach to establish a repeating appointment at a consistent day and time.

FR-SB-026
The system shall support configurable buffer time between appointments, preventing back-to-back scheduling and ensuring adequate transition time for coaches.

FR-SB-027
The system shall enforce cancellation and rescheduling policies for personal training appointments, including configurable cancellation windows and associated fees or session forfeiture rules.

FR-SB-028
The system shall track personal training package balances, displaying the number of sessions remaining and alerting both the client and coach when the package is nearing depletion.

---

## 4. Events & Workshops

FR-SB-029
The system shall support special event creation and management, including event name, description, date, time, location, and associated media.

FR-SB-030
The system shall support event registration with capacity management, enforcing maximum participant limits and providing waitlist functionality when capacity is reached.

FR-SB-031
The system shall support event ticketing and pricing, including free events, single-price events, and tiered pricing with multiple ticket types.

FR-SB-032
The system shall support competition event management, including participant registration, heat or division assignments, and scheduling of competition heats.

FR-SB-033
The system shall support workshop scheduling with distinct configuration for multi-session workshops that span multiple dates.

FR-SB-034
The system shall support open gym and free training time slot management, allowing administrators to define and publish available unstructured training windows and allowing members to reserve spots within those windows.
