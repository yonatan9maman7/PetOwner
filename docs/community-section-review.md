# PetOwner Mobile — Community Section: Technical & UX Review

**Purpose:** Handoff document for product, design, or another AI/engineering pass. Describes the current implementation, data flows, gaps, and a prioritized improvement backlog.

**Scope:** `pet-owner-mobile` Community tab + stack, related API (`PetOwner.Api`), and cross-links (Pals, posts, playdates).  
**Last reviewed (codebase state):** February 2026.

---

## 1. Executive summary

The **Community** experience is a **single mega-screen** (`CommunityScreen.tsx`, **~4,400+ lines**) with **seven in-screen tabs** (Feed, Meetups, Dog parks, Groups, Q&A, Events, Lost & SOS). It mixes **global social feed** (`/posts/feed`), **community-specific APIs** (`/community/*`), **playdates** (`/playdates`), **Pals beacons** (`/pals/beacons`), **Google Places–backed dog parks**, and **large inline modals** (composer, playdate create, group create, etc.).

**Strengths:** Cohesive brand (navy/white), RTL support (`rowDirectionForAppLayout`, `rtlText`/`rtlRow`), Hebrew/English via `useTranslation` + scoped `cm_*` keys, dashboard counts surfaced as **tab badges**, park check-in dual path (**community** `DogParkCheckIn` + **Pals** `PlaydateBeacon`).

**Risks:** **Maintainability** (one file owns most of Community UX), **cognitive load** (seven tabs + search + feed filters), **mixed mental models** (global feed vs group posts vs meetups), **partial dead code** (`CommunityDashboard.tsx` no longer mounted after UI strip-down).

---

## 2. Navigation & entry points

| Layer | Implementation |
|--------|-----------------|
| Tab | `AppNavigator.tsx` — tab **“Community”** (`CommunityStackScreen`). |
| Stack | `CommunityStack` — `headerShown: false` on all screens. |
| Root | `CommunityMain` → `CommunityScreen`. |
| Pushed screens | `GroupDetail`, `PalProfile`, `PlaydatePrefs`, `LiveBeaconDetail`, `PlaydateEventDetail`, `CreatePlaydateEvent`. |

**Files:** `src/pet-owner-mobile/src/navigation/AppNavigator.tsx`, `src/pet-owner-mobile/src/screens/community/*.tsx`.

---

## 3. In-screen tabs (`MainTab`)

Order in the horizontal `ScrollView` (unchanged):

1. **feed** — Ranked/global post feed + filters + composer entry.  
2. **playdates** — `playdatesApi.list`, cards, RSVP, comments sheet.  
3. **parks** — Google nearby parks + **beacons** (`palsApi.getActiveBeacons`) + check-in ( **`communityApi.startParkCheckIn`** + **`palsApi.startBeacon`** ).  
4. **groups** — `communityApi.getGroups`, local filter, join/leave, **admin FAB** create group.  
5. **qa** — Filtered question posts / demo subset + “answer” flow.  
6. **events** — Reuses `playdates` list with different copy/section.  
7. **lostSos** — Posts filtered for SOS/lost categories.

**Badge counts (tab overlays):** Derived from `communityApi.getDashboard()`, local `playdates`, `groups`, `posts`, `beacons`, etc. (see `renderTopTabs` in `CommunityScreen.tsx`).

---

## 4. Primary UI blocks (current)

| Block | Role |
|--------|------|
| `BrandedAppHeader` | Logo row. |
| Full-width **search pill** | Opens `CommunitySearchModal` (posts/groups/meetups/parks search). Placeholder from `cm_search_placeholder`. |
| **Circle tab rail** | Tab switch + numeric badges. |
| **Tab body** | One of: `FlatList`/`ScrollView` per tab + modals anchored in same screen. |

**Removed in recent iterations (for context):** Large navy “hero” banner; standalone `CommunityDashboard` “Summary” strip (counts moved to tab badges).

---

## 5. Data & API map

### 5.1 Mobile client (`src/pet-owner-mobile/src/api/client.ts`)

| API object | Endpoints used by Community flows |
|------------|-------------------------------------|
| `postsApi` | `GET /posts/feed`, create/delete/like/helpful/save/report/comments, SOS sighting, resolve SOS. |
| `communityApi` | `GET /community/dashboard`, `GET /community/search`, `GET/POST/DELETE` groups & join, `GET/POST` group posts & likes, comments, **`POST /community/park-check-ins`**, **`DELETE /community/park-check-ins/me`**, admin `POST /community/admin/groups`. |
| `playdatesApi` | List, RSVP, comments, create/cancel as used from Community. |
| `palsApi` | Beacons start/active/end, prefs (elsewhere in stack). |
| `petsApi` / `filesApi` | Pets, image upload for posts. |

**Auth:** `apiClient` request interceptor attaches `Authorization: Bearer <token>` from `useAuthStore`.

### 5.2 Backend (`PetOwner.Api`)

| Controller | Relevant routes |
|-------------|-----------------|
| `CommunityController` (`/api/community`) | Dashboard, search, park check-ins, groups CRUD/join, group posts + likes + comments, **admin** group create/update/delete. |
| `PostsController` | Feed, reactions, reports, saved posts, SOS helpers. |
| `PlaydatesController` | Events/meetups. |
| `PalsController` | Beacons (also used from Community parks). |
| `UsersController` | `/users/me/community-prefs` (privacy). |

---

## 6. Supporting modules & files

