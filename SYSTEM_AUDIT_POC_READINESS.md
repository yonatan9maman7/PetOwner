# System Audit: POC Readiness (`pet-owner-mobile` + `PetOwner.Api`)

**Scope:** Static analysis of the ASP.NET Core API surface (`src/PetOwner.Api/Controllers`) versus all HTTP calls initiated from the React Native app (`src/pet-owner-mobile`), plus architectural and operational risks relevant to a closed beta.  
**Method:** Controller route attributes + `client.ts`, `reviewsApi.ts`, `activitiesApi.ts`, and repository-wide string matches for `/api/` paths and `apiClient` usage. SignalR hub URLs (`/hubs/*`) are noted separately; they are used by the app but are not REST controller actions.

---

## 1. Current State Overview (The "What We Have")

The mobile app is a **broad, multi-role product**: owner flows, optional provider flows, in-app admin tooling, community/social features, and real-time messaging/notifications. The following areas are **implemented end-to-end enough to demo** (with caveats called out in section 3).

### Authentication and account

- **Register / login / logout** with JWT stored client-side; **forgot password** emails a reset link (backend sends mail; reset completion is **web-oriented**, not an in-app token form).
- **Profile read/update** (`GET/PUT` profile), account settings, language, security entry points, **contact/support** ticket submission.

### Explore, map, and providers

- **Map pins** with filters; **service type** catalog; **provider public profile** and **contact** (phone) for approved providers.
- **Favorites** (list, toggle, check).
- **Reviews:** list on provider profile; **submit review tied to a booking** after service.

### Booking (scheduled services)

- **Create booking**, **list mine**, **get by id**, **provider confirm**, **owner cancel**.
- **Payment:** checkout is driven by a **`paymentUrl` returned on the booking** and handled in a **WebView** (`PaymentCheckoutScreen`), with polling on `bookingsApi.getById` for paid status—not the `PaymentsController` Stripe REST surface (see section 2).

### Provider onboarding and provider tools

- **Multi-step provider onboarding** posts to **`POST /api/providers/apply`** (not the alternate `onboarding` endpoint).
- **Provider dashboard:** availability toggle, **schedule CRUD**, profile update, **AI bio generation**, image upload, **stats/earnings** (including booking-based stats, sparkline, CSV export for providers who use that UI).

### Pets and health

- **Pet CRUD**, **lost/found** reporting with media upload.
- **Teletriage** assess + per-pet history + **nearby vets** (maps integration uses platform APIs elsewhere).
- **Weight logs**, **vaccinations**, **vaccine status**, **medical records** vault (list/add/delete via mobile; see gaps).
- **Health passport share link** generation (QR/share sheet).
- **Activity log** (walk/meal/exercise/weight) with list, summary, CRUD.

### Community

- **Global feed** with posts, likes, comments (including reply/like extensions present in API client).
- **Groups:** list, create (admin route), group posts, likes, comments.
- **Playdate Pals:** preferences, nearby pals, playdate requests, **live beacons**, **playdate events** (CRSVP, comments, cancel), aligned with `palsApi` / `playdatesApi`.

### Messaging and notifications

- **Chat:** conversations and history via REST; **sending uses SignalR** (`sendMessage`), not an HTTP POST on `ChatController`.
- **In-app notifications** list/unread/read/delete; **notification preference sync**; **Expo push token** register/remove.
- **SignalR** hubs for notifications and chat—wired from `notificationStore` / `signalr.ts` using `EXPO_PUBLIC_API_URL`.

### Profile, stats, admin (power users)

- **Owner stats** and CSV export (`/users/me/stats*`) where exposed in UI.
- **My Stats** for providers (`/providers/me/booking-stats*` etc.).
- **In-app admin dashboard** for admins: stats, users, pets, pending providers, inquiries, seed/clear demo actions, provider moderation—**subset** of full `AdminController` (see section 2).

### Operational / integration (backend-only by design)

- **Stripe** and **Grow** webhooks, **dummy Grow** payment service registration—these are **not** mobile-called; they are server integrations.

---

## 2. Unattached / Orphaned API Endpoints

