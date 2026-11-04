import { test, expect } from "@playwright/test";

const slots = ["breakfast", "lunch", "snack", "supper"] as const;
const times = {
  breakfast: "07:35",
  lunch: "13:00",
  snack: "16:00",
  supper: "19:30",
};
const recipes = Array.from({ length: 144 }, (_, n) => ({
  id: `recipe-${n}`,
  name: n % 2 ? `Beef dish ${n}` : `Chicken dish ${n}`,
  category: "main",
  meal_types: n === 0 ? [...slots] : ["lunch", "supper"],
  servings: 1,
  ingredients: [
    {
      ingredient_id: n % 2 ? "beef" : "chicken",
      name: n % 2 ? "beef" : "chicken",
      quantity: 100,
      unit: "g",
      quantity_basis: "raw_or_dry_unless_ready_to_eat",
      unit_price_kes: null,
    },
  ],
  preparation: "Cook and serve.",
  prep_time_minutes: 20,
  tags: [],
  allergen_tags: [],
  protein_options: [n % 2 ? "beef" : "chicken"],
  notes: "",
  estimated_cost_kes: null,
  nutrition: { status: "unavailable", source: null },
  suggested_alternative_recipe_ids: [],
}));
const pack = {
  format: "nourish-personal-meal-library-and-rotation",
  schema_version: 2,
  generated_on: "2026-11-04",
  import_mode: "merge_as_new_personal_catalog_and_plan",
  plan_id: "e2e-rotation",
  plan_name: "E2E rotation",
  profile: {
    weight_kg: 52,
    height_cm: 166,
    first_goal_kg: 55,
    long_term_goal_kg: 65,
    goal: "gradual_weight_gain",
    currency: "KES",
    daily_budget_kes: 200,
    weekly_budget_kes: 1400,
    tea_note: "",
    medical_note: "",
  },
  timezone: "Africa/Nairobi",
  meal_times: times,
  rotation: {
    length_weeks: 4,
    repeat: true,
    start_on: "current_week_monday",
    fill_current_and_following_weeks: true,
    template_entries: Array.from({ length: 4 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) =>
        slots.map((slot) => ({
          id: `w${week + 1}-d${day}-${slot}`,
          recipe_id: slot === "lunch" ? `recipe-${week * 2 + 1}` : "recipe-0",
          title:
            slot === "lunch" ? `Beef dish ${week * 2 + 1}` : "Chicken dish 0",
          week_index: week + 1,
          weekday_index_monday_zero: day,
          slot,
          time: times[slot],
          servings: 1,
          status: "planned",
          cost_override_kes: null,
        })),
      ),
    ).flat(2),
  },
  recipes,
  ingredient_prices: Array.from({ length: 72 }, (_, n) => ({
    ingredient_id: n === 0 ? "chicken" : n === 1 ? "beef" : `ingredient-${n}`,
    name: n === 0 ? "chicken" : n === 1 ? "beef" : `ingredient ${n}`,
    unit: "g",
    price_per_unit_kes: null,
    source: "user_entry_required",
  })),
  pricing_policy: {
    missing_prices_are_unknown_not_zero: true,
    no_price_overwrite_on_import: true,
  },
  nutrition_policy: { nutrition_unavailable_without_verified_data: true },
  import_notes: [],
};

test("imports a four-week pack and finds beef in Replace Meal with no prices", async ({
  page,
}) => {
  await page.goto("/plan");
  await page
    .locator(".plan-import-trigger input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "personal-pack.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(pack)),
    });
  const dialog = page.getByRole("dialog", {
    name: "Review your personal meal pack",
  });
  await expect(dialog).toContainText("144 recipes");
  await expect(dialog).toContainText("112 meals");
  await dialog.getByRole("button", { name: "Import & use rotation" }).click();
  await expect(page.locator(".plan-guide")).toContainText(
    "My Nourish 4-Week Kenyan Weight-Gain Rotation",
  );
  await page.reload();
  await expect(page.locator(".plan-guide")).toContainText(
    "My Nourish 4-Week Kenyan Weight-Gain Rotation",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  const replacement = page.getByRole("dialog");
  await replacement.getByLabel("Search meals").fill("Beef");
  await expect(
    replacement.locator(".replace-results button").first(),
  ).toBeVisible();
  await expect(replacement).toContainText("Price not entered");
  await replacement.getByRole("button", { name: "Close" }).click();
  await page.goto("/pantry");
  await page.getByRole("button", { name: "Ingredient prices" }).click();
  await expect(
    page.getByText("Prices to enter from your meal pack"),
  ).toBeVisible();
  await page.getByLabel("Search ingredients").fill("beef");
  await page.getByRole("button", { name: "Enter price" }).click();
  const priceDialog = page.getByRole("dialog", { name: "Ingredient price" });
  await priceDialog.getByLabel("Package quantity").fill("1000");
  await priceDialog.getByLabel("Package price (KES)").fill("5000");
  await priceDialog.getByRole("button", { name: "Save price" }).click();
  await expect(page.getByRole("button", { name: "Edit price of beef" })).toBeVisible();
  await page.goto("/plan");
  await expect(
    page.getByText(/Known ingredient costs already exceed this week's target/),
  ).toBeVisible();
});
