# PetOwner API — Backend contracts (ASP.NET Core)

This document reflects the **current** `PetOwner.Api` implementation as of the repository state used to generate it. It is intended for native mobile client and architecture planning: routes, HTTP verbs, authorization, request/response shapes, and SignalR contracts.

**Base URL:** configurable per environment (e.g. `https://host/`). All REST routes below are relative to that origin unless noted as absolute.

**Authentication**

- **REST:** `Authorization: Bearer <JWT>`.
- **JWT claims:** `NameIdentifier` (user id, `Guid` string), `Name`, `Role` (`Owner` | `Provider` | `Admin`). Issuer, audience, signing key, and expiry come from configuration (`Jwt:*`).
- **SignalR:** same JWT; for WebSocket connections the token may be passed as query `access_token` on paths under `/hubs` (see `Program.cs`).

**JSON naming:** ASP.NET Core default **camelCase** for JSON property names.

**Enums:** There is **no** `JsonStringEnumConverter` registered in `Program.cs`; `System.Text.Json` typically serializes enums as **numeric** values unless you add converters. Enum definitions are listed in the reference section at the end.

**Errors:** Many endpoints return `{ "message": "..." }` for errors; the app uses `ProblemDetails` and a global exception handler for unhandled failures.

---

## 1. REST API by controller

### 1.1 `AuthController` — `api/auth`

| Method | Route | Auth | Request body | Success response |
|--------|-------|------|--------------|------------------|
| POST | `api/auth/register` | **Anonymous** | `RegisterDto` | `200` `{ token: string, userId: guid }` |
| POST | `api/auth/login` | **Anonymous** | `LoginDto` | `200` `{ token: string, userId: guid }` |
| POST | `api/auth/forgot-password` | **Anonymous** | `ForgotPasswordDto` | `200` `{ message: string }` |
| POST | `api/auth/reset-password` | **Anonymous** | `ResetPasswordDto` | `200` `{ message: string }` |

---

### 1.2 `PetsController` — `api/pets`

Class-level **`[Authorize]`**, except `GET api/pets/lost` (**`[AllowAnonymous]`**).

| Method | Route | Auth | Request | Success response |
|--------|-------|------|---------|------------------|
| GET | `api/pets` | Authenticated | — | `200` `PetDto[]` |
| POST | `api/pets` | Authenticated | `CreatePetRequest` | `201` `PetDto` (`CreatedAtAction` → `GetMyPets`) |
| PUT | `api/pets/{id}` | Authenticated | `UpdatePetRequest` | `200` `PetDto` |
| DELETE | `api/pets/{id}` | Authenticated | — | `204` |
| POST | `api/pets/{id}/report-lost` | Authenticated | `ReportLostRequest` | `200` `PetDto` or `400` SOS cooldown object |
| POST | `api/pets/{id}/mark-found` | Authenticated | — | `200` `PetDto` |
| GET | `api/pets/lost` | **Anonymous** | — | `200` `LostPetDto[]` |

**SOS cooldown error body (400):** `{ message, code: "SOS_COOLDOWN", cooldownEndsAt: dateTime, remainingMinutes: int }`.

---

### 1.3 `PetHealthController` — `api/pets/{petId}`

**`[Authorize]`** — all routes require ownership of `petId`.

| Method | Route | Request body | Success response |
|--------|-------|--------------|------------------|
| GET | `.../vaccinations` | — | `200` `VaccinationDto[]` |
| GET | `.../vaccinations/{id}` | — | `200` `VaccinationDto` |
| POST | `.../vaccinations` | `CreateVaccinationRequest` | `201` `VaccinationDto` |
| PUT | `.../vaccinations/{id}` | `UpdateVaccinationRequest` | `200` `VaccinationDto` |
| DELETE | `.../vaccinations/{id}` | — | `204` |
| GET | `.../vaccine-status` | — | `200` `VaccineStatusDto[]` |
| GET | `.../weight-logs` | — | `200` `WeightLogDto[]` |
| GET | `.../weight-logs/{id}` | — | `200` `WeightLogDto` |
| POST | `.../weight-logs` | `CreateWeightLogRequest` | `201` `WeightLogDto` |
| PUT | `.../weight-logs/{id}` | `UpdateWeightLogRequest` | `200` `WeightLogDto` |
| DELETE | `.../weight-logs/{id}` | — | `204` |
| GET | `.../weight-history` | — | `200` `WeightLogDto[]` |
| GET | `.../health-records` | — | `200` `MedicalRecordDto[]` |
| GET | `.../health-records/{id}` | — | `200` `MedicalRecordDto` |
| POST | `.../health-records` | `CreateMedicalRecordDto` | `201` `MedicalRecordDto` |
| PUT | `.../health-records/{id}` | `UpdateMedicalRecordDto` | `200` `MedicalRecordDto` |
| DELETE | `.../health-records/{id}` | — | `204` |

