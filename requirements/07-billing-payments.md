# 7. Billing & Payments

This document defines the functional requirements for the Billing & Payments domain of the Insight fitness platform. This domain encompasses all capabilities related to membership billing, payment processing, invoicing, and the sale of financial products. It ensures accurate, secure, and configurable revenue collection across diverse billing models, payment methods, and tenant configurations.

---

## 7.1 Membership Billing

**FR-BP-001**
The system shall support recurring membership billing on monthly, quarterly, and annual billing cycles.

**FR-BP-002**
The system shall provide autopay setup and management, allowing members to enroll in and modify automatic recurring payment arrangements.

**FR-BP-003**
The system shall support multiple payment methods, including credit card, debit card, and ACH/bank transfer.

**FR-BP-004**
The system shall store payment card information in a PCI-compliant manner, ensuring secure handling and tokenization of sensitive cardholder data.

**FR-BP-005**
The system shall calculate and apply proration when a membership change occurs mid-billing cycle, adjusting charges to reflect the remaining period under each plan.

**FR-BP-006**
The system shall support membership upgrade and downgrade workflows, including plan comparison, confirmation, and corresponding billing adjustments.

**FR-BP-007**
The system shall support membership freeze and hold functionality with configurable billing behavior during the hold period, including full billing pause and reduced-rate billing.

**FR-BP-008**
The system shall support family billing, enabling multiple members to be grouped under a single payment account and billed with a consolidated payment.

**FR-BP-009**
The system shall support corporate billing, allowing organizations to be billed for memberships on behalf of their employees or affiliates.

**FR-BP-010**
The system shall provide scholarship and discount rate management, enabling administrators to assign and track reduced membership rates for qualifying members.

**FR-BP-011**
The system shall support free trial period management, including configurable trial durations and automatic conversion to a paid membership upon trial expiration.

---

## 7.2 Payment Processing

**FR-BP-012**
The system shall integrate with a payment gateway to authorize, capture, and settle payment transactions.

**FR-BP-013**
The system shall implement failed payment retry logic with a configurable retry schedule, defining the number of retry attempts and the interval between them.

**FR-BP-014**
The system shall provide dunning management capabilities, including automated follow-up communications to members with failed or outstanding payments.

**FR-BP-015**
The system shall support late fee configuration and automatic application of late fees to overdue accounts based on administrator-defined rules.

**FR-BP-016**
The system shall generate and deliver payment receipts via email and within the member-facing application upon successful payment processing.

**FR-BP-017**
The system shall support refund processing, allowing authorized staff to issue full or partial refunds against completed transactions.

**FR-BP-018**
The system shall provide chargeback management and dispute handling capabilities, enabling staff to track, respond to, and resolve payment disputes.

**FR-BP-019**
The system shall support multi-currency payment processing, allowing international tenants to accept payments in their configured local currencies.

**FR-BP-020**
The system shall calculate and collect applicable taxes based on configurable tax rates, supporting varying tax jurisdictions and tax-exempt designations.

**FR-BP-021**
The system shall provide a processing fee pass-through option, allowing tenants to configure whether payment processing fees are absorbed by the business or passed through to the member.

---

## 7.3 Invoicing

**FR-BP-022**
The system shall automatically generate invoices for recurring charges, one-time purchases, and other billable events according to the configured billing schedule.

**FR-BP-023**
The system shall allow authorized staff to manually create invoices for ad hoc charges and custom billing scenarios.

**FR-BP-024**
The system shall support line item management on invoices, enabling the inclusion of distinct entries for services, products, fees, taxes, and discounts.

**FR-BP-025**
The system shall support the creation of credit notes and billing adjustments to correct or offset previously issued invoice amounts.

**FR-BP-026**
The system shall generate invoices in PDF format and deliver them to members via email or make them available for download within the application.

**FR-BP-027**
The system shall track outstanding balances per member account, providing visibility into unpaid amounts and aging of receivables.

**FR-BP-028**
The system shall support payment plans and installment management, allowing a total amount to be divided into a series of scheduled payments.

**FR-BP-029**
The system shall support batch invoicing, enabling administrators to generate and issue invoices for multiple accounts in a single operation.

---

## 7.4 Financial Products

**FR-BP-030**
The system shall support the sale of drop-in passes, allowing non-members or members to purchase single-visit access.

**FR-BP-031**
The system shall support the sale of class packs and punch cards, enabling members to purchase a defined number of visits or class admissions for a fixed price.

**FR-BP-032**
The system shall support the sale of personal training packages, allowing members to purchase bundles of training sessions at a defined price.

**FR-BP-033**
The system shall support merchandise and retail sales, enabling the sale of physical goods through the platform's point-of-sale capabilities.

**FR-BP-034**
The system shall support gift card and gift certificate sales and redemption, allowing purchasers to buy stored-value instruments that recipients can apply toward purchases or memberships.

**FR-BP-035**
The system shall support event and workshop ticket sales, enabling members and non-members to purchase admission to scheduled events.

**FR-BP-036**
The system shall support online program and course sales, allowing users to purchase access to digital fitness programs, courses, or content.

**FR-BP-037**
The system shall support promotional pricing mechanisms, including discounts, coupons, and promo codes that can be applied to memberships, products, and services.
