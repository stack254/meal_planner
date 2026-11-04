import { addDays, format } from "date-fns";
import { z } from "zod";
import {
  categories,
  catalogFromRecipes,
  db,
  today,
  uid,
  weekFromTemplate,
  weekOf,
  type Ingredient,
  type NourishDB,
  type PlannedMeal,
  type PlanTemplate,
  type Recipe,
  type Slot,
} from "./data";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
const fileSlots = ["breakfast", "lunch", "snack", "supper"] as const;
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 07:35");
const amount = z.number().finite().positive();
const fileIngredient = z.object({
  name: z.string().trim().min(1).max(100),
  quantity: amount,
  unit: z.string().trim().min(1).max(20),
  unit_price_kes: z.number().finite().nonnegative().nullable().optional(),
});
const fileMeal = z.object({
  id: z.string().trim().min(1).max(100),
  day: z.enum(days),
  slot: z.enum(fileSlots),
  time,
  title: z.string().trim().min(1).max(150),
  servings: amount,
  ingredients: z.array(fileIngredient).min(1),
  alternatives: z.array(z.string().trim().min(1)).default([]),
  preparation: z.string().trim().min(1),
  estimated_cost_kes: z.number().finite().nonnegative().nullable().optional(),
  completed: z.boolean().optional(),
});
const fileSchema = z
  .object({
    format: z.literal("nourish-personal-weekly-plan"),
    schema_version: z.literal(1),
    plan_id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/),
    plan_name: z.string().trim().min(1),
    repeat: z.literal("weekly"),
    start_week_on: z.literal("Monday"),
    meal_times: z.object({
      breakfast: time,
      lunch: time,
      snack: time,
      supper: time,
    }),
    meal_entries: z.array(fileMeal).length(28),
    owner_profile: z
      .object({
        currency: z.literal("KES"),
        daily_food_budget_kes: z.number().nonnegative(),
        weekly_food_budget_kes: z.number().nonnegative(),
      })
      .passthrough(),
    pricing: z
      .object({ currency: z.literal("KES") })
      .passthrough()
      .optional(),
  })
  .superRefine((value, ctx) => {
    const occupied = new Set<string>();
    const ids = new Set<string>();
    for (const [index, meal] of value.meal_entries.entries()) {
      const key = `${meal.day}:${meal.slot}`;
      if (occupied.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["meal_entries", index],
          message: `Duplicate ${key} meal`,
        });
      if (ids.has(meal.id))
        ctx.addIssue({
          code: "custom",
          path: ["meal_entries", index, "id"],
          message: "Duplicate meal ID",
        });
      if (meal.time !== value.meal_times[meal.slot])
        ctx.addIssue({
          code: "custom",
          path: ["meal_entries", index, "time"],
          message: "Meal time differs from the weekly schedule",
        });
      occupied.add(key);
      ids.add(meal.id);
    }
    for (const day of days)
      for (const slot of fileSlots)
        if (!occupied.has(`${day}:${slot}`))
          ctx.addIssue({
            code: "custom",
            path: ["meal_entries"],
            message: `Missing ${day} ${slot}`,
          });
  });
export type PersonalPlanFile = z.infer<typeof fileSchema>;
export type PersonalPlanPreview = {
  source: PersonalPlanFile;
  template: PlanTemplate;
  recipes: Recipe[];
  mealTimes: Record<Slot, string>;
};
export function isPersonalMealPlanFile(raw: unknown): boolean {
  return Boolean(
    raw &&
    typeof raw === "object" &&
    "format" in raw &&
    raw.format === "nourish-personal-weekly-plan",
  );
}
const aliases: Record<string, string> = {
  "whole milk": "milk",
  "rice dry": "rice",
  "beans dry": "beans",
  "maize dry": "maize",
  "ndengu dry": "ndengu",
  "omena dry": "omena",
  "sweet potato": "sweet potatoes",
  banana: "bananas",
  "cooking oil": "oil",
  "sukuma wiki": "sukuma",
  "tilapia edible portion": "tilapia",
};
const units: Record<string, string> = { piece: "pcs", slice: "slices" };
export function mapPlanIngredient(
  item: PersonalPlanFile["meal_entries"][number]["ingredients"][number],
): Ingredient {
  const original = item.name.toLowerCase().trim();
  const name = aliases[original] || original;
  const category =
    categories[name] ||
    (/vegetable|greens|carrot|tomato|onion|cabbage|sukuma/.test(name)
      ? "Vegetables"
      : /maize|flour|porridge|bread|rice/.test(name)
        ? "Grains"
        : /milk|yoghurt|egg/.test(name)
          ? "Dairy & eggs"
          : /fish|tilapia|omena/.test(name)
            ? "Fish"
            : /chicken|beef|pork/.test(name)
              ? "Meat"
              : "Pantry essentials");
  return {
    name,
    qty: item.quantity,
    unit: units[item.unit.toLowerCase()] || item.unit.toLowerCase(),
    category,
  };
}
const slotOf = (slot: (typeof fileSlots)[number]): Slot =>
  slot === "supper" ? "dinner" : slot;