**Medical record `type` values (case-insensitive):** `Vaccination`, `Condition`, `Medication`, `VetVisit`.

---

### 1.4 `MedicalRecordsController` — `api/pets/{petId}/medical-records`

**`[Authorize]`** — CRUD requires pet ownership.

| Method | Route | Request | Success response |
|--------|-------|---------|------------------|
| GET | `api/pets/{petId}/medical-records` | — | `200` `MedicalRecordDto[]` |
| GET | `api/pets/{petId}/medical-records/{id}` | — | `200` `MedicalRecordDto` |
| POST | `api/pets/{petId}/medical-records` | `CreateMedicalRecordDto` | `201` `MedicalRecordDto` |
| PUT | `api/pets/{petId}/medical-records/{id}` | `UpdateMedicalRecordDto` | `200` `MedicalRecordDto` |
| DELETE | `api/pets/{petId}/medical-records/{id}` | — | `204` |

**Shared records for providers (absolute route on same controller):**

| Method | Route | Auth | Success response |
|--------|-------|------|------------------|
| GET | `api/bookings/{bookingId}/medical-records` | Authenticated (must be **provider** on booking) | `200` `{ shared: bool, records: MedicalRecordDto[] }` |

Provider access only when booking status is `Accepted` or `Completed`; otherwise `400`. If `shared` is false, `records` is empty.

---

### 1.5 `ActivitiesController` — `api/pets/{petId}/activities`

**`[Authorize]`** — pet ownership enforced.

| Method | Route | Query | Request | Success response |
|--------|-------|-------|---------|------------------|
| GET | `.../activities` | `type?`, `days` (default 30) | — | `200` `ActivityDto[]` |
| POST | `.../activities` | — | `CreateActivityDto` | `201` `ActivityDto` |
| PUT | `.../activities/{id}` | — | `UpdateActivityDto` | `200` `ActivityDto` |
| DELETE | `.../activities/{id}` | — | — | `204` |
| GET | `.../activities/summary` | `days` (default 30) | — | `200` `ActivitySummaryDto` |

**Activity `type` values:** `Walk`, `Meal`, `Exercise`, `Weight` (case-insensitive).

---

### 1.6 `PostsController` — `api/posts`

**`[Authorize]`** on the controller (all endpoints).

| Method | Route | Query | Request | Success response |
|--------|-------|-------|---------|------------------|
| GET | `api/posts/feed` | `page`, `pageSize` (max 50), `lat`, `lng`, `radiusKm`, `category` | — | `200` `PostDto[]` |
| POST | `api/posts` | — | `CreatePostDto` | `201` `PostDto` |
| PUT | `api/posts/{id}` | — | `UpdatePostDto` | `200` `PostDto` |
| DELETE | `api/posts/{id}` | — | — | `204` |
| POST | `api/posts/{id}/like` | — | — | `200` `{ liked: bool, likeCount: int }` |
| GET | `api/posts/{postId}/comments` | — | — | `200` `CommentDto[]` |
| POST | `api/posts/{postId}/comments` | — | `CreateCommentDto` | `200` `CommentDto` |
| DELETE | `api/posts/comments/{commentId}` | — | — | `204` |

---

### 1.7 `MapController` — `api/map` (no class-level `[Authorize]`)

| Method | Route | Auth | Query | Success response |
|--------|-------|------|-------|------------------|
| GET | `api/map/pins` | **Anonymous** | `requestedTime?`, `serviceType?`, `minRating?`, `maxRate?`, `radiusKm?`, `latitude?`, `longitude?`, `searchTerm?` | `200` `MapPinDto[]` |
| GET | `api/map/service-types` | **Anonymous** | — | `200` `string[]` (display names) |
| GET | `api/providers/{providerId}/profile` | **Anonymous** | — | `200` `ProviderPublicProfileDto` |
| GET | `api/users/{userId}/mini-profile` | **Anonymous** | — | `200` `UserMiniProfileDto` |
| GET | `api/providers/{providerId}/contact` | **Authenticated** | — | `200` `ContactDto` |

---

### 1.8 `ProvidersController` — `api/providers`

Per-action auth as below.

