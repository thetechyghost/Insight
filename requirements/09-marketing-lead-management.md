# Marketing & Lead Management -- Functional Requirements

This document defines the functional requirements for the Marketing & Lead Management domain of the Insight fitness platform. The Marketing & Lead Management domain encompasses all capabilities related to acquiring, tracking, and converting prospective members, including lead capture across digital and physical channels, CRM pipeline management, trial and conversion workflows, member referral programs, and promotional campaign management.

All requirements use the identifier format **FR-ML-NNN** (Functional Requirement -- Marketing & Lead Management).

---

## 1. Lead Capture

FR-ML-001
The system shall provide embeddable website lead capture form widgets that can be placed on external websites to collect prospect information.

FR-ML-002
The system shall provide a landing page builder that allows staff to create campaign-specific landing pages with lead capture forms.

FR-ML-003
The system shall integrate with Facebook Lead Ads to automatically import leads generated through Facebook advertising campaigns.

FR-ML-004
The system shall support Instagram lead capture by integrating with Instagram advertising and contact mechanisms.

FR-ML-005
The system shall support QR code generation for physical marketing materials, linking to digital lead capture forms.

FR-ML-006
The system shall support manual lead entry for walk-in visitors and phone inquiries, capturing contact details and inquiry context.

FR-ML-007
The system shall track referral leads, associating each referred prospect with the originating member.

FR-ML-008
The system shall attribute each lead to its originating source, maintaining a configurable taxonomy of lead sources across all capture channels.

---

## 2. CRM & Pipeline Management

FR-ML-009
The system shall provide a lead pipeline with configurable stages, defaulting to New, Contacted, Trial Booked, Trial Completed, and Converted, with the ability for staff to add, rename, reorder, and remove stages.

FR-ML-010
The system shall automatically update lead status based on tracked actions, such as advancing a lead to Trial Booked when a trial class is scheduled.

FR-ML-011
The system shall support lead assignment to sales staff members, including manual assignment and configurable automatic assignment rules.

FR-ML-012
The system shall compute a lead score for each prospect based on configurable criteria such as engagement level, demographics, and source quality, and shall use this score to prioritize leads in pipeline views.

FR-ML-013
The system shall provide follow-up task management, allowing staff to create, assign, schedule, and track follow-up tasks associated with individual leads.

FR-ML-014
The system shall maintain a communication history for each lead, recording all notes, emails, calls, and messages associated with the prospect.

FR-ML-015
The system shall support cold lead re-engagement automation, triggering configurable outreach sequences when a lead has been inactive beyond a defined threshold.

FR-ML-016
The system shall support lead segmentation by demographics, lead source, area of interest, and other configurable attributes to enable targeted outreach.

---

## 3. Trial & Conversion Management

FR-ML-017
The system shall support free trial offer configuration, allowing staff to define trial duration, eligible classes, and any restrictions or conditions.

FR-ML-018
The system shall provide a trial class booking flow that allows prospects to browse available trial sessions and book a trial visit.

FR-ML-019
The system shall track trial-to-member conversion status for each prospect, recording whether and when a trial participant converts to a paying membership.

FR-ML-020
The system shall support automated trial follow-up sequences, sending configurable messages at defined intervals during and after the trial period.

FR-ML-021
The system shall send trial expiration notifications to prospects and assigned staff before and upon trial period expiration.

FR-ML-022
The system shall provide conversion analytics, including trial-to-paid conversion rate, average time-to-convert, and conversion rate segmented by lead source, staff member, and trial type.

---

## 4. Referral Programs

FR-ML-023
The system shall track member referrals, recording which existing member referred each new prospect and the resulting conversion outcome.

FR-ML-024
The system shall support configurable referral reward definitions, including discounts, free membership periods, and merchandise credits.

FR-ML-025
The system shall generate unique referral links for each member that automatically attribute new leads to the referring member.

FR-ML-026
The system shall provide referral leaderboards displaying top referrers ranked by number of successful referrals within configurable time periods.

FR-ML-027
The system shall support automated referral reward fulfillment, applying earned rewards to the referring member's account upon successful conversion of the referred prospect.

FR-ML-028
The system shall provide referral program analytics, including total referrals generated, referral conversion rate, rewards distributed, and revenue attributed to referrals.

---

## 5. Promotions & Campaigns

FR-ML-029
The system shall support promotional offer creation with configurable discount types, including percentage off, fixed amount off, free trial periods, and bundled pricing.

FR-ML-030
The system shall support promo code generation and tracking, recording usage count, redemption history, and revenue attributed to each code.

FR-ML-031
The system shall support limited-time offer management with configurable start and end dates, automatically activating and deactivating offers based on the defined schedule.

FR-ML-032
The system shall support quantity-limited offer management, enforcing a maximum redemption count and automatically deactivating the offer when the limit is reached.

FR-ML-033
The system shall provide social media sharing tools that allow staff to share promotional offers directly to social media platforms with pre-formatted content.

FR-ML-034
The system shall provide campaign performance analytics, including impressions, leads generated, conversion rate, cost per lead, and return on investment for each campaign.

FR-ML-035
The system shall support A/B testing for promotional offers and messaging, allowing staff to compare the performance of variant offers or copy against a control.

FR-ML-036
The system shall provide seasonal campaign templates with pre-configured promotional structures that staff can customize and deploy.
