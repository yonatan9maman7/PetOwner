# Final code health check — `pet-owner-mobile`

Proactive QA scan of the React Native app (and relevant client patterns) before human beta. **No feature code was changed**; this document is actionable technical debt and risk inventory.

**Scope:** `src/pet-owner-mobile/src/**` (Angular/web clients excluded).

---

## 1. Unhandled async, errors, and silent failures

### 1.1 Empty `catch {}` blocks (silent failures)

These swallow **all** errors (network, 500, validation). Users see **no** toast/alert; state may be wrong; debugging in production is blind.

| Area | Files / pattern |
|------|-----------------|
| **Bookings list** | [`MyBookingsScreen.tsx`](src/pet-owner-mobile/src/screens/profile/MyBookingsScreen.tsx) — `fetchBookings`: `catch {}` hides load failures (empty list vs error indistinguishable). |
| **Community feed & groups** | [`CommunityScreen.tsx`](src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx) — `loadFeed`, `loadGroups`, `onRefresh*` paths: empty catch; **like** (`handleToggleLike`) and **delete** (`handleDelete`): empty catch — failed like/delete silently reverts UI inconsistency risk. |
| **Explore / map** | [`ExploreScreen.tsx`](src/pet-owner-mobile/src/screens/explore/ExploreScreen.tsx) — some `catch {}` on location/map flows (lines ~246, ~625 per scan): errors disappear. |
| **Provider profile** | [`ProviderProfileScreen.tsx`](src/pet-owner-mobile/src/screens/explore/ProviderProfileScreen.tsx) — empty catches on async work. |
| **Group detail** | [`GroupDetailScreen.tsx`](src/pet-owner-mobile/src/screens/community/GroupDetailScreen.tsx) — multiple `catch {}`. |
| **Admin dashboard** | [`AdminDashboardScreen.tsx`](src/pet-owner-mobile/src/screens/profile/AdminDashboardScreen.tsx) — several `catch {}` on seed/admin actions. |
| **My Pets / health** | [`VaccinesSection.tsx`](src/pet-owner-mobile/src/screens/pets/MyPets/sections/VaccinesSection.tsx), [`VaultSection.tsx`](src/pet-owner-mobile/src/screens/pets/MyPets/sections/VaultSection.tsx), [`WeightSection.tsx`](src/pet-owner-mobile/src/screens/pets/MyPets/sections/WeightSection.tsx) — empty catches around persistence/upload flows. |
| **Triage** | [`TriageScreen.tsx`](src/pet-owner-mobile/src/screens/pets/TriageScreen.tsx) — `catch {}`. |
| **Pals / playdates** | [`LiveBeaconsList.tsx`](src/pet-owner-mobile/src/screens/community/pals/LiveBeaconsList.tsx), [`PlaydateEventsList.tsx`](src/pet-owner-mobile/src/screens/community/pals/PlaydateEventsList.tsx), [`PlaydateEventDetailScreen.tsx`](src/pet-owner-mobile/src/screens/community/pals/PlaydateEventDetailScreen.tsx), [`StartBeaconSheet.tsx`](src/pet-owner-mobile/src/screens/community/pals/StartBeaconSheet.tsx), [`CommentsBottomSheet.tsx`](src/pet-owner-mobile/src/screens/community/CommentsBottomSheet.tsx) — empty catches. |
| **Playdate RSVP UI** | [`PlaydateEventCard.tsx`](src/pet-owner-mobile/src/screens/community/pals/PlaydateEventCard.tsx) — `rsvp`: `catch {}` with **no user feedback** on failure (buttons re-enable; user assumes success). |
| **Stores** | [`notificationStore.ts`](src/pet-owner-mobile/src/store/notificationStore.ts) — `fetchUnreadCount`, `markRead`, `markAllRead`, `removeNotification`: `catch {}` (badge/read state can drift). [`themeStore.ts`](src/pet-owner-mobile/src/store/themeStore.ts) — storage read/write: `catch {}` (acceptable for non-critical prefs, but still opaque). [`favoritesStore.ts`](src/pet-owner-mobile/src/store/favoritesStore.ts) — `fetchIds` silent by design; document or surface degraded mode. |

- [ ] **Action:** Replace empty catches with at least: `Alert` for user-visible flows, centralized logger (e.g. Sentry) in production, and **differentiate** 401 (handled by axios interceptor) vs real failures.

### 1.2 `console.*` vs user-visible errors

| Finding | Risk |
|--------|------|
| [`client.ts`](src/pet-owner-mobile/src/api/client.ts) — `medicalApi.addVaccination` logs `console.error` then **rethrows**. Callers may still not show API `response.data` message; users only see generic alerts if the screen catches. | High for vaccination UX. |
| [`config/server.ts`](src/pet-owner-mobile/src/config/server.ts) — `console.warn` if API base URL missing (dev visibility only). | Low. |

- [ ] **Action:** Ensure vaccination/medical screens map axios `response.data.message` (or ProblemDetails) to `Alert`; reduce reliance on console in production builds.