const iconOf = (ingredients: Ingredient[], slot: Slot) => {
  const names = ingredients.map((i) => i.name);
  return names.some((x) => /chicken/.test(x))
    ? "🍗"
    : names.some((x) => /beef|pork/.test(x))
      ? "🥘"
      : names.some((x) => /fish|tilapia|omena/.test(x))
        ? "🐟"
        : slot === "breakfast"
          ? "🍳"
          : slot === "snack"
            ? "🍌"
            : "🍲";
};
export function parsePersonalMealPlan(raw: unknown): PersonalPlanPreview {
  const result = fileSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      "Invalid personal meal plan: " +
        result.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
    );
  const source = result.data;
  const planId = `imported:${source.plan_id}`;
  const recipes = source.meal_entries.map((entry) => {
    const slot = slotOf(entry.slot);
    const ingredients = entry.ingredients.map(mapPlanIngredient);
    return {
      id: `${planId}:${entry.id}`,
      name: entry.title,
      emoji: iconOf(ingredients, slot),
      ingredients,
      steps: entry.preparation,
      servings: entry.servings,
      minutes: 0,
      notes: "Preparation time not supplied in the imported plan.",
      description: "From your personal weekly plan.",
      category:
        slot === "breakfast"
          ? "Breakfast"
          : slot === "snack"
            ? "Snack"
            : "Main meal",
      mealTypes: [slot],
      substitutions: entry.alternatives,
      source: "imported" as const,
    } satisfies Recipe;
  });
  const template: PlanTemplate = {
    id: planId,
    name: "My Personal Weight-Gain Plan",
    createdAt: today(),
    description: "Your imported seven-day plan with four meals each day.",
    sourceId: source.plan_id,
    mealTimes: {
      breakfast: source.meal_times.breakfast,
      lunch: source.meal_times.lunch,
      snack: source.meal_times.snack,
      dinner: source.meal_times.supper,
    },
    items: source.meal_entries.map((entry) => ({
      day: days.indexOf(entry.day),
      slot: slotOf(entry.slot),
      recipeId: `${planId}:${entry.id}`,
      portion: 1,
    })),
  };
  return { source, template, recipes, mealTimes: template.mealTimes! };
}
const weekEnd = (week: string) =>
  format(addDays(new Date(`${week}T12:00:00`), 6), "yyyy-MM-dd");
