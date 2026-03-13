# User / Athlete -- Functional Requirements

This document defines the functional requirements for the User/Athlete domain of the Insight fitness platform. The User/Athlete domain encompasses all capabilities available to individual athletes and gym members, including account management, workout tracking and logging, performance analytics, body composition monitoring, and goal setting.

All requirements use the identifier format **FR-UA-NNN** (Functional Requirement -- User/Athlete).

---

## 1. Profile & Account Management

FR-UA-001
The system shall support user registration through self-service sign-up or gym-initiated invitation and onboarding.

FR-UA-002
The system shall maintain a personal profile for each user, including avatar, bio, height, weight, age, and gender.

FR-UA-003
The system shall provide privacy settings that allow the user to control the visibility of their performance data to other members, coaches, and the public.

FR-UA-004
The system shall support multi-gym membership management, allowing a user to join and leave gyms and designate a primary gym.

FR-UA-005
The system shall track a training start date and calculate a training age for each user.

FR-UA-006
The system shall store emergency contact information for each user.

FR-UA-007
The system shall allow users to record medical conditions and injury history, and shall make this information visible to coaches only when the user has granted explicit permission.

FR-UA-008
The system shall provide configurable notification preferences, including push notifications, email, SMS, and in-app notifications.

FR-UA-009
The system shall support account linking via Apple ID, Google, and email/password authentication methods.

---

## 2. Workout Tracking & Logging

### 2.1 Workout Types Supported

FR-UA-010
The system shall support For Time workouts, in which the athlete completes prescribed work as fast as possible and the result is recorded as a time in minutes and seconds.

FR-UA-011
The system shall support AMRAP (As Many Reps/Rounds As Possible) workouts with a fixed time domain, recording the result as total rounds plus remaining reps.

FR-UA-012
The system shall support EMOM (Every Minute On the Minute) workouts, recording rounds completed and weights used.

FR-UA-013
The system shall support Tabata workouts with interval scoring, recording both the lowest-round score and total reps.

FR-UA-014
The system shall support Max Effort / 1RM workouts for single-rep max lifts across all barbell movements.

FR-UA-015
The system shall support Max Reps workouts, recording total reps achieved for a given movement or within a given time constraint.

FR-UA-016
The system shall support Rounds for Time workouts, recording the time required to complete a prescribed number of rounds.

FR-UA-017
The system shall support Strength / Weightlifting workouts, recording sets, reps, and weight for strength-focused training.

FR-UA-018
The system shall support Endurance / Monostructural workouts for rowing, running, biking, swimming, and skiing, recording distance, time, pace, and calories.

FR-UA-019
The system shall support Interval Training workouts with configurable work and rest intervals and per-interval logging.

FR-UA-020
The system shall support Custom Workouts, allowing users to define and log their own workout types.

FR-UA-021
The system shall support Multi-part / Complex Workouts composed of multiple components, such as warm-up, strength, metcon, and cooldown segments.

FR-UA-022
The system shall provide a curated library of Named/Benchmark Workouts from which users can select when logging results.

FR-UA-023
The system shall support Guided/Follow-along Workouts with video playback and real-time metric overlay.

FR-UA-024
The system shall support Open Gym / Free Training sessions, allowing users to log unstructured training activity.

### 2.2 Metrics Tracked Per Workout

FR-UA-025
The system shall record time in minutes, seconds, and milliseconds for applicable workout types.

FR-UA-026
The system shall record rounds and remaining reps for AMRAP workout types.

FR-UA-027
The system shall record load/weight in pounds or kilograms per movement and per set.

FR-UA-028
The system shall record reps completed per set.

FR-UA-029
The system shall record distance in meters, miles, and kilometers for applicable workout types.

FR-UA-030
The system shall record calories burned, supporting both equipment-reported values and platform-estimated values.

FR-UA-031
The system shall record pace in minutes per mile, minutes per 500 meters, and minutes per kilometer for applicable workout types.

FR-UA-032
The system shall record real-time heart rate data from connected wearables, including current, average, and maximum heart rate as well as time spent in each heart rate zone.

FR-UA-033
The system shall record power output in watts from compatible equipment such as bikes and rowers.

FR-UA-034
The system shall record cadence and stroke rate in RPM or strokes per minute for applicable equipment.

FR-UA-035
The system shall record split times per interval, per round, and per distance segment.

FR-UA-036
The system shall support scaling designations of Rx, Rx+, and Scaled, with the ability to attach specific scaling notes describing modifications made.

FR-UA-037
The system shall capture a perceived exertion rating on an RPE scale of 1 to 10 for each workout.

FR-UA-038
The system shall record movement substitutions along with the reason for each substitution.

FR-UA-039
The system shall allow users to attach free-text notes to any workout log entry.

