import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { addDays, format, parseISO } from "date-fns";
import {
  defaultProfile,
  mealCost,
  NourishDB,
  shoppingNeeds,
  weekOf,
  type PlanTemplate,
} from "./data";
import {
  importPersonalMealPlan,
  parsePersonalMealPlan,
} from "./mealPlanImport";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const slots = ["breakfast", "lunch", "snack", "supper"];
const times = {
  breakfast: "07:35",
  lunch: "13:00",
  snack: "16:00",
  supper: "19:30",
};
const fixture = () => ({
  format: "nourish-personal-weekly-plan",
  schema_version: 1,
  plan_id: "test-personal-week",
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
      time: times[slot as keyof typeof times],
      title: slot === "lunch" ? "Rice & beef" : `${slot} meal`,
      servings: 1,
      ingredients: [
        { name: "rice dry", quantity: 100, unit: "g", unit_price_kes: null },
      ],
      alternatives: ["Beans & rice"],
      preparation: "Cook until ready.",
      estimated_cost_kes: null,
      completed: false,
    })),
  ),
});

describe("personal weekly plan import", () => {
  it("validates all 28 unique day and slot combinations", () => {
    const plan = fixture();
    expect(parsePersonalMealPlan(plan).template.items).toHaveLength(28);
    plan.meal_entries[1].slot = "breakfast";
    expect(() => parsePersonalMealPlan(plan)).toThrow(/Duplicate|Missing/);
  });
  it("can save and activate a plan when there is no profile yet", async () => {
    const database = new NourishDB(`import-empty-${crypto.randomUUID()}`);
    const preview = parsePersonalMealPlan(fixture());
    await importPersonalMealPlan(preview, false, database, "2026-11-04");
    expect((await database.profiles.get("me"))?.id).toBe("me");
    expect(await database.meals.count()).toBe(0);
    await importPersonalMealPlan(preview, true, database, "2026-11-04");
    const profile = await database.profiles.get("me");
    expect(profile?.activeTemplateId).toBe(preview.template.id);
    expect(profile?.mealTimes.breakfast).toBe("07:35");
    expect(await database.meals.count()).toBe(56);
    database.close();
    await database.open();
    expect((await database.profiles.get("me"))?.activeTemplateId).toBe(
      preview.template.id,
    );
    await database.delete();
  });
  it("activates, repeats, preserves history and customizations, and survives reopening", async () => {
    const database = new NourishDB(`import-test-${crypto.randomUUID()}`);
    const original: PlanTemplate = {
      id: "other-plan",
      name: "Other",
      createdAt: "2026-01-01",
      items: [],
    };
    await database.profiles.put({
      ...defaultProfile,
      name: "Amina",
      activeTemplateId: original.id,
    });
    await database.templates.put(original);
    await database.weights.put({
      id: "weight-1",
      date: "2026-10-01",
      kg: 53,
      note: "",
    });
    const date = "2026-11-04";
    const preview = parsePersonalMealPlan(fixture());
    await importPersonalMealPlan(preview, false, database, date);
    expect((await database.profiles.get("me"))?.activeTemplateId).toBe(
      original.id,
    );
    expect(await database.meals.count()).toBe(0);
    await database.meals.put({
      id: "eaten-breakfast",
      date,
      slot: "breakfast",
      recipeId: preview.template.items.find(
        (item) => item.day === 2 && item.slot === "breakfast",
      )!.recipeId,
      portion: 1,
      status: "eaten",
    });
    await importPersonalMealPlan(preview, true, database, date);
    expect((await database.meals.get("eaten-breakfast"))?.status).toBe("eaten");
    expect((await database.profiles.get("me"))?.name).toBe("Amina");
    expect((await database.profiles.get("me"))?.mealTimes.dinner).toBe("19:30");
    expect(await database.weights.count()).toBe(1);
    expect(await database.templates.count()).toBe(2);
    expect(await database.prices.count()).toBe(0);
    const week = weekOf(date);
    const nextWeek = format(addDays(parseISO(week), 7), "yyyy-MM-dd");
    expect(
      (await database.meals.toArray()).filter((m) => weekOf(m.date) === week),
    ).toHaveLength(28);
    expect(
      (await database.meals.toArray()).filter(
        (m) => weekOf(m.date) === nextWeek,
      ),
    ).toHaveLength(28);
    const wednesday = (
      await database.meals.where("date").equals(date).toArray()
    ).find((m) => m.slot === "lunch")!;
    const extra = {
      name: "milk",
      qty: 250,
      unit: "ml",
      category: "Dairy & eggs",
    };
    await database.meals.update(wednesday.id, {
      portion: 2,
      addedIngredients: [extra],
    });
    const recipes = await database.recipes.toArray();
    const needs = shoppingNeeds(
      await database.meals.toArray(),
      recipes,
      [{ id: "stock", name: "rice", qty: 100, unit: "g" }],
      week,
    );
    expect(needs.find((x) => x.name === "rice")?.qty).toBe(2800);
    expect(needs.find((x) => x.name === "milk")?.qty).toBe(500);
    expect(mealCost(recipes[0], [], 1).missing).toContain("rice");
    await importPersonalMealPlan(preview, true, database, date);
    expect(await database.recipes.count()).toBe(28);
    expect(
      (await database.meals.toArray()).filter((m) => weekOf(m.date) === week),
    ).toHaveLength(28);
    expect((await database.meals.get(wednesday.id))?.addedIngredients).toEqual([
      extra,
    ]);
    expect(
      (await database.templates.get(preview.template.id))?.items,
    ).toHaveLength(28);
    database.close();
    await database.open();
    expect((await database.meals.get(wednesday.id))?.portion).toBe(2);
    expect((await database.planWeeks.get(nextWeek))?.templateId).toBe(
      preview.template.id,
    );
    await database.delete();
  });
});
