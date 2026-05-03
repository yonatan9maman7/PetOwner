# PetOwner Mobile — Explore & Discover: Production Readiness Review

**Purpose:** Handoff for QA, another engineer, or an AI model. Describes what is in good shape, what is risky or confusing for real users, and concrete follow-ups before wide client testing.

**Scope:** Map-based **Explore** tab (`ExploreScreen.tsx`), list-based **Discover** (`DiscoverScreen.tsx`), shared map API usage, location, and linked flows (dog parks, playdates on map, beacons).

**Last reviewed (codebase state):** May 3, 2026.

---

## 1. Executive summary

**Explore** is a large, carefully engineered map screen (marker pooling, debounced viewport fetches, abort guards, RTL isolation for Android Google Maps, comments documenting past MapKit crashes). That work is a **strength** for stability.

**Gaps for production** are mostly **product/UX consistency** (hardcoded copy, wrong geography in APIs), **silent failure modes** (errors that look like “empty results”), **in-flight request races** on Discover, and a few **navigation/focus edge cases** on Explore.

**Discover** is visually polished but treats **all fetch failures like empty lists** and does **not cancel** superseded `fetchPins` calls; Explore does better on network hygiene for map pins.

---

## 2. File map

| Area | Primary file(s) |
|------|------------------|
| Map Explore tab | `src/pet-owner-mobile/src/screens/explore/ExploreScreen.tsx` (~2.6k lines) |
| Business list | `src/pet-owner-mobile/src/screens/explore/DiscoverScreen.tsx` |
| Map markers / pooling | `ExploreMapMarkers.tsx`, `mapCollision.ts` |
| Debug logging (off by default) | `exploreMapDiag.ts` — `EXPLORE_MAP_DIAG_ENABLED = false` → zero-cost no-op |
| API | `src/pet-owner-mobile/src/api/client.ts` — `mapApi.fetchPins(filters?, signal?)` |
| Base URL | `src/pet-owner-mobile/src/config/server.ts` — `EXPO_PUBLIC_API_URL`, fallback `REMOTE_URL` |

---

## 3. Explore (`ExploreScreen.tsx`)

### 3.1 What is already strong

- **Viewport pin refresh:** Debounced `onRegionChangeComplete`, suppression after programmatic moves and marker taps, deduping “tiny” region moves — reduces server load and native map churn.
- **Cancellation:** `pinsAbortRef` aborts the previous `GET /map/pins` when a new one starts; stale generation guards avoid applying old responses.
- **Unfocused safety:** `exploreScreenFocusedRef` prevents committing pin updates when the screen is not focused (reduces native crashes from off-screen updates).
- **Marker pool:** Stable marker slots / offscreen coordinates — intentional design to avoid remove/add annotation storms on iOS.
- **User location:** Throttling GPS updates (~10 m) and constant accuracy circle radius — documented as crash mitigation for MapKit.
- **Primary pin fetch errors:** Uses `showApiErrorToast` + `getNormalizedApiError` (except 401), keeps existing pins visible.
- **Android + RTL:** `AndroidMapRtlIsolation` forces LTR subtree for the map so gestures still work after language toggles.

### 3.2 Production / UX issues (concrete)

**A. Hardcoded Hebrew UI (i18n gap)**  
Several user-visible strings are **not** routed through `useTranslation` / `TranslationKey`:

- Dog parks chip and filter panel label: `גינות כלבים` (appears even when `isRTL` is false in some rows — e.g. green chip in filter panel).
- Dog park card: section title `גינות כלבים`, buttons `נווט`, `צ'ק-אין`.
- Empty state for dog parks when `showDogParksOnly`: Hebrew vs English branches exist for one message but other strings stay Hebrew-only in LTR builds.

**Impact:** English-first users (or mixed households) see Hebrew fragments; App Store review / support noise; inconsistent with the rest of the app’s i18n approach.

**B. Playdate card: untranslated English**  
Line ~1716: `{selectedPlaydate.goingCount} going` — literal English “going”, not `t(...)`.

**C. Dog park check-in: hardcoded city for beacon**  
`palsApi.startBeacon` is called with `city: isRTL ? "תל אביב" : "Tel Aviv"`. Real check-ins outside that metro will still report Tel Aviv / תל אביב.

**Impact:** Wrong locality in Pals/beacon data for production users; should use reverse geocode, park metadata, or user profile city.

**D. Silent failures (no user feedback)**

| Call site | Behavior |
|-----------|----------|
| `mapApi.getServiceTypes()` | `.catch(() => {})` — filter chips may stay empty; user is not told. |
| Playdate pins `fetchPlaydatePins` | `.catch(() => {})` — playdate layer silently empty. |
| Dog parks `fetchDogParks` | `.catch` sets `[]` — same as real empty; indistinguishable from network error. |
| Location permission / `watchPositionAsync` | Outer `catch {}` — no guidance if permission denied or GPS errors. |
| “My location” button | `getCurrentPositionAsync` errors swallowed — spinner stops with no explanation. |

**E. `focusProviderId` navigation (deep link / return from profile)**  
The `useEffect` that focuses a provider from `route.params.focusProviderId` depends on `[route.params?.focusProviderId, t, beginProgrammaticMapMove, commitPins]` but **not** on `pins`.

