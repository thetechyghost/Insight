# F3 — Performance Dashboards & Analytics

**Priority:** High
**Platform:** React Native (iOS + Android)
**Depends On:** B2, B3, F2
**Key Spec Files:** 02-user-athlete (§3), 17-mobile-application

---

## Overview

Where athletes see the payoff of their training. PR boards, fitness scores, charts, trends, and comparative analytics — all consuming the APIs built in B2.

---

## Screens — Personal Records

### PR Board

- Grid/list view of all personal bests organized by movement category (barbell, gymnastics, monostructural, benchmark) (FR-UA-055)
- Each PR card: movement name, best value, date achieved, percentage change from previous (FR-UA-056)
- Tap PR → timeline view showing progression over time as a line chart (FR-UA-057)
- Estimated 1RM display for movements with rep-max data, formula noted (Epley/Brzycki) (FR-UA-059)
- Filter: movement category, time period, search by name

### Concept2 PR Board (dedicated section)

- Organized by machine type tabs: RowErg / BikeErg / SkiErg (FR-UA-107)
- All standard distances listed with best time/pace (FR-UA-107)
- PB progression chart per distance — line graph with historical attempts (FR-UA-108)
- "Time since last attempt" indicator — red highlight if >90 days (FR-UA-109)
- "Beat this PB" shortcut — initiates BLE session or pushes to FitTrack device (FR-UA-110)
- Verified vs unverified badge on each record (FR-UA-112)

---

## Screens — Fitness Score

### Composite Score Dashboard

- Large 0–100 score display with trend arrow (improving/stable/declining) (FR-UA-060)
- Spider/radar chart — 10 physical domains plotted (Endurance, Stamina, Strength, Power, Speed, Flexibility, Coordination, Agility, Balance, Accuracy) (FR-UA-061–062)
- Tap any domain → drill-down with contributing movements and scores
- Fitness tier badge: Beginner / Intermediate / Advanced / Elite (FR-UA-066)
- Percentile rank vs platform population — "You're in the top X%" (FR-UA-064)
- Age and gender adjusted toggle for percentile (FR-UA-065)

### Erg Fitness Score (Concept2-specific)

- 0–100 score with 30-day trend indicator (FR-UA-111)
- Score breakdown showing component contributions (volume, pace improvement, global comparison)
- Displayed alongside composite fitness score for C2-focused athletes

---

## Screens — Trends & Progress

### Training Overview

- Workout frequency chart — workouts per week, bar chart, configurable time range (FR-UA-067)
- Training volume chart — total reps and tonnage per period, line/bar chart (FR-UA-068)
- Consistency calendar — GitHub-style heat map showing workout days, intensity color-coded (FR-UA-069)
- Streak display — current workout streak, longest streak, Concept2 streak (FR-UA-115)

### Training Analysis

- Movement frequency breakdown — horizontal bar chart, which movements you do most (FR-UA-070)
- Time domain distribution — pie/donut chart of workout duration buckets (FR-UA-071)
- Modality distribution — pie chart: Monostructural / Gymnastics / Weightlifting / Mixed (FR-UA-072)
- Intensity distribution — RPE distribution over time (FR-UA-076)
- Recovery tracking — days between sessions chart, volume spike warnings (FR-UA-077)

### Movement History

- Select any movement → full performance chart over time (FR-UA-073)
- 1RM trend line for strength movements (FR-UA-074)
- Benchmark workout history — select named workout, see all attempts charted

### Body Comp vs Performance

- Dual-axis chart overlaying body weight/bf% trends with selected performance metric (FR-UA-075)
- Configurable: pick which body metric and which performance metric to correlate

---

## Screens — Comparative Analytics

### Gym Comparison

- After logging a workout, see "You vs Gym Average" card — your score vs gym average for same workout, percentile within gym (FR-UA-078)
- Filterable by Rx/Scaled

### Global Comparison

- "You vs Community" — percentile rank against entire platform for benchmark workouts and lifts (FR-UA-079, FR-UA-082)
- Filter toggles: age group, gender, weight class (FR-UA-080)

### Athlete vs Athlete

- Search for athlete → request comparison (requires mutual consent) (FR-UA-081)
- Side-by-side cards: fitness score, key lifts, benchmark times, training volume
- Consent managed via Convex — both users must approve before data is displayed

### Custom Date Range

- Date range picker on all chart screens — presets (7d/30d/90d/1y/all) plus custom start/end date selector
- Custom range persists per screen during session
- Comparison mode — select two date ranges, overlay charts to compare periods (e.g., "this quarter vs last quarter")

---

## Charting Library

- **Victory Native** (or react-native-chart-kit) for native-feeling charts
- Chart types needed: line, bar, radar/spider, pie/donut, heat map, dual-axis
- All charts support: pinch-to-zoom on time axis, tap for data point detail, configurable time range
- Loading states: skeleton shimmer while Azure Functions queries return (target <2s per NFR-004)
- Offline: last-fetched data cached via TanStack Query, shown with "last updated" timestamp

---

## Data Fetching Pattern

```
Screen mounts
  → TanStack Query fires Azure Functions GET request
  → Cache check: if fresh data exists, render immediately
  → If stale/missing: fetch, render on arrival, cache for next visit
  → Pull-to-refresh forces fresh fetch
```

All analytics endpoints use the Azure Functions performance API from B2. No direct TimescaleDB queries from the client.

---

## Key Design Decisions

- **Analytics are read-heavy, write-rare.** TanStack Query with 5-minute stale time for most dashboards. Athletes check progress a few times per day — slightly stale data is acceptable. PR board and fitness score have shorter stale times (1 minute) since they update on workout completion.
- **Spider chart is the signature visualization.** The 10-domain radar chart is the visual identity of the fitness score. It immediately communicates strengths and weaknesses. Worth investing in polish — smooth animations, tap-to-drill-down, comparison overlay mode.
- **Progressive disclosure.** Top-level screens show summary cards. Tap to drill into detail. Avoids overwhelming athletes with data. Casual users see their score and PRs. Data-focused athletes can dig into every chart.
- **iPad layout.** Analytics screens benefit most from larger screens. Use responsive layout — on iPad, show dashboard grid (2–3 charts side by side) instead of scrolling list. Same components, different layout.

---

## Requirements Covered

FR-UA-054–082 (all performance analytics), FR-UA-106–112 (Concept2 dashboards), FR-UA-115 (C2 streak), FR-MA-016–020 (mobile UX — charts, data display), NFR-004 (2s dashboard load)

## What's Deferred

- Coach view of athlete analytics (→ F7/F9, web admin)
- Export/download analytics as PDF (→ future)
