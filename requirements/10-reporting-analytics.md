# 10. Reporting & Analytics

This document defines the functional requirements for the Reporting & Analytics domain of the Insight fitness platform. This domain encompasses all capabilities related to business intelligence, member behavior analysis, operational performance measurement, fitness outcome tracking, marketing effectiveness evaluation, and custom report generation. It ensures that gym owners, coaches, and administrators have access to actionable, data-driven insights across all areas of their business.

---

## 10.1 Business Analytics

**FR-RA-001**
The system shall generate revenue reports on daily, weekly, and monthly intervals, including year-over-year comparisons.

**FR-RA-002**
The system shall calculate and display Monthly Recurring Revenue (MRR) with trend analysis over configurable time periods.

**FR-RA-003**
The system shall calculate and display Average Revenue Per Member (ARPM) across configurable time periods and membership segments.

**FR-RA-004**
The system shall calculate and display Member Lifetime Value (LTV) based on historical revenue and retention data.

**FR-RA-005**
The system shall calculate and display churn rate and retention analytics, tracking the rate at which members cancel or fail to renew their memberships over time.

**FR-RA-006**
The system shall track and report on new member acquisition rate, including a breakdown by acquisition source.

**FR-RA-007**
The system shall track and report on trial-to-paid membership conversion rates over configurable time periods.

**FR-RA-008**
The system shall generate accounts receivable aging reports, categorizing outstanding balances by age brackets.

**FR-RA-009**
The system shall provide cash flow forecasting based on projected recurring revenue, scheduled payments, and historical collection patterns.

**FR-RA-010**
The system shall generate revenue breakdowns by product and service type, enabling comparison across revenue categories.

**FR-RA-011**
The system shall generate revenue breakdowns by membership type, enabling comparison of financial performance across membership tiers and plans.

**FR-RA-012**
The system shall provide break-even analysis, calculating the point at which total revenue equals total costs based on configurable cost inputs and current revenue trends.

---

## 10.2 Member Analytics

**FR-RA-013**
The system shall display the total active member count and visualize the membership trend over configurable time periods.

**FR-RA-014**
The system shall track and report on member growth and decline over time, including net membership change by period.

**FR-RA-015**
The system shall provide attendance analytics with filtering and grouping by class, time of day, day of week, and coach.

**FR-RA-016**
The system shall calculate and display the average number of visits per member per month across configurable time periods.

**FR-RA-017**
The system shall calculate a member engagement score based on configurable factors such as attendance frequency, class variety, and platform interaction.

**FR-RA-018**
The system shall identify at-risk members based on configurable criteria, including declining attendance patterns, approaching contract end dates, and reduced engagement scores.

**FR-RA-019**
The system shall provide a member demographics breakdown, reporting on the composition of the membership base by attributes such as age, gender, and location.

**FR-RA-020**
The system shall support member retention cohort analysis, grouping members by join date and tracking retention rates for each cohort over time.

**FR-RA-021**
The system shall track and display member satisfaction trends over time, including Net Promoter Score (NPS) aggregation by period.

---

## 10.3 Operational Analytics

**FR-RA-022**
The system shall calculate and display class utilization rates by comparing scheduled capacity against actual attendance for each class.

**FR-RA-023**
The system shall provide peak hours analysis, identifying the busiest facility usage periods by time of day and day of week.

**FR-RA-024**
The system shall generate coach performance metrics, including class attendance averages, member retention within coached classes, and member satisfaction ratings per coach.

**FR-RA-025**
The system shall generate staff productivity reports, tracking key performance indicators for staff members based on configurable metrics.

**FR-RA-026**
The system shall generate facility utilization reports, tracking usage of physical spaces, rooms, and training areas over time.

**FR-RA-027**
The system shall provide equipment usage analytics, tracking utilization frequency and patterns for registered equipment assets.

**FR-RA-028**
The system shall provide waitlist analytics, including waitlist frequency by class, average wait duration, and conversion rate from waitlist to attendance.

**FR-RA-029**
The system shall track and report on no-show and late cancellation rates, with filtering by class, member, and time period.

---

## 10.4 Performance / Fitness Analytics (Gym-Wide)

**FR-RA-030**
The system shall calculate and display the gym-wide average fitness level and its trend over configurable time periods.

**FR-RA-031**
The system shall provide a distribution analysis of personal records (PRs) across the membership base, grouped by movement or benchmark.

**FR-RA-032**
The system shall track and report on benchmark workout participation rates across the membership base.

**FR-RA-033**
The system shall provide programming effectiveness analysis, evaluating the coverage of targeted fitness domains within the programmed workout schedule.

**FR-RA-034**
The system shall generate a movement competency distribution report, visualizing the spread of proficiency levels across the membership for tracked movements.

**FR-RA-035**
The system shall provide workout type distribution analysis, reporting on the frequency and proportion of different workout categories within the programming.

**FR-RA-036**
The system shall track and display training volume trends across the membership base over configurable time periods.

---

## 10.5 Marketing Analytics

**FR-RA-037**
The system shall track and report on lead source effectiveness, attributing new leads and conversions to their originating marketing channels.

**FR-RA-038**
The system shall calculate and display campaign return on investment (ROI) by comparing campaign costs against revenue generated from attributed conversions.

**FR-RA-039**
The system shall provide conversion funnel analytics, tracking prospect progression through configurable funnel stages from initial lead to paid membership.

**FR-RA-040**
The system shall track and report on referral program performance, including the number of referrals generated, conversion rates, and revenue attributed to member referrals.

**FR-RA-041**
The system shall provide email and SMS campaign performance analytics, including delivery rates, open rates, click-through rates, and conversion rates per campaign.

**FR-RA-042**
The system shall track and display social media engagement metrics, aggregating interaction data from connected social media accounts.

**FR-RA-043**
The system shall track and report on promotional offer redemption rates, measuring the usage and effectiveness of discount codes, coupons, and special promotions.

---

## 10.6 Custom Reporting

**FR-RA-044**
The system shall provide a custom report builder with a drag-and-drop interface, allowing authorized users to select and arrange data fields, filters, and groupings to construct ad hoc reports.

**FR-RA-045**
The system shall support report scheduling and automated delivery, enabling users to configure reports to run at defined intervals and be distributed via email to specified recipients.

**FR-RA-046**
The system shall support report export in CSV, PDF, and Excel formats.

**FR-RA-047**
The system shall provide dashboard customization capabilities, allowing authorized users to configure, arrange, and personalize the widgets and data visualizations displayed on their dashboards.

**FR-RA-048**
The system shall support saved report templates, enabling users to save custom report configurations for reuse and sharing with other authorized users.

**FR-RA-049**
The system shall support cross-location comparative reports, enabling multi-location tenants to compare key metrics across their facilities within a single report.

**FR-RA-050**
The system shall provide API access for custom business intelligence tool integration, enabling authorized external systems to query and retrieve reporting data programmatically.
