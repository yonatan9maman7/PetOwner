import { test, expect } from "@playwright/test";

test.describe("Expo web smoke", () => {
  test("loads the shell and bottom tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("tab-explore")).toBeVisible();
    await expect(page.getByTestId("tab-community")).toBeVisible();
    await expect(page.getByTestId("tab-mypets")).toBeVisible();
    await expect(page.getByTestId("tab-login")).toBeVisible();
  });

  test("login tab shows email and password fields", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-login").click();
    await expect(page.getByTestId("login-email-input")).toBeVisible();
    await expect(page.getByTestId("login-password-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });
});
