import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  db,
  initialize,
  setMealStatus,
  addFood,
  shoppingNeeds,
  weekOf,
  today,
  setActiveTemplate,
} from "./data";
import { addDays, format, parseISO } from "date-fns";

describe("IndexedDB persistence", () => {
  it("keeps edited profile and planned meals after reopening", async () => {
    await initialize();
    expect(await db.ingredients.count()).toBeGreaterThan(40);
    expect(await db.recipes.count()).toBeGreaterThanOrEqual(150);
    expect(await db.weights.count()).toBe(0); // Example profile values are not measurements.
    expect(await db.templates.count()).toBeGreaterThanOrEqual(4);
    expect((await db.profiles.get("me"))?.onboarded).toBe(true);
    expect(
      await db.meals
        .where("date")
        .between(weekOf(today()), today(), true, true)
        .count(),
    ).toBeGreaterThan(0);
    expect((await db.preferences.get("me"))?.theme).toBe("system");
    await db.profiles.update("me", { name: "Amina" });
    const followingWeek = format(
      addDays(parseISO(weekOf(today())), 7),
      "yyyy-MM-dd",
    );
    await setActiveTemplate("template-balanced");
    expect((await db.profiles.get("me"))?.activeTemplateId).toBe(
      "template-balanced",
    );
    expect((await db.planWeeks.get(followingWeek))?.templateId).toBe(
      "template-balanced",
    );
    const futureMeal = (
      await db.meals.where("date").equals(followingWeek).toArray()
    ).find((m) => m.slot === "breakfast")!;
    expect(futureMeal.recipeId).toBe(
      (await db.templates.get("template-balanced"))?.items[0].recipeId,
    );
    await db.meals.update(futureMeal.id, { recipeId: "banana" });
    await setActiveTemplate("template-variety");
    expect((await db.meals.get(futureMeal.id))?.recipeId).toBe("banana");
    expect((await db.profiles.get("me"))?.activeTemplateId).toBe(
      "template-variety",
    );
    const before = await db.meals.count();
    const recipeCount = await db.recipes.count();
    await initialize();
    expect(await db.meals.count()).toBe(before);
    expect(await db.recipes.count()).toBe(recipeCount);
    const meal = (await db.meals.toArray())[0];
    const recipes = await db.recipes.toArray();
    const recipe = recipes.find((r) => r.id === meal.recipeId)!;
    const extra = {
      name: "milk",
      qty: 250,
      unit: "ml",
      category: "Dairy & eggs",
    };
    await addFood(meal, extra, "meal", recipe);
    const needs = shoppingNeeds(
      await db.meals.toArray(),
      recipes,
      [],
      weekOf(meal.date),
    );
    expect(
      needs.find((x) => x.name === "milk" && x.unit === "ml")?.qty,
    ).toBeGreaterThanOrEqual(250);
    await setMealStatus(
      { ...meal, addedIngredients: [extra] },
      "eaten",
      recipes,
      [],
    );
    const snapshot = (await db.mealRecords.get(meal.id))?.recipe.name;
    expect(
      (await db.mealRecords.get(meal.id))?.recipe.ingredients,
    ).toContainEqual(extra);
    await db.recipes.update(meal.recipeId, { name: "Renamed later" });
    expect((await db.mealRecords.get(meal.id))?.recipe.name).toBe(snapshot);
    db.close();
    await db.open();
    expect((await db.profiles.get("me"))?.name).toBe("Amina");
    expect(await db.meals.count()).toBe(before);
    expect((await db.mealRecords.get(meal.id))?.recipe.name).toBe(snapshot);
    await db.delete();
  });
});
