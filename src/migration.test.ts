import "fake-indexeddb/auto";
import Dexie from "dexie";
import { it, expect } from "vitest";
import { NourishDB, defaultProfile, seedRecipes } from "./data";
it("upgrades v4 data with ingredient and appearance stores intact", async () => {
  const name = "nourish-migration-test";
  const old = new Dexie(name);
  old.version(4).stores({
    profiles: "id",
    recipes: "id",
    meals: "id,date,recipeId,status",
    prices: "name",
    pantry: "id,name",
    purchases: "id,date,listWeek",
    weights: "id,date",
    habits: "id,date,key",
    lists: "id,week",
    reminders: "id",
    templates: "id",
    mealRecords: "id,date",
  });
  await old.open();
  await old.table("profiles").put({ ...defaultProfile, theme: "dark" });
  await old.table("recipes").put(seedRecipes[0]);
  old.close();
  const next = new NourishDB(name);
  await next.open();
  expect((await next.profiles.get("me"))?.theme).toBe("dark");
  expect((await next.preferences.get("me"))?.theme).toBe("dark");
  expect((await next.ingredients.get("eggs"))?.category).toBe("Dairy & eggs");
  await next.delete();
});
