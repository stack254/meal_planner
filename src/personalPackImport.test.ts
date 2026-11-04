import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { addDays, format, parseISO } from "date-fns";
import {
  defaultProfile,
  ensureUpcomingPlan,
  mealCost,
  NourishDB,
  templateItemsForWeek,
  weekOf,
} from "./data";
import { importPersonalPack, parsePersonalPack } from "./personalPackImport";
import { recipeMatchesQuery, recipeAllowedInSlot } from "./recipeSearch";

const slots = ["breakfast", "lunch", "snack", "supper"] as const;
function fixture() {
  const recipes = Array.from({ length: 144 }, (_, n) => ({
    id: `recipe-${n}`,
    name: n % 2 ? `Beef dish ${n}` : `Chicken dish ${n}`,
    category: "main" as const,
    meal_types: ["lunch", "supper"],
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
    prep_time_minutes: 25,
    tags: [],
    allergen_tags: [],
    protein_options: [n % 2 ? "beef" : "chicken"],
    notes: "",
    estimated_cost_kes: null,
    nutrition: { status: "unavailable", source: null },
    suggested_alternative_recipe_ids: [],
  }));
  // The fixture uses compatible slots for all four daily entries.
  recipes[0].meal_types = ["breakfast", "lunch", "snack", "supper"];
  return {
    format: "nourish-personal-meal-library-and-rotation",
    schema_version: 2,
    generated_on: "2026-11-04",
    import_mode: "merge_as_new_personal_catalog_and_plan",
    plan_id: "test-four-week-pack",
    plan_name: "Test rotation",
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
    meal_times: {
      breakfast: "07:35",
      lunch: "13:00",
      snack: "16:00",
      supper: "19:30",
    },
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
            time: {
              breakfast: "07:35",
              lunch: "13:00",
              snack: "16:00",
              supper: "19:30",
            }[slot],
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
}

describe("personal four-week pack", () => {
  it("validates the full grid and rejects broken references", () => {
    const file = fixture();
    expect(
      parsePersonalPack(file).template.rotation?.weeks.map(
        (week) => week.length,
      ),
    ).toEqual([28, 28, 28, 28]);
    file.rotation.template_entries[0].recipe_id = "missing";
    expect(() => parsePersonalPack(file)).toThrow(/Recipe missing is missing/);
  });
  it("imports searchable recipes, rotates weeks, preserves data and survives reimport", async () => {
    const database = new NourishDB(`pack-${crypto.randomUUID()}`);
    await database.profiles.put({
      ...defaultProfile,
      name: "Amina",
      dailyBudget: 300,
    });
    await database.weights.put({
      id: "w",
      date: "2026-11-01",
      kg: 53,
      note: "",
    });
    await database.prices.put({
      name: "beef",
      qty: 1000,
      unit: "g",
      price: 500,
      updatedAt: "2026-11-01",
    });
    const preview = parsePersonalPack(fixture());
    await importPersonalPack(
      preview,
      { mode: "update-unchanged", activate: true, applyProfileDefaults: false },
      database,
      "2026-11-04",
    );
    expect(await database.recipes.count()).toBe(144);
    expect(
      (await database.ingredients.toArray()).filter(
        (item) => item.fromPersonalPack,
      ),
    ).toHaveLength(72);
    expect(await database.templates.count()).toBe(1);
    expect(await database.meals.count()).toBe(56);
    expect((await database.profiles.get("me"))?.name).toBe("Amina");
    expect((await database.profiles.get("me"))?.dailyBudget).toBe(300);
    expect(await database.weights.count()).toBe(1);
    expect((await database.prices.get("beef"))?.price).toBe(500);
    expect(await database.prices.count()).toBe(1);
    const beef = (await database.recipes.toArray()).filter(
      (recipe) =>
        recipeMatchesQuery(recipe, "Beef") &&
        recipeAllowedInSlot(recipe, "lunch"),
    );
    expect(beef.length).toBeGreaterThan(1);
    expect(mealCost(beef[0], []).missing).toContain("beef");
    const template = (await database.templates.get(preview.template.id))!;
    const anchor = weekOf("2026-11-04");
    const weekAt = (n: number) =>
      format(addDays(parseISO(anchor), n * 7), "yyyy-MM-dd");
    expect(templateItemsForWeek(template, weekAt(0))[1].recipeId).not.toBe(
      templateItemsForWeek(template, weekAt(1))[1].recipeId,
    );
    expect(templateItemsForWeek(template, weekAt(4))[1].recipeId).toBe(
      templateItemsForWeek(template, weekAt(0))[1].recipeId,
    );
    await ensureUpcomingPlan(weekAt(2), database);
    await ensureUpcomingPlan(weekAt(3), database);
    await ensureUpcomingPlan(weekAt(4), database);
    const fifthWeekMonday = await database.meals
      .where("date")
      .equals(weekAt(4))
      .toArray();
    expect(
      fifthWeekMonday.find((meal) => meal.slot === "lunch")?.recipeId,
    ).toBe(templateItemsForWeek(template, weekAt(0))[1].recipeId);
    const edited = (await database.meals.toArray()).find(
      (meal) => meal.date === "2026-11-04" && meal.slot === "lunch",
    )!;
    await database.meals.update(edited.id, {
      portion: 2,
      addedIngredients: [
        { name: "milk", qty: 250, unit: "ml", category: "Dairy & eggs" },
      ],
    });
    await importPersonalPack(
      preview,
      { mode: "update-unchanged", activate: true, applyProfileDefaults: false },
      database,
      "2026-11-04",
    );
    expect(await database.meals.count()).toBe(168);
    expect((await database.meals.get(edited.id))?.portion).toBe(2);
    expect(
      (await database.meals.get(edited.id))?.addedIngredients?.[0].name,
    ).toBe("milk");
    database.close();
    await database.open();
    expect(await database.recipes.count()).toBe(144);
    expect(
      (await database.templates.get(template.id))?.rotation?.weeks,
    ).toHaveLength(4);
    await database.delete();
  });
});
