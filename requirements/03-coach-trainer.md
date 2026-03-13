# Coach/Trainer -- Functional Requirements

This document defines the functional requirements for the Coach/Trainer domain of the Insight fitness platform. The Coach/Trainer domain encompasses all capabilities that enable coaches and trainers to design and deliver workout programming, monitor and manage athletes, run classes, provide video-based movement feedback, and communicate with members.

All requirements use the identifier format **FR-CT-NNN** (Functional Requirement -- Coach/Trainer).

---

## 1. Workout Programming

### 1.1 Program Design Tools

FR-CT-001
The system shall provide a workout builder interface with a searchable movement library that allows coaches to look up exercises by name, category, equipment, or muscle group.

FR-CT-002
The system shall support drag-and-drop workout construction, enabling coaches to assemble workouts by dragging movements and components into a structured layout.

FR-CT-003
The system shall support multi-week and multi-month program design with periodization capabilities, allowing coaches to plan training phases across extended timeframes.

FR-CT-004
The system shall provide training cycle templates for common periodization models, including linear, undulating, conjugate, and block periodization.

FR-CT-005
The system shall support percentage-based programming that auto-calculates prescribed loads from each athlete's most recently logged one-rep max values.

FR-CT-006
The system shall support multi-component workout structures, allowing coaches to define distinct sections within a single workout (e.g., warm-up, skill, strength, metcon, cooldown).

FR-CT-007
The system shall allow coaches to copy and duplicate workouts across days and weeks within a program.

FR-CT-008
The system shall allow coaches to import programming from platform-provided templates or from other coaches who have shared their programs.

FR-CT-009
The system shall provide a programming calendar with drag-and-drop scheduling, enabling coaches to assign and rearrange workouts on a visual calendar.

FR-CT-010
The system shall maintain an undo and revision history for program changes, allowing coaches to revert to previous versions of a program or workout.

### 1.2 Programming Delivery

FR-CT-011
The system shall allow coaches to publish a daily workout of the day (WOD) to the gym feed so that all members can view the prescribed training.

FR-CT-012
The system shall support multi-track programming, enabling a gym to offer concurrent program tracks (e.g., Competitors, Fitness, Endurance, Foundations) with independent daily workouts.

FR-CT-013
The system shall allow coaches to attach written coaching notes to each workout, providing guidance on execution, pacing, or focus areas.

FR-CT-014
The system shall allow coaches to define an intended stimulus description for each workout, communicating the target effort level, time domain, and physiological response.

FR-CT-015
The system shall allow coaches to specify scaling guidance and modification options for each workout, detailing how athletes of different ability levels should adjust the prescribed work.

FR-CT-016
The system shall allow coaches to prescribe warm-up and cool-down routines as part of a published workout.

FR-CT-017
The system shall link movement demonstration videos to each exercise within a published workout, so athletes can view proper technique for every prescribed movement.

FR-CT-018
The system shall support scheduled publishing, allowing coaches to write workouts in advance and configure them to auto-publish at a specified date and time.

FR-CT-019
The system shall send a push notification to members when the daily workout is published.

### 1.3 Programming Analysis

FR-CT-020
The system shall provide a programming coverage analysis that evaluates domain and modality balance across a coach's programming over a configurable time window.

FR-CT-021
The system shall provide a time domain distribution analysis showing how programming is distributed across short, medium, and long workout durations.

FR-CT-022
The system shall provide a movement frequency analysis showing how often each movement or movement category appears in programming over a given period.

FR-CT-023
The system shall identify and surface programming gaps, alerting coaches when specific movements, modalities, or domains have not appeared in programming for an extended period (e.g., "you haven't programmed heavy squats in 6 weeks").

FR-CT-024
The system shall allow coaches to compare their programming distribution against balanced programming models or reference benchmarks.

FR-CT-025
The system shall track and display aggregate volume and intensity load across programming over time, enabling coaches to monitor training load trends.

---

## 2. Athlete Monitoring and Management

FR-CT-026
The system shall allow coaches to view any member's full training history, including all logged workouts, scores, and results.

FR-CT-027
The system shall allow coaches to view an athlete's fitness level breakdown and domain scores, reflecting performance across different training modalities.

FR-CT-028
The system shall allow coaches to monitor each athlete's training volume, frequency, and intensity over configurable time periods.