### 1.3 Stores using `catch (e: any)` / weak error messages

| File | Issue |
|------|--------|
| [`petsStore.ts`](src/pet-owner-mobile/src/store/petsStore.ts) | Uses `e.message`; Axios errors often need `e.response?.data?.message`. Users may see useless text. |
| Auth-adjacent | [`authStore.ts`](src/pet-owner-mobile/src/store/authStore.ts) — intentional `catch (() => {})` on SignalR/push bootstrap; **failures are silent** (no “chat/notifications unavailable” banner). |

- [ ] **Action:** Normalize API errors with a small `getApiErrorMessage(error)` helper; consider a non-blocking “connection issue” banner when hubs fail to start.

### 1.4 Notification prefs save

| File | Issue |
|------|--------|
| [`notificationPrefsStore.ts`](src/pet-owner-mobile/src/store/notificationPrefsStore.ts) | `save()` has `try/finally` but **no `catch`**: unhandled rejection can crash the flow; also **no user feedback** on failure. |

- [ ] **Action:** Catch, set error state, `Alert`, and optionally roll back `dirty` flag.

---

## 2. Missing UI loading states & double-submit risk

### 2.1 Generally good patterns (use as reference)

- [`CommentsBottomSheet.tsx`](src/pet-owner-mobile/src/screens/community/CommentsBottomSheet.tsx), [`GroupDetailScreen.tsx`](src/pet-owner-mobile/src/screens/community/GroupDetailScreen.tsx), [`BookingScreen.tsx`](src/pet-owner-mobile/src/screens/explore/BookingScreen.tsx), [`WriteReviewScreen.tsx`](src/pet-owner-mobile/src/screens/explore/WriteReviewScreen.tsx) (store `submitting`), [`ProviderOnboardingScreen.tsx`](src/pet-owner-mobile/src/features/provider-onboarding/ProviderOnboardingScreen.tsx), auth screens: **submitting/loading** disables primary actions.

### 2.2 Gaps and risks

| Location | Issue |
|----------|--------|
| **Community like / delete** | [`CommunityScreen.tsx`](src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx) — `handleToggleLike` / `handleDelete`: **no per-post `loading` or debounce**; rapid taps can issue duplicate requests; optimistic UI + silent `catch` = confusing state. |
| **Chat send** | [`ChatRoomScreen.tsx`](src/pet-owner-mobile/src/screens/messages/ChatRoomScreen.tsx) — `handleSend` clears input immediately; **no explicit “sending”** flag. Second send blocked while `text` empty, but **race**: slow `sendMessage` + failure restores text; user may spam send on flaky network if UX is unclear. Low severity; optional `sending` state + disable send button. |
| **Messages list** | [`MessagesScreen.tsx`](src/pet-owner-mobile/src/screens/messages/MessagesScreen.tsx) — `useEffect(() => { startConnection(); }, [])` with **no loading/error** if SignalR fails (connection left `null`; `sendMessage` later rejects). |
| **My bookings fetch** | [`MyBookingsScreen.tsx`](src/pet-owner-mobile/src/screens/profile/MyBookingsScreen.tsx) — loading for initial fetch exists, but **silent** `catch` means spinner stops with **no error UI**. |
| **Explore** | [`ExploreScreen.tsx`](src/pet-owner-mobile/src/screens/explore/ExploreScreen.tsx) — has map `loading` overlay; still verify **filter changes** don’t stack concurrent `fetchPins` without cancellation (stale results possible). |
| **Payment WebView** | [`PaymentCheckoutScreen.tsx`](src/pet-owner-mobile/src/screens/profile/PaymentCheckoutScreen.tsx) — good `webViewLoading` / `paymentPhase`; polling uses `catch` quietly (acceptable for poll loop). |

- [ ] **Action:** Add **per-id** pending state for like/delete; **disable** or throttle duplicate actions; add **inline error** on failed list loads (bookings, feed).

---

## 3. Memory leaks, subscriptions, and cleanup

### 3.1 Good examples

- [`ChatRoomScreen.tsx`](src/pet-owner-mobile/src/screens/messages/ChatRoomScreen.tsx) — `setActiveChat` cleanup on unmount; `BackHandler` and `Keyboard` listeners removed.
- [`PaymentCheckoutScreen.tsx`](src/pet-owner-mobile/src/screens/profile/PaymentCheckoutScreen.tsx) — `mountedRef` / `pollCancelledRef` guard async polling.
- [`pushService.ts`](src/pet-owner-mobile/src/services/pushService.ts) — `attachNotificationListeners` returns `remove()`.
- [`App.tsx`](src/pet-owner-mobile/App.tsx) — notification tap listener **cleanup returned** from `useEffect`.

### 3.2 Risks

