# Insight Platform -- Technology Stack

This document defines the technology stack for the Insight fitness platform across all layers: client applications, backend services, data stores, real-time infrastructure, and on-premise components.

---

## 1. Client Applications

### 1.1 Web Application

- **Framework:** React 19+
- **UI Component Library:** shadcn/ui (built on Radix UI primitives + Tailwind CSS)
- **Styling:** Tailwind CSS
- **Target Users:** Gym owners, admins, coaches (desktop/tablet administration interface)

### 1.2 Mobile Application

- **Framework:** React Native
- **Platforms:** iOS (iPhone + iPad), Android
- **Target Users:** Athletes, coaches (primary mobile experience)
- **Companion Apps:** Apple Watch, Wear OS (via React Native bridging or native modules)

---

## 2. Backend Services

### 2.1 Convex (Non-Performance Data)

Convex serves as the primary backend-as-a-service for all non-performance, non-timeseries data. This includes:

- User accounts and profiles
- Tenant/gym configuration and branding
- Memberships and member management
- Roles, permissions, and access control
- Device registrations
- User preferences and notification settings
- Scheduling, bookings, and class management
- Billing records and invoicing
- Messaging and communications
- Social features (feeds, comments, leaderboards)
- Content and exercise library
- Workout programming and program assignments
- Goal tracking and habit logging
- Retail and product catalog
- Lead management and CRM
- Legal documents and waivers
- Media metadata (video, photo references)
- Gamification (badges, streaks, points)

**Key Capabilities Used:**
- Real-time subscriptions (live UI updates)
- Server functions (queries, mutations, actions)
- File storage (media assets)
- Scheduled functions (cron jobs for automated workflows)
- Authentication integration

### 2.2 C# API on Azure Functions (Performance & Timeseries Data Access)

A C#-based API layer running on Azure Functions provides access to all performance and timeseries data stored in TimescaleDB. This API serves:

- Workout performance metrics (times, reps, weights, distances)
- Personal records and PR history
- Fitness level scoring and composite analytics
- Heart rate data (real-time and historical)
- HRV, VO2 max, and biometric time series
- Connected equipment metrics (Concept2, bikes, treadmills)
- Wearable device data (Apple Watch, Garmin, Fitbit, Whoop)
- Body composition measurements over time
- Nutrition tracking data
- Sleep and wellness data over time
- Training volume and frequency trends
- Comparative and percentile analytics

**Key Characteristics:**
- Serverless, auto-scaling
- Pay-per-execution cost model
- RESTful endpoints
- Optimized for read-heavy analytical queries

---

## 3. Data Stores

### 3.1 Convex Database

- **Type:** Document-relational (managed by Convex)
- **Use Case:** All non-performance operational data (see Section 2.1)
- **Characteristics:** Real-time sync, ACID transactions, automatic indexing

### 3.2 TimescaleDB

- **Type:** Time-series relational database (PostgreSQL extension)
- **Use Case:** All performance data, biometric time series, device telemetry, and analytics
- **Deployment:** Azure-hosted (managed PostgreSQL with TimescaleDB extension)
- **Key Features Used:**
  - Hypertables for time-partitioned data
  - Continuous aggregates for pre-computed rollups (daily, weekly, monthly)
  - Compression for historical data cost reduction
  - Time-bucket queries for trend analysis
  - Retention policies for data lifecycle management

---

## 4. Real-Time & IoT Infrastructure

### 4.1 Azure Event Hub

- **Role:** High-throughput event ingestion pipeline
- **Use Case:** Receives performance and telemetry events from on-premise gateways and mobile devices
- **Data Flow:** Equipment metrics, heart rate streams, wearable data events
- **Characteristics:** Partitioned for parallel processing, supports millions of events per second

### 4.2 Azure IoT Hub

- **Role:** Device management and bidirectional communication for on-premise equipment
- **Use Case:** Manages registration, authentication, and command/control for gym-deployed IoT Edge devices
- **Capabilities Used:**
  - Device provisioning and identity management
  - Device-to-cloud telemetry routing
  - Cloud-to-device commands (e.g., start/stop session, configure display)
  - Device twin for configuration state management

### 4.3 Data Ingestion Flow