FR-CT-029
The system shall generate inactivity alerts that identify athletes who have not trained within a configurable threshold period.

FR-CT-030
The system shall provide at-risk member identification using churn prediction indicators, flagging members who exhibit patterns associated with membership cancellation.

FR-CT-031
The system shall allow coaches to compare an athlete's progress over time through historical trend views of key performance metrics.

FR-CT-032
The system shall allow coaches to view athlete body composition and nutrition data when such data has been recorded or integrated.

FR-CT-033
The system shall allow coaches to set individualized goals for athletes, with the ability to track progress toward those goals.

FR-CT-034
The system shall allow coaches to assign specific workouts or multi-day programs to individual athletes outside of the group class programming.

FR-CT-035
The system shall allow coaches to add private coach-only notes to athlete profiles that are not visible to the athlete.

FR-CT-036
The system shall allow coaches to track athlete attendance across classes over time.

FR-CT-037
The system shall support athlete readiness and recovery monitoring by integrating data from wearable devices and displaying readiness metrics on athlete profiles.

---

## 3. Class Management

FR-CT-038
The system shall allow coaches to schedule and manage class sessions, including setting class times, durations, and recurrence patterns.

FR-CT-039
The system shall allow coaches to assign specific workouts to specific class time slots.

FR-CT-040
The system shall support per-class attendance tracking with check-in and check-out functionality.

FR-CT-041
The system shall enforce capacity management per class, preventing registrations beyond a configured maximum headcount.

FR-CT-042
The system shall provide waitlist management for classes that have reached capacity, automatically promoting waitlisted members when a spot becomes available.

FR-CT-043
The system shall track late cancellations and no-shows per member, maintaining a history that coaches and administrators can review.

FR-CT-044
The system shall provide a class roster view that displays registered athlete details for each scheduled class session.

FR-CT-045
The system shall provide an in-class timer display mode optimized for TV or projector output, showing workout timers visible to the entire class.

FR-CT-046
The system shall provide an in-class leaderboard display mode that shows a live scoreboard of athlete results during a class session.

FR-CT-047
The system shall support substitute coach assignment, allowing a different coach to be designated for a specific class session without altering the recurring schedule.

FR-CT-048
The system shall allow coaches to add class notes and post-class summaries to a completed class session record.

---

## 4. Video Review and Feedback

FR-CT-049
The system shall allow coaches to receive video uploads submitted by athletes for movement review.

FR-CT-050
The system shall provide frame-by-frame video playback controls for detailed movement analysis.

FR-CT-051
The system shall provide video annotation tools, including drawing and sketching overlays on video frames.

FR-CT-052
The system shall provide text annotation capabilities that allow coaches to attach written comments to specific frames or time ranges within a video.

FR-CT-053
The system shall provide voice-over annotation capabilities, allowing coaches to record audio commentary over an athlete's video.

FR-CT-054
The system shall support side-by-side video comparison, enabling coaches to place two videos adjacent for comparative analysis.

FR-CT-055
The system shall provide slow-motion playback and zoom controls for detailed inspection of movement mechanics.

FR-CT-056
The system shall allow coaches to send annotated video feedback back to the athlete who submitted the original video.

FR-CT-057
The system shall provide a video review queue that organizes pending video submissions and allows coaches to manage their review workload.

FR-CT-058
The system shall support annotation templates for common corrections, allowing coaches to apply pre-defined feedback patterns to expedite the review process.

FR-CT-059
The system shall support video tagging by movement type, enabling coaches to categorize and retrieve reviewed videos by the exercise or movement pattern they contain.

---

## 5. Communication

FR-CT-060
The system shall provide direct messaging between a coach and an individual athlete within the platform.

FR-CT-061
The system shall provide group messaging capabilities, allowing a coach to send messages to all participants in a specific class or program track.

FR-CT-062
The system shall support push notification delivery to defined member groups, enabling coaches to reach targeted subsets of the gym membership.

FR-CT-063
The system shall allow coaches to comment on athlete workout logs with feedback that is visible to the athlete.

FR-CT-064
The system shall support automated milestone celebrations that generate notifications or shout-outs when an athlete achieves a personal record.

FR-CT-065
The system shall allow coaches to post in-app announcements visible to all gym members.

FR-CT-066
The system shall provide email and SMS campaign tools that allow coaches to compose and send communications to selected member segments.
