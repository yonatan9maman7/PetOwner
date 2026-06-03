# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Expo web smoke >> loads the shell and bottom tabs
- Location: e2e\smoke.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('tab-explore')
Expected: visible
Timeout: 25000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 25000ms
  - waiting for getByTestId('tab-explore')

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Expo web smoke", () => {
  4  |   test("loads the shell and bottom tabs", async ({ page }) => {
  5  |     await page.goto("/");
> 6  |     await expect(page.getByTestId("tab-explore")).toBeVisible();
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  7  |     await expect(page.getByTestId("tab-community")).toBeVisible();
  8  |     await expect(page.getByTestId("tab-mypets")).toBeVisible();
  9  |     await expect(page.getByTestId("tab-login")).toBeVisible();
  10 |   });
  11 | 
  12 |   test("login tab shows email and password fields", async ({ page }) => {
  13 |     await page.goto("/");
  14 |     await page.getByTestId("tab-login").click();
  15 |     await expect(page.getByTestId("login-email-input")).toBeVisible();
  16 |     await expect(page.getByTestId("login-password-input")).toBeVisible();
  17 |     await expect(page.getByTestId("login-submit-button")).toBeVisible();
  18 |   });
  19 | });
  20 | 
```