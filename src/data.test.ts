import { describe, it, expect } from "vitest";
import {
  mealCost,
  effectiveRecipe,
  shoppingNeeds,
  type Recipe,
  type PlannedMeal,
  type Pantry,
} from "./data";
const recipe: Recipe = {
  id: "beans",
  name: "Beans",
  emoji: "🫘",
  ingredients: [
    { name: "beans", qty: 100, unit: "g", category: "Legumes" },
    { name: "oil", qty: 10, unit: "ml", category: "Pantry essentials" },
  ],
  steps: "",
  servings: 2,
  minutes: 20,
};
const meal: PlannedMeal = {
  id: "1",
  date: "2026-11-02",
  slot: "lunch",
  recipeId: "beans",
  portion: 2,
  status: "planned",
};
describe("costing and shopping", () => {
  it("prices portions, not the whole package", () => {
    const result = mealCost(
      recipe,
      [
        { name: "beans", qty: 1000, unit: "g", price: 200, updatedAt: "" },
        { name: "oil", qty: 1000, unit: "ml", price: 300, updatedAt: "" },
      ],
      2,
    );
    expect(result.total).toBe(23);
    expect(result.missing).toEqual([]);
  });
  it("charges added food once per portion for a multi-serving recipe", () => {
    const extra = {
      name: "milk",
      qty: 250,
      unit: "ml",
      category: "Dairy & eggs",
    };
    const adapted = effectiveRecipe(
      { ...meal, addedIngredients: [extra] },
      recipe,
    );
    const prices = [
      { name: "beans", qty: 1000, unit: "g", price: 200, updatedAt: "" },
      { name: "oil", qty: 1000, unit: "ml", price: 300, updatedAt: "" },
      { name: "milk", qty: 1000, unit: "ml", price: 100, updatedAt: "" },
    ];
    expect(mealCost(adapted, prices, 2).total).toBe(73);
    const needs = shoppingNeeds(
      [{ ...meal, addedIngredients: [extra] }],
      [recipe],
      [],
      "2026-11-02",
    );
    expect(needs.find((i) => i.name === "milk")?.qty).toBe(500);
  });
  it("replaces one scheduled ingredient without changing the base recipe", () => {
    const adapted = effectiveRecipe(
      {
        ...meal,
        removedIngredientIndexes: [0],
        addedIngredients: [
          { name: "ndengu", qty: 50, unit: "g", category: "Legumes" },
        ],
      },
      recipe,
    );
    expect(adapted.ingredients.map((i) => i.name)).toEqual(["oil", "ndengu"]);
    expect(recipe.ingredients[0].name).toBe("beans");
    const needs = shoppingNeeds(
      [
        {
          ...meal,
          removedIngredientIndexes: [0],
          addedIngredients: [
            { name: "ndengu", qty: 50, unit: "g", category: "Legumes" },
          ],
        },
      ],
      [recipe],
      [],
      "2026-11-02",
    );
    expect(needs.some((i) => i.name === "beans")).toBe(false);
    expect(needs.find((i) => i.name === "ndengu")?.qty).toBe(100);
  });
  it("does not invent prices for unknown ingredients", () => {
    expect(mealCost(recipe, []).missing).toEqual(["beans", "oil"]);
  });
  it("aggregates plans and subtracts matching pantry stock", () => {
    const pantry: Pantry[] = [{ id: "p", name: "beans", qty: 50, unit: "g" }];
    const items = shoppingNeeds(
      [meal, { ...meal, id: "2", date: "2026-11-03" }],
      [recipe],
      pantry,
      "2026-11-02",
    );
    expect(items.find((x) => x.name === "beans")?.qty).toBe(150);
    expect(items.find((x) => x.name === "oil")?.qty).toBe(20);
    const expiring = shoppingNeeds(
      [meal],
      [recipe],
      [
        {
          id: "e",
          name: "beans",
          qty: 100,
          unit: "g",
          expiresOn: "2026-11-04",
        },
      ],
      "2026-11-02",
    );
    expect(expiring.find((x) => x.name === "beans")?.qty).toBe(100);
  });
});
import {
  affordableAlternatives,
  makeSeedWeek,
  budgetFor,
  defaultProfile,
} from "./data";
describe("planning and substitutions", () => {
  it("seeds all days without collapsing meal slots", () => {
    const week = makeSeedWeek("2026-11-02");
    expect(week).toHaveLength(28);
    expect(new Set(week.map((m) => m.date)).size).toBe(7);
    expect(
      week
        .filter((m) => m.date === "2026-11-02" && m.slot !== "snack")
        .map((m) => m.slot),
    ).toEqual(["breakfast", "lunch", "dinner"]);
  });
  it("offers only known cheaper options that avoid restrictions", () => {
    const costly = {
      ...recipe,
      id: "costly",
      name: "Beef meal",
      ingredients: [{ name: "beef", qty: 100, unit: "g", category: "Meat" }],
    };
    const beans = {
      ...recipe,
      id: "beans2",
      name: "Beans meal",
      ingredients: [
        { name: "beans", qty: 100, unit: "g", category: "Legumes" },
      ],
    };
    const prices = [
      { name: "beef", qty: 100, unit: "g", price: 200, updatedAt: "" },
      { name: "beans", qty: 100, unit: "g", price: 40, updatedAt: "" },
    ];
    expect(
      affordableAlternatives(costly, [costly, beans], prices, "beans"),
    ).toEqual([]);
    expect(
      affordableAlternatives(costly, [costly, beans], prices, ""),
    ).toHaveLength(1);
  });
});

describe("period budgets", () => {
  it("uses profile defaults and a matching local override", () => {
    expect(budgetFor(defaultProfile, [], "daily", "2026-11-03")).toBe(200);
    expect(
      budgetFor(
        defaultProfile,
        [
          {
            id: "weekly:2026-11-02",
            period: "weekly",
            date: "2026-11-02",
            amount: 1600,
            currency: "KES",
          },
        ],
        "weekly",
        "2026-11-03",
      ),
    ).toBe(1600);
  });
});