| Method | Route | Auth | Request | Success response |
|--------|-------|------|---------|------------------|
| POST | `api/providers/apply` | Authenticated | `ProviderApplicationRequest` | `200` `ProviderApplicationResponse` |
| POST | `api/providers/onboarding` | Authenticated | `ProviderOnboardingRequest` | `200` `ProviderOnboardingResponse` |
| POST | `api/providers/generate-bio` | **Anonymous** | `GenerateBioRequest` | `200` `GenerateBioResponse` |
| PUT | `api/providers/availability` | Authenticated | `UpdateAvailabilityRequest` | `200` `{ message, isAvailableNow }` |
| PUT | `api/providers/me` | Authenticated | `UpdateProfileDto` | `200` `{ message }` |
| GET | `api/providers/me/schedule` | Authenticated | — | `200` `AvailabilitySlotDto[]` |
| POST | `api/providers/me/schedule` | Authenticated | `CreateAvailabilitySlotDto` | `201` `AvailabilitySlotDto` |
| PUT | `api/providers/me/schedule/{id}` | Authenticated | `UpdateAvailabilitySlotDto` | `200` `AvailabilitySlotDto` |
| DELETE | `api/providers/me/schedule/{id}` | Authenticated | — | `204` |
| POST | `api/providers/upload-image` | Authenticated | `multipart/form-data`: `file` | `200` `{ url, thumbnailUrl }` (see also blob upload response in §2) |
| GET | `api/providers/me` | Authenticated | — | `200` `ProviderMeResponse` |
| GET | `api/providers/me/earnings` | Authenticated | — | `200` `EarningsSummaryDto` |
| GET | `api/providers/me/earnings/transactions` | Authenticated | — | `200` `EarningsTransactionDto[]` (max 50) |
| GET | `api/providers/me/stripe-connect` | Authenticated | — | `200` `StripeConnectStatusDto` |
| GET | `api/providers/me/stats` | Authenticated | — | `200` `ProviderStatsDto` |

---

### 1.9 `TeletriageController` — `api/teletriage`

**`[Authorize]`** — all actions.

| Method | Route | Query / body | Success response |
|--------|-------|--------------|------------------|
| POST | `api/teletriage/assess` | `TeletriageRequestDto` | `200` `TeletriageResponseDto` |
| GET | `api/teletriage/history/{petId}` | — | `200` `TeletriageHistoryDto[]` (max 20) |
| GET | `api/teletriage/{id}` | — | `200` `TeletriageHistoryDto` |
| GET | `api/teletriage/nearby-vets` | `latitude`, `longitude`, `maxResults` (default 5, cap 10) | `200` `NearbyVetDto[]` |

---

### 1.10 `RequestsController` — `api/requests`

**`[Authorize]`**.

| Method | Route | Request | Success response |
|--------|-------|---------|------------------|
| POST | `api/requests` | `CreateServiceRequestDto` | `201` `{ id: guid }` |
| GET | `api/requests` | — | `200` `ServiceRequestDto[]` |
| PUT | `api/requests/{id}/accept` | — | `200` `{ id, status }` |
| PUT | `api/requests/{id}/reject` | — | `200` `{ id, status }` |
| PUT | `api/requests/{id}/complete` | — | `200` `{ id, status }` |
| PUT | `api/requests/{id}/cancel` | `CancelRequestDto` | `200` `{ id, status, refundAmount?, refundPolicy? }` |

**Service request `status` values** (string in DB/API): e.g. `Pending`, `Accepted`, `Rejected`, `Completed`, `Cancelled`.

---

### 1.11 `PaymentsController` — `api/payments`

**`[Authorize]`**.

| Method | Route | Success response |
|--------|-------|------------------|
| POST | `api/payments/checkout/{bookingId}` | `200` `CheckoutResponseDto` |
| POST | `api/payments/{bookingId}/capture` | `200` `{ id, status, capturedAt }` |
| GET | `api/payments/{bookingId}` | `200` `PaymentStatusDto` |

`bookingId` refers to **service request** id (`ServiceRequest.Id`).

---

### 1.12 `BookingsController` — `api/bookings`

**`[Authorize]`**. (Legacy **Booking** entity / Grow flow, distinct from **ServiceRequest** flow.)

| Method | Route | Request | Success response |
|--------|-------|---------|------------------|
| POST | `api/bookings` | `CreateBookingRequest` | `201` `BookingDto` |
| GET | `api/bookings/{id}` | — | `200` `BookingDto` |
| GET | `api/bookings/mine` | — | `200` `BookingDto[]` |
| PUT | `api/bookings/{id}/confirm` | — | `204` |
| PUT | `api/bookings/{id}/cancel` | — | `204` |

---

### 1.13 `ReviewsController` — `api/reviews`

**`[Authorize]`** on controller; **`GET api/reviews/provider/{providerId}`** has **`[AllowAnonymous]`**.

| Method | Route | Auth | Request | Success response |
|--------|-------|------|---------|------------------|
| POST | `api/reviews` | Authenticated | `CreateBookingReviewDto` | `201` `{ id: guid }` |
| POST | `api/reviews/service-request` | Authenticated | `CreateReviewDto` | `201` `{ id: guid }` |
| GET | `api/reviews/provider/{providerId}` | Anonymous | — | `200` `ReviewDto[]` |

