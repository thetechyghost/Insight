# F6 — Social, Leaderboards & Messaging

**Priority:** Medium
**Platform:** React Native (iOS + Android)
**Depends On:** B7, B8, F3
**Key Spec Files:** 14-social-community, 21-gamification-motivation, 08-communication-messaging, 17-mobile-application

---

## Overview

The engagement and community layer on mobile. Activity feeds, leaderboards, challenges, in-app messaging, and all the social features that keep athletes coming back.

---

## Screens — Activity Feed

### Gym Feed

- Scrollable feed of activity from gym members: workouts logged, PRs achieved, badges earned, streaks, challenge completions, milestones (FR-SC-001–005)
- Each feed card: avatar, name, activity type, key metric, timestamp, reactions, comment count
- Reaction bar — tap to react with emoji (FR-SC-008)
- Tap comment icon → threaded comment view (FR-SC-009)
- Tap user avatar → view their public profile (respects privacy settings)
- Pull-to-refresh + real-time subscription — new items appear with "X new posts" banner (FR-SC-002)
- Feed filter tabs: All / Workouts / PRs / Challenges / Announcements
- Gym announcements pinned to top of feed (FR-CT-065)

### My Activity

- Personal activity feed — everything the user has posted/earned
- Visibility indicator per item — who can see this (gym/friends/public) (FR-SC-006)
- Edit visibility or delete own posts (FR-SC-010)

### Sharing

- Share workout summary card — generate styled image, share via iOS/Android native share sheet to Instagram, Facebook, WhatsApp, etc. (FR-UA-116, FR-SC-043)
- Share PR achievement card (FR-SC-044)
- Share challenge completion card (FR-SC-045)
- Share Concept2 workout summary card — styled with machine type, distance, pace, PB comparison (FR-UA-116)
- Cards rendered client-side as images using a template overlay on workout data

---

## Screens — Leaderboards

### Workout Leaderboard

- After logging any workout, see ranked results — your position highlighted (FR-SC-013)
- Scope toggle: This Class / My Gym / All Gyms (FR-SC-014–015)
- Filter bar: Gender / Age Group / Weight Class / Rx Only (FR-SC-016–018)
- Tap any athlete → see their score detail (if privacy allows)

### Benchmark Leaderboards

- Browse by benchmark workout or lift (FR-SC-014)
- All-time and time-windowed (this month, this year) rankings
- Percentile indicator — "Top X%" badge next to your entry (FR-UA-082)

### Concept2 Leaderboards

- Per machine type, per standard distance (FR-SC-015)
- Verified entries only — unverified excluded with explanation (FR-UA-112)
- Global rankings with age/gender filters
- Anonymized cross-gym comparisons for opt-in users (FR-MT-014)

### Challenge Leaderboards

- Active challenge standings — live-updating during challenge period (FR-SC-025)
- Your position, distance to next rank, projected final position
- Completed challenges — final standings, your result

---

## Screens — Challenges

### Challenge Hub

- Active challenges list — cards showing: name, type, time remaining, your progress, participant count (FR-SC-020–022)
- Tap challenge → detail view:
  - Rules and scoring explanation (FR-SC-023)
  - Live leaderboard (FR-SC-025)
  - Your progress bar with target (FR-SC-024)
  - Activity log — your qualifying entries
- "Join Challenge" button with confirmation (FR-SC-024)
- Completed challenges — past results, badges earned

### Challenge Types Supported

- Distance challenges — total meters rowed/biked/skied in period (FR-SC-026)
- Volume challenges — total reps or tonnage of a movement
- Frequency challenges — most workouts in period
- Benchmark challenges — best score on specific workout
- Team challenges — gym vs gym aggregate (FR-SC-027)

---

## Screens — Messaging

### Conversations List

- All conversations sorted by last message time (FR-CM-001)
- Unread count badges per conversation
- Conversation types distinguished: direct (person icon), group (people icon), class (calendar icon), coach (star icon)
- Search conversations by name or content (FR-CM-005)

