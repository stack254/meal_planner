import { it, expect } from "vitest";
import { curatedRecipes, builtInTemplates } from "./catalog";
import { seedRecipes } from "./data";
it("ships distinct, usable local recipes and four complete plans", () => {
  expect(curatedRecipes.length).toBeGreaterThanOrEqual(150);
  expect(new Set(curatedRecipes.map((r) => r.id)).size).toBe(
    curatedRecipes.length,
  );
  expect(new Set(curatedRecipes.map((r) => r.name)).size).toBe(
    curatedRecipes.length,
  );
  expect(
    curatedRecipes.every(
      (r) =>
        r.ingredients.length &&
        r.steps.length > 15 &&
        r.minutes >= 0 &&
        r.mealTypes?.length,
    ),
  ).toBe(true);
  expect(builtInTemplates).toHaveLength(4);
  const ids = new Set([...curatedRecipes, ...seedRecipes].map((r) => r.id));
  for (const t of builtInTemplates) {
    expect(t.items).toHaveLength(28);
    expect(t.items.every((i) => ids.has(i.recipeId))).toBe(true);
    for (let day = 0; day < 7; day++)
      expect(
        new Set(t.items.filter((i) => i.day === day).map((i) => i.slot)).size,
      ).toBe(4);
  }
});