---

### 1.14 `NotificationsController` — `api/notifications`

**`[Authorize]`**.

| Method | Route | Query / body | Success response |
|--------|-------|--------------|------------------|
| GET | `api/notifications` | `page`, `pageSize` | `200` `NotificationDto[]` |
| GET | `api/notifications/unread-count` | — | `200` `{ count: int }` |
| PATCH/PUT | `api/notifications/{id}/read` | — | `200` `{ message }` |
| POST | `api/notifications/read-all` | — | `200` `{ message }` |
| DELETE | `api/notifications/{id}` | — | `204` |

---

### 1.15 `ChatController` — `api/chat`

**`[Authorize]`**.

| Method | Route | Query | Success response |
|--------|-------|-------|------------------|
| GET | `api/chat/conversations` | — | `200` `ChatConversationDto[]` |
| GET | `api/chat/{otherUserId}` | `page` (default 1) | `200` `ChatMessageDto[]` |
| POST | `api/chat/{otherUserId}/read` | — | `200` `{ markedRead: int }` |

---

### 1.16 `FavoritesController` — `api/favorites`

**`[Authorize]`**.

| Method | Route | Success response |
|--------|-------|------------------|
| POST | `api/favorites/{providerProfileId}/toggle` | `200` `{ isFavorited: bool }` |
| GET | `api/favorites` | `200` **array of objects** (see §2) |
| GET | `api/favorites/check/{providerProfileId}` | `200` `{ isFavorited: bool }` |
| GET | `api/favorites/ids` | `200` `guid[]` (provider profile user ids) |

---

### 1.17 `CommunityController` — `api/community`

**`[Authorize]`** on controller — **including** group listing and group posts (all require a valid user).

| Method | Route | Roles | Request | Success response |
|--------|-------|-------|---------|------------------|
| GET | `api/community/groups` | Authenticated | — | `200` `CommunityGroupDto[]` |
| GET | `api/community/groups/{groupId}/posts` | Authenticated | Query: `lat?`, `lng?`, `radiusKm?` | `200` `GroupPostDto[]` |
| POST | `api/community/groups/{groupId}/posts` | Authenticated | `CreateGroupPostRequest` | `201` `GroupPostDto` |
| POST | `api/community/posts/{postId}/like` | Authenticated | — | `200` `{ likesCount, isLikedByCurrentUser }` |
| GET | `api/community/posts/{postId}/comments` | Authenticated | — | `200` `GroupPostCommentDto[]` |
| POST | `api/community/posts/{postId}/comments` | Authenticated | `CreateGroupPostCommentRequest` | `200` `GroupPostCommentDto` |
| GET | `api/community/admin/groups` | **Admin** | — | `200` `CommunityGroupDto[]` |
| GET | `api/community/admin/groups/{id}` | **Admin** | — | `200` `CommunityGroupDto` |
| POST | `api/community/admin/groups` | **Admin** | `CreateCommunityGroupRequest` | `201` `CommunityGroupDto` |
| PUT | `api/community/admin/groups/{id}` | **Admin** | `UpdateCommunityGroupRequest` | `200` `CommunityGroupDto` |
| DELETE | `api/community/admin/groups/{id}` | **Admin** | — | `204` |

---

### 1.18 `FilesController` — `api/files`

Class **`[Authorize]`** except where noted.

| Method | Route | Auth | Request | Success response |
|--------|-------|------|---------|------------------|
| POST | `api/files/upload/image` | Authenticated | `multipart/form-data`: `file`; query `folder` (default `images`) | `200` blob result (§2) |
| POST | `api/files/upload/document` | Authenticated | `multipart/form-data`: `file`; query `folder` (default `documents`) | `200` blob result (§2) |
| DELETE | `api/files/{*blobName}` | Authenticated | — | `204` |
| GET | `api/files/sas/{*blobName}` | **Anonymous** | — | `200` `{ url: string }` |

---

### 1.19 `WebhooksController` — `api/webhooks`

**Anonymous** (no `[Authorize]`).

| Method | Route | Request | Success response |
|--------|-------|---------|------------------|
| POST | `api/webhooks/grow` | `GrowWebhookPayload` | `200` `{ message }` |

---

### 1.20 `StripeWebhookController` — `api/webhooks/stripe`

**`[AllowAnonymous]`**. Expects **raw** Stripe event body and `Stripe-Signature` header (not a JSON DTO you define for the mobile app).

| Method | Route | Success response |
|--------|-------|------------------|
| POST | `api/webhooks/stripe` | `200` empty body (on success) |

---

### 1.21 `AdminController` — `api/admin`

**`[Authorize(Roles = "Admin")]`** for all actions.

