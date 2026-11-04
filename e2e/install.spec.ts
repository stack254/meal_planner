import { test, expect } from "@playwright/test";

test("production manifest and service worker are served", async ({
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  expect((await request.get("/sw.js")).ok()).toBe(true);
  expect((await request.get("/icon-192.png")).ok()).toBe(true);
});

test("shows an install action when Android Chrome offers one", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Install Nourish" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {
      (
        window as Window & { installPromptCalled?: boolean }
      ).installPromptCalled = true;
    };
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);
  });
  await expect(page.locator(".install-banner")).toBeVisible();
  await page
    .locator(".install-banner")
    .getByRole("button", { name: "Install Nourish" })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { installPromptCalled?: boolean })
          .installPromptCalled,
    ),
  ).toBe(true);
});

test("shows Safari installation steps on iPhone", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1",
    });
  });
  await page.goto("/settings");
  await expect(page.locator(".install-help")).toContainText(
    "Open Nourish in Safari",
  );
  await expect(page.locator(".install-help")).toContainText(
    "Add to Home Screen",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icon-192.png",
  );
});
