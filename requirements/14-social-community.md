# Social & Community Requirements

This document defines the functional requirements for the Social & Community domain of the Insight fitness platform. This domain encompasses all features that foster social engagement, healthy competition, and community building among members, coaches, and gyms. It covers activity feeds, social interactions, leaderboards, challenges and competitions, and milestone celebrations.

---

## 14.1 Activity Feed

| ID | Requirement |
|----|-------------|
| FR-SC-001 | The system shall provide a gym-specific activity feed displaying member workouts, personal records, and milestones for all members within a given gym. |
| FR-SC-002 | The system shall provide a personal activity feed for each member, displaying workouts and updates from athletes they follow and from their gym. |
| FR-SC-003 | The system shall provide a global cross-gym activity feed that aggregates content from across the platform, accessible only to members who have opted in. |
| FR-SC-004 | The system shall support activity feed filtering by workout type. |
| FR-SC-005 | The system shall support activity feed filtering by athlete. |
| FR-SC-006 | The system shall support activity feed filtering by date or date range. |

---

## 14.2 Social Interactions

| ID | Requirement |
|----|-------------|
| FR-SC-007 | The system shall allow members to like or high-five workout results posted by other members. |
| FR-SC-008 | The system shall allow members to post comments on workout logs. |
| FR-SC-009 | The system shall allow members to share their workouts to Instagram. |
| FR-SC-010 | The system shall allow members to share their workouts to Facebook. |
| FR-SC-011 | The system shall allow members to share their workouts to Twitter/X. |
| FR-SC-012 | The system shall allow members to share their workouts to Strava. |
| FR-SC-013 | The system shall allow members to follow other athletes within their own gym. |
| FR-SC-014 | The system shall allow members to follow athletes from other gyms, provided both parties have given mutual consent. |
| FR-SC-015 | The system shall allow members to tag other athletes in workout posts. |

---

## 14.3 Leaderboards

| ID | Requirement |
|----|-------------|
| FR-SC-016 | The system shall provide a daily workout leaderboard for each gym, ranking members based on their performance in the day's workout. |
| FR-SC-017 | The system shall support leaderboard filtering by Rx (as prescribed) versus Scaled workout completion. |
| FR-SC-018 | The system shall support leaderboard filtering by gender. |
| FR-SC-019 | The system shall support leaderboard filtering by age group. |
| FR-SC-020 | The system shall support leaderboard filtering by weight class. |
| FR-SC-021 | The system shall provide an all-time benchmark leaderboard for each gym, displaying the top scores for each benchmark workout across all time. |
| FR-SC-022 | The system shall provide a global platform-wide leaderboard for each benchmark workout, ranking participants across all gyms. |
| FR-SC-023 | The system shall provide monthly and weekly leaderboards ranking members by total number of workouts logged within the period. |
| FR-SC-024 | The system shall provide strength leaderboards ranking members by heaviest lifts for each tracked movement. |
| FR-SC-025 | The system shall allow gym operators to create custom leaderboards for gym-specific challenges and competitions. |
| FR-SC-026 | The system shall support team-based and group-based leaderboards that aggregate individual member scores into a combined team ranking. |

---

## 14.4 Challenges & Competitions

| ID | Requirement |
|----|-------------|
| FR-SC-027 | The system shall allow gym operators to create in-gym workout challenges with defined goals, rules, and duration. |
| FR-SC-028 | The system shall allow gym operators to create in-gym attendance challenges with defined attendance targets and duration. |
| FR-SC-029 | The system shall support multi-week challenge tracking, displaying each participant's progress toward the challenge goal over the defined period. |
| FR-SC-030 | The system shall support inter-gym competitions, allowing multiple gyms to compete against each other in shared challenges. |
| FR-SC-031 | The system shall support team-based competitions with configurable team composition and scoring rules. |
| FR-SC-032 | The system shall support multi-event competition management, allowing a competition to consist of multiple scored events aggregated into an overall standing. |
| FR-SC-033 | The system shall provide dedicated challenge leaderboards and standings, displaying current rankings for all active challenges and competitions. |
| FR-SC-034 | The system shall provide prize and reward management for challenges, allowing gym operators to define, assign, and track prizes for challenge winners and participants. |
| FR-SC-035 | The system shall provide challenge registration and participation tracking, allowing members to register for challenges and allowing gym operators to monitor enrollment and participation status. |

---

## 14.5 Milestone Celebrations

| ID | Requirement |
|----|-------------|
| FR-SC-036 | The system shall detect and celebrate workout count milestones, including but not limited to a member's 100th, 500th, and 1,000th logged workout. |
| FR-SC-037 | The system shall detect and celebrate membership anniversary milestones on the anniversary of each member's join date. |
| FR-SC-038 | The system shall detect personal record achievements and provide members with the option to automatically share the PR to their activity feed. |
| FR-SC-039 | The system shall detect and celebrate streak achievements when a member trains for a defined number of consecutive days or consecutive weeks. |
| FR-SC-040 | The system shall support a badge and achievement system, awarding unlockable badges to members when they meet defined criteria for accomplishments and milestones. |