| Method | Route | Request | Success response |
|--------|-------|---------|------------------|
| GET | `api/admin/stats` | — | `200` `AdminStatsDto` |
| GET | `api/admin/users` | — | `200` `AdminUserDto[]` |
| PATCH | `api/admin/users/{id}/role` | `UpdateRoleRequest` | `200` `{ message, role }` |
| PUT | `api/admin/users/{id}/toggle-status` | — | `200` `{ message, isActive }` |
| GET | `api/admin/bookings` | — | `200` `AdminBookingDto[]` |
| GET | `api/admin/pending` | — | `200` **array of anonymous objects** (pending providers; see §2) |
| PUT | `api/admin/approve/{providerId}` | — | `200` `{ message }` |
| POST | `api/admin/users/{providerId}/revoke-sitter` | — | `200` `{ message }` |
| POST | `api/admin/providers/{id}/suspend` | `SuspendProviderRequest?` | `200` `{ message }` |
| POST | `api/admin/providers/{id}/ban` | — | `200` `{ message }` |
| POST | `api/admin/providers/{id}/reactivate` | — | `200` `{ message }` |
| POST | `api/admin/seed-dummy-data` | — | `200` `{ message }` |
| POST | `api/admin/seed-bogus-pets` | — | `200` `{ message, count }` |
| GET | `api/admin/pets` | — | `200` `AdminPetDto[]` |
| DELETE | `api/admin/pets/{id}` | — | `200` `{ message }` |
| POST | `api/admin/providers/{id}/approve` | — | `200` `{ message }` (duplicate-style approve vs `approve/{providerId}`) |
| POST | `api/admin/clear-sos` | — | `200` `{ message, count }` |

---

## 2. DTO reference (properties and types)

### Auth

- **RegisterDto:** `email`, `phone`, `password`, `name`, `role` (default `"Owner"`), `languagePreference` (default `"he"`).
- **LoginDto:** `email`, `password`.
- **ForgotPasswordDto:** `email`.
- **ResetPasswordDto:** `email`, `token`, `newPassword`.

### Pets

- **PetDto:** `id`, `name`, `species` (enum), `breed?`, `age`, `weight?`, `allergies?`, `medicalConditions?`, `notes?`, `isNeutered`, `medicalNotes?`, `feedingSchedule?`, `microchipNumber?`, `vetName?`, `vetPhone?`, `imageUrl?`, `isLost`, `lastSeenLocation?`, `lastSeenLat?`, `lastSeenLng?`, `lostAt?`, `contactPhone?`, `communityPostId?`.
- **CreatePetRequest / UpdatePetRequest:** same core fields as PetDto without `id` / lost-SOS fields.
- **ReportLostRequest:** `lastSeenLocation`, `lastSeenLat`, `lastSeenLng`, `contactPhone`, `notes?`.
- **LostPetDto:** `id`, `name`, `species`, `breed?`, `imageUrl?`, `lastSeenLocation`, `lastSeenLat`, `lastSeenLng`, `lostAt?`, `contactPhone`, `ownerName`.

### Social posts

- **CreatePostDto:** `content`, `imageUrl?`, `latitude?`, `longitude?`, `city?`.
- **PostDto:** `id`, `userId`, `userName`, `content`, `imageUrl?`, `likeCount`, `commentCount`, `likedByMe`, `createdAt`, `authorRole`, `authorIsApprovedProvider`, `category?`, `updatedAt?`.
- **UpdatePostDto:** `content`.
- **CreateCommentDto:** `content`.
- **CommentDto:** `id`, `userId`, `userName`, `content`, `createdAt`.

### Map & profiles

- **MapPinDto:** `providerId`, `name`, `latitude`, `longitude`, `minRate`, `profileImageUrl?`, `services`, `averageRating?`, `reviewCount`, `acceptsOffHoursRequests`, `providerType`, `whatsappNumber?`, `websiteUrl?`, `isEmergencyService`.
- **ProviderPublicProfileDto:** `providerId`, `name`, `bio?`, `profileImageUrl?`, `serviceRates` (`ServiceRateDto[]`), `averageRating?`, `reviewCount`, `isAvailableNow`, `acceptsOffHoursRequests`, `services`, `availabilitySlots` (`PublicAvailabilitySlotDto[]`), `recentReviews` (`ReviewDto[]`), `providerType`, `whatsappNumber?`, `websiteUrl?`, `openingHours?`, `isEmergencyService`, `instagramUrl?`, `facebookUrl?`.
- **PublicAvailabilitySlotDto:** `dayOfWeek` (0–6), `startTime`, `endTime` (strings `"hh:mm"`).
- **UserMiniProfileDto:** `id`, `name`, `profileImageUrl?`, `bio?`, `role`, `memberSince` (maps from user `createdAt`), `isProvider`, `services?`, `averageRating?`, `reviewCount?`.
- **ContactDto:** `phone`.
- **ServiceRateDto:** `serviceType` (enum), `rate` (decimal), `pricingUnit` (enum).