| Location | Issue |
|----------|--------|
| **`App.tsx` cold-start routing** | `Notifications.getLastNotificationResponseAsync().then(...)` uses **`setInterval(..., 100)`** until `navigationRef.isReady()` — **interval is never cleared** if `isReady()` never becomes true (bug/misconfiguration). **Potential infinite timer** + repeated navigation attempts. |
| **`MessagesScreen`** | `useEffect(() => { startConnection(); }, [])` — **no cleanup**. Relies on **module singleton** [`signalr.ts`](src/pet-owner-mobile/src/services/signalr.ts) and logout `stopConnection`. Acceptable for a global chat hub, but **duplicated** with `authStore` `startHubs()` → risk of **assumptions** if lifecycle changes. |
| **SignalR notification hub** | [`notificationStore.ts`](src/pet-owner-mobile/src/store/notificationStore.ts) — `startNotificationHub` on failure sets `hubConnection = null` with **no user-visible retry**; listeners on store are OK (module-level). |
| **`addIncomingMessage` → `fetchConversations`** | [`chatStore.ts`](src/pet-owner-mobile/src/store/chatStore.ts) — `void get().fetchConversations()` on new conversation: **unbounded parallel refetches** if many messages arrive quickly (performance smell, not strictly a leak). |

- [ ] **Action:** Clear cold-start `setInterval` on unmount or after max attempts; document **single owner** for `startConnection` (auth vs screen). Consider debouncing `fetchConversations` from SignalR.

---

## 4. Dead code, `any`, and TypeScript rigor

### 4.1 Widespread `any` (runtime crash risk when API shape drifts)

High-churn / high-risk files:

- [`ProviderEditScreen.tsx`](src/pet-owner-mobile/src/screens/profile/ProviderEditScreen.tsx) — map press, slots, `catch (e: any)`, `Ionicons` name casts, web `onChange` events: **`any` throughout**; regressions won’t be caught at compile time.
- [`BookingScreen.tsx`](src/pet-owner-mobile/src/screens/explore/BookingScreen.tsx) — navigation `any`, `selectedRate as any`, `rate: any` in map.
- [`CommunityScreen.tsx`](src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx) — `t: (k: any)`, `as any` on `postsApi.create` payload.
- [`ExploreScreen.tsx`](src/pet-owner-mobile/src/screens/explore/ExploreScreen.tsx) — `region: any`, translation key `as any`.
- [`AddPetScreen.tsx`](src/pet-owner-mobile/src/screens/pets/AddPetScreen.tsx) — large screen; `colors: any`, `labelKey as any`.
- [`MyStatsScreen.tsx`](src/pet-owner-mobile/src/screens/profile/MyStatsScreen.tsx) — repeated `colors: any`, `t: (k: any)`.
- Pals: [`StartBeaconSheet.tsx`](src/pet-owner-mobile/src/screens/community/pals/StartBeaconSheet.tsx), [`PlaydateEventCard.tsx`](src/pet-owner-mobile/src/screens/community/pals/PlaydateEventCard.tsx) — `as any` for RSVP enums / pets.
- [`client.ts`](src/pet-owner-mobile/src/api/client.ts) — `form.append(..., { uri, name, type } as any)` (React Native FormData limitation); `updateVaccination(..., data: any)` — **API typing debt**.

- [ ] **Action:** Tighten `TranslationKey` at boundaries; replace `any` DTOs with `types/api` models; use `unknown` + narrowing in catches.

### 4.2 Implicit / weak typing elsewhere

- Navigation: pervasive `useNavigation<any>()`, `useRoute<any>()` — **typo’d route params = undefined at runtime**.
- **No ESLint** in `package.json` scripts for unused imports / `@typescript-eslint/no-explicit-any` — **technical debt** to add in CI.

### 4.3 Possible dead / redundant paths

- **Dual payment stacks:** Stripe (`StripePaymentService` / web) vs **Grow** in mobile checkout — ensure product docs clarify; not “dead” but **confusion risk** for testers.
- **Deprecated alias** in [`client.ts`](src/pet-owner-mobile/src/api/client.ts): `petHealthApi` → `medicalApi` — grep for lingering `petHealthApi` imports.

- [ ] **Action:** `rg "petHealthApi"` and remove stragglers; add `lint` script.

---

## 5. Critical path summary (beta readiness)

| Priority | Item |
|----------|------|
| **P0** | Replace **silent** `catch {}` on money/booking/health flows with user-visible errors + logging. |
| **P0** | **App.tsx** cold-start `setInterval` — add **cleanup** or **max retries**. |
| **P1** | Community **like/delete** — prevent duplicate taps; surface errors. |
| **P1** | **PlaydateEventCard** RSVP failure — show `Alert` (currently silent). |
| **P1** | **notification prefs `save`** — handle errors and UX. |
| **P2** | Normalize **Axios** error messages in stores (`petsStore`, screens). |
| **P2** | **ESLint + stricter TS** for `any` and unused imports in CI. |
| **P3** | Document **SignalR** ownership (auth bootstrap vs `MessagesScreen`) and failure UX. |

---

*Generated by automated scan (grep + targeted file reads). Re-run after major refactors.*
