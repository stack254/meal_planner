import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  NourishDB,
  mealCost,
  recordGroceryPurchase,
  setMealStatus,
  shoppingNeeds,
  type PlannedMeal,
  type Recipe,
} from "./data";

const rice: Recipe = {
  id: "rice-test",
  name: "Rice",
  emoji: "🍚",
  ingredients: [{ name: "rice", qty: 100, unit: "g", category: "Grains" }],
  steps: "Cook rice.",
  servings: 1,
  minutes: 20,
};

describe("bulk purchases and pantry use", () => {
  it("records the full purchase once and uses only meal quantities from stock", async () => {
    const database = new NourishDB(`bulk-test-${crypto.randomUUID()}`);
    const first: PlannedMeal = {
      id: "first",
      date: "2026-11-04",
      slot: "lunch",
      recipeId: rice.id,
      portion: 1,
      status: "planned",
    };
    const second: PlannedMeal = { ...first, id: "second", date: "2026-11-05" };
    await database.meals.bulkAdd([first, second]);
    const purchase = await recordGroceryPurchase(
      {
        name: "rice",
        qty: 5,
        unit: "kg",
        amount: 1000,
        date: "2026-11-04",
      },
      database,
    );
    expect(
      (await database.purchases.toArray()).reduce(
        (sum, x) => sum + x.amount,
        0,
      ),
    ).toBe(1000);
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBe(5);
    expect(mealCost(rice, await database.prices.toArray()).total).toBe(20);
    await setMealStatus(
      first,
      "eaten",
      [rice],
      await database.prices.toArray(),
      database,
    );
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBeCloseTo(
      4.9,
    );
    await database.meals.update(first.id, { status: "planned", portion: 2 });
    await setMealStatus(
      { ...first, portion: 2 },
      "eaten",
      [rice],
      await database.prices.toArray(),
      database,
    );
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBeCloseTo(
      4.8,
    );
    await setMealStatus(
      first,
      "eaten",
      [rice],
      await database.prices.toArray(),
      database,
    );
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBeCloseTo(
      4.8,
    );
    expect(
      shoppingNeeds(
        await database.meals.toArray(),
        [rice],
        await database.pantry.toArray(),
        "2026-11-02",
      ),
    ).toHaveLength(0);
    await setMealStatus(
      first,
      "planned",
      [rice],
      await database.prices.toArray(),
      database,
    );
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBeCloseTo(5);
    database.close();
    await database.open();
    expect((await database.purchases.get(purchase.id))?.amount).toBe(1000);
    expect((await database.pantry.get(purchase.pantryId!))?.qty).toBeCloseTo(5);
    await database.delete();
  });
});
