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
  it("preserves linked bulk stock and meal deductions in a backup", () => {
    const result = parseBackup({
      schemaVersion: 5,
      exportedAt: "2026-11-04T12:00:00.000Z",
      data: {
        ...empty,
        planWeeks: [],
        pantry: [
          {
            id: "purchase:p",
            name: "rice",
            qty: 4.9,
            unit: "kg",
            sourcePurchaseId: "p",
          },
        ],
        purchases: [
          {
            id: "p",
            date: "2026-11-04",
            name: "rice",
            qty: 5,
            unit: "kg",
            amount: 1000,
            checked: true,
            listWeek: "2026-11-02",
            pantryId: "purchase:p",
          },
        ],
        meals: [
          {
            id: "m",
            date: "2026-11-04",
            slot: "lunch",
            recipeId: "rice",
            portion: 1,
            status: "eaten",
            pantryUsed: [
              { pantryId: "purchase:p", name: "rice", unit: "kg", qty: 0.1 },
            ],
          },
        ],
      },
    });
    expect(result.data.pantry[0].sourcePurchaseId).toBe("p");
    expect(result.data.purchases[0].pantryId).toBe("purchase:p");
    expect(result.data.meals[0].pantryUsed?.[0].qty).toBe(0.1);
  });
  it("preserves four-week rotation and unpriced pack ingredients", () => {
    const result = parseBackup({
      schemaVersion: 5,
      exportedAt: "2026-11-04T12:00:00.000Z",
      data: {
        ...empty,
        planWeeks: [],
        ingredients: [
          {
            name: "rice",
            category: "Grains",
            unit: "g",
            fromPersonalPack: true,
          },
        ],
        templates: [
          {
            id: "pack:test",
            name: "Rotation",
            createdAt: "2026-11-04",
            items: [],
            rotation: { anchorWeek: "2026-11-02", weeks: [[], [], [], []] },
          },
        ],
      },
    });
    expect(result.data.ingredients[0].fromPersonalPack).toBe(true);
    expect(result.data.templates[0].rotation?.weeks).toHaveLength(4);
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