### Providers

- **ProviderApplicationRequest:** see `OnboardingRequest.cs` — includes `type` (enum), `businessName?`, `serviceType`, address fields, `latitude`, `longitude`, `phoneNumber`, `whatsappNumber?`, `websiteUrl?`, `openingHours?`, `isEmergencyService`, `description`, `imageUrl?`, `selectedServices`, `referenceName?`, `referenceContact?`, `instagramUrl?`, `facebookUrl?`.
- **ProviderApplicationResponse:** `message`, `applicationId` (guid; here the **user id** of the applicant).
- **ProviderOnboardingRequest:** `selectedServices`, `bio`, `latitude`, `longitude`, `city`, `street`, `buildingNumber`, `apartmentNumber?`, `referenceName`, `referenceContact`, `instagramUrl?`, `facebookUrl?`.
- **ProviderOnboardingResponse:** `message`, `newAccessToken`.
- **GenerateBioRequest / GenerateBioResponse:** `userNotes` / `bio`.
- **UpdateAvailabilityRequest:** `isAvailable`.
- **UpdateProfileDto:** `bio`, `selectedServices`, `latitude`, `longitude`, `city`, `street`, `buildingNumber`, `apartmentNumber?`, `acceptsOffHoursRequests?`, `instagramUrl?`, `facebookUrl?`.
- **ProviderMeResponse:** `status`, `isAvailableNow`, `userName`, `bio?`, `serviceRates`, `city`, `street`, `buildingNumber`, `apartmentNumber?`, `latitude?`, `longitude?`, `serviceIds`, `services`, `profileImageUrl?`, `averageRating?`, `reviewCount`, `acceptsOffHoursRequests`, `isSuspended`, `suspensionReason?`, `providerType`, `whatsappNumber?`, `websiteUrl?`, `openingHours?`, `isEmergencyService`, `instagramUrl?`, `facebookUrl?`.

### Availability

- **AvailabilitySlotDto:** `id`, `dayOfWeek`, `startTime`, `endTime` (`TimeSpan` → JSON string).
- **CreateAvailabilitySlotDto / UpdateAvailabilitySlotDto:** `dayOfWeek`, `startTime`, `endTime`.

### Earnings & Stripe

- **EarningsSummaryDto:** `totalEarned`, `platformFees`, `netEarnings`, `completedBookings`, `pendingPayments`, `pendingAmount`.
- **EarningsTransactionDto:** `paymentId`, `bookingId`, `ownerName`, `petName?`, `amount`, `platformFee`, `netAmount`, `status`, `createdAt`, `capturedAt?`.
- **StripeConnectStatusDto:** `isConnected`, `accountId?`.

### Provider stats

- **ProviderStatsDto:** `totalBookings`, `completedBookings`, `pendingBookings`, `cancelledBookings`, `completionRate`, `totalEarnings`, `monthlyEarnings`, `thisMonthBookings`, `averageRating`, `reviewCount`, `upcomingBookings`, `todaySchedule`.
- **UpcomingBookingDto:** `id`, `petOwnerName`, `petName?`, `serviceName?`, `scheduledStart?`, `scheduledEnd?`, `totalPrice?`, `status`.
- **TodayScheduleDto:** `id`, `petOwnerName`, `petName?`, `timeSlot`, `status`.

### Teletriage

- **TeletriageRequestDto:** `petId`, `symptoms`, `imageBase64?`.
- **TeletriageResponseDto / TeletriageHistoryDto:** `id`, `petId`, `petName`, (`symptoms` on history), `severity`, `assessment`, `recommendations?`, `isEmergency`, `createdAt`.
- **NearbyVetDto:** `providerId`, `name`, `phone?`, `latitude`, `longitude`, `address?`, `distanceKm`, `profileImageUrl?`, `services`, `minRate`, `averageRating`, `reviewCount`.

### Service requests & payments

- **CreateServiceRequestDto:** `providerId`, `petId?`, `serviceId?`, `scheduledStart?`, `scheduledEnd?`, `notes?`, `shareMedicalRecords` (default false).
- **ServiceRequestDto:** `id`, `ownerId`, `ownerName`, `providerId`, `providerName`, `petId?`, `petName?`, `status`, `createdAt`, `providerPhone?`, `hasReview`, `serviceId?`, `serviceName?`, `scheduledStart?`, `scheduledEnd?`, `totalPrice?`, `notes?`, `cancellationReason?`, `paymentStatus?`, `shareMedicalRecords`.
- **CancelRequestDto:** `reason?`.
- **CheckoutResponseDto:** `clientSecret`, `paymentIntentId`, `amount`, `platformFee`, `currency`.
- **PaymentStatusDto:** `id`, `serviceRequestId`, `stripePaymentIntentId`, `amount`, `platformFee`, `currency`, `status`, `createdAt`, `capturedAt?`, `refundedAt?`, `refundAmount?`.

