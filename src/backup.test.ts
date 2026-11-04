import { describe, it, expect } from "vitest";
import { parseBackup } from "./backup";
import { defaultProfile } from "./data";
const empty = {
  profiles: [defaultProfile],
  recipes: [],
  meals: [],
  prices: [],
  pantry: [],
  purchases: [],
  weights: [],
  habits: [],
  lists: [],
  reminders: [],
  templates: [],
  mealRecords: [],
  ingredients: [],
  budgets: [],
  preferences: [{ id: "me", theme: "system" }],
};
describe("backup validation", () => {
  it("accepts a complete current backup", () => {
    expect(
      parseBackup({
        schemaVersion: 4,
        exportedAt: "2026-11-03T12:00:00.000Z",
        data: empty,
      }).data.profiles,
    ).toHaveLength(1);
  });
  it("migrates a v1 backup", () => {
    const {
      templates: _,
      mealRecords: __,
      ingredients: ___,
      budgets: ____,
      preferences: _____,
      ...old
    } = empty;
    const profile = { ...defaultProfile } as Record<string, unknown>;
    delete profile.currentMeals;
    const result = parseBackup({
      schemaVersion: 1,
      exportedAt: "2026-11-03T12:00:00.000Z",
      data: { ...old, profiles: [profile] },
    });
    expect(result.data.profiles[0].currentMeals).toBe(2);
    expect(result.data.templates).toEqual([]);
  });
  it("migrates v3 ingredient and appearance records", () => {
    const { ingredients: _, budgets: __, preferences: ___, ...old } = empty;
    const result = parseBackup({
      schemaVersion: 3,
      exportedAt: "2026-11-03T12:00:00.000Z",
      data: {
        ...old,
        recipes: [
          {
            id: "r",
            name: "Rice",
            emoji: "🍚",
            ingredients: [
              { name: "rice", qty: 100, unit: "g", category: "Grains" },
            ],
            steps: "Cook",
            servings: 1,
            minutes: 20,
          },
        ],
      },
    });
    expect(result.data.ingredients[0]?.name).toBe("rice");
    expect(result.data.preferences[0]?.theme).toBe("system");
  });
  it("rejects malformed records", () => {
    expect(() =>
      parseBackup({
        schemaVersion: 4,
        exportedAt: "x",
        data: { ...empty, weights: [{ id: "a", kg: -10 }] },
      }),
    ).toThrow(/invalid backup/);
  });
});
