# B8 — Communication & Messaging

**Priority:** Medium
**Depends On:** B1
**Key Spec Files:** 08-communication-messaging

---

## Overview

The notification and messaging backbone. In-app messaging, push notifications, email, SMS, and automated communication workflows.

---

## Convex Schemas

### New

- **`conversations`** — direct and group message threads: type (direct/group/class/program), participants, tenant, created date, last message timestamp (FR-CM-001–005)
- **`messages`** — individual messages within conversations: sender, content, attachments (file refs), read receipts per participant, timestamp (FR-CM-003–004)
- **`notification_queue`** — pending notifications: user, type (push/email/sms/in-app), template ref, payload data, status (pending/sent/failed/read), scheduled send time (FR-CM-006–010)
- **`notification_templates`** — per-tenant configurable templates: channel (push/email/sms), trigger event, subject, body with merge fields, enabled flag (FR-CM-015–020)
- **`automation_workflows`** — automated communication rules: trigger (event type + conditions), action (send notification/message), delay, audience filter, tenant, active flag (FR-CM-030–045)
- **`email_campaigns`** — bulk email sends: subject, body, audience segment, status (draft/scheduled/sent), send date, open/click tracking refs (FR-CM-046–050)
- **`announcement_posts`** — gym-wide announcements: tenant, author, content, pinned flag, visibility, expiry date (FR-CT-065)

### Extended (from B0)

- **`users`** — notification preferences already exist, now fully utilized: per-channel opt-in/out, quiet hours, frequency caps (FR-UA-008, FR-CM-011–014)

---

## External Service Integrations

### Push Notifications

- Apple Push Notification Service (APNs) — iOS/Watch
- Firebase Cloud Messaging (FCM) — Android/Wear OS
- Convex action wraps both services with unified interface

### Email

- SendGrid or similar transactional email service
- Tenant-branded templates with logo, colors, terminology applied (FR-PA-015)
- Unsubscribe handling per email category (FR-CM-014)

### SMS

- Twilio for SMS delivery (FR-CM-051–053)
- Opt-in/opt-out management with compliance (TCPA)
- Rate limiting per user

---

## Convex Server Functions

### Direct & Group Messaging

- Create conversation (direct or group) (FR-CM-001)
- Send message with optional attachments (FR-CM-003)
- Real-time subscription on conversations — new messages appear instantly (FR-CM-002)
- Read receipt tracking (FR-CM-004)
- Group messaging for class participants — auto-create conversation for class session (FR-CT-061)
- Group messaging for program track members (FR-CT-061)
- Message search within conversations (FR-CM-005)

### Notification Dispatch

- Unified notification sender — accepts event type + user + payload, resolves to correct channels based on user preferences (FR-CM-006–010)
- Channel routing logic: check user prefs → filter by quiet hours → check frequency caps → dispatch to enabled channels (FR-CM-011–014)
- Push notification delivery via Convex action → APNs/FCM (FR-CM-007)
- Email delivery via Convex action → SendGrid (FR-CM-008)
- SMS delivery via Convex action → Twilio (FR-CM-009)
- In-app notification storage + real-time subscription (FR-CM-006)
- Notification read/dismiss mutations (FR-CM-010)

### Notification Templates

- Template CRUD per tenant (FR-CM-015–016)
- Merge field resolution — user name, gym name, workout name, PR value, class time, etc. (FR-CM-017)
- Tenant terminology applied to all outbound content (FR-PA-016)
- Tenant branding applied to email templates (FR-PA-015)
- Default templates seeded on tenant creation, customizable by gym owner (FR-CM-018)

### Automated Workflows

- Workflow engine — Convex scheduled function evaluates triggers on events:
  - **Welcome series:** new member signup → day 0, day 3, day 7 emails (FR-CM-030)
  - **Inactivity nudge:** no check-in for X days → push + email (FR-CM-031)
  - **PR celebration:** new PR detected → push notification + feed post (FR-CM-032, FR-CT-064)
  - **Class reminder:** X hours before registered class → push (FR-CM-033)
  - **Streak at risk:** no activity today, streak will break tomorrow → push (FR-CM-034)
  - **Workout published:** daily WOD goes live → push to all members (FR-CT-019)
  - **Waitlist promotion:** spot opens → push + email to next waitlisted member (FR-CM-035)
  - **Membership expiry:** X days before expiry → email (FR-CM-036)
  - **Goal progress:** milestone reached toward goal → push (FR-CM-037)
  - **Video feedback ready:** coach completes review → push to athlete (FR-CM-038)
  - **Concept2 PB:** new personal best on C2 distance → push with comparison (FR-CM-054–056)
- Workflow CRUD — gym owners can enable/disable, customize delays and content (FR-CM-040)
- Workflow execution log — audit trail of all automated sends (FR-CM-045)

### Campaigns (Coach/Owner tools)

- Email campaign builder — audience segment selection, content editor, schedule (FR-CM-046–048, FR-CT-066)
- SMS campaign with same flow (FR-CM-051–053)
- Audience segmentation — filter by membership status, last attendance, tags, membership type (FR-CM-047)
- Campaign analytics — sends, opens, clicks, unsubscribes (FR-CM-050)
- Push notification to defined member groups (FR-CT-062)
- In-app announcements CRUD with pin/expiry (FR-CT-065)

---

## Key Design Decisions

- **Convex as the real-time layer:** In-app messaging and notifications use Convex subscriptions. Users see new messages/notifications without polling. Push/email/SMS are fire-and-forget via Convex actions.
- **Unified dispatch:** One function handles all notification routing. Event producers don't care about channels — they emit an event type and user ID. The dispatcher resolves channels, preferences, quiet hours, and frequency caps.
- **Tenant branding in every outbound message:** Email templates, push notification text, and SMS all pass through a branding resolver that applies the tenant's terminology, logo, and colors. No "Insight" branding visible to end users if the gym has white-labeling configured.
- **Workflow engine is simple:** No complex DAG or visual flow builder. Each workflow is: trigger event → optional delay → send notification via template. Covers 90% of use cases without over-engineering. Complex campaign orchestration deferred.

---

## Requirements Covered

FR-CM-001–056, FR-CT-019 (WOD publish notification), FR-CT-061–066 (coach communication), FR-PA-015–016 (branded communications)

## What's Deferred

- Rich email template visual editor (→ F7)
- Slack/Zapier integration for notifications (→ B12)
- Campaign A/B testing (→ B11)
- In-app chat UI (→ F6)
