# Tenant / Gym Owner -- Functional Requirements

This document defines the functional requirements for the Tenant/Gym Owner domain of the Insight fitness platform. The Tenant/Gym Owner domain encompasses the administrative capabilities available to gym owners and managers, covering member management, staff operations, business intelligence, financial management, marketing and growth tools, and feedback and quality assurance.

All requirements use the identifier format **FR-TG-NNN** (Functional Requirement -- Tenant/Gym Owner).

---

## 1. Member Management

FR-TG-001
The system shall provide a member roster view with search, filter, and sort capabilities across all member records.

FR-TG-002
The system shall maintain member profiles containing full member history, including attendance records, billing history, and performance data.

FR-TG-003
The system shall track membership status for each member using defined lifecycle states: active, frozen, cancelled, and prospect.

FR-TG-004
The system shall support configurable membership types, including but not limited to unlimited, limited, drop-in, family, and corporate plans.

FR-TG-005
The system shall provide contract and agreement management, including the ability to define terms, duration, and renewal conditions for each membership.

FR-TG-006
The system shall support digital waiver and liability forms with electronic signature capture.

FR-TG-007
The system shall provide automated member onboarding workflows, including a configurable welcome sequence triggered upon new member registration.

FR-TG-008
The system shall support family and household account linking, allowing multiple members to be grouped under a shared household.

FR-TG-009
The system shall support corporate and group membership management, enabling bulk enrollment and centralized billing for organizations.

FR-TG-010
The system shall allow tenant administrators to define custom tags and custom fields on member records.

FR-TG-011
The system shall support bulk member operations, including mass email, bulk status changes, and bulk data imports.

FR-TG-012
The system shall provide member import and export functionality in CSV format, including migration tooling for data ingestion from other platforms.

FR-TG-013
The system shall provide automated member lifecycle management that transitions members through defined stages: trial, active, renewal, at-risk, and cancelled.

FR-TG-014
The system shall support member freeze and hold management with configurable policies governing freeze duration, frequency, and billing treatment.

---

## 2. Staff Management

FR-TG-015
The system shall maintain staff profiles with assigned roles for each staff member.

FR-TG-016
The system shall enforce role-based access control with predefined roles including owner, manager, head coach, coach, and front desk.

FR-TG-017
The system shall support granular permission configuration per role, allowing tenant administrators to specify which features and data each role may access.

FR-TG-018
The system shall provide staff scheduling capabilities, including class assignments and shift management.

FR-TG-019
The system shall track payroll-relevant data for staff, including hours worked, classes taught, and personal training sessions delivered.

FR-TG-020
The system shall calculate and display staff performance metrics based on configurable criteria.

FR-TG-021
The system shall support commission tracking for personal training sessions and retail sales.

FR-TG-022
The system shall provide internal staff communication tools for messaging between team members within a tenant.

FR-TG-023
The system shall track staff certifications and credentials, including certification type, issuing authority, and expiration date, and shall alert administrators when credentials are approaching expiration.

FR-TG-024
The system shall provide task assignment and management functionality for delegating and tracking work items across staff members.

---

## 3. Business Operations

FR-TG-025
The system shall support multi-location management for gym chains and franchises, enabling a single tenant to operate across multiple physical locations.

FR-TG-026
The system shall provide centralized reporting that aggregates data across all locations within a multi-location tenant.

FR-TG-027
The system shall allow per-location configuration and branding within a multi-location tenant.

FR-TG-028
The system shall support configurable member access policies that govern which locations a member may access within a multi-location tenant.

FR-TG-029
The system shall support staff assignment across multiple locations within a multi-location tenant.

FR-TG-030
The system shall generate both consolidated and per-location financial reports for multi-location tenants.

FR-TG-031
The system shall provide an operational dashboard displaying daily, weekly, and monthly key performance indicators.

FR-TG-032
The system shall provide a custom report builder that allows tenant administrators to define and save custom report configurations.

FR-TG-033
The system shall support data export in CSV, PDF, and API-accessible formats.

FR-TG-034
The system shall provide calendar management for defining holidays, special events, and facility closures.

FR-TG-035
The system shall provide inventory management for tracking retail products and equipment stock levels.

FR-TG-036
The system shall support equipment maintenance tracking and scheduling, including maintenance history and upcoming service dates.

FR-TG-037
The system shall provide facility resource management enabling room and space booking by staff and members.

---

## 4. Invoicing & Financial Management

FR-TG-038
The system shall support invoice generation and management for all billable activities.

FR-TG-039
The system shall support recurring membership invoicing on configurable billing cycles.

FR-TG-040
The system shall support one-time charge invoicing for ad hoc services and purchases.

FR-TG-041
The system shall support credit note issuance and refund management.

FR-TG-042
The system shall track outstanding balances and provide aging reports segmented by time period.

FR-TG-043
The system shall support payment plan management, allowing balances to be split across scheduled installments.

FR-TG-044
The system shall support tax configuration at the tenant level and shall generate tax reporting data.

FR-TG-045
The system shall integrate with external accounting software, including QuickBooks and Xero, for financial data synchronization.

FR-TG-046
The system shall provide revenue recognition reporting in accordance with configurable recognition rules.

FR-TG-047
The system shall provide financial dashboards displaying key metrics including monthly recurring revenue, annual recurring revenue, customer lifetime value, and churn rate.

FR-TG-048
The system shall support processing fee management with configurable options to pass fees through to members or absorb them at the tenant level.

---

## 5. Marketing & Growth

FR-TG-049
The system shall provide email marketing campaign tools, including template management, scheduling, and audience segmentation.

FR-TG-050
The system shall provide SMS marketing campaign tools with audience segmentation and scheduling.

FR-TG-051
The system shall provide embeddable lead capture forms for use on external websites and landing pages.

FR-TG-052
The system shall support referral program management, including referral tracking, reward configuration, and referral attribution.

FR-TG-053
The system shall support promotional campaign management, including discounts, trial offers, and limited-time promotions.

FR-TG-054
The system shall generate QR codes for promotions and marketing materials.

FR-TG-055
The system shall integrate with social media platforms, including Facebook Leads and Instagram, for lead acquisition.

FR-TG-056
The system shall provide tools for collecting and managing member reviews and testimonials.

FR-TG-057
The system shall support trial and introductory offer management with configurable duration, pricing, and conversion workflows.

FR-TG-058
The system shall support automated follow-up sequences triggered by configurable events such as lead capture, trial expiration, or member inactivity.

FR-TG-059
The system shall support A/B testing for marketing campaigns, allowing comparison of variant performance.

FR-TG-060
The system shall provide marketing analytics including campaign performance metrics and conversion rate tracking.

FR-TG-061
The system shall provide a branded website builder for creating SEO-optimized landing pages under the tenant's branding.

---

## 6. Feedback & Quality

FR-TG-062
The system shall support automated member satisfaction surveys, including post-class surveys and periodic Net Promoter Score surveys.

FR-TG-063
The system shall provide a coach and class rating system that allows members to submit ratings after attending sessions.

FR-TG-064
The system shall provide a suggestion box or feedback portal where members can submit general feedback to the tenant.

FR-TG-065
The system shall support service recovery workflows that automatically trigger follow-up actions when negative feedback is received.

FR-TG-066
The system shall track Net Promoter Score over time and display historical NPS trends on the operational dashboard.

FR-TG-067
The system shall support automated review solicitation, prompting satisfied members to leave reviews on configured external platforms.
