# 20. Nutrition & Wellness — Functional Requirements

This document defines the functional requirements for the Nutrition & Wellness domain of the Insight fitness platform. This domain encompasses daily food logging and macronutrient tracking, nutrition analytics and adherence reporting, and holistic wellness monitoring including sleep, recovery, habit tracking, and subjective readiness assessments. Together these capabilities enable athletes and coaches to make informed decisions about fueling, recovery, and long-term health.

---

## 20.1 Nutrition Tracking

**FR-NW-001**
The system shall provide a daily food logging interface that allows users to record individual food items categorized by meal type (breakfast, lunch, dinner, snack, or user-defined meal).

**FR-NW-002**
The system shall track macronutrient intake for each logged food item, recording protein, carbohydrates, and fat in grams.

**FR-NW-003**
The system shall calculate and display a daily total calorie count derived from all logged food items.

**FR-NW-004**
The system shall provide a searchable food database that allows users to look up foods by name and retrieve their nutritional information.

**FR-NW-005**
The system shall support barcode scanning for packaged food products, automatically populating nutritional data from the scanned item.

**FR-NW-006**
The system shall allow users to create and save meal templates (saved meals) that can be recalled for quick logging of frequently consumed meals.

**FR-NW-007**
The system shall allow users to create custom food entries and custom recipes with user-defined nutritional values.

**FR-NW-008**
The system shall support Zone Diet block tracking, allowing users to log and monitor intake in terms of Zone blocks in addition to raw macronutrient grams.

**FR-NW-009**
The system shall provide macro ratio visualizations, including pie charts and bar charts, that display the proportional breakdown of protein, carbohydrates, and fat.

**FR-NW-010**
The system shall allow custom macronutrient targets to be set by the user or prescribed by a coach, and shall display progress toward those targets throughout the day.

**FR-NW-011**
The system shall provide water and hydration tracking, allowing users to log daily fluid intake and view progress toward a configurable hydration goal.

---

## 20.2 Nutrition Analytics

**FR-NW-012**
The system shall generate nutrition summaries at daily, weekly, and monthly intervals, including total calories, macronutrient totals, and averages per period.

**FR-NW-013**
The system shall provide intake-versus-target analysis that clearly indicates whether the user is over or under their prescribed calorie and macronutrient targets for a given period.

**FR-NW-014**
The system shall display nutrition adherence trends over time, showing how consistently a user meets their nutritional targets across configurable date ranges.

**FR-NW-015**
The system shall provide correlation views that overlay nutrition data against workout performance metrics, enabling users and coaches to identify relationships between dietary intake and training outcomes.

**FR-NW-016**
The system shall generate coach-visible nutrition reports for each athlete, allowing coaches to review an athlete's nutritional intake, adherence, and trends without requiring the athlete to share data manually.

---

## 20.3 Wellness Tracking

**FR-NW-017**
The system shall integrate with wearable devices to capture sleep tracking data, including sleep duration and sleep quality metrics.

**FR-NW-018**
The system shall integrate with wearable devices to capture stress and readiness scores, and shall present these scores within the user's wellness dashboard.

**FR-NW-019**
The system shall provide a daily wellness check-in that captures subjective self-reported data including mood, energy level, soreness, and perceived sleep quality.

**FR-NW-020**
The system shall generate recovery recommendations based on the combination of current training load and wellness data, advising users on appropriate rest, intensity adjustments, or recovery activities.

**FR-NW-021**
The system shall support habit tracking, allowing users to define and log recurring wellness habits such as stretching, meditation, foam rolling, and other user-defined activities.

**FR-NW-022**
The system shall provide supplement tracking, allowing users to log daily supplement intake including supplement name, dosage, and timing.
