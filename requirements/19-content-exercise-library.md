# Content & Exercise Library -- Functional Requirements

This document defines the functional requirements for the Content & Exercise Library domain of the Insight fitness platform. The Content & Exercise Library domain encompasses all capabilities related to the platform's movement and exercise database, benchmark workout library, training program library, and educational content offerings. These features provide the foundational content that coaches and athletes rely on for workout programming, performance tracking, skill development, and ongoing education.

All requirements use the identifier format **FR-EL-NNN** (Functional Requirement -- Exercise Library).

---

## 19.1 Movement / Exercise Database

FR-EL-001
The system shall provide a comprehensive exercise library containing a minimum of 500 distinct movements.

FR-EL-002
The system shall categorize exercises into the following primary categories: Weightlifting, Gymnastics, Monostructural, Accessory, and Mobility.

FR-EL-003
The system shall store and display the name and all known aliases for each exercise in the library.

FR-EL-004
The system shall store and display a detailed description and coaching cues for each exercise.

FR-EL-005
The system shall store and display demonstration videos filmed from multiple angles for each exercise.

FR-EL-006
The system shall store and display common faults and their corresponding corrections for each exercise.

FR-EL-007
The system shall store and display scaling options and movement progressions for each exercise, enabling athletes to work toward more advanced variations.

FR-EL-008
The system shall store and display the required equipment for each exercise.

FR-EL-009
The system shall store and display the targeted muscle groups for each exercise.

FR-EL-010
The system shall store and display a difficulty level for each exercise.

FR-EL-011
The system shall store and display related movements for each exercise, linking exercises that share similar movement patterns or muscle group targets.

FR-EL-012
The system shall provide exercise search functionality with autocomplete, returning relevant results as the user types a partial exercise name or alias.

FR-EL-013
The system shall allow tenants to create custom exercises that are visible only within their own gym, including all standard per-exercise detail fields.

FR-EL-014
The system shall allow members to mark exercises as favorites for quick retrieval.

FR-EL-015
The system shall track and display each member's recently used exercises for quick retrieval.

---

## 19.2 Benchmark Workout Library

FR-EL-016
The system shall provide a benchmark workout library containing the standard CrossFit benchmark workouts known as "The Girls," including but not limited to Fran, Grace, Helen, and Diane.

FR-EL-017
The system shall provide a benchmark workout library containing Hero WODs, including but not limited to Murph, DT, and Nate.

FR-EL-018
The system shall provide a complete historical archive of all CrossFit Open workouts as benchmark entries.

FR-EL-019
The system shall provide a historical archive of CrossFit Games event workouts as benchmark entries.

FR-EL-020
The system shall provide strength benchmarks for one-rep-max testing across all major barbell lifts tracked on the platform.

FR-EL-021
The system shall provide gymnastics benchmarks for maximum-repetition testing of bodyweight movements.

FR-EL-022
The system shall provide monostructural benchmarks for standard distances and time-based efforts across running, rowing, cycling, swimming, and other supported modalities.

FR-EL-023
The system shall allow tenants to create and maintain custom gym-specific benchmark workouts that are visible to their members.

FR-EL-024
The system shall provide suggested retest intervals for each benchmark workout and shall support configurable retest schedules to prompt athletes when a benchmark is due for retesting.

---

## 19.3 Training Program Library

FR-EL-025
The system shall provide a library of pre-built multi-week training programs that athletes can browse and enroll in.

FR-EL-026
The system shall provide a program marketplace that allows coaches to publish training programs and allows users to discover and purchase them.

FR-EL-027
The system shall support categorization of training programs by goal type, including but not limited to strength, endurance, competition preparation, sport-specific training, and beginner programs.

FR-EL-028
The system shall provide a program preview for each training program, allowing users to review the program structure, duration, and summary before enrolling or purchasing.

FR-EL-029
The system shall provide a review and rating system for training programs, allowing users who have completed or are enrolled in a program to submit ratings and written reviews.

FR-EL-030
The system shall support program assignment, allowing coaches to assign a training program to one or more athletes.

FR-EL-031
The system shall provide program progress tracking, displaying each enrolled athlete's current week, session completion status, and overall percentage of program completion.

---

## 19.4 Educational Content

FR-EL-032
The system shall provide an exercise tutorial library containing instructional content for movements in the exercise database.

FR-EL-033
The system shall provide nutrition education content, including articles and multimedia resources covering dietary guidance relevant to fitness training.

FR-EL-034
The system shall provide recovery and mobility educational content, including articles and multimedia resources covering stretching, soft tissue work, and recovery protocols.

FR-EL-035
The system shall provide training methodology articles covering programming principles, periodization, and training theory.

FR-EL-036
The system shall provide coach education resources, including content specifically designed to support coach professional development and continuing education.