**Definition used:** An ASP.NET Core route under `api/*` (and attribute-routed equivalents such as `HealthPassportController`) that **no mobile code invokes** via `apiClient`, `fetch` to the same API host, or documented hub-only flows.  
**Note:** “Orphaned from mobile” does **not** always mean “should delete”—many are **webhooks, admin-panel futures, or web-only flows.**

### Entire controllers or families unused by the mobile app

| Endpoint(s) | Recommendation |
|---------------|----------------|
| **`RequestsController` — `api/requests` (POST, GET, accept/reject/complete/cancel)`** | **Keep for future or delete after product decision.** This is the **legacy “service request”** pipeline. The app’s booking flow uses **`BookingsController`**. If you no longer support service requests anywhere, **delete or archive** after DB/migration review; otherwise **keep** for admin/back-office. |
| **`PaymentsController` — `api/payments/checkout/{bookingId}`, `capture`, `GET {bookingId}`** | **Keep (Stripe integration).** Mobile uses **Grow URL + WebView** path from booking DTOs, not these endpoints. If Stripe is still required for some tenants or reconciliation, **retain**; if production will be Grow-only, **document** and consider **deprecating** Stripe paths after parity. |
| **`POST api/webhooks/grow`** | **Keep.** Payment provider callback; not called by the app. |
| **`POST api/webhooks/stripe`** | **Keep** if Stripe remains in stack. |
| **`POST api/auth/reset-password`** | **Keep (web/password-reset).** Mobile uses **forgot-password** email flow; users complete reset in a **browser**. Optionally **add** deep link handling in the app later—do **not** delete without a web client story. |
| **`POST api/auth/promote-admin`** | **Treat as dangerous; remove or lock down before beta.** Hard-coded secret in source (`AuthController`); **not** for mobile. **Replace** with secure ops procedure (Azure Key Vault + one-time script, or remove entirely for production). |

### Provider, map, and user auxiliary routes

| Endpoint | Recommendation |
|----------|----------------|
| **`POST api/providers/onboarding`** | **Delete or merge.** Mobile uses **`POST api/providers/apply`** for onboarding. Two creation paths risk **drift** (confirmed in `ProvidersController`: different payloads/behavior). Prefer **one** onboarding endpoint. |
| **`GET api/providers/me/stripe-connect`** | **Keep for future provider payouts UI** or **delete** if Stripe Connect is out of scope. |
| **`GET api/users/{userId}/mini-profile`** (routed from `MapController`) | **Implement in mobile** if Pals/social screens should show lightweight user cards **without** duplicating provider profile calls; otherwise **keep** for future or **remove** if unused server-side. |

### Admin (`AdminController`)

Mobile uses: `stats`, `users`, `pets`, `pending`, `approve` (**PUT** `approve/{id}`), suspend/ban/reactivate, seeds, `clear-sos`, inquiries, etc.

| Endpoint | Recommendation |
|----------|----------------|
| **`GET api/admin/bookings`** | **Implement in admin app** when you need booking oversight, or **keep** for a **separate admin web** panel. |
| **`POST api/admin/users/{providerId}/revoke-sitter`** | **Keep for admin panel** or **wire into mobile** if product needs “revoke sitter” from phone. |
| **`POST api/admin/providers/{id}/approve`** | **Duplicate of** `PUT api/admin/approve/{providerId}` used by mobile. **Remove one** route to avoid confusion, or **document** canonical path. |

### Community admin group management

Mobile uses: `GET api/community/groups`, `POST api/community/admin/groups`, group posts, likes, comments.

| Endpoint | Recommendation |
|----------|----------------|
| **`GET api/community/admin/groups`**, **`GET api/community/admin/groups/{id}`**, **`PUT`**, **`DELETE`** | **Keep for future admin CMS** or **add** to mobile for group moderators. Not referenced in the client today. |

### Notifications

| Endpoint | Recommendation |
|----------|----------------|
| **`PATCH api/notifications/{id}/read`** | **Duplicate of** `PUT` on same path. Mobile uses **PUT**. **Remove PATCH** or implement one canonical verb to reduce maintenance. |

### Reviews

| Endpoint | Recommendation |
|----------|----------------|
| **`POST api/reviews/service-request`** | **Keep** only if legacy service-request reviews matter; mobile **never** calls it. **`reviewsApi.createServiceRequestReview`** exists in TypeScript but has **no store/screen usage**—dead client wrapper. Either **delete backend + client** or **document** for admin. |

### Pet health: duplicate and granular routes

Mobile uses **`MedicalRecordsController`** at **`api/pets/{petId}/medical-records`** for list/create/delete.

| Endpoint | Recommendation |
|----------|----------------|
| **`PetHealthController` — full `health-records` CRUD under `api/pets/{petId}/health-records`** | **Delete or redirect** to `MedicalRecordsController`. Same underlying `MedicalRecords` table—**duplicate API surface**. |
| **`GET api/pets/{petId}/vaccinations/{id}`**, **`GET api/pets/{petId}/weight-logs/{id}`** | **Implement in app** if you need detail screens, or **keep** for API completeness. |
| **`GET/PUT api/pets/{petId}/medical-records/{id}`** | **Implement edit/detail in mobile** or accept **create/delete-only** MVP. |

### Medical records for providers (booking-scoped)

| Endpoint | Recommendation |
|----------|----------------|
| **`GET api/bookings/{bookingId}/medical-records`** (on `MedicalRecordsController`) | **Implement in provider-facing UI** when a sitter must view shared records for an active booking; **keep** for HIPAA-style sharing story. |

### Teletriage

| Endpoint | Recommendation |
|----------|----------------|
| **`GET api/teletriage/{id:guid}`** | **Keep** for fetching a single assessment by id (e.g. deep link); **wire mobile** if you add assessment detail screen. |

### Files

| Endpoint | Recommendation |
|----------|----------------|
| **`DELETE api/files/{*blobName}`**, **`GET api/files/sas/{*blobName}`** | **Keep** for **admin/maintenance** or **direct blob management**; **optional** future client use for client-side deletes. Mobile only uses **upload** endpoints. |

### Health passport (public)

| Endpoint | Recommendation |
|----------|----------------|
| **`GET api/public/health-passport/{token}`** | **Keep.** Intended for **anonymous browser** open of shared link; **not** a mobile API call. |

### `HealthPassportController` share POST

- **`POST api/pets/{petId}/health-passport/share`** — **Used by mobile** (`petHealthApi.createShareLink`). Not orphaned.

---

## 3. POC Readiness Gap Analysis (Recommendations)

### UX/UI blockers

| Priority | Item |
|----------|------|
| **High** | **401 handling:** Axios interceptor **logs the user out on any 401**. Expired tokens and permission errors feel the same as “bad password”—consider **refresh tokens** or **targeted 401** handling so beta users are not kicked out unexpectedly. |
| **High** | **Silent failures:** `chatStore` and similar **swallow errors** on fetch (`catch { set loading false }`). Users see **empty states** without knowing if offline vs error. Add **toasts** or inline errors for critical fetches. |
| **High** | **Password reset:** “Change password” in-app is **email reset only**—fine if documented; confusing if users expect **in-app password change** without leaving the app. |
| **Medium** | **Payment success:** WebView + polling is acceptable for POC; **document** that **slow webhooks** trigger the “delayed success” alert path (`PaymentCheckoutScreen`). |
| **Medium** | **Loading coverage:** Many screens use **ActivityIndicator**; spot-check **Playdate/Pals** and **community** flows for **pull-to-refresh** and **empty states** when APIs return []. |
| **Low** | **RTL / i18n:** Large `i18n` surface—spot-check **new Pals strings** for missing keys before beta. |

### Security and data integrity

| Priority | Item |
|----------|------|
| **High** | **CORS** in `Program.cs` uses **`SetIsOriginAllowed(_ => true)`** with **credentials**—appropriate only for dev. **Lock to known app origins** before public beta API exposure. |
| **High** | **JWT key:** Development injects a **fallback JWT key** when missing. Ensure **production** always sets **`Jwt:Key`** via secret store; **never** ship fallback in release builds. |
| **High** | **`POST api/auth/promote-admin`** with a **plaintext secret** in code—**remove or protect** before any wide API exposure. |
| **High** | **Admin seeding:** `Program.cs` seeds **known admin emails** and **resets password hashes** in development—confirm this **does not run** in production configuration. |
| **Medium** | **No rate limiting** found on API—auth and posting endpoints are vulnerable to **credential stuffing** and **spam**. Add **ASP.NET rate limiting** or reverse-proxy limits. |
| **Medium** | **Stripe webhook** and other secrets must live in **configuration**, not repos—verify `appsettings` patterns for deployment. |
| **Low** | **Push tokens:** Ensure **token rotation** and **logout** always call **`DELETE /api/users/push-token`** (push service comments reference this; verify all logout paths). |

### Missing MVP features / “dead ends”

| Priority | Item |
|----------|------|
| **High** | **Dual booking systems:** **`BookingsController`** vs legacy **`ServiceRequests`** in **`RequestsController`/`PaymentsController`**. Product clarity: beta testers and support need **one** mental model. |
| **High** | **Medical record edit:** Backend supports **PUT** on medical records; mobile may be **create/delete-only**—users who mistype a record may feel **stuck** unless you add edit or delete-recreate guidance. |
| **Medium** | **Provider Stripe Connect:** If payouts are in scope, **`me/stripe-connect`** is unused in mobile—providers cannot self-serve Connect onboarding via app. |
| **Medium** | **Service-request reviews** endpoint and **client method** are unused—either **remove** or **surface** in UI for legacy jobs. |
| **Medium** | **Community admin** group management APIs exist without mobile UI—OK for POC if **only global groups** are seeded. |
| **Low** | **Teletriage single GET** by id—no detail screen linked; low impact unless you add sharing of assessments. |

### Infrastructure and beta operations

| Priority | Item |
|----------|------|
| **High** | **Development uses in-memory database** (`Program.cs`); production uses **SQL Server** with migrations. **POC environment must mirror production** data layer or you will see **different bugs** than beta users. |
| **Medium** | **Default API URL** in `server.ts` points to a **hosted test host**—beta builds **must** use **`EXPO_PUBLIC_API_URL`** consistently. |
| **Medium** | **SignalR** requires **WebSockets** and correct **TLS**; failures fall back to poor UX (empty chat). Document **firewall/proxy** requirements for testers. |
| **Low** | **Swagger** enabled globally in `Program.cs`—consider **restricting** in production. |

---

## Prioritized Checklist Before Inviting Testers

### High (must address or explicitly accept risk)

1. **Production secrets:** Remove or gate **`promote-admin`**, confirm **JWT**, **Stripe/Grow**, and **SMTP** secrets are **environment-only**; remove dev-only JWT fallback from release paths.
2. **CORS and Swagger:** Tighten **CORS**; restrict **Swagger UI** on public deployments.
3. **Database parity:** Run beta API against **real SQL Server + migrations**, not in-memory dev defaults.
4. **Error visibility:** Replace **silent catches** on primary flows (chat, bookings, community load) with user-visible error feedback.
5. **401 policy:** Revisit **global logout on 401** for long sessions during beta.
6. **API URL discipline:** Ensure all beta builds point to the **intended** API via **`EXPO_PUBLIC_API_URL`**.
7. **Consolidate onboarding:** Resolve **`apply` vs `onboarding`** duplicate provider creation paths.
8. **Product narrative:** Document for testers: **booking + Grow checkout** vs **Stripe PaymentsController** so support is not confused.

### Medium (strongly recommended)

1. **Rate limiting** on **auth** and **content** endpoints.
2. **Duplicate API cleanup:** `PetHealthController` **health-records** vs **`MedicalRecordsController`**; **PATCH vs PUT** notification read; **duplicate admin approve** routes.
3. **Medical records:** Add **edit** in app or clear **copy** explaining delete/recreate.
4. **Remove or use** `reviews/service-request` and **`createServiceRequestReview`** in client.
5. **Monitoring:** Basic **logging + alert** on 5xx and payment webhook failures for beta period.

### Low (nice to have)

1. **`mini-profile`** endpoint for lighter social cards if Pals UI needs it.
2. **Teletriage** detail by id if you add assessment history drill-down.
3. **Files DELETE/SAS** if you need client-side lifecycle management for blobs.

---

**Closing honesty:** The codebase is **feature-rich** for a POC—almost **too rich**—with **overlapping domains** (bookings vs service requests, duplicate medical-record routes, two provider onboarding posts). For a **credible beta**, prioritize **operational hardening** (secrets, CORS, rate limits, DB parity, error UX) and **API surface clarity** over adding new features.
