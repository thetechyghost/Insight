# F7 — Web Admin Shell & Dashboard

**Priority:** Medium
**Platform:** React 19+ (Desktop/Tablet Web)
**Depends On:** B6, F1
**Key Spec Files:** 18-desktop-tablet-admin, 03-coach-trainer, 01-platform-architecture

---

## Overview

The React web application for coaches and gym owners. Desktop/tablet-first admin interface built with React 19, shadcn/ui, and Tailwind CSS.

---

## React Web Setup

### Project Foundation

- React 19+ with TypeScript
- Vite for build tooling
- shadcn/ui component library (Radix UI primitives + Tailwind CSS) (FR-DA-001)
- React Router for navigation
- Convex React client for real-time subscriptions
- TanStack Query for Azure Functions REST calls (same pattern as mobile)
- TanStack Table for data grids (member lists, reports, roster views)
- Recharts for analytics visualizations (built on D3, integrates well with React)

### Layout Structure

- Sidebar navigation — collapsible, icon + label, grouped by domain
- Top bar — gym name/logo (tenant branding), user avatar, notification bell, gym switcher dropdown
- Content area — responsive, optimized for 1280px+ but functional down to 768px (tablet)
- Tenant branding applied globally — colors, logo, typography from tenant config (FR-PA-012, FR-MT-004)

---

## Navigation Structure

```
Dashboard (home)
├── Programming
│   ├── Workout Builder
│   ├── Program Calendar
│   ├── Daily WOD
│   └── Programming Analysis
├── Classes
│   ├── Schedule
│   ├── Live Class
│   └── Class Analytics
├── Athletes
│   ├── Member List
│   ├── Athlete Detail
│   └── At-Risk Members
├── Equipment
│   ├── Machine Dashboard
│   ├── Live Class Equipment
│   └── Device Management
├── Video Review
│   ├── Review Queue
│   └── Video Library
├── Communication
│   ├── Messages
│   ├── Announcements
│   └── Campaigns
├── Settings
│   ├── Gym Profile & Branding
│   ├── Terminology
│   ├── Feature Toggles
│   └── Staff & Roles
```

---

## Screens — Dashboard

### Coach Dashboard

- Today's WOD summary — what's published, which tracks (FR-CT-011)
- Today's classes — upcoming sessions with registration count vs capacity (FR-CT-044)
- Equipment status — machine count by status (active/idle/offline) (FR-CT-067)
- Recent athlete activity — latest workout logs, PRs, milestones (FR-CT-026)
- Pending video reviews count with link to queue (FR-CT-057)
- Inactivity alerts — athletes who haven't trained recently (FR-CT-029)
- Unread messages count

### Gym Owner Dashboard (extends coach)

- Adds: member count (active/frozen/cancelled), new signups this week, upcoming membership expirations
- Revenue snapshot — MRR, outstanding payments, recent transactions
- At-risk members flagged (FR-CT-030)
- Staff on schedule today

---

## Screens — Workout Programming

### Workout Builder

- Full-screen editor — movement search sidebar, drag-and-drop workout construction area (FR-CT-001–002)
- Movement library panel — searchable by name/category/equipment/muscle group, drag to add (FR-CT-001)
- Workout type selector with type-specific field templates (FR-CT-006)
- Multi-component structure — tabbed sections (warm-up/skill/strength/metcon/cooldown), reorderable (FR-CT-006)
- Per-movement fields: reps, weight (absolute or % of 1RM), distance, time, rest (FR-CT-005)
- Coach notes text editor (FR-CT-013)
- Intended stimulus field (FR-CT-014)
- Scaling guidance editor — Rx+/Rx/Scaled columns (FR-CT-015)
- Movement demo video attachment — search and link from library (FR-CT-017)
- Save, duplicate, assign to date (FR-CT-007)

### Program Calendar

