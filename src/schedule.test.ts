import { describe, it, expect } from "vitest";
import { nextMeal, mealTime } from "./schedule";
import { defaultProfile, type PlannedMeal } from "./data";
const item = (
  id: string,
  date: string,
  slot: PlannedMeal["slot"],
  status: PlannedMeal["status"] = "planned",
): PlannedMeal => ({
  id,
  date,
  slot,
  status,
  recipeId: "eggs-bread",
  portion: 1,
});
describe("local meal schedule", () => {
  const meals = [
    item("breakfast", "2026-11-04", "breakfast"),
    item("lunch", "2026-11-04", "lunch"),
    item("next", "2026-11-05", "breakfast"),
  ];
  it("uses local meal time and exact countdown", () => {
    expect(mealTime(meals[0], defaultProfile.mealTimes).getHours()).toBe(7);
    expect(
      nextMeal(meals, defaultProfile.mealTimes, new Date(2026, 10, 4, 7, 23))
        ?.label,
    ).toBe("Breakfast in 12 minutes");
  });
  it("shows overdue, then upcoming and next-day meals", () => {
    expect(
      nextMeal(meals, defaultProfile.mealTimes, new Date(2026, 10, 4, 7, 40))
        ?.meal.id,
    ).toBe("breakfast");
    expect(
      nextMeal(meals, defaultProfile.mealTimes, new Date(2026, 10, 4, 10, 0))
        ?.meal.id,
    ).toBe("lunch");
    expect(
      nextMeal(meals, defaultProfile.mealTimes, new Date(2026, 10, 4, 20, 0))
        ?.meal.id,
    ).toBe("next");
  });
  it("ignores completed and skipped meals", () => {
    const changed = [
      { ...meals[0], status: "eaten" as const },
      { ...meals[1], status: "skipped" as const },
      meals[2],
    ];
    expect(
      nextMeal(changed, defaultProfile.mealTimes, new Date(2026, 10, 4, 7, 23))
        ?.meal.id,
    ).toBe("next");
  });
});
