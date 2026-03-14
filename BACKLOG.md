# PetOwner Platform — Agile Backlog

> Last updated: March 2026
> Legend: ✅ Done · 🔜 Next · ⬜ Pending

---

## Rules of Engagement

| # | Rule | Rationale |
|---|------|-----------|
| 1 | **One User Story at a time.** Fully complete (backend + frontend + migration) one story before moving to the next. | Prevents half-built features and merge conflicts. |
| 2 | **Always run EF migrations when the DB schema changes.** Every model change = `Add-Migration` + verify SQL before applying. | Ensures schema consistency and prevents drift. |
| 3 | **Backend-first, then Frontend.** Entity/migration → API endpoint → Angular service → UI component. | Clean dependency flow. |
| 4 | **No placeholder / mock implementations.** Every endpoint must be fully functional with real DB operations. | No regressions against the working MVP. |
| 5 | **Preserve existing patterns.** Standalone Angular components, signals (not NgRx), TailwindCSS, injectable services, DTOs for all API contracts. | Consistency across the codebase. |
| 6 | **Every new entity gets a DTO.** Never expose EF entities directly. Request DTOs for input, Response DTOs for output. | Security and contract stability. |
| 7 | **Validate before persisting.** All API inputs validated. Return `400 BadRequest` with clear messages. | Defensive coding; better UX. |
| 8 | **Auth-first on every endpoint.** Every action must specify `[Authorize]` with role restrictions where applicable. | Security by default. |
| 9 | **No `&&` in CMD commands.** Use sequential shell invocations or `;` separators. | Windows PowerShell compatibility. |
| 10 | **Commit after each completed story.** Atomic commits: `feat(E1-S1.1): Add AvailabilitySlot entity and migration`. | Clean git history, easy rollback. |
| 11 | **Check for lint/build errors after every edit.** Run builds on modified files before marking a story complete. | No broken builds. |
| 12 | **Do not refactor existing working code** unless the current story explicitly requires it. | Protect the working MVP. |

---

## Execution Roadmap

```
Phase 1 ── E1 (Scheduling) → E2 (Booking) → E3 (Reviews) → E4 (Search) → E5 (Notifications) → E6 (Provider Dashboard)
Phase 2 ── E7 (Stripe) → E8 (Medical Records) → E9 (File Storage)
Phase 3 ── E10 (AI Teletriage) → E11 (Fitness) → E12 (Social)
```

---

## Phase 1 — Core Provider OS & Midrag Model

### E1: Provider Scheduling ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S1.1 | Availability Schedule Model | `AvailabilitySlot` entity (DayOfWeek, StartTime, EndTime) + EF migration. FK to ProviderProfile. | ✅ Done |
| S1.2 | Availability CRUD API | `POST/GET/PUT/DELETE /api/providers/me/availability` — manage weekly time-slots with overlap validation. | ✅ Done |
| S1.3 | Availability Management UI | Provider-facing weekly calendar grid to add/edit/remove time-slots. Integrated into Edit Profile page. | ✅ Done |

---

### E2: Enhanced Booking Flow ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S2.1 | Enrich ServiceRequest Entity | Added `ScheduledStart`, `ScheduledEnd`, `ServiceId`, `TotalPrice`, `CancellationReason`, `Notes` to `ServiceRequest` + migration. | ✅ Done |
| S2.2 | Booking Request API | Booking endpoint with availability-check, conflict detection, and automatic price calculation (`HourlyRate × Duration`). | ✅ Done |
| S2.3 | Booking Request UI | Date/time picker, service selector, pet selector, duration, price preview on map bottom-sheet modal. | ✅ Done |
| S2.4 | Booking Lifecycle API | Cancel with reason, auto-expire stale pending requests via background service. | ✅ Done |
| S2.5 | Booking Lifecycle UI | Status badges, cancel actions on Requests page. Confirmation modals. | ✅ Done |

---

### E3: Verified Reviews & Ratings ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S3.1 | Enhance Review Model | Added `IsVerified` flag (auto-set on completed booking), `CommunicationRating`, `ReliabilityRating`, `PhotoUrl`. Migration. | ✅ Done |
| S3.2 | Rating Aggregation | Computed `AverageRating` and `ReviewCount` on `ProviderProfile`. Updated on review create. Exposed in `MapPinDto`. | ✅ Done |
| S3.3 | Enhanced Review UI | Star-rating input, verified badge, multi-criteria breakdown in review submission modal. | ✅ Done |
| S3.4 | Provider Reviews Display | Review cards with aggregated rating in map bottom-sheet. | ✅ Done |

---

### E4: Search & Discovery ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S4.1 | Advanced Search API | Filter `/api/map/pins` by `serviceType`, `minRating`, `maxRate`, `radiusKm` (spatial query via NetTopologySuite), `availableOn` (date). `MapSearchFilter` record, `SearchProvidersAsync` method. Service types endpoint. | ✅ Done |
| S4.2 | Search & Filter UI | Collapsible filter panel on map page. Service type chips, min rating dropdown, max rate input, distance radius selector. Filter count badge. `MapSearchFilters` interface in Angular `MapService`. | ✅ Done |
| S4.3 | Provider Public Profile Page | Dedicated `/provider/:id` route with full bio, services, reviews, weekly schedule, availability status, hourly rate, "Book Now" CTA. `ProviderPublicProfileDto`, `GET /api/providers/{id}/profile`. | ✅ Done |

