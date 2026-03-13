# Insight Platform - Feature Requirements Research

> Comprehensive feature research compiled from analysis of Wodify, Apple Fitness+, Beyond the Whiteboard (BTWB), Caliber, Trainerize, TrueCoach, TrainHeroic, Mindbody, Zen Planner, PushPress, Glofox, and other fitness industry platforms.

---

## Table of Contents

1. [Platform Architecture](#1-platform-architecture)
2. [User / Athlete Domain](#2-user--athlete-domain)
3. [Coach / Trainer Domain](#3-coach--trainer-domain)
4. [Tenant / Gym Owner Domain](#4-tenant--gym-owner-domain)
5. [Platform Administration (Super Admin)](#5-platform-administration-super-admin)
6. [Scheduling & Booking](#6-scheduling--booking)
7. [Billing & Payments](#7-billing--payments)
8. [Communication & Messaging](#8-communication--messaging)
9. [Marketing & Lead Management](#9-marketing--lead-management)
10. [Reporting & Analytics](#10-reporting--analytics)
11. [Wearable & Device Integration](#11-wearable--device-integration)
12. [Connected Equipment Integration](#12-connected-equipment-integration)
13. [Video Upload & Analysis](#13-video-upload--analysis)
14. [Social & Community](#14-social--community)
15. [Retail & Point of Sale](#15-retail--point-of-sale)
16. [Access Control & Facility Management](#16-access-control--facility-management)
17. [Mobile Application (User-Facing)](#17-mobile-application-user-facing)
18. [Desktop / Tablet Administration](#18-desktop--tablet-administration)
19. [Content & Exercise Library](#19-content--exercise-library)
20. [Nutrition & Wellness](#20-nutrition--wellness)
21. [Gamification & Motivation](#21-gamification--motivation)
22. [Multi-Tenancy & Data Architecture](#22-multi-tenancy--data-architecture)
23. [Integrations & API](#23-integrations--api)
24. [Compliance, Legal & Security](#24-compliance-legal--security)

---

## 1. Platform Architecture

### 1.1 Multi-Tenant Foundation
- Each gym/organization operates as an isolated tenant with its own branding, data, and configuration
- Users can belong to one or multiple gyms simultaneously
- Cross-tenant user identity (single user account, multiple gym memberships)
- Tenant-level data isolation with shared platform infrastructure
- Per-tenant custom dictionary/terminology (e.g., "box" vs "gym" vs "studio")
- Per-tenant feature toggles (enable/disable modules per gym)

### 1.2 Platform Tiers
- **User/Athlete tier** -- primary access via mobile devices (iOS and Android)
- **Coach/Trainer tier** -- mobile + tablet access for class management and athlete monitoring
- **Gym Owner/Admin tier** -- full desktop and iPad administration interface
- **Platform Super Admin tier** -- platform-wide management, tenant provisioning

### 1.3 White-Label & Branding
- Per-tenant custom branding (logo, colors, typography)
- Custom-branded mobile application per tenant (or branded skin within shared app)
- Custom domain mapping for tenant web portals
- Branded email templates and communications
- Custom terminology dictionary per tenant

---

## 2. User / Athlete Domain

### 2.1 Profile & Account Management
- User registration and onboarding (self-service or gym-initiated)
- Personal profile (avatar, bio, height, weight, age, gender)
- Privacy settings (control visibility of performance data to other members, coaches, public)
- Multi-gym membership management (join/leave gyms, set primary gym)
- Training start date / training age tracking
- Emergency contact information
- Medical conditions and injury history (visible to coaches with permission)
- Notification preferences (push, email, SMS, in-app)
- Account linking (Apple ID, Google, email/password)

### 2.2 Workout Tracking & Logging

#### 2.2.1 Workout Types Supported
- **For Time** -- complete work as fast as possible; records time (mm:ss)
- **AMRAP** (As Many Reps/Rounds As Possible) -- fixed time domain; records total rounds + reps
- **EMOM** (Every Minute On the Minute) -- records rounds completed and weights used
- **Tabata** -- interval scoring (lowest round, total reps)
- **Max Effort / 1RM** -- single-rep max lifts (all barbell movements)
- **Max Reps** -- total reps achieved in given movement/time
- **Rounds for Time** -- time to complete set number of rounds
- **Strength / Weightlifting** -- sets x reps x weight for strength work
- **Endurance / Monostructural** -- distance, time, pace, calories for rowing, running, biking, swimming, skiing
- **Interval Training** -- configurable work/rest intervals with per-interval logging
- **Custom Workouts** -- user-defined workout types
- **Multi-part / Complex Workouts** -- workouts with multiple components (warm-up + strength + metcon + cooldown)
- **Named/Benchmark Workouts** -- select from curated library of benchmark WODs
- **Guided/Follow-along Workouts** -- video-led workouts with real-time metric overlay
- **Open Gym / Free Training** -- unstructured session logging

#### 2.2.2 Metrics Tracked Per Workout
- Time (minutes, seconds, milliseconds)
- Rounds + Reps (for AMRAPs)
- Load/Weight (lbs or kg) per movement, per set
- Reps completed per set
- Distance (meters, miles, kilometers)
- Calories burned (equipment-reported + estimated)
- Pace (min/mile, min/500m, min/km)
- Heart rate (real-time from wearable: current, average, max, zone time)
- Power output (watts -- from bikes, rowers)
- Cadence / Stroke rate (RPM, strokes/min)
- Split times (per interval, per round, per distance segment)
- Scaling options -- Rx, Rx+, Scaled (with specific scaling notes)
- Perceived exertion (RPE scale 1-10)
- Movement substitutions with reason
- Free-text workout notes
- Rest periods between sets
- Tempo notation (eccentric/pause/concentric/pause)
- Band/assistance levels for gymnastics movements

#### 2.2.3 Workout Logging UX
- Quick-log for repeat/benchmark workouts (pre-populated from history)
- Previous scores displayed when re-logging a benchmark
- Built-in timers (countdown, count-up, Tabata, EMOM, custom intervals)
- Barbell calculator / plate math helper
- Percentage-based loading calculator (% of 1RM)
- Movement search with autocomplete
- Batch entry for strength sets (e.g., 5x5 @ 225)
- Voice logging (hands-free rep/set logging via voice)
- One-tap start for gym-programmed daily workout
- Copy previous workout as template
- Auto-save draft workouts (prevent data loss)

### 2.3 Performance Analytics

#### 2.3.1 Personal Records (PR) Tracking
- Automatic PR detection on workout log
- PR board showing all personal bests organized by movement/benchmark
- PRs tracked for:
  - Every named benchmark workout (best time, most rounds, heaviest load)
  - Every lift at every rep scheme (1RM, 2RM, 3RM, 5RM, 10RM, etc.)
  - Monostructural efforts (fastest mile, 5K, 2K row, 500m row, etc.)
  - Max unbroken reps for gymnastics movements
  - Power output records (highest watts on bike/rower)
- PR history with date progression timeline
- PR notifications and celebrations
- Estimated 1RM calculations from rep-max data (Epley, Brzycki formulas)

#### 2.3.2 Fitness Level & Composite Scoring
- Composite fitness score (0-100 scale) across multiple domains
- Domain breakdown across physical skills:
  - Cardiovascular/Respiratory Endurance
  - Stamina
  - Strength
  - Power
  - Speed
  - Flexibility
  - Coordination
  - Agility
  - Balance
  - Accuracy
- Spider/radar chart visualization of strengths and weaknesses
- Score updates dynamically with each logged workout
- Percentile ranking vs. platform user population
- Gender and age-adjusted comparisons
- Fitness tier categorization (Beginner, Intermediate, Advanced, Elite)

#### 2.3.3 Trend & Progress Analysis
- Workout frequency tracking (workouts per week/month over time)
- Volume tracking (total reps, total tonnage lifted per period)
- Training consistency calendar/heat map
- Movement frequency analysis (how often each movement is trained)
- Time domain distribution (short sprint vs. long grind balance)
- Modality distribution (Monostructural / Gymnastics / Weightlifting / Mixed)
- Historical performance charts per movement and benchmark
- Estimated 1RM trend tracking from submaximal data
- Body composition vs. performance correlation views
- Workout intensity distribution over time
- Recovery tracking (time between sessions, volume spikes)

#### 2.3.4 Comparative Analytics
- Compare results to gym average
- Compare to global platform community
- Filter comparisons by age, gender, bodyweight class
- Side-by-side comparison with specific athletes (with mutual consent)
- Percentile rankings for every benchmark and lift

### 2.4 Body Composition & Biometrics
- Body weight logging with trend tracking
- Body fat percentage tracking
- Lean body mass calculation
- Body measurements (waist, hips, chest, arms, thighs, calves, neck)
- BMI auto-calculation
- Before/after progress photos with side-by-side comparison
- Photo timeline view
- Integration with smart scales (Wi-Fi/Bluetooth scales)
- Resting heart rate tracking
- Blood pressure logging
- Sleep duration and quality tracking (from wearables)
- VO2 max estimation (from wearables)
- HRV (Heart Rate Variability) tracking
- Body weight goal setting with progress tracking

### 2.5 Goal Setting & Programs
- Set strength goals (target weights for specific lifts)
- Set body composition goals (target weight, body fat %)
- Set endurance goals (target times for benchmark distances)
- Set consistency goals (workouts per week target)
- Set skill goals (acquire specific movements -- muscle-ups, handstands, etc.)
- Follow structured multi-week programs assigned by coach
- Self-guided program marketplace (purchase/follow training programs)
- Daily/weekly habit tracking (stretching, hydration, sleep, etc.)
- Goal progress dashboards with projected completion dates

---

## 3. Coach / Trainer Domain

### 3.1 Workout Programming

#### 3.1.1 Program Design Tools
- Workout builder with searchable movement library
- Drag-and-drop workout construction
- Multi-week/multi-month program design (periodization)
- Training cycle templates (linear, undulating, conjugate, block)
- Percentage-based programming (auto-calculates loads from athlete's logged 1RMs)
- Multi-component workout structure (warm-up / skill / strength / metcon / cooldown)
- Copy/duplicate workouts across days and weeks
- Import programming from templates or other coaches
- Programming calendar with drag-and-drop scheduling
- Undo/revision history for program changes

#### 3.1.2 Programming Delivery
- Daily WOD publishing to gym feed
- Multi-track programming (Competitors, Fitness, Endurance, Foundations, etc.)
- Workout descriptions with coaching notes
- Intended stimulus descriptions per workout
- Scaling guidance and modification options per workout
- Warm-up and cool-down prescriptions
- Movement demo videos linked to each exercise in the workout
- Scheduled publishing (write ahead, auto-publish at set time)
- Push notification to members when daily workout is published

#### 3.1.3 Programming Analysis
- Programming coverage analysis (domain/modality balance)
- Time domain distribution in programming
- Movement frequency analysis in programming
- Gap identification ("you haven't programmed heavy squats in 6 weeks")
- Comparison against balanced programming models
- Volume and intensity load tracking across programming

### 3.2 Athlete Monitoring & Management
- View any member's full training history
- View athlete's fitness level breakdown and domain scores
- Monitor athlete training volume, frequency, and intensity
- Identify athletes who haven't trained recently (inactivity alerts)
- At-risk member identification (churn prediction)
- Compare athlete's progress over time
- View athlete body composition and nutrition data
- Set individualized goals for athletes
- Assign specific workouts or programs to individual athletes
- Add private coach-only notes to athlete profiles
- Track athlete attendance across classes
- Athlete readiness / recovery monitoring (from wearable data)

### 3.3 Class Management
- Schedule and manage class sessions
- Assign workouts to specific class times
- Track attendance per class (check-in/check-out)
- Capacity management per class
- Waitlist management
- Late cancel / no-show tracking
- Class roster view with athlete details
- In-class timer display (TV/projector mode)
- In-class leaderboard display (live scoreboard)
- Substitute coach assignment
- Class notes and post-class summaries

### 3.4 Video Review & Feedback
- Receive video uploads from athletes (workout form videos)
- Frame-by-frame video playback
- Video annotation tools:
  - Drawing/sketching on video frames (lines, circles, angles)
  - Text annotations at specific timestamps
  - Voice-over annotations
  - Side-by-side comparison (athlete video vs. reference/demo)
  - Slow motion and zoom capabilities
- Send annotated video feedback back to athlete
- Video review queue management (pending reviews, completed)
- Annotation templates for common corrections
- Video tagging by movement type for organized review

### 3.5 Communication
- Direct messaging with individual athletes
- Group messaging to class/program participants
- Push notification capabilities to member groups
- Comment on athlete workout logs with feedback
- Automated milestone celebrations (PR shout-outs)
- In-app announcements to gym members
- Email/SMS campaign tools for coach-specific communications

---

## 4. Tenant / Gym Owner Domain

### 4.1 Member Management
- Member roster with search, filter, and sort
- Member profiles with full history (attendance, billing, performance)
- Membership status tracking (active, frozen, cancelled, prospect)
- Membership type management (unlimited, limited, drop-in, family, corporate)
- Contract and agreement management (terms, duration, renewal)
- Digital waiver and liability forms (e-signature)
- Member onboarding workflows (automated welcome sequence)
- Family/household account linking
- Corporate/group membership management
- Member tags and custom fields
- Bulk member operations (mass email, status changes, imports)
- Member import/export (CSV, migration from other platforms)
- Automated member lifecycle management (trial -> active -> renewal -> at-risk -> cancelled)
- Member freeze/hold management with configurable policies

### 4.2 Staff Management
- Staff profiles with role assignments
- Role-based access control (owner, manager, head coach, coach, front desk, etc.)
- Granular permissions per role (what each role can view, edit, manage)
- Staff scheduling (class assignments, shift management)
- Payroll tracking (hours worked, classes taught, personal training sessions)
- Staff performance metrics (classes taught, member satisfaction, retention of their clients)
- Commission tracking for personal training and retail sales
- Internal staff communication tools
- Staff certifications and credential tracking (CPR, coaching certs, expiration dates)
- Task assignment and management for staff

### 4.3 Business Operations
- Multi-location management (for gym chains/franchises)
  - Centralized reporting across locations
  - Per-location configuration and branding
  - Member access policies across locations
  - Staff assignment across locations
  - Consolidated and per-location financial reports
- Operational dashboard (daily/weekly/monthly KPIs)
- Custom report builder
- Data export capabilities (CSV, PDF, API)
- Calendar management (holidays, special events, closures)
- Inventory management (retail products, equipment)
- Equipment maintenance tracking and scheduling
- Facility resource management (room/space booking)

### 4.4 Invoicing & Financial Management
- Invoice generation and management
- Recurring membership invoicing
- One-time charge invoicing
- Credit note and refund management
- Outstanding balance tracking and aging reports
- Payment plan management
- Tax configuration and tax reporting
- Accounting software integration (QuickBooks, Xero)
- Revenue recognition reporting
- Financial dashboards (MRR, ARR, LTV, churn rate)
- Processing fee management (pass-through or absorb)

### 4.5 Marketing & Growth
- Email marketing campaigns (templates, scheduling, segmentation)
- SMS marketing campaigns
- Lead capture forms (website embeds, landing pages)
- Referral program management (referral tracking, rewards)
- Promotional campaign management (discounts, trials, limited-time offers)
- QR code generation for promotions
- Social media integration (Facebook Leads, Instagram)
- Review/testimonial collection and management
- Trial/intro offer management
- Automated follow-up sequences
- A/B testing for campaigns
- Marketing analytics (campaign performance, conversion rates)
- Branded website builder (SEO-optimized landing pages)

### 4.6 Feedback & Quality
- Member satisfaction surveys (automated post-class, periodic NPS)
- Coach/class rating system
- Suggestion box / feedback portal
- Service recovery workflows (automated follow-up on negative feedback)
- Net Promoter Score (NPS) tracking over time
- Review solicitation automation (prompt happy members to leave reviews)

---

## 5. Platform Administration (Super Admin)

### 5.1 Tenant Provisioning
- Create and configure new tenant accounts
- Tenant onboarding wizard
- Feature package assignment per tenant
- Billing plan management for tenants
- Tenant suspension and termination workflows

### 5.2 Platform Monitoring
- Platform-wide analytics dashboard
- Tenant activity monitoring
- System health and performance monitoring
- Usage metrics across tenants
- Support ticket management

### 5.3 Content Management
- Exercise/movement library management (global library)
- Benchmark workout library curation
- Platform-wide announcements
- Content moderation tools
- Feature flag management

---

## 6. Scheduling & Booking

### 6.1 Class Scheduling
- Recurring class schedule creation (weekly templates)
- One-off class/event scheduling
- Multi-room/multi-resource scheduling
- Class capacity limits with enforcement
- Waitlist management with automatic promotion
- Class series and session packages
- Color-coded calendar view (by class type, coach, room)
- Schedule conflict detection
- Holiday and closure calendar
- Schedule publishing and member notification

### 6.2 Booking & Reservations
- Member self-service class booking (mobile + web)
- Advance booking window configuration (how far ahead members can book)
- Late cancel policy enforcement (fees, restrictions)
- No-show tracking and policy enforcement
- Booking confirmation notifications (push, email, SMS)
- Booking reminder notifications (configurable timing)
- Guest/drop-in booking
- Intro/trial class booking with special flow
- Recurring booking (auto-book same class every week)
- Book from waitlist notification

### 6.3 Personal Training / Appointments
- 1-on-1 session scheduling
- Coach availability management
- Appointment type configuration (duration, price, location)
- Client self-booking for available appointment slots
- Recurring appointment scheduling
- Buffer time between appointments
- Cancellation and rescheduling policies
- Personal training package tracking (sessions remaining)

### 6.4 Events & Workshops
- Special event creation and management
- Event registration with capacity management
- Event ticketing and pricing
- Competition event management
- Workshop scheduling
- Open gym / free training time slots

---

## 7. Billing & Payments

### 7.1 Membership Billing
- Recurring membership billing (monthly, quarterly, annual)
- Autopay setup and management
- Multiple payment method support (credit card, debit, ACH/bank transfer)
- Secure payment card storage (PCI compliant)
- Proration for mid-cycle membership changes
- Membership upgrade/downgrade workflows
- Membership freeze/hold with configurable billing (pause, reduced rate)
- Family billing (multiple members, single payment)
- Corporate billing
- Scholarship/discount rate management
- Free trial period management with auto-conversion

### 7.2 Payment Processing
- Integrated payment gateway
- Failed payment retry logic (configurable retry schedule)
- Dunning management (automated follow-up for failed payments)
- Late fee configuration and auto-application
- Payment receipts (email, in-app)
- Refund processing
- Chargeback management and dispute handling
- Currency support (multi-currency for international tenants)
- Tax calculation and collection (configurable tax rates)
- Processing fee pass-through option

### 7.3 Invoicing
- Automated invoice generation
- Manual invoice creation
- Line item management (services, products, fees)
- Credit notes and adjustments
- Invoice PDF generation and delivery
- Outstanding balance tracking
- Payment plans and installment management
- Batch invoicing

### 7.4 Financial Products
- Drop-in pass sales
- Class pack / punch card sales (X visits for $Y)
- Personal training package sales
- Merchandise and retail sales
- Gift card / gift certificate sales and redemption
- Event and workshop ticket sales
- Online program/course sales
- Promotional pricing (discounts, coupons, promo codes)

---

## 8. Communication & Messaging

### 8.1 In-App Messaging
- Direct messaging (member <-> coach, member <-> gym)
- Group messaging (class groups, program groups)
- Unified inbox for all message types (email, SMS, in-app chat)
- Message read receipts
- File and image attachment support
- Video message support
- Message templates for common communications
- Auto-translation capabilities

### 8.2 Push Notifications
- Daily workout published notification
- Class booking confirmations and reminders
- PR and milestone achievement notifications
- Coach feedback received notification
- Video review completed notification
- Billing and payment notifications
- Marketing and promotional notifications
- Configurable notification preferences per user

### 8.3 Email Communications
- Transactional emails (booking confirmations, receipts, password resets)
- Marketing email campaigns
- Automated lifecycle emails (welcome series, re-engagement, win-back)
- Email template builder with branding
- Email analytics (open rates, click rates)
- Unsubscribe management
- Email deliverability management

### 8.4 SMS Communications
- Transactional SMS (booking reminders, payment alerts)
- Marketing SMS campaigns
- Two-way SMS messaging
- SMS character limit management
- Opt-in/opt-out compliance
- SMS automation triggers

### 8.5 Automated Communications
- Welcome sequence for new members
- Birthday and anniversary messages
- Workout streak recognition
- Re-engagement campaigns for inactive members
- Payment failure notifications
- Contract renewal reminders
- Class reminder sequences
- Post-class follow-ups
- Milestone celebrations (100th workout, 1-year anniversary)
- Coach-triggered automated check-ins

---

## 9. Marketing & Lead Management

### 9.1 Lead Capture
- Website lead capture forms (embeddable widgets)
- Landing page builder for campaigns
- Facebook Lead Ads integration
- Instagram lead capture
- QR code lead capture for physical marketing
- Walk-in / phone inquiry lead entry
- Referral lead tracking
- Lead source attribution

### 9.2 CRM & Pipeline Management
- Lead pipeline with configurable stages (New -> Contacted -> Trial Booked -> Trial Completed -> Converted)
- Automatic lead status updates based on actions
- Lead assignment to sales staff
- Lead scoring and prioritization
- Follow-up task management
- Lead notes and communication history
- Cold lead re-engagement automation
- Lead segmentation by demographics, source, interest

### 9.3 Trial & Conversion Management
- Free trial offer configuration
- Trial class booking flow
- Trial-to-member conversion tracking
- Automated trial follow-up sequences
- Trial expiration notifications
- Conversion analytics (trial-to-paid rate, time-to-convert)

### 9.4 Referral Programs
- Member referral tracking
- Referral reward configuration (discounts, free months, merchandise)
- Referral link generation
- Referral leaderboards
- Automated referral reward fulfillment
- Referral program analytics

### 9.5 Promotions & Campaigns
- Promotional offer creation (% off, $ off, free period, bundled)
- Promo code generation and tracking
- Limited-time offer management
- Quantity-limited offer management
- Social media sharing tools for promotions
- Campaign performance analytics
- A/B testing for offers and messaging
- Seasonal campaign templates

---

## 10. Reporting & Analytics

### 10.1 Business Analytics
- Revenue reports (daily, weekly, monthly, YoY)
- Monthly Recurring Revenue (MRR) and trends
- Average Revenue Per Member (ARPM)
- Member Lifetime Value (LTV)
- Churn rate and retention analytics
- New member acquisition rate and sources
- Trial conversion rates
- Accounts receivable aging
- Cash flow forecasting
- Revenue by product/service type
- Revenue by membership type
- Break-even analysis

### 10.2 Member Analytics
- Total active member count and trend
- Member growth/decline over time
- Attendance analytics (by class, time, day, coach)
- Average visits per member per month
- Member engagement scoring
- At-risk member identification (declining attendance, approaching contract end)
- Member demographics breakdown
- Member retention cohort analysis
- Member satisfaction trends (NPS over time)

### 10.3 Operational Analytics
- Class utilization rates (capacity vs. actual attendance)
- Peak hours analysis
- Coach performance metrics
- Staff productivity reports
- Facility utilization reports
- Equipment usage analytics
- Waitlist analytics
- No-show and late cancel rates

### 10.4 Performance / Fitness Analytics (Gym-Wide)
- Gym-wide average fitness level and trend
- PR distribution across members
- Benchmark workout participation rates
- Programming effectiveness analysis (coverage of fitness domains)
- Movement competency distribution across membership
- Workout type distribution analysis
- Training volume trends across membership

### 10.5 Marketing Analytics
- Lead source effectiveness
- Campaign ROI
- Conversion funnel analytics
- Referral program performance
- Email/SMS campaign performance
- Social media engagement metrics
- Promotional offer redemption rates

### 10.6 Custom Reporting
- Custom report builder with drag-and-drop fields
- Report scheduling and automated delivery
- Report export (CSV, PDF, Excel)
- Dashboard customization
- Saved report templates
- Cross-location comparative reports (for multi-location tenants)
- API access for custom BI tool integration

---

## 11. Wearable & Device Integration

### 11.1 Apple Watch / HealthKit Integration
- **Read from HealthKit:**
  - Heart rate (real-time during workouts, resting, walking average)
  - Active energy burned (calories)
  - Basal energy burned
  - Step count
  - Distance walking/running
  - Cycling distance
  - Swimming distance and stroke count
  - VO2 max estimation
  - Heart rate variability (HRV)
  - Resting heart rate
  - Walking heart rate average
  - Respiratory rate
  - Blood oxygen saturation (SpO2)
  - Body mass / weight
  - Body fat percentage
  - Sleep analysis (duration, stages)
  - Workout sessions (type, duration, energy, distance)
  - Activity summary (move, exercise, stand rings)
  - Flights climbed
  - Cycling power and cadence
  - Running power, cadence, stride length, ground contact time
- **Write to HealthKit:**
  - Workout sessions (start/end time, type, energy burned, distance)
  - Body measurements (weight, body fat)
  - Nutrition data
- **Real-Time Capabilities:**
  - Live heart rate streaming during active workout sessions
  - Live calorie burn updates
  - Workout session state management (start, pause, resume, end)
  - Background heart rate delivery
- **Apple Watch App Features:**
  - Standalone workout logging on watch
  - Real-time metrics display during workout (HR, calories, timer)
  - Watch complications showing daily stats, next class, activity rings
  - Haptic notifications for workout milestones, zone changes
  - Quick-log actions from watch (start workout, log set)

### 11.2 Google Watch / Wear OS / Health Connect Integration
- **Health Connect Data Types (Read/Write):**
  - Steps record
  - Heart rate record (BPM samples)
  - Distance record
  - Calories burned (active + total)
  - Exercise session record (type, duration)
  - Speed record
  - Power record
  - Cycling pedaling cadence
  - Weight record
  - Body fat record
  - Sleep session record
  - Blood pressure record
  - Oxygen saturation record
  - Respiratory rate record
  - Hydration record
  - Nutrition record
- **Wear OS App Features:**
  - Workout tracking and logging on watch
  - Real-time metrics display
  - Tile complications for quick stats
  - Notification mirroring

### 11.3 Heart Rate Monitor Integration
- **Bluetooth Low Energy (BLE) Heart Rate Profile:**
  - Standard GATT Heart Rate Service (0x180D)
  - Real-time BPM streaming
  - R-R interval data for HRV calculation
  - Sensor contact detection
  - Energy expended data
- **Supported Device Types:**
  - Chest straps (Polar H10, Garmin HRM-Pro, Wahoo TICKR, MyZone)
  - Optical arm bands (Polar Verity Sense, Whoop, Scosche Rhythm+)
  - Wrist-based (Apple Watch, Garmin watches, Fitbit)
- **Heart Rate Zone Configuration:**
  - Custom zone thresholds (per user, configurable by coach)
  - Auto-calculated zones from max HR or LTHR
  - Zone-based training display (color-coded real-time)
  - Zone time tracking per workout
  - Heart rate zone alerts/haptics

### 11.4 Third-Party Platform Sync
- **Garmin Connect:**
  - Workout sync (bi-directional)
  - Activity and health metrics import
  - Training status and load
- **Fitbit:**
  - Activity data import
  - Sleep data import
  - Heart rate data import
- **Whoop:**
  - Recovery score import
  - Strain score import
  - Sleep performance import
  - HRV data import
- **Strava:**
  - Workout export to Strava
  - Activity import from Strava
  - Social sharing integration
- **MyFitnessPal:**
  - Nutrition data sync
  - Calorie and macro import
- **Training Peaks:**
  - Workout export
  - TSS/CTL/ATL metrics

---

## 12. Connected Equipment Integration

### 12.1 Proprietary Equipment Connectivity Protocol
- Real-time data streaming from gym equipment to platform
- Near real-time display of user workout metrics during class
- Live class leaderboard from connected equipment
- Coach dashboard showing all connected equipment in class simultaneously
- Automatic workout logging from equipment session data
- Equipment pairing (user device <-> specific equipment unit for session)

### 12.2 Concept2 Equipment (Rower, SkiErg, BikeErg)
- **Connection:** Bluetooth FTMS (Fitness Machine Service) and proprietary Concept2 protocol via PM5 monitor
- **Real-Time Data Available:**
  - Pace (per 500m for rower/ski, per km for bike)
  - Stroke rate / cadence (strokes per minute / RPM)
  - Power (watts)
  - Distance (meters)
  - Calories
  - Heart rate (if HR monitor connected to PM5)
  - Elapsed time
  - Split times (per 500m, per interval)
  - Drag factor
  - Drive length and drive time
  - Stroke count
- **Integration via ErgData / Concept2 Logbook API:**
  - Historical workout sync
  - Season rankings
  - Lifetime meters tracking
- **Class Display Features:**
  - Live race view (multiple rowers/skiers side-by-side)
  - Pace boat/virtual competitor
  - Interval summary display

### 12.3 Indoor Bikes
- **Connection:** Bluetooth FTMS standard
- **Compatible Equipment Types:**
  - Stages indoor bikes
  - Wahoo KICKR / KICKR Bike
  - Peloton bikes (via FTMS where supported)
  - Keiser M3i
  - Assault/Echo bikes (air bikes)
  - Schwinn IC series
  - Life Fitness IC bikes
- **Real-Time Data Available:**
  - Power (watts)
  - Cadence (RPM)
  - Speed (km/h, mph)
  - Distance
  - Calories
  - Heart rate (if connected)
  - Resistance level
  - Elapsed time
- **Features:**
  - FTP (Functional Threshold Power) testing and tracking
  - Power zone training display
  - Calorie estimation from power data
  - Virtual ride/race capabilities

### 12.4 Treadmills & Running Equipment
- **Connection:** Bluetooth FTMS
- **Real-Time Data:**
  - Speed (mph, km/h)
  - Incline/grade (%)
  - Distance
  - Pace (min/mile, min/km)
  - Calories
  - Heart rate
  - Elapsed time
  - Elevation gain

### 12.5 Other Cardio Equipment
- Elliptical trainers (FTMS)
- Stair climbers
- Assault/Echo runners
- Ski trainers (non-Concept2)
- General FTMS-compatible equipment fallback

### 12.6 Real-Time Data Architecture
- **Equipment -> Platform data flow:**
  - BLE FTMS connection from equipment to local gateway device (tablet/phone in gym)
  - Gateway relays data to cloud platform via WebSocket
  - Platform distributes to coach dashboard and user mobile app
  - Latency target: < 2 seconds end-to-end
- **Class broadcast mode:**
  - All connected equipment in a class streams to shared dashboard
  - Coach can view all athletes simultaneously
  - TV/projector display mode for class leaderboard
  - Individual athlete metrics visible on their own device
- **Session management:**
  - User pairs to equipment unit at class start
  - Automatic session start/end detection
  - Manual override for session boundaries
  - Equipment conflict resolution (two users trying to pair same unit)

---

## 13. Video Upload & Analysis

### 13.1 Video Upload (Athlete Side)
- Record and upload workout videos from mobile device camera
- Upload from camera roll / photo library
- Video trimming before upload (set start/end points)
- Multiple video upload per workout session
- Tag video with movement type, date, and workout context
- Video compression for efficient upload and storage
- Upload progress indicator with resume capability
- Offline recording with queue-and-sync upload
- Video privacy settings (coach-only, gym-visible, public)
- Maximum video duration configuration per tenant

### 13.2 Video Review & Annotation (Coach Side)
- Video review queue (pending, in-progress, completed)
- Frame-by-frame playback controls
- Slow motion playback (0.25x, 0.5x)
- Zoom and pan on video frames
- **Annotation Tools:**
  - Freehand drawing on video frames (pen/marker tool)
  - Straight line tool (for alignment reference)
  - Angle measurement tool (joint angles)
  - Circle/highlight tool (for focus areas)
  - Arrow tool (for direction/correction indication)
  - Text overlay annotations at specific timestamps
  - Voice-over recording on video (audio annotation)
  - Telestrator-style annotations that follow through frames
- Side-by-side video comparison:
  - Athlete's video vs. reference/demo video
  - Athlete's current attempt vs. their previous attempt
  - Two athletes side-by-side for comparison coaching
- Annotation templates for common corrections per movement
- Timestamp-based comments (text comments anchored to specific moments)
- Overall video feedback summary (text or audio)
- Share annotated video back to athlete with notification

### 13.3 Video Management
- Video library per athlete (organized by movement, date)
- Coach video library (annotated reviews, demo videos)
- Video tagging and categorization
- Video search and filtering
- Storage management and retention policies
- Video streaming quality optimization (adaptive bitrate)
- Thumbnail generation
- Video analytics (views, engagement)

---

## 14. Social & Community

### 14.1 Activity Feed
- Gym-specific activity feed (member workouts, PRs, milestones)
- Personal feed (workouts from followed athletes and gym)
- Global/cross-gym feed (opt-in community feed)
- Feed filtering (by workout type, athlete, date)

### 14.2 Social Interactions
- Like/high-five on workout results
- Comments on workout logs
- Share workouts to external platforms (Instagram, Facebook, Twitter/X, Strava)
- Follow other athletes (within gym, cross-gym with mutual consent)
- Tagging other athletes in workout posts

### 14.3 Leaderboards
- Daily workout leaderboard (per gym)
- Filter by Rx vs. Scaled
- Filter by gender, age group, weight class
- All-time benchmark leaderboard per gym
- Global platform leaderboard per benchmark
- Monthly/weekly leaderboard for total workouts logged
- Strength leaderboards (heaviest lifts by movement)
- Custom leaderboard creation for gym challenges/competitions
- Team/group leaderboards

### 14.4 Challenges & Competitions
- In-gym challenge creation (workout challenges, attendance challenges)
- Multi-week challenge tracking with progress
- Inter-gym competitions
- Team-based competitions with scoring
- Multi-event competition management
- Challenge leaderboards and standings
- Prize and reward management
- Challenge registration and participation tracking

### 14.5 Milestone Celebrations
- Workout count milestones (100th, 500th, 1000th workout)
- Membership anniversary milestones
- PR celebrations with auto-sharing option
- Streak achievements (consecutive days/weeks training)
- Badge/achievement unlocking

---

## 15. Retail & Point of Sale

### 15.1 Product Management
- Product catalog management (name, description, images, variants)
- Category organization
- Inventory tracking (stock levels, low-stock alerts)
- Barcode/SKU management
- Product variants (size, color)
- Pricing management (regular, sale, member pricing)
- Supplier management

### 15.2 In-Person Sales
- Mobile POS (phone/tablet-based checkout)
- Barcode scanning for product lookup
- Cart management
- Multiple payment methods (card, cash, member account credit)
- Receipt generation (email, print, SMS)
- Staff-attributed sales tracking
- Processing fee pass-through option

### 15.3 Online Sales
- In-app product store
- Product browsing and search
- Shopping cart
- Secure checkout
- Order confirmation and tracking
- Shipping management (for physical products)
- Digital product delivery

### 15.4 Integration
- Shopify integration for extended e-commerce
- Inventory sync across channels
- Financial reporting integration
- Commission tracking for staff sales

---

## 16. Access Control & Facility Management

### 16.1 Check-In Systems
- Self-service kiosk check-in (tablet at front desk)
- Mobile app check-in (QR code, NFC, geofencing)
- Coach/staff manual check-in
- Check-in validation against booking/membership
- Check-in notifications to staff
- Check-in history and audit trail

### 16.2 Facility Access Control
- 24/7 app-based door/gate access
- Access scheduling (restrict hours by membership type)
- Access group management (which members can access which areas)
- Multi-door/multi-zone access control
- Access log and audit trail
- Emergency override capabilities
- Integration with physical access control hardware (door strikes, turnstiles)
- Visitor/guest access management

### 16.3 Facility Management
- Room/space management and booking
- Equipment inventory tracking
- Equipment maintenance scheduling
- Equipment maintenance logging
- Cleaning schedules
- Facility capacity management (for compliance)

---

## 17. Mobile Application (User-Facing)

### 17.1 Core Navigation
- Dashboard / home feed
- Today's workout / daily WOD
- Class schedule and booking
- Workout log / history
- PR board
- Performance analytics / fitness level
- Profile and settings
- Gym page / community
- Leaderboards
- Messaging / inbox
- Video upload
- Retail store

### 17.2 Platform Support
- Native iOS app (iPhone optimized)
- Native Android app
- iPad optimized layout
- Apple Watch companion app
- Wear OS companion app
- Offline mode with sync-when-connected
- Background data sync
- Push notification support
- Deep linking support

### 17.3 UX Features
- Dark mode support
- Customizable home screen / dashboard widgets
- Quick-action shortcuts (start workout, check in, view today's WOD)
- Pull-to-refresh
- Infinite scroll for feeds and history
- Search across workouts, movements, members
- Haptic feedback for key interactions
- Accessibility compliance (VoiceOver, TalkBack, dynamic type)
- Multi-language support (localization)
- Biometric authentication (Face ID, Touch ID, fingerprint)

### 17.4 Media Features
- Camera integration for video recording and progress photos
- Photo gallery for progress photos
- Video playback for coach feedback and exercise demos
- In-app timer with audio cues
- Music integration (play/control music during workout)

---

## 18. Desktop / Tablet Administration

### 18.1 Admin Dashboard
- Business KPI overview dashboard
- Attendance overview
- Revenue summary
- Member status summary
- Today's schedule overview
- Task and notification center
- Quick-action shortcuts

### 18.2 Admin Interface Features
- Responsive web application (desktop + iPad)
- Role-based views (owner sees everything, coach sees relevant subset)
- Bulk operations (member management, billing, communications)
- Advanced search and filtering across all data
- Data tables with sorting, filtering, pagination, export
- Calendar views (schedule, billing, events)
- Drag-and-drop interface for scheduling and programming
- Keyboard shortcuts for power users
- Multi-tab/multi-window support

### 18.3 Configuration & Settings
- Gym profile and branding configuration
- Membership type configuration
- Class type and schedule configuration
- Billing and payment settings
- Notification and communication settings
- Integration settings (connected services, API keys)
- Role and permission configuration
- Policy configuration (cancellation, freeze, late cancel, no-show)
- Custom field configuration
- Workflow and automation configuration

---

## 19. Content & Exercise Library

### 19.1 Movement / Exercise Database
- Comprehensive exercise library (500+ movements minimum)
- Categories: Weightlifting, Gymnastics, Monostructural, Accessory, Mobility
- Per-exercise details:
  - Name and aliases (e.g., "Clean and Jerk" / "C&J")
  - Description and coaching cues
  - Demonstration video (multiple angles)
  - Common faults and corrections
  - Scaling options and progressions
  - Required equipment
  - Targeted muscle groups
  - Difficulty level
  - Related movements
- Search with autocomplete
- Custom exercise creation (per tenant)
- Exercise favoriting / recently used

### 19.2 Benchmark Workout Library
- **The Girls** -- Fran, Grace, Helen, Diane, Elizabeth, Jackie, Karen, Isabel, Annie, Cindy, Mary, Nancy, Amanda, Chelsea, Linda, Eva, Kelly, Angie, Barbara, Nicole, etc.
- **Hero WODs** -- Murph, DT, Nate, Michael, Luce, Badger, Jag 28, Chad, etc.
- **CrossFit Open Workouts** -- complete historical archive
- **CrossFit Games Workouts** -- historical event workouts
- **Strength Benchmarks** -- 1RM for all major lifts
- **Gymnastics Benchmarks** -- max reps for bodyweight movements
- **Monostructural Benchmarks** -- standard distances/times
- **Custom Gym Benchmarks** -- tenant-defined benchmark workouts
- Suggested retest intervals and schedules

### 19.3 Training Program Library
- Pre-built multi-week training programs
- Program marketplace (coaches publish, users purchase)
- Program categories (strength, endurance, competition prep, sport-specific, beginners)
- Program preview and reviews
- Program assignment and progress tracking

### 19.4 Educational Content
- Exercise tutorial library
- Nutrition education content
- Recovery and mobility content
- Training methodology articles
- Coach education resources

---

## 20. Nutrition & Wellness

### 20.1 Nutrition Tracking
- Daily food logging with meal categorization
- Macronutrient tracking (protein, carbohydrates, fat in grams)
- Calorie tracking (daily total)
- Food database search
- Barcode scanning for packaged foods
- Meal templates / saved meals for quick logging
- Custom food/recipe creation
- Zone Diet block tracking
- Macro ratio visualization (pie charts, bar charts)
- Custom macro targets (set by user or prescribed by coach)
- Water/hydration tracking

### 20.2 Nutrition Analytics
- Daily/weekly/monthly nutrition summaries
- Intake vs. targets (over/under analysis)
- Nutrition adherence trends over time
- Correlation views (nutrition vs. workout performance)
- Coach-visible nutrition reports per athlete

### 20.3 Wellness Tracking
- Sleep tracking (duration, quality -- from wearables)
- Stress / readiness scoring (from wearable data)
- Daily wellness check-in (subjective: mood, energy, soreness, sleep quality)
- Recovery recommendations based on training load + wellness data
- Habit tracking (stretching, meditation, foam rolling, etc.)
- Supplement tracking

---

## 21. Gamification & Motivation

### 21.1 Achievement System
- Badge/achievement unlocking for milestones
- Workout count badges (10, 50, 100, 500, 1000)
- Streak badges (consecutive days/weeks/months)
- PR badges (first PR, multiple PRs in a session)
- Benchmark completion badges
- Community participation badges
- Seasonal/event-specific badges

### 21.2 Streaks & Consistency
- Workout streak tracking (consecutive days, weeks)
- Weekly attendance streak
- Logging streak (consecutive days of tracking)
- Streak recovery/freeze options
- Streak leaderboards

### 21.3 Points & Rewards
- Points system for workout completion, attendance, engagement
- Point leaderboards
- Redeemable rewards (merchandise, membership credits, partner offers)
- Challenge-specific point systems

### 21.4 Motivation Features
- Daily motivational prompts
- Coach shout-outs
- Weekly/monthly summary reports (email digest of achievements)
- Year-in-review summary
- Activity ring / progress ring visualization
- Burn Bar (compare effort to others who did same workout -- inspired by Apple Fitness+)
- Virtual trophies for competition wins

---

## 22. Multi-Tenancy & Data Architecture

### 22.1 Tenant Isolation
- Per-tenant data isolation (no cross-tenant data leakage)
- Tenant-specific configuration and customization
- Tenant-specific branding and theming
- Independent tenant scaling

### 22.2 Cross-Tenant User Experience
- Single user identity across multiple gym memberships
- User can see and switch between their gyms in-app
- Per-gym workout history segregation
- Merged personal analytics across all gyms (optional)
- Gym-specific privacy settings
- Transfer membership between gyms
- Drop-in / visitor access at other tenant gyms
- Cross-gym benchmark comparisons (anonymized or opt-in)

### 22.3 Data Ownership & Portability
- Users own their personal data (workout history, body composition, PRs)
- Data export capability for users (personal data)
- Data export capability for tenants (member data, within privacy regulations)
- Data retention policies per tenant
- Right to deletion (GDPR compliance)
- Data migration tools (import from competing platforms)

---

## 23. Integrations & API

### 23.1 Health & Fitness Integrations
- Apple HealthKit (bi-directional sync)
- Google Health Connect (bi-directional sync)
- Strava (workout export/import)
- Garmin Connect (data sync)
- Fitbit (data sync)
- Whoop (data import)
- MyFitnessPal (nutrition sync)
- Training Peaks (workout sync)
- MapMyFitness (activity sync)

### 23.2 Business Integrations
- QuickBooks (accounting sync)
- Xero (accounting sync)
- Stripe (payment processing)
- Square (payment processing)
- Mailchimp (email marketing)
- Twilio (SMS)
- Zapier (workflow automation)
- Slack (team communication)
- Google Calendar (schedule sync)
- Apple Calendar (schedule sync)
- Shopify (retail/e-commerce)
- Facebook (lead ads, social sharing)
- Instagram (social sharing)
- SurveyMonkey (member surveys)

### 23.3 Equipment & Hardware Integrations
- Concept2 (rower, SkiErg, BikeErg via PM5)
- FTMS-compatible fitness equipment (bikes, treadmills)
- Heart rate monitor brands (Polar, Garmin, Wahoo, MyZone, Scosche)
- Smart scales (Withings, Renpho, etc.)
- Access control hardware (door controllers, turnstiles)
- Kiosk hardware (check-in tablets)
- Display hardware (TV/projector for class display)
- Barcode scanners (retail POS)

### 23.4 Platform API
- RESTful API for third-party integrations
- Webhook support for event-driven integrations
- OAuth 2.0 authentication for API access
- Rate limiting and usage monitoring
- API documentation and developer portal
- Sandbox/test environment for developers
- API versioning and deprecation policy

---

## 24. Compliance, Legal & Security

### 24.1 Data Privacy & Compliance
- GDPR compliance (EU data protection)
- CCPA compliance (California privacy)
- HIPAA considerations for health data
- Data Processing Agreement (DPA) templates
- Privacy policy management
- Cookie consent management (for web interfaces)
- Data retention and deletion policies
- Right to access / right to deletion workflows
- Data breach notification procedures

### 24.2 Legal Document Management
- Digital waiver and liability forms
- Electronic signature collection
- Contract/agreement management (membership contracts)
- Terms of service management
- Document versioning and audit trail
- Automated document expiration and renewal reminders
- Minor/guardian consent workflows
- Document template management

### 24.3 Security
- Role-based access control (RBAC) with granular permissions
- Multi-factor authentication (MFA) for admin accounts
- Biometric authentication for mobile (Face ID, fingerprint)
- Session management and auto-logout
- Audit logging for sensitive operations
- PCI DSS compliance for payment processing
- Data encryption at rest and in transit
- Regular security assessments
- SOC 2 compliance considerations
- IP whitelisting for admin access (optional)
- Password policy enforcement
- Secure API authentication (OAuth 2.0, API keys)
- Rate limiting and abuse prevention

### 24.4 Age & Parental Controls
- Minor account management (parental consent required)
- Age verification at registration
- Restricted features for minor accounts
- Parental dashboard for minor account oversight
- Guardian consent workflow for waivers and agreements

---

## Appendix A: Competitive Platform Feature Comparison

| Feature Domain | Wodify | BTWB | Apple Fitness+ | Caliber | Trainerize | TrueCoach | Mindbody | PushPress |
|---|---|---|---|---|---|---|---|---|
| Workout Logging | Deep | Deep | Basic | Deep | Moderate | Moderate | None | None |
| Performance Analytics | Yes | Best-in-class | Basic rings | Good | Basic | Basic | None | None |
| Fitness Level Score | No | Yes (proprietary) | No | No | No | No | No | No |
| Gym Management | Yes | Limited | No | No | Yes | No | Yes | Yes |
| Billing & Payments | Yes | No | No | Limited | Yes | Yes | Yes | Yes |
| Class Scheduling | Yes | Limited | No | No | Yes | No | Yes | Yes |
| Video Workout Review | No | No | Pre-recorded only | No | Yes | Yes | No | No |
| Coach Annotation on Video | No | No | No | No | No | Limited | No | No |
| Heart Rate Integration | Yes | Limited | Best (Apple Watch) | No | Limited | No | No | No |
| Equipment Integration | Limited | Limited | Apple ecosystem | No | No | No | No | No |
| Real-time Equipment Data | No | No | Partial | No | No | No | No | No |
| Multi-Tenant | No | Yes | No | No | Yes | No | Yes | No |
| White-Label App | Yes | No | No | No | Yes | No | Yes | Yes |
| Nutrition Tracking | No | Yes | No | Yes | Yes | Yes | No | No |
| Retail / POS | Yes | No | No | No | No | No | Yes | Yes |
| Access Control | Yes | No | No | No | No | No | Yes | Yes |
| Lead Management / CRM | Yes | No | No | No | Yes | No | Yes | Yes |
| Wearable Sync | Limited | Limited | Best | Limited | Limited | Limited | Limited | Limited |
| Marketing Automation | Yes | No | No | No | Yes | No | Yes | Yes |

## Appendix B: Unique Differentiators for Insight

Based on the competitive analysis, the following features represent opportunities for differentiation:

1. **Unified real-time equipment integration** -- No platform fully owns the connected equipment experience with near real-time data from bikes, rowers, and ski ergs combined with workout tracking in a single interface
2. **Video annotation and review workflow** -- While some platforms offer basic video, none provide a complete coach-annotation workflow with drawing tools, angle measurement, voice-over, and side-by-side comparison
3. **Multi-tenant with cross-gym user identity** -- Users seamlessly belonging to multiple gyms with unified personal analytics is poorly served
4. **Composite fitness scoring + real-time equipment data** -- Combining BTWB-style fitness level analytics with live equipment data creates a unique value proposition
5. **Mobile-first athlete experience + desktop admin** -- Purpose-built UX per device type (mobile for athletes, desktop/tablet for administration) rather than responsive compromise
6. **Wearable-agnostic integration** -- Deep support for both Apple Watch AND Wear OS/Google Watch, plus all major HR monitors, in a single platform

---

*Research compiled from public feature listings, product pages, app store descriptions, and developer documentation for: Wodify, Apple Fitness+, Beyond the Whiteboard, Caliber, Trainerize, TrueCoach, TrainHeroic, Mindbody, Zen Planner, PushPress, Glofox, Gymdesk, Hapana, Exercise.com, and related fitness industry platforms.*

*Sources consulted:*
- *[Apple Fitness+ Features](https://www.apple.com/apple-fitness-plus/)*
- *[Apple Fitness+ 2025 Announcement](https://www.apple.com/newsroom/2025/01/apple-fitness-plus-unveils-an-exciting-lineup-of-new-ways-to-stay-active-in-2025/)*
- *[Concept2 App Integrations](https://www.concept2.com/apps)*
- *[Concept2 ErgData](https://www.concept2.com/ergdata)*
- *[Terra API - Concept2 Integration](https://tryterra.co/integrations/concept2)*
- *[Wodify Full Feature List](https://www.wodify.com/products/core/full-feature-list)*
- *[Best Gym Management Software 2026](https://www.getkisi.com/blog/best-gym-management-systems-compared)*
- *[Exercise.com White Label](https://www.exercise.com/grow/best-white-label-fitness-app-software/)*
- *[Trainerize Custom Branded Apps](https://www.trainerize.com/features/custom-branded-fitness-apps/)*