- Monthly/weekly calendar view — drag workouts to dates (FR-CT-009)
- Multi-track lanes — parallel rows for each program track (FR-CT-012)
- Color-coded by modality or workout type
- Copy week — duplicate entire week to another week (FR-CT-007)
- Periodization view — phase labels across weeks (FR-CT-003–004)
- Revision history sidebar — click to revert (FR-CT-010)

### Daily WOD Management

- Today and upcoming days — per-track WOD editor (FR-CT-011)
- Schedule publish — set date/time for auto-publish (FR-CT-018)
- Publish now button — immediately pushes to member feed + notification (FR-CT-019)
- Preview mode — see how it appears to athletes

### Programming Analysis

- Coverage radar chart — domain/modality balance (FR-CT-020)
- Time domain distribution chart (FR-CT-021)
- Movement frequency bar chart (FR-CT-022)
- Gap alerts — highlighted warnings for missing domains (FR-CT-023)
- Comparison overlay — your distribution vs balanced benchmark (FR-CT-024)
- Volume/intensity trend line (FR-CT-025)

---

## Screens — Class Management

### Schedule Manager

- Weekly grid view — time slots as rows, days as columns (FR-CT-038)
- Drag to create/resize class blocks
- Click block to edit: class name, coach, capacity, track, room (FR-CT-038–041)
- Recurring pattern editor — repeat weekly with exceptions (FR-SB-001–004)
- Substitute coach assignment per session (FR-CT-047)
- Holiday/exception management — cancel or modify specific dates (FR-SB-004–005)

### Live Class View

- Class roster — registered athletes with check-in status, real-time (FR-CT-044)
- One-click check-in/check-out per athlete (FR-CT-040)
- Waitlist panel — promote manually or auto (FR-CT-042)
- Equipment panel — machine status grid, athlete-to-machine assignments (FR-CT-068)
- Live metrics per machine — pace, stroke rate, watts, HR, distance (FR-CT-069)
- Push workout to all machines button (FR-CT-073)
- Start class synchronized button (FR-CT-074)
- Individual machine commands — dropdown per machine (FR-CT-079)
- Mid-class athlete detail — click any machine for full live view (FR-CT-075)
- Live leaderboard — sortable by pace/distance/projected finish (FR-CT-046)
- TV Display launch button — opens separate browser window with full-screen leaderboard (FR-CT-080)

### TV Display Mode

- Separate route: `/tv/{session_id}` — bookmarkable, shareable to any screen (FR-CT-080)
- Full-screen, no chrome — designed for gym TVs/projectors (FR-CT-045)
- Configurable layout: athlete names (or anonymized), current pace, distance, progress bar, PR flags
- Auto-sorted by real-time performance
- Timer display — current workout timer, large format
- Gym branding — logo and colors applied

### Post-Class

- Results table — all athletes, scores, PBs flagged, average pace (FR-CT-076)
- Export CSV button (FR-CT-077)
- Generate shareable leaderboard image (FR-CT-078)
- Class notes editor — coach post-class summary (FR-CT-048)
- Class analytics — attendance rate trend, average performance trend (FR-CT-081)

---

## Screens — Athlete Management

### Member List

- Sortable, filterable data grid: name, membership status, last attendance, join date, plan, tags (FR-TG-003)
- Quick search by name/email (FR-TG-003)
- Bulk actions: send message, assign program, add tag
- Status indicators: active, frozen, past-due, at-risk (FR-TG-011)

### Athlete Detail

- Profile header — avatar, name, membership info, contact, medical info (if coach access granted) (FR-CT-026, FR-UA-007)
- Tabs:
  - **Training** — workout history, filterable table + timeline chart (FR-CT-026)
  - **Performance** — fitness score, PR board, domain breakdown (FR-CT-027)
  - **Volume** — training volume/frequency/intensity charts (FR-CT-028)
  - **Body & Readiness** — body comp trends, wearable readiness metrics (FR-CT-032, FR-CT-037)
  - **Goals** — coach-set and athlete-set goals with progress (FR-CT-033)
  - **Programs** — assigned programs, completion status (FR-CT-034)
  - **Attendance** — class attendance history calendar (FR-CT-036)
  - **Notes** — private coach notes, chronological (FR-CT-035)
  - **Videos** — submitted videos and annotated feedback history
