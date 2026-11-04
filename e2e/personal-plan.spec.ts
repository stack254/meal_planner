import { test, expect } from "@playwright/test";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const slots = ["breakfast", "lunch", "snack", "supper"] as const;
const times = {
  breakfast: "07:35",
  lunch: "13:00",
  snack: "16:00",
  supper: "19:30",
};
const plan = {
  format: "nourish-personal-weekly-plan",
  schema_version: 1,
  plan_id: "e2e-personal-week",
  plan_name: "Personal week",
  repeat: "weekly",
  start_week_on: "Monday",
  meal_times: times,
  owner_profile: {
    currency: "KES",
    daily_food_budget_kes: 200,
    weekly_food_budget_kes: 1400,
  },
  meal_entries: days.flatMap((day) =>
    slots.map((slot) => ({
      id: `${day}-${slot}`,
      day,
      slot,
      time: times[slot],
      title: `${day} ${slot} special`,
      servings: 1,
      ingredients: [
        { name: "rice dry", quantity: 100, unit: "g", unit_price_kes: null },
      ],
      alternatives: ["Beans and rice"],
      preparation: "Cook until ready.",
      estimated_cost_kes: null,
      completed: false,
    })),
  ),
};

test("routes a meal-plan file from Backup to Planner and keeps it after reload", async ({
  page,
}) => {
  await page.goto("/backup");
  await expect(
    page.getByRole("heading", { name: "Data & backup" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import Meal Plan" }),
  ).toBeVisible();
  await page.locator(".settings-card input[type=file]").setInputFiles({
    name: "personal-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(plan)),
  });
  await expect(page).toHaveURL(/\/plan$/);
  const input = page.locator(".plan-import-trigger input[type=file]");
  const dialog = page.getByRole("dialog", {
    name: "Use your weekly plan",
  });
  await expect(dialog).toContainText("7 days · 28 meals");
  await expect(dialog.locator(".plan-import-day")).toHaveCount(7);
  await expect(dialog.locator(".plan-import-meal:visible")).toHaveCount(4);
  await dialog.getByRole("button", { name: "Use this plan" }).click();
  await expect(page.locator(".plan-guide")).toContainText(
    "My Personal Weight-Gain Plan",
  );
  await page.reload();
  await expect(page.locator(".plan-guide")).toContainText(
    "My Personal Weight-Gain Plan",
  );
  await page.getByRole("button", { name: "7-day week" }).click();
  await page.getByRole("button", { name: "Expand all days" }).click();
  await expect(page.locator(".plan-meal")).toHaveCount(28);
  await input.setInputFiles({
    name: "personal-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(plan)),
  });
  await page
    .getByRole("dialog", { name: "Use your weekly plan" })
    .getByRole("button", { name: "Use this plan" })
    .click();
  await expect(page.locator(".plan-guide")).toContainText(
    "My Personal Weight-Gain Plan",
  );
  await page.getByRole("button", { name: "7-day week" }).click();
  await page.getByRole("button", { name: "Expand all days" }).click();
  await expect(page.locator(".plan-meal")).toHaveCount(28);
});

test("onboarding can carry a selected weekly plan into its preview", async ({
  page,
}) => {
  await page.goto("/personalize");
  await page.locator(".onboard-restore input[type=file]").setInputFiles({
    name: "personal-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(plan)),
  });
  await expect(
    page.getByText("Your weekly plan is ready.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Start my journey/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Use your weekly plan" }),
  ).toBeVisible();
});
