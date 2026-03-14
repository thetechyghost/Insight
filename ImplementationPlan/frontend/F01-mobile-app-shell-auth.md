# F1 — Mobile App Shell & Auth

**Priority:** Critical
**Platform:** React Native (iOS + Android)
**Depends On:** B0
**Key Spec Files:** 17-mobile-application, 01-platform-architecture

---

## Overview

The React Native foundation. Navigation, auth flows, tenant switching, and the app skeleton that all subsequent mobile phases build into.

---

## React Native Setup

### Project Foundation

- React Native with TypeScript
- Navigation: React Navigation (tab bar + stack navigators)
- State management: Convex React client (real-time subscriptions) + TanStack Query (for Azure Functions REST calls, caching, offline)
- Styling: NativeWind (Tailwind CSS for React Native) — keeps mental model consistent with web admin's Tailwind
- Secure storage: react-native-keychain for tokens
- Push notifications: react-native-firebase (FCM) + @react-native-community/push-notification-ios (APNs)

### Tab Navigation Structure

- **Today** — daily WOD, upcoming class, quick-log entry point
- **Log** — workout logging, history, timers
- **Progress** — PRs, fitness score, analytics, body comp
- **Community** — feed, leaderboards, challenges, messaging
- **Profile** — settings, goals, wearables, billing

---

## Screens — Auth & Onboarding

- **Welcome screen** — app intro, sign up / sign in options (FR-UA-001)
- **Sign up** — email/password, Apple ID, Google sign-in (FR-UA-009)
- **Sign in** — same three methods + biometric unlock (Face ID / fingerprint) for returning users
- **Gym selection** — after auth, choose gym to join (search/invite code) or accept pending invitation (FR-UA-004)
- **Onboarding flow** — profile setup: name, avatar, height, weight, age, gender, unit preference (lbs/kg), training start date (FR-UA-002, FR-UA-005)
- **Notification permissions** — prompt for push notification access, explain value
- **Terms acceptance** — display terms/privacy policy, record consent version (FR-CS-001–003)

---

## Screens — Core Shell

- **Tenant switcher** — accessible from profile, shows all gym memberships, tap to switch context (FR-MT-008)
- **Today screen** — daily WOD preview (from coach publishing), next registered class with countdown, recent activity summary, streaks display
- **Notification center** — in-app notification list with read/unread state, tap to navigate to relevant screen (FR-CM-006, FR-CM-010)
- **Settings** — notification preferences per channel, privacy settings per gym, unit preferences, connected accounts, logout (FR-UA-003, FR-UA-008, FR-MT-011)

---

## Convex Integration

- **Convex React Native client** — real-time subscriptions for: today's WOD, notification count, gym context, user profile
- **Auth flow** — Convex auth integration with Apple/Google/email providers, token stored in secure keychain
- **Tenant context** — all Convex queries and mutations automatically scoped by selected tenant ID from app state
- **Offline awareness** — detect connectivity state, show offline banner, queue mutations for retry

---

## Azure Functions Integration

- **API client setup** — base URL config per environment, auth token injection, tenant header
- **TanStack Query configuration** — stale times, retry policies, cache persistence for offline access
- **Error handling** — global error interceptor, auth expiry detection → re-auth flow

---

## Push Notification Setup

- **FCM + APNs registration** — on first launch, register device token with Convex (FR-CM-007)
- **Notification routing** — tap notification → deep link to relevant screen (workout, class, message, PR)
- **Badge count** — unread notification count on app icon
- **Quiet hours** — respect user-configured quiet hours from B8

---

## Key Design Decisions

- **Convex for real-time, TanStack Query for REST.** Convex client handles all operational data with live subscriptions. TanStack Query wraps Azure Functions calls for performance/analytics data with intelligent caching. Two data layers, clear separation.
- **Tenant context in app state.** Selected gym stored in React context, passed to all Convex queries and API calls. Switching gym re-renders the entire app with new tenant data. No cross-tenant data leakage possible from the client side.
- **NativeWind for styling.** Same Tailwind utility classes as the web admin (shadcn/ui uses Tailwind). Reduces cognitive overhead when you eventually move to building the web admin in F7.
- **Biometric unlock.** After first sign-in, offer Face ID / fingerprint for subsequent app opens. Tokens refreshed silently in background. Removes friction for daily use — athletes open the app multiple times per day.

---

## Requirements Covered

FR-UA-001–009, FR-PA-007 (mobile tier), FR-MT-007–008 (cross-tenant identity, gym switching), FR-MT-011 (per-gym privacy), FR-CS-001–003 (consent), FR-MA-001–005 (core navigation, platform support)

## What's Deferred

- All feature screens (workout logging, analytics, social, etc.) → F2–F6
- iPad-specific layouts → F3 (analytics charts benefit from larger screen)
- Deep linking from external sources (email, SMS) → F2