- Coach actions: assign workout, assign program, set goal, send message, add note (FR-CT-033–035)

### At-Risk Members

- Filtered view of members flagged by churn prediction (FR-CT-030)
- Risk indicators: days since last visit, declining frequency trend, past-due payment, membership expiring soon
- Quick action: send re-engagement message, assign check-in task to staff

---

## Screens — Video Review

### Review Queue

- Sortable list: athlete name, movement tag, submitted date, status (FR-CT-057)
- Priority sorting — oldest first by default
- Click to open review workspace

### Video Review Workspace

- Video player: play/pause, frame-by-frame step (arrow keys), playback speed (0.25x–2x), slow motion (FR-CT-050, FR-CT-055)
- Zoom controls — pinch or scroll to zoom into movement detail (FR-CT-055)
- Drawing overlay — freehand draw on current frame, arrow tool, angle tool, color picker (FR-CT-051)
- Text annotation — click frame to add text note anchored to timestamp (FR-CT-052)
- Voice-over recording — record audio commentary, synced to video timeline (FR-CT-053)
- Side-by-side comparison — load second video adjacent, synchronized playback (FR-CT-054)
- Annotation templates — dropdown to apply common corrections (FR-CT-058)
- Movement tag editor (FR-CT-059)
- Send feedback button — saves annotations, notifies athlete (FR-CT-056)

---

## Screens — Settings & Configuration

### Gym Profile & Branding

- Logo upload, color palette picker (primary, secondary, accent), font selection (FR-PA-012)
- Custom domain configuration (FR-PA-014)
- Preview mode — see branding applied live (FR-PA-013)

### Terminology

- Dictionary editor — table of platform terms with custom overrides per tenant (FR-PA-005)
- Preview how terms appear in member-facing UI

### Feature Toggles

- Module enable/disable switches: nutrition, retail, video review, challenges, etc. (FR-PA-006)

### Staff & Roles

- Staff list with role assignments (FR-TG-013–015)
- Invite staff member flow (FR-TG-013)
- Permission editor per role (FR-TG-015)
- Staff schedule view (FR-TG-016)

---

## Key Design Decisions

- **shadcn/ui provides the component foundation.** Accessible, well-tested primitives (dialogs, dropdowns, data tables, forms) with Tailwind styling. Customizable without fighting a component library. Tenant branding is applied via CSS variables that shadcn/ui already supports.
- **Real-time everywhere it matters.** Class roster, equipment status, live leaderboard, messaging — all Convex subscriptions. Member lists, analytics, reports — REST with TanStack Query. Clear split: if it changes while you're looking at it, it's real-time.
- **TV Display is a separate zero-chrome route.** Coaches open it in a second browser tab, drag to the gym TV, go full-screen. No special hardware or app needed. Updates via Convex subscription. Any device with a browser works.
- **Video workspace is the most complex screen.** Canvas-based drawing overlay, synchronized audio recording, frame-accurate annotation anchoring. This is the highest implementation effort in the entire frontend. Consider using Fabric.js or Konva.js for the canvas layer.

---

## Requirements Covered

FR-DA-001–028 (admin dashboard), FR-CT-001–081 (coach tools UI), FR-PA-005–006, FR-PA-012–014 (branding/config), FR-TG-013–016 (staff management), FR-CT-045–046 (timer/leaderboard display), FR-CT-080 (TV display)

## What's Deferred

- Scheduling drag-and-drop builder (→ F9)
- Billing management UI (→ F10)
- Marketing/lead management UI (→ F10)
- Reporting/analytics builder (→ F10)
- Super admin interface (→ F10)
