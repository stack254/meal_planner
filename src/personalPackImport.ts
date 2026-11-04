import { addDays, format } from "date-fns";
import { z } from "zod";
import {
  catalogFromRecipes,
  categories,
  db,
  defaultProfile,
  today,
  uid,
  weekFromTemplate,
  weekOf,
  templateItemsForWeek,
  type Ingredient,
  type NourishDB,
  type PlanTemplate,
  type PlannedMeal,
  type Recipe,
  type Slot,
} from "./data";

const identifier = z.string().trim().min(1).max(150);
const positive = z.number().finite().positive();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const slot = z.enum(["breakfast", "lunch", "snack", "supper"]);
const unit = z.enum(["g", "kg", "ml", "l", "piece", "pcs", "slice", "slices"]);
const ingredient = z.object({
  ingredient_id: identifier,
  name: identifier,
  quantity: positive,
  unit,
  quantity_basis: z.literal("raw_or_dry_unless_ready_to_eat"),
  unit_price_kes: z.null(),
});
const recipe = z.object({
  id: identifier,
  name: identifier,
  category: z.enum(["breakfast", "main", "snack"]),
  meal_types: z.array(slot).min(1),
  servings: positive,
  ingredients: z.array(ingredient).min(1),
  preparation: z.string().trim().min(1),
  prep_time_minutes: z.number().finite().nonnegative(),
  tags: z.array(z.string()),
  allergen_tags: z.array(z.string()),
  protein_options: z.array(z.string()),
  notes: z.string(),
  estimated_cost_kes: z.null(),
  nutrition: z.object({ status: z.literal("unavailable"), source: z.null() }),
  suggested_alternative_recipe_ids: z.array(identifier),
});
const price = z.object({
  ingredient_id: identifier,
  name: identifier,
  unit,
  price_per_unit_kes: z.null(),
  source: z.string(),
});
const entry = z.object({
  id: identifier,
  recipe_id: identifier,
  title: identifier,
  week_index: z.number().int().min(1).max(4),
  weekday_index_monday_zero: z.number().int().min(0).max(6),
  slot,
  time,
  servings: positive,
  status: z.literal("planned"),
  cost_override_kes: z.null(),
});
const packSchema = z
  .object({
    format: z.literal("nourish-personal-meal-library-and-rotation"),
    schema_version: z.literal(2),
    generated_on: z.string(),
    import_mode: z.string(),
    plan_id: identifier,
    plan_name: identifier,
    profile: z.object({
      weight_kg: positive,
      height_cm: positive,
      first_goal_kg: positive,
      long_term_goal_kg: positive,
      goal: z.literal("gradual_weight_gain"),
      currency: z.literal("KES"),
      daily_budget_kes: z.number().finite().nonnegative(),
      weekly_budget_kes: z.number().finite().nonnegative(),
      tea_note: z.string(),
      medical_note: z.string(),
    }),
    timezone: z.string(),
    meal_times: z.object({
      breakfast: time,
      lunch: time,
      snack: time,
      supper: time,
    }),
    rotation: z.object({
      length_weeks: z.literal(4),
      repeat: z.literal(true),
      start_on: z.literal("current_week_monday"),
      fill_current_and_following_weeks: z.literal(true),
      template_entries: z.array(entry).length(112),
    }),
    recipes: z.array(recipe).length(144),
    ingredient_prices: z.array(price).length(72),
    pricing_policy: z.object({
      missing_prices_are_unknown_not_zero: z.literal(true),
      no_price_overwrite_on_import: z.literal(true),
    }),
    nutrition_policy: z.object({
      nutrition_unavailable_without_verified_data: z.literal(true),
    }),
    import_notes: z.array(z.string()),
  })
  .superRefine((value, ctx) => {
    const recipeIds = new Set<string>();
    const recipesById = new Map(value.recipes.map((item) => [item.id, item]));
    for (const [index, item] of value.recipes.entries()) {
      if (recipeIds.has(item.id))
        ctx.addIssue({
          code: "custom",
          path: ["recipes", index, "id"],
          message: `Duplicate recipe ID ${item.id}`,
        });
      recipeIds.add(item.id);
    }
    const priceIds = new Set<string>();
    const pricesById = new Map(
      value.ingredient_prices.map((item) => [item.ingredient_id, item]),
    );
    for (const [index, item] of value.ingredient_prices.entries()) {
      if (priceIds.has(item.ingredient_id))
        ctx.addIssue({
          code: "custom",
          path: ["ingredient_prices", index],
          message: `Duplicate ingredient ID ${item.ingredient_id}`,
        });
      priceIds.add(item.ingredient_id);
    }
    const occupied = new Set<string>();
    const entryIds = new Set<string>();
    for (const [index, item] of value.rotation.template_entries.entries()) {
      const position = `${item.week_index}:${item.weekday_index_monday_zero}:${item.slot}`;
      if (occupied.has(position))
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index],
          message: `Duplicate slot ${position}`,
        });
      if (entryIds.has(item.id))
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index, "id"],
          message: `Duplicate entry ID ${item.id}`,
        });
      if (!recipeIds.has(item.recipe_id))
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index, "recipe_id"],
          message: `Recipe ${item.recipe_id} is missing`,
        });
      const chosenRecipe = recipesById.get(item.recipe_id);
      if (chosenRecipe && !chosenRecipe.meal_types.includes(item.slot))
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index, "slot"],
          message: `${chosenRecipe.name} is not suitable for ${item.slot}`,
        });
      if (chosenRecipe && chosenRecipe.name !== item.title)
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index, "title"],
          message: "Meal title differs from its recipe name",
        });
      if (item.time !== value.meal_times[item.slot])
        ctx.addIssue({
          code: "custom",
          path: ["rotation", "template_entries", index, "time"],
          message: `Time does not match ${item.slot}`,
        });
      occupied.add(position);
      entryIds.add(item.id);
    }
    for (let week = 1; week <= 4; week++)
      for (let day = 0; day < 7; day++)
        for (const meal of ["breakfast", "lunch", "snack", "supper"])
          if (!occupied.has(`${week}:${day}:${meal}`))
            ctx.addIssue({
              code: "custom",
              path: ["rotation", "template_entries"],
              message: `Missing week ${week}, day ${day + 1}, ${meal}`,
            });
    for (const [index, item] of value.recipes.entries()) {
      for (const [ingredientIndex, component] of item.ingredients.entries()) {
        const listed = pricesById.get(component.ingredient_id);
        if (!listed)
          ctx.addIssue({
            code: "custom",
            path: [
              "recipes",
              index,
              "ingredients",
              ingredientIndex,
              "ingredient_id",
            ],
            message: `Ingredient ${component.ingredient_id} is missing from the price catalog`,
          });
        else if (
          listed.name !== component.name ||
          listed.unit !== component.unit
        )
          ctx.addIssue({
            code: "custom",
            path: ["recipes", index, "ingredients", ingredientIndex],
            message: `Ingredient ${component.ingredient_id} differs from the price catalog`,
          });
      }
      for (const alternative of item.suggested_alternative_recipe_ids)
        if (!recipeIds.has(alternative))
          ctx.addIssue({
            code: "custom",
            path: ["recipes", index, "suggested_alternative_recipe_ids"],
            message: `Alternative ${alternative} is missing`,
          });
    }
  });