FR-UA-040
The system shall record rest periods between sets.

FR-UA-041
The system shall support tempo notation in the format eccentric/pause/concentric/pause for applicable movements.

FR-UA-042
The system shall record band and assistance levels used for gymnastics movements.

### 2.3 Workout Logging UX

FR-UA-043
The system shall provide a quick-log feature for repeat and benchmark workouts, pre-populating fields from the user's workout history.

FR-UA-044
The system shall display the user's previous scores when re-logging a benchmark workout.

FR-UA-045
The system shall provide built-in timers, including countdown, count-up, Tabata, EMOM, and custom interval timers.

FR-UA-046
The system shall provide a barbell calculator and plate math helper that computes the required plate configuration for a given target weight.

FR-UA-047
The system shall provide a percentage-based loading calculator that computes target weights as a percentage of the user's recorded 1RM.

FR-UA-048
The system shall provide a movement search with autocomplete functionality during workout logging.

FR-UA-049
The system shall support batch entry for strength sets, allowing the user to input uniform sets in a single action (e.g., 5 sets of 5 reps at a given weight).

FR-UA-050
The system shall support voice logging, enabling hands-free rep and set logging via voice input.

FR-UA-051
The system shall provide a one-tap start option for the gym-programmed daily workout.

FR-UA-052
The system shall allow users to copy a previous workout as a template for a new workout entry.

FR-UA-053
The system shall auto-save draft workouts in progress to prevent data loss.

---

## 3. Performance Analytics

### 3.1 Personal Records (PR) Tracking

FR-UA-054
The system shall automatically detect and flag personal records when a workout is logged.

FR-UA-055
The system shall maintain a PR board displaying all personal bests organized by movement and benchmark workout.

FR-UA-056
The system shall track personal records for every named benchmark workout, every lift at every rep scheme, monostructural efforts, max unbroken reps for gymnastics movements, and power output records.

FR-UA-057
The system shall maintain a PR history showing date progression for each personal record on a timeline.

FR-UA-058
The system shall deliver notifications and celebratory feedback when a user achieves a new personal record.

FR-UA-059
The system shall calculate estimated 1RM values from rep-max data using established formulas (Epley, Brzycki).

### 3.2 Fitness Level & Composite Scoring

FR-UA-060
The system shall compute a composite fitness score on a 0 to 100 scale that reflects the user's performance across multiple physical domains.

FR-UA-061
The system shall provide a domain breakdown of the composite fitness score across the following physical skills: Cardiovascular/Respiratory Endurance, Stamina, Strength, Power, Speed, Flexibility, Coordination, Agility, Balance, and Accuracy.

FR-UA-062
The system shall present the domain breakdown as a spider/radar chart visualization highlighting strengths and weaknesses.

FR-UA-063
The system shall update the composite fitness score dynamically with each logged workout.

FR-UA-064
The system shall compute percentile rankings for the user relative to the platform user population.

FR-UA-065
The system shall support gender-adjusted and age-adjusted comparisons when computing percentile rankings and fitness scores.

FR-UA-066
The system shall categorize users into fitness tiers (Beginner, Intermediate, Advanced, Elite) based on their composite fitness score and performance data.

### 3.3 Trend & Progress Analysis

FR-UA-067
The system shall track workout frequency over time, displaying workouts per week and per month.

FR-UA-068
The system shall track training volume over time, including total reps and total tonnage lifted per period.

FR-UA-069
The system shall provide a training consistency calendar or heat map visualization showing workout activity by date.

FR-UA-070
The system shall provide movement frequency analysis, showing how often each movement appears in the user's training history.

FR-UA-071
The system shall provide time domain distribution analysis, showing the breakdown of workout durations across the user's training history.

FR-UA-072
The system shall provide modality distribution analysis, categorizing training volume across Monostructural, Gymnastics, Weightlifting, and Mixed modalities.

FR-UA-073
The system shall display historical performance charts for each movement and benchmark workout.

FR-UA-074
The system shall track estimated 1RM trends over time derived from submaximal training data.

FR-UA-075
The system shall provide body composition vs. performance correlation views, allowing users to visualize relationships between body metrics and workout performance.

FR-UA-076
The system shall display workout intensity distribution over time.

FR-UA-077
The system shall provide recovery tracking, monitoring time between sessions and flagging volume spikes.

### 3.4 Comparative Analytics

FR-UA-078
The system shall allow users to compare their workout results to the gym average for the same workout.

FR-UA-079
The system shall allow users to compare their workout results to the global platform community.

FR-UA-080
The system shall support filtering comparisons by age, gender, and bodyweight class.

FR-UA-081
The system shall support side-by-side performance comparison with specific athletes, requiring mutual consent from both parties before data is shared.

FR-UA-082
The system shall compute and display percentile rankings for the user for every benchmark workout and lift.

