import { expect, it } from "vitest";
import { recipeAllowedInSlot, recipeMatchesQuery } from "./recipeSearch";
import type { Recipe } from "./data";

it("finds dishes by words, ingredients and meal time", () => {
  const beef: Recipe = {
    id: "beef",
    name: "Ugali with Beef Stew",
    emoji: "🍲",
    ingredients: [
      { name: "sukuma", qty: 60, unit: "g", category: "Vegetables" },
    ],
    steps: "Cook and serve.",
    servings: 1,
    minutes: 30,
    mealTypes: ["lunch", "dinner"],
    keywords: ["Kenyan"],
  };
  expect(recipeMatchesQuery(beef, "  BEEF   stew ")).toBe(true);
  expect(recipeMatchesQuery(beef, "sukuma ugali")).toBe(true);
  expect(recipeMatchesQuery(beef, "Kenyan beef")).toBe(true);
  expect(recipeMatchesQuery(beef, "chicken")).toBe(false);
  expect(recipeAllowedInSlot(beef, "dinner")).toBe(true);
  expect(recipeAllowedInSlot(beef, "breakfast")).toBe(false);
});

it("finds familiar fish names through the fish shortcut", () => {
  const tilapia: Recipe = {
    id: "tilapia",
    name: "Grilled tilapia",
    emoji: "🐟",
    ingredients: [],
    steps: "Grill and serve.",
    servings: 1,
    minutes: 20,
    mealTypes: ["lunch", "dinner"],
  };
  expect(recipeMatchesQuery(tilapia, "Fish")).toBe(true);
});