### Legacy bookings

- **CreateBookingRequest:** `providerId`, `serviceType` (enum), `startDate`, `endDate`, `notes?`.
- **BookingDto:** `id`, `ownerId`, `providerProfileId`, `providerName`, `ownerName`, `service`, `startDate`, `endDate`, `totalPrice`, `pricingUnit`, `status`, `paymentStatus`, `paymentUrl?`, `createdAt`, `notes?`, `providerPhone?`, `ownerPhone?`, `hasReview`.

### Reviews

- **CreateBookingReviewDto:** `bookingId`, `rating`, `comment`.
- **CreateReviewDto:** `requestId`, `rating`, `comment`, `communicationRating?`, `reliabilityRating?`.
- **ReviewDto:** `id`, `serviceRequestId?`, `bookingId?`, `reviewerId`, `reviewerName`, `reviewerAvatar?`, `revieweeId`, `rating`, `comment`, `isVerified`, `communicationRating?`, `reliabilityRating?`, `photoUrl?`, `createdAt`.

### Notifications

- **NotificationDto:** `id`, `type`, `title`, `message`, `relatedEntityId?`, `isRead`, `createdAt`.

### Chat (REST)

- **ChatConversationDto:** `conversationId`, `otherUserId`, `otherUserName`, `otherUserAvatar?`, `lastMessageSnippet?`, `unreadCount`, `lastMessageAt`.
- **ChatMessageDto:** `id`, `senderId`, `senderName`, `content`, `isRead`, `sentAt` (UTC).

### Pet health (shared with medical DTOs above)

- **VaccinationDto:** `id`, `petId`, `vaccineName` (enum), `dateAdministered`, `nextDueDate?`, `notes?`, `createdAt`.
- **CreateVaccinationRequest / UpdateVaccinationRequest:** `vaccineName`, `dateAdministered`, `nextDueDate?`, `notes?`.
- **VaccineStatusDto:** `vaccineName`, `dateAdministered`, `nextDueDate?`, `status` (`"Up to Date"` \| `"Due Soon"` \| `"Overdue"`).
- **WeightLogDto:** `id`, `petId`, `weight`, `dateRecorded`, `createdAt`.
- **CreateWeightLogRequest / UpdateWeightLogRequest:** `weight`, `dateRecorded`.
- **MedicalRecordDto:** `id`, `petId`, `type`, `title`, `description?`, `date`, `documentUrl?`, `createdAt`.
- **CreateMedicalRecordDto / UpdateMedicalRecordDto:** `type`, `title`, `description?`, `date`, `documentUrl?`.

### Activities

- **CreateActivityDto / UpdateActivityDto:** `type`, `value?`, `durationMinutes?`, `notes?`, `date`.
- **ActivityDto:** `id`, `petId`, `type`, `value?`, `durationMinutes?`, `notes?`, `date`, `createdAt`.
- **ActivitySummaryDto:** `totalWalks`, `totalWalkMinutes`, `totalWalkDistance`, `totalMeals`, `totalExercises`, `totalExerciseMinutes`, `weightHistory` (`WeightEntryDto[]`), `currentStreak`, `weeklyBreakdown` (`Record<string, int>`).
- **WeightEntryDto:** `date`, `value`.

### Community

- **CommunityGroupDto:** `id`, `name`, `description`, `icon?`, `isActive`, `createdAt`, `targetCountry?`, `targetCity?`, `postCount`.
- **CreateCommunityGroupRequest / UpdateCommunityGroupRequest:** per `CommunityDto.cs`.
- **GroupPostDto:** `id`, `groupId`, `authorId`, `authorName`, `authorAvatar?`, `content`, `createdAt`, `latitude?`, `longitude?`, `city?`, `country?`, `likesCount`, `commentsCount`, `isLikedByCurrentUser`.
- **CreateGroupPostRequest:** `content`, `latitude?`, `longitude?`, `city?`, `country?`.
- **GroupPostCommentDto:** `id`, `authorId`, `authorName`, `authorAvatar?`, `content`, `createdAt`.
- **CreateGroupPostCommentRequest:** `content`.

### Favorites (`GET api/favorites`)

Each element is shaped like:

- `userId` (guid), `name`, `profileImageUrl?`, `averageRating?`, `reviewCount`, `isAvailableNow`, `services` (string), `minRate`, `favoritedAt`.

### Admin