export type PersonalPackFile = z.infer<typeof packSchema>;
export type PersonalPackPreview = {
  source: PersonalPackFile;
  recipes: Recipe[];
  template: PlanTemplate;
  ingredientCount: number;
};
export function isPersonalPackFile(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    "format" in value &&
    value.format === "nourish-personal-meal-library-and-rotation",
  );
}
const appSlot = (value: z.infer<typeof slot>): Slot =>
  value === "supper" ? "dinner" : value;
const appUnit = (value: string) =>
  ({ piece: "pcs", slice: "slices" })[
    value.toLowerCase() as "piece" | "slice"
  ] || value.toLowerCase();
const appName = (value: string) =>
  value.trim().toLowerCase() === "whole milk"
    ? "milk"
    : value.trim().toLowerCase();
const appIngredient = (value: z.infer<typeof ingredient>): Ingredient => {
  const name = appName(value.name);
  return {
    name,
    qty: value.quantity,
    unit: appUnit(value.unit),
    category: categories[name] || "Pantry essentials",
    quantityBasis: value.quantity_basis,
    sourceIngredientId: value.ingredient_id,
  };
};
const fingerprint = (value: Recipe) => {
  const {
    favorite: _favorite,
    importFingerprint: _fingerprint,
    ...base
  } = value;
  let hash = 2166136261;
  for (const char of JSON.stringify(base))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
};
export function parsePersonalPack(raw: unknown): PersonalPackPreview {
  const result = packSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      "Invalid personal meal pack: " +
        result.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
    );
  const source = result.data;
  const namespace = `pack:${source.plan_id}`;
  const byId = new Map(source.recipes.map((item) => [item.id, item]));
  const recipes = source.recipes.map((item) => {
    const ingredients = item.ingredients.map(appIngredient);
    const mapped: Recipe = {
      id: `${namespace}:${item.id}`,
      name: item.name,
      emoji: ingredients.some((i) => /beef|pork|chicken/.test(i.name))
        ? "🍲"
        : ingredients.some((i) => /tilapia|omena|fish/.test(i.name))
          ? "🐟"
          : item.category === "breakfast"
            ? "🍳"
            : item.category === "snack"
              ? "🍌"
              : "🍛",
      category:
        item.category === "main"
          ? "Main meal"
          : item.category === "breakfast"
            ? "Breakfast"
            : "Snack",
      mealTypes: item.meal_types.map(appSlot),
      servings: item.servings,
      ingredients,
      steps: item.preparation,
      minutes: item.prep_time_minutes,
      notes: item.notes,
      dietaryTags: item.tags,
      allergens: item.allergen_tags,
      keywords: item.protein_options,
      substitutions: item.suggested_alternative_recipe_ids.map(
        (id) => byId.get(id)!.name,
      ),
      description:
        "From your personal four-week meal pack. Ingredient quantities are raw or dry unless ready to eat.",
      source: "imported",
    };
    return { ...mapped, importFingerprint: fingerprint(mapped) };
  });
  const weeks = Array.from({ length: 4 }, (_, index) =>
    source.rotation.template_entries
      .filter((item) => item.week_index === index + 1)
      .map((item) => ({
        day: item.weekday_index_monday_zero,
        slot: appSlot(item.slot),
        recipeId: `${namespace}:${item.recipe_id}`,
        portion: item.servings,
        sourceEntryId: item.id,
      })),
  );
  const template: PlanTemplate = {
    id: namespace,
    name: "My Nourish 4-Week Kenyan Weight-Gain Rotation",
    description: "Four distinct weeks of breakfast, lunch, snack and supper.",
    sourceId: source.plan_id,
    sourceTimezone: source.timezone,
    sourceGeneratedOn: source.generated_on,
    sourceImportMode: source.import_mode,
    sourceProfileNotes: {
      tea: source.profile.tea_note,
      medical: source.profile.medical_note,
    },
    importNotes: source.import_notes,
    createdAt: today(),
    mealTimes: {
      breakfast: source.meal_times.breakfast,
      lunch: source.meal_times.lunch,
      snack: source.meal_times.snack,
      dinner: source.meal_times.supper,
    },
    items: weeks[0],
    rotation: { anchorWeek: weekOf(today()), weeks },
  };
  return {
    source,
    recipes,
    template,
    ingredientCount: source.ingredient_prices.length,
  };
}

