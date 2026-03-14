# B9 — Scheduling & Booking

**Priority:** Lower
**Depends On:** B6, B8
**Key Spec Files:** 06-scheduling-booking

---

## Overview

Class scheduling, personal training bookings, event management, and calendar integrations. Builds on classes from B6 and notifications from B8.

---

## Convex Schemas

### New

- **`schedule_templates`** — recurring schedule blueprints: tenant, name, time slots with day/time/duration/class type/coach/capacity, active date range (FR-SB-001–003)
- **`schedule_exceptions`** — overrides to recurring schedule: date, cancelled flag, replacement time/coach/capacity, holiday label (FR-SB-004)
- **`booking_policies`** — per-tenant rules: advance booking window (how far ahead), cancellation deadline (hours before), late cancel penalty, no-show penalty, max bookings per member per day/week (FR-SB-008–012)
- **`pt_sessions`** — personal training definitions: coach, client, recurring or one-off, duration, rate, location, notes (FR-SB-018–022)
- **`pt_bookings`** — individual PT session instances: date, time, status (scheduled/completed/cancelled/no-show), payment ref (FR-SB-020)
- **`events`** — special events: tenant, name, description, date, time, duration, capacity, price, registration open/close dates, location (FR-SB-027–031)
- **`event_registrations`** — user-to-event: status, payment ref, waitlist position (FR-SB-029)
- **`calendar_sync`** — per-user external calendar connections: provider (Google/Apple/Outlook), sync token, enabled (FR-SB-033–034)

### Extended (from B6)

- **`classes`** — add link to schedule_template, booking_policy ref
- **`class_sessions`** — now generated from schedule_templates rather than manually created
- **`class_registrations`** — add cancellation timestamp, penalty applied flag, booking source (app/web/front-desk)

---

## Convex Server Functions

### Schedule Management

- Schedule template CRUD — define recurring weekly patterns (FR-SB-001)
- Session generation — scheduled Convex function generates class_sessions X weeks ahead from templates (FR-SB-002)
- Exception handling — cancel, reschedule, or modify individual sessions without affecting the recurring pattern (FR-SB-004)
- Holiday management — bulk cancel sessions for a date range (FR-SB-005)
- Multi-room/location support — sessions tagged with room/area (FR-SB-006)
- Schedule publish — make upcoming schedule visible to members (FR-SB-007)
- Coach availability — per-coach available hours, prevents double-booking (FR-SB-003)

### Class Booking

- Book class — enforce capacity, booking window, max bookings policy (FR-SB-008–009)
- Cancel booking — enforce cancellation deadline, apply late-cancel penalty if past deadline (FR-SB-010)
- Waitlist auto-management — on cancellation, promote next waitlisted member, send push + email via B8 automation (FR-SB-011, FR-CM-035)
- No-show detection — post-class scheduled function marks unattended registrations as no-show, applies penalty (FR-SB-012)
- Booking confirmation — trigger notification via B8 (FR-SB-013)
- Class reminder — scheduled notification X hours before class (FR-SB-014)
- Recurring booking — member books same class weekly, auto-registers for future sessions (FR-SB-015)
- Front-desk booking — staff books on behalf of member (FR-SB-016)
- Walk-in registration — add member to class at the door if capacity allows (FR-SB-017)

### Personal Training

- PT package definition — coach sets rates, session duration, package sizes (FR-SB-018)
- PT session scheduling — coach or client books, checks coach availability (FR-SB-019–020)
- PT recurring sessions — auto-generate from recurring pattern (FR-SB-021)
- PT session completion — mark complete, log notes, link to workout log if applicable (FR-SB-022)
- PT cancellation with policy enforcement (FR-SB-023)
- Coach PT dashboard — upcoming sessions, client history, revenue summary (FR-SB-024)

### Events

- Event CRUD — create special events (workshops, competitions, seminars) (FR-SB-027)
- Event registration — capacity enforcement, waitlist, payment collection ref (FR-SB-028–029)
- Event reminder notifications via B8 (FR-SB-030)
- Event completion — attendance tracking, follow-up notification (FR-SB-031)

### Calendar Integration

- Google Calendar sync — push class bookings and PT sessions as calendar events via Convex action → Google Calendar API (FR-SB-033)
- Apple Calendar sync — generate .ics feed URL per user (FR-SB-034)
- Bidirectional for Google: external changes reflected back (cancellation detection)
- Calendar event includes: class name, time, location, coach, workout preview

---

## Key Design Decisions

- **Template-driven scheduling:** Recurring schedules are defined as templates. A scheduled Convex function generates concrete class_sessions from templates, typically 4–8 weeks ahead. Exceptions override specific dates without breaking the pattern. This is simpler and more reliable than recurrence rule evaluation at query time.
- **Policy engine is data-driven:** Booking rules (advance window, cancel deadline, penalties) are stored per-tenant in `booking_policies`. The booking mutation reads the policy and enforces it. No hardcoded business rules.
- **Waitlist is FIFO with auto-promote:** When a spot opens, the earliest waitlisted member is promoted and notified. If they don't confirm within a configurable window, the next person is promoted.
- **PT sessions are separate from classes:** Personal training has its own booking flow, pricing, and scheduling. PT sessions can optionally link to a workout_log for tracking what was done during the session.

---

## Requirements Covered

FR-SB-001–034, FR-CT-038–043 (class management scheduling aspects), FR-CT-047 (substitute coach)

## What's Deferred

- Payment collection for PT and events (→ B10, wired to Stripe)
- Schedule display UI (→ F6 mobile, F9 web admin)
- Drag-and-drop schedule builder UI (→ F7)
- Resource/room management UI (→ F9)
