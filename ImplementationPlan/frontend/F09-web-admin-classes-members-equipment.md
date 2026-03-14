# F9 — Web Admin — Classes, Members & Equipment Management

**Priority:** Lower
**Platform:** React 19+ (Desktop/Tablet Web)
**Depends On:** B9, B10, F7
**Key Spec Files:** 06-scheduling-booking, 04-tenant-gym-owner, 07-billing-payments, 12-connected-equipment, 16-access-control-facility

---

## Overview

Extends the web admin with scheduling management, full member management, billing UI, equipment fleet management for gym mode, and facility access.

---

## Screens — Schedule Management

### Visual Schedule Builder

- Drag-and-drop weekly grid — time axis (vertical) × day axis (horizontal) (FR-SB-001)
- Drag to create new class block — opens config panel: name, coach, capacity, room, track, recurring pattern
- Resize block to adjust duration
- Drag existing block to reschedule
- Multi-room view — parallel columns per room/area within each day (FR-SB-006)
- Coach availability overlay — greyed-out time slots where assigned coach is unavailable (FR-SB-003)
- Exception editor — click any session to cancel, modify, or assign substitute (FR-SB-004, FR-CT-047)
- Holiday bulk cancel — select date range, cancel all sessions with optional message to members (FR-SB-005)
- Publish schedule — make visible to members, trigger notification (FR-SB-007)

### Booking Management

- Per-session view: registered members, waitlist, capacity bar (FR-SB-008)
- Manual book/cancel on behalf of member (FR-SB-016)
- Walk-in add button (FR-SB-017)
- Late cancellation and no-show log — per member history (FR-SB-010, FR-SB-012)
- Booking policy editor — advance window, cancel deadline, penalties, max bookings (FR-SB-008–012)

### Personal Training Management

- PT package editor — rates, duration, package sizes (FR-SB-018)
- PT calendar — coach-filtered view of PT sessions (FR-SB-019–020)
- PT booking on behalf of client (FR-SB-020)
- PT session log — completion, notes, linked workout (FR-SB-022)
- Coach PT revenue summary (FR-SB-024)

### Events

- Event creation form — name, description, date, capacity, price, registration window (FR-SB-027)
- Event registration list with waitlist (FR-SB-029)
- Event reminder trigger (FR-SB-030)

---

## Screens — Full Member Management

### Enhanced Member List (extending F7)

- Advanced filters: membership plan, payment status, join date range, last attendance, tags, lead source, referral status (FR-TG-003)
- Bulk actions: assign tag, change plan, send email, export CSV (FR-TG-003)
- Inline status change: freeze, cancel, reactivate (FR-TG-009–010)
- Membership plan assignment and change with proration preview (FR-TG-005)

### Member Detail (extending F7 athlete detail)

- Adds billing tab: subscription status, payment history, invoices, outstanding balance, payment method on file (FR-TG-006)
- Adds membership tab: plan details, contract dates, freeze history, cancellation terms
- Adds check-in history: calendar view of all facility visits (FR-TG-008)
- Adds waiver status: signed/unsigned waivers, re-sign prompt for updated versions (FR-TG-058–060)
- Adds lead/referral source tracking (FR-TG-004)

### Member Import

- CSV upload with column mapping UI (FR-TG-002)
- Preview imported records before confirming
- Duplicate detection — match on email, flag potential duplicates
- Bulk invite send after import

### Waiver Management

- Waiver template editor — rich text, version management (FR-TG-058)
- Member waiver status dashboard — who has signed, who hasn't (FR-TG-059)
- Bulk re-sign request when waiver updated (FR-TG-060)
- Digital signature capture via touch/mouse (FR-TG-059)

---

## Screens — Billing Management

### Membership Plans

- Plan builder — name, type (recurring/punch/drop-in/trial), price, interval, contract length, included classes, freeze policy (FR-BP-001–005)
- Plan comparison table for gym owner review
- Archive/retire plans without affecting active subscribers

### Subscription Overview

- Dashboard: active subscriptions by plan, MRR, churn this month, past-due count (FR-BP-029–033)
- Subscription list — filterable by plan, status, next billing date
- Click subscription → detail: payment history, upcoming invoice, plan change history

### Payment Management

- Failed payments dashboard — members with outstanding failed charges, attempt count, last retry date (FR-BP-015–017)
- One-click retry payment
- Manual payment entry — cash/check payments recorded manually (FR-BP-014)
- Refund processing — select transaction, full or partial refund (FR-BP-018)
- Credit management — add/remove account credits per member (FR-BP-028)