export type PackImportMode = "skip" | "update-unchanged" | "replace-plan";
const endOfWeek = (week: string) =>
  format(addDays(new Date(`${week}T12:00:00`), 6), "yyyy-MM-dd");
function untouched(
  meal: PlannedMeal,
  old: PlanTemplate | undefined,
  week: string,
) {
  if (
    meal.status !== "planned" ||
    meal.notes ||
    meal.addedIngredients?.length ||
    meal.removedIngredientIndexes?.length ||
    meal.pantryUsed?.length
  )
    return false;
  if (!old) return false;
  const day = Math.round(
    (new Date(`${meal.date}T12:00:00`).getTime() -
      new Date(`${week}T12:00:00`).getTime()) /
      86_400_000,
  );
  const prior = templateItemsForWeek(old, week).find(
    (item) => item.day === day && item.slot === meal.slot,
  );
  return Boolean(
    prior && prior.recipeId === meal.recipeId && prior.portion === meal.portion,
  );
}
export async function importPersonalPack(
  preview: PersonalPackPreview,
  options: {
    mode: PackImportMode;
    activate: boolean;
    applyProfileDefaults: boolean;
  },
  database: NourishDB = db,
  date = today(),
) {
  const currentWeek = weekOf(date);
  const nextWeek = format(
    addDays(new Date(`${currentWeek}T12:00:00`), 7),
    "yyyy-MM-dd",
  );
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
      const previousTemplate = await database.templates.get(
        preview.template.id,
      );
      if (previousTemplate && options.mode === "skip") return;
      const profile = (await database.profiles.get("me")) || {
        ...defaultProfile,
      };
      const anchorWeek =
        previousTemplate?.rotation?.anchorWeek &&
        profile.activeTemplateId === preview.template.id
          ? previousTemplate.rotation.anchorWeek
          : currentWeek;
      const template: PlanTemplate = {
        ...preview.template,
        createdAt: previousTemplate?.createdAt || preview.template.createdAt,
        rotation: { ...preview.template.rotation!, anchorWeek },
      };
      for (const incoming of preview.recipes) {
        const existing = await database.recipes.get(incoming.id);
        if (existing && existing.source !== "imported")
          throw new Error(`Recipe ID is already used: ${incoming.id}`);
        if (
          existing &&
          options.mode === "update-unchanged" &&
          existing.importFingerprint !== fingerprint(existing)
        )
          continue;
        await database.recipes.put({
          ...incoming,
          favorite: existing?.favorite || false,
        });
      }
      const known = new Map(
        (await database.ingredients.toArray()).map((item) => [item.name, item]),
      );
      const catalog = catalogFromRecipes(preview.recipes);
      const packPriceNames = new Set(
        preview.source.ingredient_prices.map((item) => appName(item.name)),
      );
      const priceByName = new Map(
        preview.source.ingredient_prices.map((item) => [
          appName(item.name),
          item,
        ]),
      );
      for (const item of preview.source.ingredient_prices) {
        const name = appName(item.name);
        if (!catalog.some((entry) => entry.name === name))
          catalog.push({
            name,
            category: categories[name] || "Pantry essentials",
            unit: appUnit(item.unit),
          });
      }
      const updates = catalog
        .filter(
          (item) => !known.has(item.name) || packPriceNames.has(item.name),
        )
        .map((item) => ({
          ...item,
          ...known.get(item.name),
          fromPersonalPack:
            packPriceNames.has(item.name) ||
            known.get(item.name)?.fromPersonalPack,
          sourceIngredientId:
            priceByName.get(item.name)?.ingredient_id ||
            known.get(item.name)?.sourceIngredientId,
        }));
      if (updates.length) await database.ingredients.bulkPut(updates);
      await database.templates.put(template);
      if (!(await database.profiles.get("me")))
        await database.profiles.add(profile);
      if (options.applyProfileDefaults)
        await database.profiles.update("me", {
          weight: preview.source.profile.weight_kg,
          height: preview.source.profile.height_cm,
          milestone: preview.source.profile.first_goal_kg,
          target: preview.source.profile.long_term_goal_kg,
          goal: "gain",
          currency: preview.source.profile.currency,
          country: "Kenya",
          dailyBudget: preview.source.profile.daily_budget_kes,
          weeklyBudget: preview.source.profile.weekly_budget_kes,
        });
      if (!options.activate) return;
      await database.profiles.update("me", {
        activeTemplateId: template.id,
        mealTimes: template.mealTimes,
      });
      for (const week of [currentWeek, nextWeek]) {
        const record = await database.planWeeks.get(week);
        const old =
          record?.templateId === template.id
            ? previousTemplate
            : record?.templateId
              ? await database.templates.get(record.templateId)
              : undefined;
        const existing = await database.meals
          .where("date")
          .between(week, endOfWeek(week), true, true)
          .toArray();
        for (const proposed of weekFromTemplate(template, week)) {
          const sameSlot = existing.filter(
            (meal) =>
              meal.date === proposed.date && meal.slot === proposed.slot,
          );
          if (
            sameSlot.some(
              (meal) => meal.status === "eaten" || meal.status === "skipped",
            )
          )
            continue;
          const editable = sameSlot.find((meal) => meal.status === "planned");
          if (editable) {
            if (old && !untouched(editable, old, week)) continue;
            if (!old && record?.templateId === "existing") continue;
            if (
              !old &&
              (editable.notes ||
                editable.addedIngredients?.length ||
                editable.removedIngredientIndexes?.length)
            )
              continue;
            await database.meals.update(editable.id, {
              recipeId: proposed.recipeId,
              portion: proposed.portion,
              addedIngredients: [],
              removedIngredientIndexes: [],
              notes: "",
            });
          } else await database.meals.add({ ...proposed, id: uid() });
          for (const duplicate of sameSlot.filter(
            (meal) => meal.status === "planned" && meal.id !== editable?.id,
          ))
            await database.meals.delete(duplicate.id);
        }
        await database.planWeeks.put({ week, templateId: template.id });
      }
    },
  );
  if (database === db && typeof localStorage !== "undefined")
    localStorage.removeItem("nourish-erased");
}
