# B10 — Billing & Payments

**Priority:** Lower
**Depends On:** B1
**Key Spec Files:** 07-billing-payments

---

## Overview

Membership billing, payment processing, invoicing, and financial products. Stripe as the payment backbone, Convex managing subscription state.

---

## External Integration: Stripe

### Stripe Products Used

- **Stripe Billing** — recurring membership subscriptions (FR-BP-001–008)
- **Stripe Checkout** — one-time payments (PT sessions, events, retail) (FR-BP-009)
- **Stripe Connect** — per-tenant Stripe accounts for platform marketplace model (FR-BP-010)
- **Stripe Invoicing** — automated invoice generation and delivery (FR-BP-020–024)
- **Stripe Payment Methods** — card, ACH/bank transfer, Apple Pay, Google Pay (FR-BP-011–013)
- **Stripe Webhooks** — payment lifecycle events back to Convex

---

## Convex Schemas

### New

- **`membership_plans`** — per-tenant plan definitions: name, type (recurring/punch-card/drop-in/trial), price, billing interval (weekly/monthly/annual), contract length, setup fee, included classes per period, freeze policy, cancellation terms (FR-BP-001–005)
- **`subscriptions`** — active member subscriptions: user, plan ref, Stripe subscription ID, status (active/past_due/frozen/cancelled/trialing), start date, current period end, cancel at period end flag (FR-BP-006–008)
- **`payment_methods`** — per-user stored payment methods: Stripe payment method ID, type (card/bank/apple_pay), last four, default flag (FR-BP-011–013)
- **`invoices`** — invoice records: user, tenant, Stripe invoice ID, line items, subtotal, tax, total, status (draft/open/paid/void/uncollectable), due date, paid date (FR-BP-020–024)
- **`punch_cards`** — class pack balances: user, tenant, total purchased, remaining, expiry date (FR-BP-003)
- **`promo_codes`** — discount codes: tenant, code, type (percentage/fixed/trial_extension), value, valid date range, max uses, current uses, applicable plans (FR-BP-025–027)
- **`payment_history`** — transaction log: user, tenant, amount, type (subscription/one-time/refund/credit), Stripe payment intent ID, timestamp, status (FR-BP-014)
- **`credits`** — account credit balances per user per tenant: amount, reason, expiry (FR-BP-028)
- **`failed_payments`** — dunning records: user, subscription, attempt count, last attempt date, next retry date, status (retrying/action_required/written_off) (FR-BP-015–017)

### Extended (from B1)

- **`memberships`** — add subscription ref, plan ref, payment status, Stripe customer ID
- **`tenants`** — add Stripe Connect account ID, tax rate, currency, invoice settings

---

## Convex Server Functions

### Subscription Lifecycle

- Create subscription — select plan → create Stripe customer (if new) → create Stripe subscription → store in Convex (FR-BP-006)
- Plan change — upgrade/downgrade with proration handling via Stripe (FR-BP-007)
- Freeze membership — pause Stripe subscription, set resume date, enforce freeze policy limits (FR-BP-008)
- Cancel membership — cancel at period end or immediately, enforce contract terms (FR-BP-008)
- Trial management — trial start → auto-convert to paid or cancel at trial end (FR-BP-005)
- Renewal processing — handled by Stripe, confirmed via webhook (FR-BP-006)

### Payment Processing

- Checkout session creation — Convex action → Stripe Checkout for one-time payments (PT, events, retail) (FR-BP-009)
- Payment method management — add, remove, set default via Stripe API (FR-BP-011–013)
- Apply promo code — validate code, attach discount to Stripe subscription or checkout (FR-BP-025–027)
- Apply account credit — deduct from credit balance before charging card (FR-BP-028)
- Refund processing — full or partial refund via Stripe, update records (FR-BP-018)

### Dunning & Failed Payments

- Stripe webhook: `invoice.payment_failed` → create/update failed_payment record (FR-BP-015)
- Automated retry schedule — Stripe Smart Retries + platform notifications (FR-BP-016)
- Dunning notification workflow via B8: payment failed → email with update payment link → follow-up at 3, 7, 14 days → final warning → membership suspension (FR-BP-017)
- Payment method update prompt — deep link to update card details (FR-BP-016)
- Auto-suspend membership after configurable failed attempts (FR-BP-017)

### Invoicing

- Auto-generate invoice on subscription renewal and one-time charges (FR-BP-020)
- Invoice customization — tenant logo, address, tax ID, custom notes (FR-BP-021)
- Invoice delivery — email via B8 with PDF attachment (FR-BP-022)
- Invoice history — user can view and download all past invoices (FR-BP-023)
- Manual invoice creation by gym owner for custom charges (FR-BP-024)
- Tax calculation — configurable tax rates per tenant, applied to all charges (FR-BP-019)

### Stripe Webhook Handler

- Convex HTTP endpoint receives Stripe webhooks, verifies signature, processes:
  - `invoice.paid` → update subscription status, create payment_history record
  - `invoice.payment_failed` → trigger dunning flow
  - `customer.subscription.updated` → sync status changes
  - `customer.subscription.deleted` → mark cancelled, update membership
  - `checkout.session.completed` → fulfill one-time purchase (PT pack, event, retail)
  - `charge.refunded` → create refund record
- Idempotent processing — Stripe event IDs tracked to prevent duplicate handling

### Financial Queries

- Revenue dashboard data — MRR, churn rate, average revenue per member, delinquent amount (FR-BP-029–033)
- Payment history per member (FR-BP-014)
- Outstanding balance queries (FR-BP-034)
- Punch card balance queries (FR-BP-003)
- Promo code usage reports (FR-BP-027)

---

## Convex Scheduled Functions

- **Daily:** Check expiring trials, send conversion reminder via B8
- **Daily:** Check expiring punch cards, send renewal reminder
- **Daily:** Check frozen memberships approaching resume date, auto-resume
- **Weekly:** Generate revenue summary for gym owners

---

## Key Design Decisions

- **Stripe is the source of truth for payment state.** Convex mirrors subscription and invoice status via webhooks. If there's ever a discrepancy, Stripe wins. The webhook handler is the only path for payment state changes — no direct status mutations.
- **Stripe Connect for multi-tenancy.** Each tenant gets a Stripe Connect account. Platform takes a configurable percentage. This cleanly separates money flows per gym and handles tax reporting per entity.
- **Punch cards are Convex-native.** Class packs don't need Stripe's subscription model. Convex tracks the balance, decrements on class attendance, and handles expiry. The initial purchase goes through Stripe Checkout.
- **Dunning is aggressive but configurable.** Default schedule (3/7/14 days) is a starting point. Each tenant can customize retry timing and suspension threshold. The goal is zero surprise cancellations — always warn first.

---

## Requirements Covered

FR-BP-001–037

## What's Deferred

- Detailed financial reporting and export (→ B11)
- QuickBooks/Xero accounting integration (→ B12)
- POS/retail checkout flow (→ B11)
- Billing settings UI (→ F9)
- Member-facing billing portal UI (→ F6)