```
Equipment (BLE/FTMS)
    → On-Premise Gateway (Azure IoT Edge)
        → Azure IoT Hub
            → Azure Event Hub
                → Event Processing (Azure Functions)
                    → TimescaleDB
```

---

## 5. On-Premise Components

### 5.1 Azure IoT Edge

- **Deployment:** Physical gateway device deployed at each gym location
- **Role:** Local data aggregation, protocol translation, and edge processing
- **Responsibilities:**
  - BLE/FTMS connectivity to gym equipment (rowers, bikes, treadmills, ski ergs)
  - Heart rate monitor pairing and data relay
  - Local buffering during connectivity loss (store-and-forward)
  - Real-time WebSocket broadcast to in-gym displays and coach dashboards
  - Equipment session management (pairing, start/stop detection)
  - Protocol translation (BLE FTMS → structured telemetry events)
- **Upstream Communication:** Secure connection to Azure IoT Hub
- **Offline Resilience:** Continues local operation when cloud connectivity is interrupted

---

## 6. Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  React 19+   │  │ React Native │  │  Watch/Wearable  │  │
│  │  shadcn/ui   │  │  iOS + Android│  │  Companion Apps  │  │
│  │  (Web Admin) │  │  (Mobile)    │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                           │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │       Convex          │  │   Azure Functions (C# API)  │  │
│  │                       │  │                             │  │
│  │  • Users, tenants     │  │  • Performance queries      │  │
│  │  • Permissions        │  │  • Analytics endpoints      │  │
│  │  • Scheduling         │  │  • Timeseries aggregation   │  │
│  │  • Billing            │  │  • Biometric data access    │  │
│  │  • Messaging          │  │  • Equipment data access    │  │
│  │  • Content            │  │                             │  │
│  └──────────┬────────────┘  └──────────────┬──────────────┘  │
│             │                              │                │
│             ▼                              ▼                │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │   Convex Database     │  │       TimescaleDB           │  │
│  │   (Document-relational│  │   (Time-series PostgreSQL)  │  │
│  └───────────────────────┘  └──────────────▲──────────────┘  │
└─────────────────────────────────────────────┼───────────────┘
                                              │
┌─────────────────────────────────────────────┼───────────────┐
│                 INGESTION LAYER              │               │
│                                             │               │
│  ┌───────────────────┐  ┌───────────────────┴────────────┐  │
│  │   Azure IoT Hub   │  │   Azure Event Hub              │  │
│  │   (Device Mgmt)   │──│   (Event Ingestion)            │  │
│  └─────────▲─────────┘  └────────────────────────────────┘  │
└────────────┼────────────────────────────────────────────────┘
             │
┌────────────┼────────────────────────────────────────────────┐
│            │          ON-PREMISE LAYER                       │
│  ┌─────────┴──────────────────────────────────────────────┐ │
│  │              Azure IoT Edge Gateway                     │ │
│  │                                                         │ │
│  │  BLE/FTMS ←→ Equipment (Rowers, Bikes, Treadmills)     │ │
│  │  BLE ←→ Heart Rate Monitors                             │ │
│  │  WebSocket → In-Gym Displays / Coach Dashboards         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Convex for operational data** | Real-time subscriptions eliminate polling; server functions simplify backend logic; managed infrastructure reduces ops burden |
| **TimescaleDB for performance data** | Purpose-built for time-series workloads; continuous aggregates enable fast dashboards; compression reduces storage costs for historical data; SQL compatibility for complex analytical queries |
| **Azure Functions (C#) for timeseries API** | Serverless scaling matches bursty analytics query patterns; C# provides strong typing for complex domain models; Azure ecosystem alignment with IoT infrastructure |
| **Azure IoT Edge for on-premise** | Enables offline resilience at gym locations; handles BLE protocol translation locally; store-and-forward ensures no data loss during connectivity gaps |
| **Azure Event Hub for ingestion** | Handles high-throughput telemetry from many concurrent gym sessions; partitioning enables parallel processing; native integration with Azure Functions for stream processing |
| **React 19+ with shadcn/ui for web** | Server components and concurrent features in React 19; shadcn/ui provides accessible, customizable components without vendor lock-in; Tailwind CSS for consistent styling |
| **React Native for mobile** | Code sharing between iOS and Android; shared mental model with React web team; strong ecosystem for fitness app features (camera, BLE, HealthKit bridges) |