**Why this matters:** Logic branches on `pins.length` at effect time. Today the code compensates by issuing an **unfiltered** `fetchPins()` when `pins` is empty. If that helper fetch fails or races oddly with the normal initial `loadPins()`, the map may never focus the provider even though a later pin set would contain them.

**Recommendation:** Either add a controlled retry when `focusProviderId` is set and pin not found after loads settle, or include `pins` (or a “pins load generation”) in dependencies with a ref to avoid duplicate fetches.

**F. Playdate pin fetch and focus**  
`fetchPlaydatePins` `.then(setPlaydatePins)` does not check `exploreScreenFocusedRef`. Low severity, but inconsistent with pin fetch.

**G. Empty “no providers” vs error**  
Explore correctly toasts on main pin fetch failure; users still see “no providers” empty card for **filtered** empty results — by design. Combined with silent dog-park errors, dog park mode can look “broken” with no toast.

**H. Complexity / testing surface**  
The screen merges: map pins, dog park layer, playdate layer, filters, WhatsApp deep links, favorites, cluster chooser modal, filter sheet, Report Lost, Discover FAB, location. **Client beta** should include explicit test matrices: RTL, Android map gestures, permission denied, airplane mode, `focusProviderId`, dog parks toggle, playdate toggle.

---

## 4. Discover (`DiscoverScreen.tsx`)

### 4.1 What is already strong

- Clear layout: search, category chips, animated cards, pull-to-refresh, FAB back to map.
- **Business-only mode** filters out individual-service chips via `INDIVIDUAL_SERVICE_CHIP_IDS`.
- **Viewport params** from Explore (`latitude`, `longitude`, `radiusKm`) align list results with map context.
- Service label mapping aligns with Explore’s `SERVICE_I18N_MAP` (with small extensions e.g. grooming, vet).

### 4.2 Production / behavior issues

**A. Errors disguised as “no businesses”**  
`loadProviders` uses:

`...catch(() => setProviders([]))`

So **network failures, 5xx, timeouts** produce the same UI as a real empty result (`noBusinessesFound` copy). Users cannot tell “try again” vs “nothing here”. Explore does better for its main map fetch.

**B. No abort / stale response control**  
Rapid typing (debounced search) or quick filter changes can complete **out of order**: an older `fetchPins` may resolve after a newer one and overwrite `providers`. Explore uses `AbortController` + generation counters for map pins; Discover should mirror that pattern for `loadProviders`.

**C. Silent `getServiceTypes` failure**  
Same as Explore: `.catch(() => {})` — chips may be incomplete with no feedback.

**D. Pull-to-refresh tied to global `loading`**  
`refreshing={loading}` and `loadProviders` sets `loading` true at start. For non-empty lists this is OK; for empty list, `ListEmpty` also keys off `loading` — behavior is acceptable but worth QA attention (double spinners / flicker).

**E. Card top row: comment vs content**  
The row is described internally as “Category + distance” but displays **₪ minRate + perHour** in `distancePill`-styled UI. Not a crash, but **misleading naming**; QA/docs should not assume true distance is shown (unless product intends to add distance later).

**F. Category filter implementation**  
`filteredProviders` uses `p.services.toLowerCase().includes(selectedCategory)`. Type says `services: string`; if API ever returns missing/null at runtime, this throws — low probability but worth defensive coding before production hardening.

---

## 5. Configuration & backend

- **`server.ts`:** Production builds should set **`EXPO_PUBLIC_API_URL`** via EAS/env; dev warns if unset and falls back to Railway URL in `__DEV__`.
- **Map diagnostics:** `exploreMapDiag.ts` is **disabled** for production (`EXPLORE_MAP_DIAG_ENABLED = false`); safe for shipping. Enable only when debugging native map crashes.

---

## 6. Suggested priority order (for the next implementer)

**Status (May 2026):** Items 1–6 below have been implemented in code (`ExploreScreen.tsx`, `DiscoverScreen.tsx`, `i18n/index.ts`). Remaining work is mostly QA using section 7.

1. ~~**Discover:** Stop swallowing errors — toast or inline error + retry; add **AbortController** (or request id) to `loadProviders`.~~
2. ~~**Explore + Discover:** Surface `getServiceTypes` failure (toast or “filters unavailable” banner).~~
3. ~~**Explore i18n:** Replace hardcoded dog park / navigate / check-in strings with translation keys; fix playdate “going” string.~~
4. ~~**Dog park beacon:** Remove hardcoded Tel Aviv; derive city from server park DTO or geocode~~ (address parsed: last segment after comma via `cityHintFromParkAddress`).
5. ~~**Location:** If permission denied, show one-line inline state or toast on Explore~~ (banner + locate-button toast on GPS error).
6. ~~**Explore `focusProviderId`:** Harden effect dependencies / retry when pin missing after loads complete.~~

---

## 7. Quick test checklist (pre–client pilot)

- [ ] Explore: pan/zoom iOS + Android, RTL on/off, dog parks layer on/off, playdates on/off.  
- [ ] Explore: airplane mode during pin load — toast appears, map not wiped.  
- [ ] Explore: deny location — map usable; locate button behavior acceptable.  
- [ ] Explore: navigate with `focusProviderId` from profile — reliable focus.  
- [ ] Discover: slow network + fast search typing — results match last query.  
- [ ] Discover: kill network — user sees error, not “no businesses”.  
- [ ] Dog park check-in — beacon/community reflect correct place; city field sanity.  

---

*End of document.*