---

### E5: Notifications ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S5.1 | Notification Entity & API | `Notification` model (UserId, Type, Title, Body, ReferenceId, IsRead, CreatedAt) + `AddNotifications` migration. `NotificationsController` with paginated list, unread count, mark-as-read, mark-all-read, delete. `INotificationService` for programmatic creation. | ✅ Done |
| S5.2 | Real-Time via SignalR | `NotificationHub` at `/hubs/notifications` with JWT auth via query string. Auto-joins user-specific group. `NotificationService` pushes to connected clients on creation. Booking lifecycle events (new, accepted, rejected, completed, cancelled) integrated. | ✅ Done |
| S5.3 | Notification Center UI | Bell icon (top-right, fixed) with unread count badge. Dropdown panel with notification list, mark-as-read on click, mark-all-read button. `NotificationService` (Angular) with SignalR connection, real-time updates. `@microsoft/signalr` package. | ✅ Done |

---

### E6: Provider Dashboard ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S6.1 | Provider Dashboard Page | `/provider-dashboard` route: stat cards (total bookings, earnings, rating, pending), today's schedule timeline, upcoming bookings list, quick links to edit profile & earnings. `ProviderDashboardComponent`. Nav item "Dashboard" with grid icon for providers. | ✅ Done |
| S6.2 | Provider Analytics API | `GET /api/providers/me/stats` — total/completed/pending/cancelled bookings, completion rate, total & monthly earnings, rating, review count, upcoming bookings (top 10), today's schedule. `ProviderStatsDto`. | ✅ Done |

---

## Phase 2 — Payments (Stripe) & Medical Records

### E7: Stripe Payments ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S7.1 | Stripe Backend Setup | Installed `Stripe.net`, configured API keys, created `StripePaymentService` wrapper and `StripeSettings`. | ✅ Done |
| S7.2 | Payment Entity & Migration | `Payment` model (ServiceRequestId, StripePaymentIntentId, Amount, PlatformFee, Status, CreatedAt). Migration. | ✅ Done |
| S7.3 | Checkout Flow API | `POST /api/payments/checkout/{bookingId}` — creates PaymentIntent (manual capture). `POST /api/payments/{id}/capture`. Auto-capture on booking completion. | ✅ Done |
| S7.4 | Stripe Webhooks | `POST /api/webhooks/stripe` — handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Updates Payment status. | ✅ Done |
| S7.5 | Payment UI (Owner) | Stripe Card Element in booking requests page. "Pay Now" button, payment summary, authorized/captured status badges. | ✅ Done |
| S7.6 | Provider Payouts & Earnings | `StripeConnectAccountId` on `ProviderProfile`. Earnings dashboard (`/earnings`) with summary cards and transaction history. | ✅ Done |
| S7.7 | Refunds & Cancellation Fees | Tiered refund policy: 100% (>24h), 50% (2–24h), 0% (<2h). Handles Authorized and Captured payments. `RefundAmount` stored on `Payment`. | ✅ Done |

---

### E8: Pet Medical Records ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S8.1 | Medical Record Model | `MedicalRecord` entity (PetId, Type, Title, Description, Date, DocumentUrl, CreatedAt) + migration. | ✅ Done |
| S8.2 | Medical Records API | `POST/GET/PUT/DELETE /api/pets/{petId}/medical-records`. Type validation (Vaccination/Condition/Medication/VetVisit). | ✅ Done |
| S8.3 | Medical Records UI | Expandable health records panel per pet in My Pets page. Timeline view with color-coded type icons, add/edit/delete. | ✅ Done |
| S8.4 | Medical Sharing with Providers | `ShareMedicalRecords` flag on `ServiceRequest`. Checkbox in booking form. `GET /api/bookings/{id}/medical-records` for providers. Inline health records panel in Requests page. | ✅ Done |

---

### E9: File Storage ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S9.1 | Azure Blob Storage Integration | `BlobService` wrapper (Azure.Storage.Blobs), SAS token generation, `POST /api/files/upload/image` and `POST /api/files/upload/document` endpoints, `DELETE /api/files/{blobName}`, `GET /api/files/sas/{blobName}`. Replaced placeholder provider image upload. | ✅ Done |
| S9.2 | Image Resize Pipeline | Server-side thumbnail generation via SixLabors.ImageSharp (300x300 max, JPEG 80% quality). Auto-generated on image upload. Angular `FileUploadService` for generic file uploads. | ✅ Done |

---

## Phase 3 — AI Teletriage & Fitness/Social

