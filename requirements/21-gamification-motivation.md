# 21. Gamification & Motivation

This document defines the functional requirements for the Gamification & Motivation domain of the Insight fitness platform. This domain encompasses the systems and features designed to drive user engagement, reward consistency, and sustain long-term motivation through achievements, streaks, points, and personalized motivational content.

---

## 21.1 Achievement System

**FR-GM-001**
The system shall support a badge and achievement framework that unlocks badges automatically when a user reaches a defined milestone.

**FR-GM-002**
The system shall award workout count badges when a user completes 10, 50, 100, 500, and 1,000 total workouts.

**FR-GM-003**
The system shall award streak badges when a user maintains consecutive workout activity over defined periods, including consecutive days, consecutive weeks, and consecutive months.

**FR-GM-004**
The system shall award personal record (PR) badges, including a badge for a user's first PR and a badge for achieving multiple PRs within a single session.

**FR-GM-005**
The system shall award benchmark completion badges when a user completes designated benchmark workouts.

**FR-GM-006**
The system shall award community participation badges to recognize user engagement in community features such as commenting, encouraging other members, and joining group activities.

**FR-GM-007**
The system shall support seasonal and event-specific badges that are available only during designated time windows or in conjunction with specific platform events.

**FR-GM-008**
The system shall display all earned badges on the user's profile and provide a catalog of available badges with progress indicators showing how close the user is to earning each one.

---

## 21.2 Streaks & Consistency

**FR-GM-009**
The system shall track workout streaks by recording consecutive days and consecutive weeks in which a user completes at least one workout.

**FR-GM-010**
The system shall track weekly attendance streaks, defined as consecutive weeks in which a user meets a configurable minimum number of workout sessions.

**FR-GM-011**
The system shall track logging streaks, defined as consecutive days in which a user records at least one tracking entry (e.g., nutrition, body metrics, or workout data).

**FR-GM-012**
The system shall provide streak recovery and streak freeze options that allow a user to preserve an active streak after a missed day or period, subject to configurable limits on frequency and duration.

**FR-GM-013**
The system shall maintain streak leaderboards that rank users by their current and longest streaks across workout, attendance, and logging categories.

**FR-GM-014**
The system shall notify the user when a streak is at risk of being broken, providing a reminder before the tracking window closes.

---

## 21.3 Points & Rewards

**FR-GM-015**
The system shall implement a points system that awards points for workout completion, class attendance, and platform engagement activities.

**FR-GM-016**
The system shall maintain point leaderboards that rank users by total accumulated points over configurable time periods (e.g., weekly, monthly, all-time).

**FR-GM-017**
The system shall support a redeemable rewards catalog in which users can exchange accumulated points for merchandise, membership credits, and partner offers.

**FR-GM-018**
The system shall support challenge-specific point systems that award points according to rules unique to each challenge, independent of the global points system.

**FR-GM-019**
The system shall display a user's current point balance, point earning history, and redemption history within their profile.

---

## 21.4 Motivation Features

**FR-GM-020**
The system shall deliver daily motivational prompts to users, surfaced within the application dashboard or via push notification.

**FR-GM-021**
The system shall enable coaches to issue shout-outs to individual users or groups, which are displayed as highlighted notifications within the platform.

**FR-GM-022**
The system shall generate weekly and monthly summary reports delivered as email digests that include the user's workout count, achievements earned, streaks maintained, and other key activity metrics for the period.

**FR-GM-023**
The system shall generate an annual year-in-review summary for each user, aggregating total workouts, personal records, longest streaks, points earned, badges unlocked, and other notable accomplishments over the calendar year.

**FR-GM-024**
The system shall provide an activity ring or progress ring visualization on the user dashboard that displays real-time progress toward daily or weekly workout and activity goals.

**FR-GM-025**
The system shall provide a Burn Bar feature that compares a user's effort metrics for a given workout against the aggregated effort metrics of other users who completed the same workout.

**FR-GM-026**
The system shall award virtual trophies to users who win or place in competitions, and display those trophies on the user's profile.