---

## 4. Body Composition & Biometrics

FR-UA-083
The system shall support body weight logging with trend tracking over time.

FR-UA-084
The system shall support body fat percentage tracking.

FR-UA-085
The system shall calculate lean body mass from recorded body weight and body fat percentage.

FR-UA-086
The system shall support body measurement logging for waist, hips, chest, arms, thighs, calves, and neck.

FR-UA-087
The system shall auto-calculate BMI from recorded height and weight.

FR-UA-088
The system shall support before/after progress photo uploads with side-by-side comparison view.

FR-UA-089
The system shall provide a photo timeline view displaying progress photos chronologically.

FR-UA-090
The system shall integrate with smart scales to import body weight and body composition data.

FR-UA-091
The system shall support resting heart rate tracking.

FR-UA-092
The system shall support blood pressure logging.

FR-UA-093
The system shall support sleep duration and quality tracking via integration with wearable devices.

FR-UA-094
The system shall support VO2 max estimation imported from compatible wearable devices.

FR-UA-095
The system shall support HRV (Heart Rate Variability) tracking imported from compatible wearable devices.

FR-UA-096
The system shall support body weight goal setting with progress tracking toward the target.

---

## 5. Goal Setting & Programs

FR-UA-097
The system shall allow users to set strength goals by specifying target weights for specific lifts.

FR-UA-098
The system shall allow users to set body composition goals, including target weight and target body fat percentage.

FR-UA-099
The system shall allow users to set endurance goals by specifying target times for benchmark distances.

FR-UA-100
The system shall allow users to set consistency goals by specifying a target number of workouts per week.

FR-UA-101
The system shall allow users to set skill goals for acquiring specific movements.

FR-UA-102
The system shall allow users to follow structured multi-week training programs assigned by a coach.

FR-UA-103
The system shall provide a self-guided program marketplace from which users can purchase or follow published training programs.

FR-UA-104
The system shall support daily and weekly habit tracking for user-defined habits.

FR-UA-105
The system shall provide goal progress dashboards displaying current progress and projected completion dates for each active goal.

---

## 6. Concept2 Performance Tracking

FR-UA-106
The system shall display a Concept2-specific post-workout summary screen including a key stats hero card (total distance, total time, average pace, average stroke rate, average watts), personal best comparison with gap indicator, pace graph with stroke rate overlay, split table, heart rate zone breakdown (if wearable data available), global ranking percentile, notes field, and a share button that generates a styled summary card.

FR-UA-107
The system shall track personal bests for all standard Concept2 distances per machine type: RowErg and SkiErg (100m, 200m, 500m, 1000m, 2000m, 5000m, 6000m, 10000m, Half Marathon, Marathon, 1 min, 4 min, 30 min, 60 min); BikeErg (1000m, 2000m, 4000m, 5000m, 10000m, 20000m, Half Marathon, Marathon, 1 min, 4 min, 30 min, 60 min). (Cross-ref: FR-UA-054)

FR-UA-108
The system shall display a personal best progression chart per standard Concept2 distance, showing a line graph of historical attempts and PB improvement over time.

FR-UA-109
The system shall display a "time since last attempt" indicator for each standard Concept2 distance, with visual emphasis when more than 90 days have elapsed since the last attempt.

FR-UA-110
The system shall provide a "Beat this PB" shortcut from the personal bests board that either pushes a target workout for the selected distance to a connected FitTrack Integration Device or initiates a direct Bluetooth LE session on the mobile app.

FR-UA-111
The system shall compute an Erg Fitness Score (0–100) derived from recent training volume, pace improvement trends across standard distances, and comparison against global age-and-gender benchmarks, with a trend indicator (improving, stable, or declining over the last 30 days) and a score breakdown showing each component's contribution. (Cross-ref: FR-UA-060)

FR-UA-112
The system shall classify Concept2 workouts as Verified (captured by a FitTrack Integration Device or validated with a PM5 verification code) or Unverified (manual entry without verification code), and shall exclude Unverified workouts from official rankings and global leaderboards.

FR-UA-113
The system shall support manual Concept2 workout entry, allowing athletes to enter machine type, workout type, date, total distance, total time, average pace, average stroke rate, average watts, calories, individual split data for interval workouts, freetext notes, and an optional PM5 verification code.

FR-UA-114
The system shall support workout history filtering by Concept2 machine type (RowErg, BikeErg, SkiErg), workout type (Single Distance, Single Time, Interval, Free), date range, and verified/unverified status.

FR-UA-115
The system shall track a Concept2-specific training streak measuring consecutive days or weeks with at least one Concept2 workout logged.

FR-UA-116
The system shall generate a shareable workout summary card (styled image) suitable for posting to social media platforms after a Concept2 workout is completed.