| Path | Notes |
|------|--------|
| `CommunityScreen.tsx` | Main hub; modals, lists, handlers, styles (`getStyles`). |
| `components/CommunitySearchModal.tsx` | Full-screen search; `SafeAreaView` for notch. |
| `components/CommunityDashboard.tsx` | **Currently unused** after tab-badge refactor — candidate delete or repurpose. |
| `GroupDetailScreen.tsx` | Single group + posts. |
| `CommentsBottomSheet.tsx`, `commentTree.ts` | Threaded comments. |
| `utils/formatCommunity.ts` | Distance/time copy. |
| `i18n/en.json`, `i18n/he.json` (under `screens/community/i18n/`) | Merged into global `TranslationKey` via `src/i18n/index.ts`. |
| `pals/*` | Pals/playdates/beacon flows when navigated from Community stack. |

---

## 7. Internationalization & copy

- **Global:** `useTranslation()` → `t("…")` for many strings.  
- **Community-only keys:** `cm_*` in `screens/community/i18n/*.json`.  
- **Large inline dictionaries:** `HE` / `EN` objects inside `CommunityScreen.tsx` for `copy("…")` — **duplicates** some concepts with `t()`; increases drift risk.

**Improvement:** Consolidate on `t()` + JSON keys, or a single `communityCopy.ts` module.

---

## 8. RTL / layout

- `rowDirectionForAppLayout(isRTL)` for rows.  
- `rtlText`, `rtlRow`, `rtlInput` from `useTranslation`.  
- Tab badge position mirrors for RTL (`left` vs `right`).  
- Search bar and pills follow `appRowDirection`.

---

## 9. Notable product/UX behaviors

| Topic | Behavior |
|-------|----------|
| **Feed empty state** | Can fall back to **demo posts** when API returns empty (explicit demo mode flag). |
| **Park check-in** | **Community** row is authoritative for “server check-in”; **beacon** adds live presence + notifications; local fallback if both fail. |
| **Groups** | Header is title + subtitle only; **Create Group** is **admin-only FAB** (anchored bottom-left with safe-area inset); list bottom padding avoids overlap. |
| **Search** | Modal search hits API for remote results beyond local arrays (threshold in screen logic). |

---

## 10. Technical debt & quality

| Issue | Severity | Detail |
|-------|----------|--------|
| **Monolithic `CommunityScreen`** | High | ~4.4k lines: hard to test, review, and split by feature. |
| **Unused `CommunityDashboard`** | Low | Orphan component after UI change. |
| **Duplicate copy systems** | Medium | `t()` vs `copy()` / HE+EN tables. |
| **Seven tabs in one horizontal row** | Medium | Discoverability vs clutter; long Hebrew labels wrap. |
| **Events vs Meetups** | Medium | Overlap in data model and user mental model. |
| **Modals in one screen** | Medium | Many `Modal` instances; risk of z-order and state coupling. |

---

## 11. Suggested improvements (for roadmap / another AI)

### P0 — Quick wins

1. **Delete or reuse `CommunityDashboard.tsx`** to avoid confusion.  
2. **Extract tab bodies** into `CommunityFeedTab.tsx`, `CommunityGroupsTab.tsx`, etc., each <300 lines, props-only.  
3. **Document tab→API matrix** in README next to this file (one table).  
4. **Analytics hooks** (tab viewed, check-in success, group join) — if product uses analytics SDK.

### P1 — UX & clarity

5. **Reduce tabs or nest** (e.g. “More” sheet for Events + Lost/SOS + Q&A) to shorten horizontal scroll.  
6. **Unify Events vs Meetups** — single tab with segmented control, or clear copy why both exist.  
7. **Feed vs Groups** — onboarding tooltip: global feed vs group-only posts in `GroupDetail`.  
8. **Search results** — navigate to entity (post detail, group detail) on row tap; today may be text-only list.  
9. **Badge semantics** — tooltip or `accessibilityHint` explaining what each number means (especially Feed = “active nearby” proxy).  
10. **Empty states** — per-tab illustrations + one primary CTA (e.g. “Add pet”, “Enable location”, “Join Pals”).

### P2 — Platform & performance

11. **List virtualization** — ensure all long lists use `FlatList`/`FlashList` with stable keys (some tabs use `ScrollView` + `.map`).  
12. **Suspense / loading** — skeleton consistency across tabs.  
13. **Prefetch** — on tab hover/focus, prefetch dashboard + next tab data.  
14. **Offline** — queue check-in / post create when network returns.  
15. **Backend:** pagination for `GET /community/groups/{id}/posts` and feed if not already capped in UI.

### P2 — Trust & safety

16. **Report/block** flows already on cards — ensure parity on **group posts** in `GroupDetailScreen`.  
17. **Moderation queue** (admin) for `CommunityReport` if not surfaced in mobile admin.

---

## 12. Prompt snippet for another AI

You can paste:

> Read `docs/community-section-review.md` and `src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx`. Propose a refactor plan to split Community into feature tabs with shared hooks (`useCommunityDashboard`, `useGroupList`), remove duplicate i18n (`copy` vs `t`), and improve navigation between global feed and group-scoped content. Preserve RTL and existing API contracts.

---

## 13. File checklist (quick grep targets)

```
src/pet-owner-mobile/src/screens/community/CommunityScreen.tsx   # main
src/pet-owner-mobile/src/screens/community/GroupDetailScreen.tsx
src/pet-owner-mobile/src/screens/community/components/CommunitySearchModal.tsx
src/pet-owner-mobile/src/api/client.ts                           # postsApi, communityApi, palsApi, playdatesApi
src/PetOwner.Api/Controllers/CommunityController.cs
src/PetOwner.Api/Controllers/PostsController.cs
src/PetOwner.Api/Controllers/PalsController.cs
src/pet-owner-mobile/src/navigation/AppNavigator.tsx             # CommunityStack
```

---

*Generated from repository analysis; adjust dates and line counts if the codebase diverges.*