- **AdminStatsDto:** `totalUsers`, `totalPets`, `totalProviders`, `totalBookings`, `activeSOSReports`, `pendingProviders`, `totalPlatformRevenue`.
- **AdminUserDto:** `id`, `name`, `email`, `phone`, `role`, `createdAt`, `isActive`, `providerStatus?`, `providerType?`, `whatsappNumber?`, `websiteUrl?`.
- **AdminBookingDto:** `id`, `ownerName`, `providerName`, `service`, `status`, `totalPrice`, `startDate`, `createdAt`.
- **AdminPetDto:** `id`, `name`, `breed?`, `species`, `age`, `imageUrl?`, `ownerName`, `ownerEmail`, `ownerId`.
- **UpdateRoleRequest:** `role`.
- **SuspendProviderRequest:** `reason?`.

**GET `api/admin/pending`:** each item includes `userId`, `name`, `phone`, `providerType`, `businessName`, `phoneNumber`, `whatsappNumber`, `websiteUrl`, `openingHours`, `isEmergencyService`, `description`, `bio`, `serviceRates` (`{ service, rate, unit }[]`), `profileImageUrl`, `createdAt`, `address`, `latitude`, `longitude`, `services`, `referenceName`, `referenceContact`.

### Webhooks

- **GrowWebhookPayload:** `transactionId?`, `bookingId`, `status`.

### File upload response (provider profile image & files API)

`{ fileName, url, thumbnailUrl?, sizeBytes }` (anonymous object; property names camelCase).

---

## 3. SignalR — `NotificationHub`

- **Path:** `/hubs/notifications`
- **Authorization:** **`[Authorize]`** on the hub — connection requires a valid JWT (header or `?access_token=` for WebSockets).

### Connection behavior

- On connect, the server adds the connection to a group named **`userId`** (`ClaimTypes.NameIdentifier`).
- On disconnect, the connection is removed from that group.

### Client-invokable hub methods

**None.** `NotificationHub` does not expose public methods for clients to call.

### Server → client events

| Event name | Direction | Payload |
|------------|-----------|---------|
| **`NotificationReceived`** | Server → client (per-user group) | Anonymous object: `id` (guid), `type` (string), `title` (string), `message` (string), `relatedEntityId` (guid \| null), `isRead` (bool), `createdAt` (DateTime UTC) |

Emitted from `NotificationService.CreateAsync` and `NotificationService.BroadcastAsync` (broadcast sends one payload per user with that user’s notification `id`).

**Note:** `title` / `message` are often **i18n keys** (e.g. `NOTIFICATIONS.SOS_ALERT_TITLE`) rather than final display strings; the mobile app may need to map them like the web client.

---

## 4. Related: `ChatHub` (not `NotificationHub`, but real-time messaging)

- **Path:** `/hubs/chat`
- **`[Authorize]`** required to connect.

### Client → server

| Method (C# hub) | Suggested client invocation | Arguments |
|-----------------|----------------------------|-----------|
| `SendMessage` | `SendMessage` | `recipientId: Guid`, `content: string` |

Validations: non-empty content; recipient exists; not self; throws `HubException` on failure.

### Server → client

| Event | Target | Payload |
|-------|--------|---------|
| `ReceiveMessage` | Group `chat_{recipientId}` | `ChatNewMessageResponse` → `{ conversationId: guid, message: ChatMessageDto }` |
| `MessageSent` | Caller | Same as `ReceiveMessage` |

**ChatMessageDto:** `id`, `senderId`, `senderName`, `content`, `isRead`, `sentAt`.

---

## 5. Enum reference (server models)

Use numeric values in JSON unless you add string enum serialization.

**PetSpecies:** `Dog=1`, `Cat=2`, `Bird=3`, `Rabbit=4`, `Reptile=5`, `Other=6`.

**ServiceType:** `DogWalking`, `PetSitting`, `Boarding`, `DropInVisit`, `Training`, `Insurance` (0-based order as declared).

**ProviderType:** `Individual`, `Business`.

**PricingUnit:** `PerHour`, `PerNight`, `PerVisit`, `PerSession`, `PerPackage`.

**VaccineName:** `Rabies=1`, `Parvo=2`, `Distemper=3`, `Hepatitis=4`, `Leptospirosis=5`, `Bordetella=6`, `Lyme=7`, `Influenza=8`, `Worms=9`, `Fleas=10`, `Ticks=11`, `FeLV=12`, `FIV=13`, `Other=99`.

**DayOfWeek** (availability slots): .NET `DayOfWeek` — `0` = Sunday … `6` = Saturday.

---

## 6. Swagger

The API hosts Swagger UI in all environments (`UseSwagger` / `UseSwaggerUI` in `Program.cs`). You can use the generated OpenAPI document alongside this file for automated client generation.

---

*Generated from controller and DTO source in `PetOwner.Api` and related projects.*
