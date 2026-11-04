import { z } from "zod";
const id = z.string().min(1);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T12:00:00`)),
    "Invalid date",
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ingredient = z.object({
  name: id,
  qty: z.number().nonnegative(),
  unit: id,
  category: id,
});
const profile = z.object({
  id: z.literal("me"),
  name: z.string(),
  goal: z.enum(["gain", "maintain", "lose"]),
  weight: z.number().positive(),
  height: z.number().positive(),
  target: z.number().positive(),
  milestone: z.number().positive(),
  dailyBudget: z.number().nonnegative(),
  weeklyBudget: z.number().nonnegative(),
  currency: z.string().length(3),
  country: z.string(),
  meals: z.number().int().min(1).max(6),
  currentMeals: z.number().int().min(1).max(6),
  teaTarget: z.number().nonnegative(),
  restrictions: z.string(),
  likes: z.string(),
  avoids: z.string(),
  mealTimes: z.record(z.enum(["breakfast", "lunch", "dinner", "snack"]), time),
  onboarded: z.boolean(),
  personalized: z.boolean().optional(),
  activeTemplateId: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]),
});
const recipe = z.object({
  id,
  name: id,
  emoji: z.string(),
  ingredients: z.array(ingredient),
  steps: z.string(),
  servings: z.number().positive(),
  minutes: z.number().nonnegative(),
  notes: z.string().optional(),
  category: z.string().optional(),
  favorite: z.boolean().optional(),
  description: z.string().optional(),
  mealTypes: z
    .array(z.enum(["breakfast", "lunch", "dinner", "snack"]))
    .optional(),
  dietaryTags: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  substitutions: z.array(z.string()).optional(),
  image: z.string().optional(),
  source: z.enum(["builtin", "custom", "imported"]).optional(),
});
const meal = z.object({
  id,
  date,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId: id,
  portion: z.number().positive(),
  status: z.enum(["planned", "eaten", "skipped"]),
  notes: z.string().optional(),
  eatenAt: z.string().datetime().optional(),
  snapshot: recipe.optional(),
  loggedCost: z.number().nonnegative().optional(),
  addedIngredients: z.array(ingredient).optional(),
  removedIngredientIndexes: z.array(z.number().int().nonnegative()).optional(),
});
const price = z.object({
  name: id,
  unit: id,
  price: z.number().nonnegative(),
  qty: z.number().positive(),
  updatedAt: z.string(),
});
const pantry = z.object({
  id,
  name: id,
  qty: z.number().nonnegative(),
  unit: id,
  expiresOn: date.optional(),
  leftover: z.boolean().optional(),
});
const purchase = z.object({
  id,
  date,
  name: id,
  qty: z.number().nonnegative(),
  unit: id,
  amount: z.number().nonnegative(),
  checked: z.boolean(),
  listWeek: date,
  listItemId: z.string().optional(),
});
const weight = z.object({
  id,
  date,
  kg: z.number().positive(),
  note: z.string(),
});
const habit = z.object({
  id,
  date,
  key: id,
  value: z.number().nonnegative(),
});
const list = z.object({
  id,
  week: date,
  name: id,
  qty: z.number().nonnegative(),
  unit: id,
  category: id,
  checked: z.boolean(),
  actualQty: z.number().nonnegative(),
  actualCost: z.number().nonnegative(),
});
const reminder = z.object({
  id,
  label: id,
  time,
  enabled: z.boolean(),
});
const mealRecord = z.object({
  id,
  date,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipe,
  portion: z.number().positive(),
  loggedAt: z.string(),
  estimatedCost: z.number().nonnegative().optional(),
});
const template = z.object({
  id,
  name: id,
  createdAt: date,
  description: z.string().optional(),
  sourceId: z.string().optional(),
  mealTimes: z
    .record(z.enum(["breakfast", "lunch", "dinner", "snack"]), time)
    .optional(),
  items: z.array(
    z.object({
      day: z.number().int().min(0).max(6),
      slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      recipeId: id,
      portion: z.number().positive(),
    }),
  ),
});
const ingredientInfo = z.object({ name: id, category: id, unit: id });
const budgetOverride = z.object({
  id,
  period: z.enum(["daily", "weekly"]),
  date,
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});
const appearancePreference = z.object({
  id: z.literal("me"),
  theme: z.enum(["light", "dark", "system"]),
});
export const backupSchema = z.object({
  schemaVersion: z.literal(5),
  exportedAt: z.string().datetime(),
  data: z.object({
    profiles: z.array(profile),
    recipes: z.array(recipe),
    meals: z.array(meal),
    prices: z.array(price),
    pantry: z.array(pantry),
    purchases: z.array(purchase),
    weights: z.array(weight),
    habits: z.array(habit),
    lists: z.array(list),
    reminders: z.array(reminder),
    templates: z.array(template),
    mealRecords: z.array(mealRecord),
    ingredients: z.array(ingredientInfo),
    budgets: z.array(budgetOverride),
    preferences: z.array(appearancePreference),
    planWeeks: z.array(z.object({ week: date, templateId: id })),
  }),
});

export function parseBackup(raw: unknown) {
  let candidate: unknown = raw;
  if (raw && typeof raw === "object") {
    const old = raw as {
      schemaVersion?: unknown;
      data?: Record<string, unknown>;
    };
    if (
      old.schemaVersion === 1 ||
      old.schemaVersion === 2 ||
      old.schemaVersion === 3 ||
      old.schemaVersion === 4
    ) {
      if (!old.data || typeof old.data !== "object")
        throw Error("Backup data is missing.");
      const oldProfiles = Array.isArray(old.data.profiles)
        ? old.data.profiles.map((p) =>
            p && typeof p === "object" ? { currentMeals: 2, ...p } : p,
          )
        : old.data.profiles;
      const meals = Array.isArray(old.data.meals) ? old.data.meals : [];
      const recipes = Array.isArray(old.data.recipes) ? old.data.recipes : [];
      const historical = meals.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const m = value as Record<string, unknown>;
        if (m.status !== "eaten") return [];
        const recipe =
          m.snapshot ||
          recipes.find(
            (r) =>
              r &&
              typeof r === "object" &&
              (r as Record<string, unknown>).id === m.recipeId,
          );
        if (!recipe) return [];
        return [
          {
            id: m.id,
            date: m.date,
            slot: m.slot,
            recipe,
            portion: m.portion,
            loggedAt: m.eatenAt || `${m.date}T12:00:00.000Z`,
            estimatedCost: m.loggedCost,
          },
        ];
      });
      const catalog = new Map<
        string,
        { name: string; category: string; unit: string }
      >();
      for (const value of recipes) {
        if (!value || typeof value !== "object") continue;
        const ingredients = (value as Record<string, unknown>).ingredients;
        if (!Array.isArray(ingredients)) continue;
        for (const rawIngredient of ingredients) {
          if (rawIngredient && typeof rawIngredient === "object") {
            const item = rawIngredient as Record<string, unknown>;
            if (
              typeof item.name === "string" &&
              typeof item.category === "string" &&
              typeof item.unit === "string"
            )
              catalog.set(item.name.toLowerCase(), {
                name: item.name.toLowerCase(),
                category: item.category,
                unit: item.unit,
              });
          }
        }
      }
      const firstProfile = Array.isArray(oldProfiles)
        ? (oldProfiles[0] as Record<string, unknown> | undefined)
        : undefined;
      candidate = {
        ...old,
        schemaVersion: 5,
        data: {
          ...old.data,
          templates: old.data.templates || [],
          mealRecords: old.data.mealRecords || historical,
          profiles: oldProfiles,
          ingredients: old.data.ingredients || [...catalog.values()],
          budgets: old.data.budgets || [],
          planWeeks: old.data.planWeeks || [],
          preferences:
            old.data.preferences ||
            (firstProfile
              ? [{ id: "me", theme: firstProfile.theme || "system" }]
              : []),
        },
      };
    }
  }
  const parsed = backupSchema.safeParse(candidate);
  if (!parsed.success)
    throw Error(
      "Unsupported or invalid backup: " +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  return candidate as typeof parsed.data;
}
