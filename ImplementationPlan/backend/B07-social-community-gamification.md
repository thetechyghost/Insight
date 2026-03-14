# B7 — Social, Community & Gamification

**Priority:** Medium
**Depends On:** B2
**Key Spec Files:** 14-social-community, 21-gamification-motivation

---

## Overview

Adds the engagement layer — activity feeds, leaderboards, challenges, achievements, streaks, and points. Makes the platform sticky.

---

## Convex Schemas

### New — Social

- **`activity_feed`** — feed items: type (workout_logged, pr_achieved, challenge_completed, milestone, badge_earned, streak), user, tenant, timestamp, visibility (gym/friends/public), linked entity ref (FR-SC-001–005)
- **`reactions`** — emoji reactions on feed items, polymorphic (FR-SC-008)
- **`comments`** — threaded comments on feed items and workout logs (FR-SC-009)
- **`follows`** — user-to-user follow relationships within a tenant, requires mutual consent for data sharing (FR-SC-006–007)
- **`challenges`** — gym or platform challenges: name, type (distance/volume/frequency/benchmark), duration, start/end dates, rules, tenant or global scope (FR-SC-020–028)
- **`challenge_participants`** — user enrollment + progress tracking per challenge (FR-SC-024)
- **`milestones`** — predefined milestone definitions: type (workout_count, pr_count, streak_length, membership_anniversary, first_rx), thresholds (FR-SC-035–042)
- **`milestone_achievements`** — user milestone completions with date (FR-SC-037)

### New — Gamification

- **`badges`** — badge definitions: name, icon, description, category (movement/consistency/community/competition), criteria (automated or manual), rarity tier (FR-GM-001–008)
- **`user_badges`** — earned badges per user with date earned (FR-GM-005)
- **`streaks`** — per user: type (workout/class_attendance/logging/concept2), current count, longest count, last activity date, freeze credits remaining (FR-GM-009–015)
- **`points`** — point ledger per user per tenant: action type, points earned, timestamp (FR-GM-016–019)
- **`rewards`** — redeemable rewards catalog: name, description, point cost, quantity available, tenant (FR-GM-020–022)
- **`reward_redemptions`** — user redemption records (FR-GM-021)
- **`motivation_quotes`** — daily motivation content pool, configurable per tenant (FR-GM-023)

### New — Leaderboards

- **`leaderboards`** — leaderboard definitions: scope (class/gym/global), workout or benchmark ref, time window (daily/weekly/monthly/all-time), filters (age/gender/weight class) (FR-SC-013–019)
- Leaderboard rankings are computed, not stored — see Azure Functions below

---

## Azure Functions — Social & Ranking API

### Leaderboards

- `GET /leaderboards/workout/{workout_id}` — ranked results for a specific workout with filters (FR-SC-013)
- `GET /leaderboards/benchmark/{benchmark_id}` — all-time rankings for a benchmark workout (FR-SC-014)
- `GET /leaderboards/concept2/{distance}/{machine_type}` — C2 distance rankings, verified only (FR-SC-015, FR-UA-112)
- `GET /leaderboards/challenge/{challenge_id}` — live challenge standings (FR-SC-025)
- `GET /leaderboards/points/{tenant_id}` — point leaderboard per gym (FR-GM-019)
- All leaderboard queries support filters: age group, gender, weight class, gym-only vs global (FR-SC-016–018)
- Anonymized cross-gym benchmark comparisons for opt-in users (FR-MT-014)

### Challenge Progress

- `GET /challenges/{id}/progress` — current standings, individual progress, projected completion (FR-SC-025)
- `GET /challenges/{id}/stats` — participation rates, completion rates, aggregate metrics

---

## Convex Server Functions

### Activity Feed

- Feed generation — on workout log, PR, badge, streak, challenge event → create feed item with correct visibility (FR-SC-001–005)
- Feed query — user's personalized feed: own activity + followed users + gym feed, paginated, real-time subscription (FR-SC-002)
- React to feed item (FR-SC-008)
- Comment on feed item, threaded replies (FR-SC-009)
- Privacy enforcement — respect user visibility settings per tenant (FR-SC-006)
- Feed item deletion/hide by author (FR-SC-010)

### Challenges

- Challenge CRUD — gym owners/coaches create, set rules, date range, scoring (FR-SC-020–023)
- Join/leave challenge (FR-SC-024)
- Progress update — triggered by workout log events, updates participant standings (FR-SC-025)
- Challenge completion detection + notification (FR-SC-027)
- Auto-close expired challenges, archive results (FR-SC-028)

### Milestones

- Milestone detection — scheduled function + event-driven checks:
  - Workout count milestones (100, 500, 1000 workouts) (FR-SC-035)
  - PR count milestones (FR-SC-036)
  - Membership anniversary (FR-SC-038)
  - First Rx workout (FR-SC-039)
  - Streak milestones (FR-SC-040)
- Milestone achievement → creates feed item + notification (FR-SC-037)

### Badges

- Badge criteria engine — evaluates user activity against badge criteria on relevant events (FR-GM-001–004)
  - Movement badges (first muscle-up, 2x bodyweight deadlift, etc.)
  - Consistency badges (30-day streak, 100 classes attended)
  - Community badges (first challenge won, 10 video reviews received)
  - Competition badges (top 10% on benchmark)
- Badge award → feed item + push notification (FR-GM-005)
- Badge showcase — user-selected featured badges on profile (FR-GM-006)

### Streaks

- Streak tracker — scheduled daily function evaluates each active user's activity (FR-GM-009–011)
- Grace period / freeze credits — configurable per streak type (FR-GM-012)
- Streak milestone notifications (7-day, 30-day, 100-day, 365-day) (FR-GM-013)
- Streak recovery — if broken, show how close to previous best (FR-GM-014)
- Concept2-specific streak (consecutive days/weeks with C2 workout) inherits from FR-UA-115

### Points & Rewards

- Point award rules — configurable per tenant: points per workout logged, per PR, per class attended, per challenge completed, per streak day (FR-GM-016–017)
- Point ledger mutations — atomic add on qualifying events (FR-GM-018)
- Rewards catalog CRUD for gym owners (FR-GM-020)
- Redemption flow — deduct points, create redemption record, notify gym staff (FR-GM-021)
- Point leaderboard data fed to Azure Functions for ranking queries (FR-GM-019)

### Motivation

- Daily motivation quote — scheduled function selects from pool, pushes to feed (FR-GM-023)
- Post-workout encouragement — contextual message based on performance (new PR, streak extended, close to goal) (FR-GM-024–026)

---

## Key Design Decisions

- **Leaderboards are computed, not materialized:** Rankings query TimescaleDB on demand with caching at the Azure Function layer. This avoids stale data and complex invalidation. For high-traffic leaderboards (global benchmarks), add a short TTL cache.
- **Feed is Convex-native:** Activity feed items live in Convex with real-time subscriptions. When a user opens the app, the feed is live. New items from followed users appear instantly.
- **Badge/milestone criteria are data-driven:** Badge definitions include structured criteria (JSON) evaluated by a generic engine. Adding new badges doesn't require code changes — just new badge records.
- **Points are tenant-scoped:** Each gym configures its own point economy. Points don't transfer between gyms. This gives gym owners control over their engagement mechanics.

---

## Requirements Covered

FR-SC-001–048, FR-GM-001–026

## What's Deferred

- Social sharing to external platforms (Instagram, Facebook) → F6
- Shareable workout/leaderboard image generation → F2/F6
- Challenge creation UI → F7
- Rewards catalog management UI → F7