### E10: AI Pet Teletriage ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S10.1 | Teletriage API | Symptom intake endpoint, LLM integration (OpenAI/Azure OpenAI) for preliminary health assessment. Structured response with severity & recommendations. `TeletriageSession` entity, `OpenAiTeletriageService` with fallback, `TeletriageController` (assess, history, get). | ✅ Done |
| S10.2 | Teletriage Conversation UI | Chat-like interface: symptom description → assessment card with severity indicator. `TeletriageService` (Angular), `TeletriageComponent` with chat bubbles, assessment cards (severity header, emergency banner, recommendations), pet selector, typing indicator, history view. Nav item added. | ✅ Done |
| S10.3 | Vet Referral & Emergency Detection | Flag emergency symptoms, suggest nearby vets, link to emergency services. `NearbyVetDto`, `GET /api/teletriage/nearby-vets` (geo-sorted providers). Emergency CTA banner with call 911 & Google Maps emergency vet search. Nearby vet cards with call/directions buttons. Auto-fetched on High/Critical/Emergency assessments using browser geolocation. | ✅ Done |
| S10.4 | Teletriage History | Store past assessments per pet (`TeletriageSession` entity — already exists from S10.1). View timeline in pet profile: expandable "Triage History" panel in My Pets with severity dots, badges, emergency flags, symptoms, assessment, and recommendations. Mutual-exclusive toggle with Health Records. | ✅ Done |

---

### E11: Pet Fitness & Activity ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S11.1 | Activity Model & API | `Activity` entity (PetId, UserId, Type, Value, DurationMinutes, Notes, Date). `ActivitiesController` with CRUD + summary endpoint (walks/meals/exercise stats, weight history, weekly breakdown, streak). Fluent API config, `AddActivities` migration. | ✅ Done |
| S11.2 | Activity Logging UI | `PetActivityComponent` with pet tabs, quick-log buttons (Walk/Meal/Exercise/Weight) with type-specific inputs (duration, distance, weight, calories), recent activity list with delete. `ActivityService` (Angular). Route `/activity`, nav item "Activity" with lightning bolt icon. | ✅ Done |
| S11.3 | Fitness Dashboard | `FitnessDashboardComponent` at `/fitness`: stat cards (walks, exercise, meals, current weight), streak banner with fire emoji, SVG weight trend chart (line + area fill), weekly activity bar chart, pet selector, link to activity log. Pure CSS/SVG — no Chart.js dependency. | ✅ Done |

---

### E12: Social Community ✅

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S12.1 | Community Post Model & API | `Post` entity (UserId, Content, ImageUrl, LikeCount, CommentCount), `PostLike` (composite PK), `PostComment`. `PostsController` with paginated feed, create/delete posts, toggle like, CRUD comments. `Conversation` + `Message` entities for chat. `AddSocialAndMessaging` migration. | ✅ Done |
| S12.2 | Social Feed UI | `SocialFeedComponent` at `/community`: create post with photo upload, paginated timeline feed, like toggle (heart fill), expandable comment threads, inline comment form, delete own posts. `PostService` (Angular). Nav item "Feed" with newspaper icon. | ✅ Done |
| S12.3 | In-App Messaging | `MessagesController` with conversations list, paginated messages, send, unread count, auto mark-as-read. `MessagingComponent` at `/messages`: conversation list with unread badges, chat view with bubbles, send input. `MessageService` (Angular). Nav item "Chat" with chat bubble icon. REST-based (SignalR ready for future upgrade). | ✅ Done |

---

## Phase 4 — Calendar & Enhanced Pet Profiles

### E13: Google Calendar Integration ⬜

| Story | Title | Description | Status |
|-------|-------|-------------|--------|
| S13.1 | Google OAuth & Calendar API Setup | Backend: Add Google Calendar API client (`Google.Apis.Calendar.v3`). Configure OAuth 2.0 credentials. `GoogleCalendarService` with token storage per user. `GET /api/calendar/connect` (OAuth redirect) and `GET /api/calendar/callback` (token exchange). | ⬜ Pending |
| S13.2 | Add Booking to Google Calendar API | `POST /api/calendar/add-event/{bookingId}` — creates a Google Calendar event from a confirmed booking (title: service type + provider/pet name, start/end from `ScheduledStart`/`ScheduledEnd`, description with provider details, location if available). Returns event link. | ⬜ Pending |
| S13.3 | Calendar Integration UI | "Add to Google Calendar" button on confirmed bookings in the Requests page. Google account connect/disconnect toggle in user settings. Success toast with link to event. Visual indicator on bookings already added to calendar. | ⬜ Pending |
| S13.4 | Auto-Add & Sync | Option to auto-add confirmed bookings to Google Calendar. Update/delete calendar events when bookings are rescheduled or cancelled. User preference stored in profile. | ⬜ Pending |

---

## Progress Summary

| Phase | Epics | Stories Total | Stories Done |
|-------|-------|---------------|--------------|
| Phase 1 | E1–E6 | 18 | 18 (E1✅ E2✅ E3✅ E4✅ E5✅ E6✅) |
| Phase 2 | E7–E9 | 13 | 13 (E7✅ E8✅ E9✅) |
| Phase 3 | E10–E12 | 10 | 10 (E10✅ E11✅ E12✅) |
| Phase 4 | E13 | 4 | 0 (E13⬜) |
| **Total** | **13** | **45** | **41 ✅** |