### Chat Screen

- Real-time message display via Convex subscription (FR-CM-002)
- Text input with send button (FR-CM-003)
- Image/file attachments from camera or library (FR-CM-004)
- Read receipts — subtle checkmarks (FR-CM-004)
- Tap coach message → option to reply inline
- Workout log link — share a workout result directly in chat

### New Conversation

- Search gym members by name
- Create direct message or group conversation
- Class conversation auto-created — visible to all registered attendees (FR-CT-061)

---

## Screens — Achievements & Gamification

### Badge Collection

- Grid display of all earned badges — full color (FR-GM-005)
- Unearned badges shown greyed with criteria description — "Log 100 workouts" (FR-GM-003)
- Tap badge → detail: description, date earned, rarity (% of users who have it) (FR-GM-007–008)
- Select featured badges for profile display (FR-GM-006)
- New badge celebration — full-screen animation on earn (FR-GM-005)

### Streaks

- Current streaks display: workout streak, class attendance streak, logging streak, Concept2 streak (FR-GM-009–011, FR-UA-115)
- Longest streak record per type
- Streak freeze status — remaining freeze credits, tap to use (FR-GM-012)
- Streak milestone celebrations (7d, 30d, 100d, 365d) (FR-GM-013)
- "Streak at risk" warning if no activity today and streak would break tomorrow (FR-GM-014)

### Points & Rewards

- Point balance display — total points, recent earning history (FR-GM-016–018)
- Points earning breakdown — "You earned 50 points for logging a workout"
- Rewards catalog — browse redeemable rewards from your gym (FR-GM-020)
- Redeem flow — confirm redemption, points deducted, gym notified (FR-GM-021)
- Points leaderboard — top earners in your gym (FR-GM-019)

### Milestones

- Milestone feed — recent milestones achieved, yours and gym members (FR-SC-035–042)
- Upcoming milestones — "3 more workouts to hit 500!" (FR-SC-041)
- Celebration overlay — confetti/animation on milestone hit (FR-SC-037)

---

## Screens — Notifications

### Notification Center (extending F1)

- Categorized tabs: All / Social / Workouts / Gym / Messages
- Each notification: icon, title, preview text, timestamp, read/unread state
- Tap → navigate to relevant screen (workout detail, chat, challenge, etc.)
- Swipe actions: mark read, dismiss
- "Mark all read" bulk action

---

## Key Design Decisions

- **Feed is Convex real-time.** Activity feed items are Convex documents with real-time subscriptions. When a gym mate finishes a workout, it appears in your feed within seconds without polling. This creates the "alive" feeling that drives engagement.
- **Share cards are client-rendered.** Using react-native-view-shot or similar to capture a styled template as an image. No server-side image generation needed. Templates are themed with gym branding (colors, logo) from tenant config.
- **Messaging is simple and focused.** Not building Slack. Direct messages, group chats, class chats. No threads within threads, no reactions on messages, no message editing. Keep it focused on coach-athlete and gym community communication.
- **Gamification is visible but not intrusive.** Badges, streaks, and points are present but don't gate functionality. Athletes who don't care about gamification can ignore it. Athletes who love it see celebrations, progress toward next badge, and leaderboard positions everywhere.
- **Leaderboard queries are cached aggressively.** Benchmark leaderboards for 10,000+ users are expensive queries. TanStack Query caches with 5-minute stale time. Real-time updates only for active class leaderboards (those use Convex subscriptions via the LiveDataBroadcaster from B4).

---

## Requirements Covered

FR-SC-001–048, FR-GM-001–026, FR-CM-001–010 (in-app messaging), FR-CT-061 (group messaging), FR-CT-065 (announcements), FR-UA-116 (share cards), FR-MT-014 (cross-gym comparisons), FR-MA-020–028 (mobile social features)

## What's Deferred

- Gym owner challenge creation/management (→ F9)
- Rewards catalog management (→ F9)
- Campaign/bulk messaging from coaches (→ F9)
- Social moderation tools (→ F9)
