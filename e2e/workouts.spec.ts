import { test, expect } from "@playwright/test";

test("opens when randomUUID is unavailable on an HTTP LAN origin", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined });
  });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Workouts" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Unable to open Nourish")).toHaveCount(0);
});

test("logs a beginner session and plays mapped exercise media offline", async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date(2026, 10, 2, 10, 0) });
  await page.goto("/");
  await expect(page.getByText("Upper body and core").first()).toBeVisible();
  await page.getByRole("link", { name: "Workouts" }).last().click();
  await expect(
    page.getByRole("heading", { name: "My Strength Journey — No Equipment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(
    page.getByRole("heading", { name: "Warm up gently" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin exercises" }).click();
  await expect(page.locator(".exercise-player h3")).toHaveText(
    "Incline push-up",
  );
  const sprite = page.locator(".exercise-player .workout-sprite");
  await expect(sprite).toHaveCSS("animation-name", "incline-pushup-frames");
  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(sprite).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect(sprite).toHaveCSS("animation-name", "incline-pushup-frames");
  await page.getByLabel("Reps or duration completed").fill("6");
  await page.getByRole("button", { name: "Save set" }).click();
  await expect(page.getByText("1 of 2 suggested sets")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Stop and save" }).click();
  await expect(page.getByText("Stopped early")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Stopped early")).toBeVisible();
  await page.getByRole("button", { name: "Tue" }).click();
  await page.getByRole("button", { name: "Start session" }).click();
  await page.getByRole("button", { name: "Begin exercises" }).click();
  const image = page.locator(".exercise-player img");
  await expect(image).toHaveAttribute("src", "/assets/workouts/squat.gif");
  await expect
    .poll(() =>
      image.evaluate((x: HTMLImageElement) => x.complete && x.naturalWidth > 0),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((x: HTMLImageElement) => x.complete && x.naturalWidth > 0),
    )
    .toBe(true);
});

test("starts with animation paused when reduced motion is enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workouts");
  await page.getByRole("button", { name: "Mon" }).click();
  await page.getByRole("button", { name: "Start session" }).click();
  await page.getByRole("button", { name: "Begin exercises" }).click();
  await expect(page.locator(".exercise-player .workout-sprite")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Play animation" }),
  ).toBeVisible();
});