function isUntouchedWeek(
  meals: PlannedMeal[],
  template: PlanTemplate,
  week: string,
) {
  return (
    meals.length === template.items.length &&
    template.items.every((item) => {
      const date = format(
        addDays(new Date(`${week}T12:00:00`), item.day),
        "yyyy-MM-dd",
      );
      const meal = meals.find((m) => m.date === date && m.slot === item.slot);
      return (
        meal?.status === "planned" &&
        meal.recipeId === item.recipeId &&
        meal.portion === item.portion &&
        !meal.notes &&
        !meal.addedIngredients?.length &&
        !meal.removedIngredientIndexes?.length
      );
    })
  );
}
export async function importPersonalMealPlan(
  preview: PersonalPlanPreview,
  activate: boolean,
  database: NourishDB = db,
  date = today(),
) {
  const { template, recipes, mealTimes } = preview;
  await database.transaction(
    "rw",
    [
      database.templates,
      database.recipes,
      database.ingredients,
      database.profiles,
      database.meals,
      database.planWeeks,
    ],
    async () => {
      const previousTemplate = await database.templates.get(template.id);
      const existingRecipeIds = new Set(
        await database.recipes.toCollection().primaryKeys(),
      );
      const savedRecipes: Recipe[] = [];
      for (const recipe of recipes) {
        const existing = existingRecipeIds.has(recipe.id)
          ? await database.recipes.get(recipe.id)
          : undefined;
        if (existing && existing.source !== "imported")
          throw new Error(
            `Recipe ID conflicts with another recipe: ${recipe.id}`,
          );
        savedRecipes.push({ ...recipe, favorite: existing?.favorite || false });
      }
      await database.recipes.bulkPut(savedRecipes);
      const existingIngredients = new Set(
        await database.ingredients.toCollection().primaryKeys(),
      );
      const newIngredients = catalogFromRecipes(recipes).filter(
        (item) => !existingIngredients.has(item.name),
      );
      if (newIngredients.length)
        await database.ingredients.bulkAdd(newIngredients);
      await database.templates.put({
        ...template,
        createdAt: previousTemplate?.createdAt || template.createdAt,
      });
      if (!activate) return;
      const profile = await database.profiles.get("me");
      if (!profile)
        throw new Error("Open Nourish once before activating a plan.");
      await database.profiles.update("me", {
        activeTemplateId: template.id,
        mealTimes: { ...profile.mealTimes, ...mealTimes },
      });
      const currentWeek = weekOf(date);
      const currentRecord = await database.planWeeks.get(currentWeek);
      const currentMeals = await database.meals
        .where("date")
        .between(currentWeek, weekEnd(currentWeek), true, true)
        .toArray();
      for (const item of template.items) {
        const mealDate = format(
          addDays(new Date(`${currentWeek}T12:00:00`), item.day),
          "yyyy-MM-dd",
        );
        const occupied = currentMeals.filter(
          (m) => m.date === mealDate && m.slot === item.slot,
        );
        const planned = occupied.filter((m) => m.status === "planned");
        if (
          occupied.some((m) => m.status === "eaten" || m.status === "skipped")
        ) {
          if (planned.length)
            await database.meals.bulkDelete(planned.map((m) => m.id));
          continue;
        }
        if (planned.length) {
          const existing = planned[0];
          if (
            currentRecord?.templateId === template.id &&
            (existing.recipeId !== item.recipeId ||
              existing.portion !== item.portion ||
              Boolean(existing.notes) ||
              Boolean(existing.addedIngredients?.length) ||
              Boolean(existing.removedIngredientIndexes?.length))
          )
            continue;
          await database.meals.update(planned[0].id, {
            recipeId: item.recipeId,
            portion: item.portion,
            addedIngredients: [],
            removedIngredientIndexes: [],
            notes: "",
          });
          if (planned.length > 1)
            await database.meals.bulkDelete(planned.slice(1).map((m) => m.id));
        } else
          await database.meals.add({
            id: uid(),
            date: mealDate,
            slot: item.slot,
            recipeId: item.recipeId,
            portion: item.portion,
            status: "planned",
          });
      }
      await database.planWeeks.put({
        week: currentWeek,
        templateId: template.id,
      });
      const nextWeek = format(
        addDays(new Date(`${currentWeek}T12:00:00`), 7),
        "yyyy-MM-dd",
      );
      const nextRecord = await database.planWeeks.get(nextWeek);
      const nextMeals = await database.meals
        .where("date")
        .between(nextWeek, weekEnd(nextWeek), true, true)
        .toArray();
      const oldTemplate =
        nextRecord?.templateId === template.id
          ? previousTemplate
          : nextRecord?.templateId
            ? await database.templates.get(nextRecord.templateId)
            : undefined;
      if (
        (!nextRecord && !nextMeals.length) ||
        (oldTemplate && isUntouchedWeek(nextMeals, oldTemplate, nextWeek))
      ) {
        if (nextMeals.length)
          await database.meals.bulkDelete(nextMeals.map((m) => m.id));
        await database.meals.bulkAdd(weekFromTemplate(template, nextWeek));
        await database.planWeeks.put({
          week: nextWeek,
          templateId: template.id,
        });
      }
    },
  );
}