### Invoice Management

- Invoice list — filterable by status (paid/open/past-due/void), date range (FR-BP-020–023)
- Invoice detail view with line items
- Manual invoice creation — custom line items, tax, send to member (FR-BP-024)
- Invoice settings — tax rates, logo, business address, payment terms (FR-BP-019, FR-BP-021)

### Promo Codes

- Code management: create, edit, archive (FR-BP-025–027)
- Usage tracking — who used, when, remaining uses

### Punch Card Management

- View member pack balances
- Manual adjustment — add/deduct sessions with reason

---

## Screens — Equipment Fleet Management (Gym Mode)

### Machine Dashboard (extending F7)

- Fleet overview — all registered FitTrack devices and IoT Edge gateways (FR-CT-067)
- Status grid: device name, location, machine type, current status, current athlete, firmware version, last seen (FR-CT-070)
- Filter: by status, machine type, location
- Click device → detail panel

### Device Detail

- Device info: serial, machine type, mode, firmware, location label (FR-CT-070)
- Connection history — online/offline events timeline
- Maintenance log — add entries, view history (FR-CT-071)
- Assigned athlete history — recent sessions on this machine
- Commands: push workout, reset, request status (FR-CT-079)
- Firmware status — current version, available update, trigger OTA update (FR-CE-054)

### Device Provisioning

- Add new FitTrack device — guided setup wizard:
  - Enter device serial or scan QR
  - Assign to tenant
  - Set mode (Gym)
  - Assign location label and human-readable name
  - Configure Wi-Fi or verify LTE connectivity
  - Test connection — send ping command, verify response (FR-CE-001–008)
- IoT Edge gateway setup — register gateway, assign gym location (FR-CE-006)

### Fleet Analytics

- Machine utilization rates — sessions per day per machine, heatmap by hour (FR-RA-026–028)
- Maintenance schedule — upcoming/overdue maintenance by machine
- Firmware rollout status — which devices are on latest, which need updates

---

## Screens — Facility Access

### Check-in Configuration

- Method setup: QR code / NFC / PIN / barcode (FR-AF-001–003)
- Device registration — link check-in hardware to tenant (FR-AF-004)

### Access Rules

- Rule editor: membership plan → allowed areas → allowed hours (FR-AF-006–009)
- Visual timetable showing access windows per plan

### Facility Areas

- Area CRUD — name, capacity, equipment list, booking rules (FR-AF-010–014)
- Operating hours editor with holiday overrides (FR-AF-015–017)

### Access Log

- Searchable entry/exit log: member, area, timestamp, method, granted/denied (FR-AF-018–020)
- Real-time occupancy display per area (FR-AF-021–022)
- Export access log as CSV

---

## Key Design Decisions

- **Schedule builder is the highest-complexity UI in this phase.** Drag-and-drop weekly grid with multi-room support, recurring patterns, and exceptions. Use a library like @dnd-kit for drag interactions. The data model (templates + generated sessions + exceptions) from B9 makes this manageable — the UI just manipulates templates and exceptions.
- **Billing UI is read-heavy.** Most billing operations happen automatically (Stripe webhooks → Convex). The admin UI is primarily for monitoring, exception handling (failed payments, manual entries, refunds), and plan configuration. Don't over-build — gym owners check billing dashboards weekly, not hourly.
- **Device provisioning is a wizard.** Step-by-step guided flow reduces errors. Each step validates before proceeding. This is critical — a misconfigured FitTrack device means lost workout data. The wizard ensures everything is verified before the device goes live.
- **Facility access is simple.** No hardware integration with physical access control systems (door locks, turnstiles). The system tracks check-ins and enforces rules, but physical enforcement is manual or via separate access control hardware. Keep scope tight.

---

## Requirements Covered

FR-SB-001–034 (scheduling UI), FR-TG-001–012 (member management UI), FR-TG-058–060 (waivers), FR-BP-001–037 (billing UI), FR-CE-001–008 (device provisioning), FR-CE-048–054 (device management), FR-CT-071 (maintenance log), FR-AF-001–022 (facility access), FR-RA-026–028 (equipment analytics)

## What's Deferred

- Marketing/lead management UI (→ F10)
- Business reporting/analytics dashboards (→ F10)
- Retail/POS UI (→ F10)
- Super admin interface (→ F10)
