# QA and E2E — findings and follow-up plan

**Run date:** 2026-04-21 (local workspace)

This document summarizes automated tests added or executed for the PetOwner repo, current pass/fail status, and **gaps** that still need work for a production-grade QA posture.

---

## Current automated results (all passing)

| Suite | Command | Result |
|--------|---------|--------|
| **.NET API unit tests** | `dotnet test PetOwner.sln` | **5 passed** (`PetOwner.Api.Tests`) |
| **React Native (Jest)** | `npm test` in `src/pet-owner-mobile` | **11 passed** (3 files) |
| **Expo Web E2E (Playwright)** | `npm run test:e2e` in `src/pet-owner-mobile` | **2 passed** (`e2e/smoke.spec.ts`) |

There were **no failing automated tests** after the Jest configuration fix described below.

---

## What was fixed during this QA pass (important for CI)

### Jest + Axios + Expo `ReadableStream`

**Symptom:** `reviewsStore` tests crashed the Jest worker with `TypeError: Cannot cancel a stream that already has a reader` while loading Axios (fetch adapter self-test vs Expo’s stream polyfill).

**Fix applied:**

1. **`jest.config.js`** — Spread `jest-expo/jest-preset` explicitly so we can prepend a setup file and merge `moduleNameMapper` with the preset (including Expo vector-icon aliases).
2. **`jest.setup-fetch-guard.js`** — Runs **first** in `setupFiles` and deletes `globalThis.fetch` / `Request` / `Response` so Axios skips the fetch adapter probe under Jest (Node 22’s native fetch triggers it).
3. **`moduleNameMapper`** — Map `axios` to `axios/dist/node/axios.cjs` for consistent Node behavior in tests.
4. **`reviewsStore.test.ts`** — Rejection value now includes `isAxiosError: true` so `getApiErrorMessage` matches Axios-shaped errors (aligned with `axios.isAxiosError`).

---

## What is *not* covered yet (treat as “failing the full QA bar”)

These items are **not** failing tests in CI today; they are **missing coverage** or **unverified flows**. Address them to claim full QA/E2E for the whole product.

### 1. Mobile native E2E (iOS / Android)

- **Gap:** Playwright only drives **Expo Web**. It does **not** validate React Native native views, gestures, push notifications, biometrics, maps, or OS-specific behavior.
- **Plan:** Add **Detox** or **Maestro** (or Expo + development build) for at least smoke flows on emulator/device; run in CI with Android (Windows-friendly) and macOS for iOS.

### 2. End-to-end flows against a real API

- **Gap:** No automated test signs in, creates a pet, books, or chats against a running `PetOwner.Api` instance.
- **Plan:** Provide a **test environment** (Docker or test DB seed), stable test users, and either:
  - Playwright web with `page.route` mocks only where needed, or
  - Full integration E2E with API + DB reset between runs.

### 3. Angular web client (`pet-owner-client`)

- **Gap:** No `*.spec.ts` files found; `ng test` was not part of the green suite.
- **Plan:** Add Jasmine/Karma (or Jest) unit tests for critical services and at least one smoke E2E (Cypress/Playwright) for main routes.

### 4. API test breadth

- **Gap:** Only **5** xUnit tests (Teletriage controller + Gemini service). Most controllers and integrations are unverified in CI.
- **Plan:** Add controller tests for auth, pets, bookings, community, admin paths; use in-memory EF Core DB pattern already used in `TeletriageControllerTests`.

### 5. Visual / accessibility / performance

- **Gap:** No screenshot baselines, no a11y audits, no Lighthouse or RN performance budgets.
- **Plan:** Optional Playwright screenshot tests for web; axe-core on web; profiling passes before releases.

### 6. Security and soak testing

- **Gap:** No automated security scans or long-running soak tests in this repo from this pass.
- **Plan:** OWASP dependency review, API fuzzing on public endpoints, rate-limit tests as applicable.

---

## Files added or changed for testing (reference)

| Path | Purpose |
|------|---------|
| `src/pet-owner-mobile/jest.config.js` | Jest preset spread, fetch guard, axios mapper |
| `src/pet-owner-mobile/jest.setup-fetch-guard.js` | Disables fetch probe before Axios loads |
| `src/pet-owner-mobile/src/__tests__/apiUtils.test.ts` | Unit tests for `apiUtils` |
| `src/pet-owner-mobile/playwright.config.ts` | Playwright + optional `webServer` for Expo web |
| `src/pet-owner-mobile/e2e/smoke.spec.ts` | Web smoke: tabs + login form |
| `src/pet-owner-mobile/src/screens/auth/LoginScreen.tsx` | `testID`s for E2E |
| `src/pet-owner-mobile/src/navigation/AppNavigator.tsx` | `tabBarButtonTestID` on tabs |
| `src/pet-owner-mobile/package.json` | `test:e2e`, `test:e2e:ui` scripts |

---

## Suggested commands for your machine / CI

```text
dotnet build PetOwner.sln
dotnet test PetOwner.sln

cd src/pet-owner-mobile
npm test
npx playwright install chromium   # once per agent
npm run test:e2e                  # starts or reuses Expo web on http://127.0.0.1:8081
```

Optional: `E2E_SKIP_SERVER=1` (Unix) or set `E2E_SKIP_SERVER` in Windows to skip Playwright’s `webServer` when Metro is already running; set `E2E_BASE_URL` if using a non-default URL.

---

## Bottom line

- **Automated failures at time of writing:** **none** (API, Jest, Playwright smoke all green).
- **Product-level QA gaps:** native mobile E2E, API-backed E2E, Angular tests, broader API unit tests, and non-functional checks — see sections above for a concrete remediation plan.
