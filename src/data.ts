import Dexie, { type EntityTable } from "dexie";
import type { Exercise, WorkoutDay, WorkoutSession } from "./workouts";
import { addDays, format, startOfWeek } from "date-fns";
import { curatedRecipes, builtInTemplates } from "./catalog";
export type Slot = "breakfast" | "lunch" | "dinner" | "snack";
export type Ingredient = {
  name: string;
  qty: number;
  unit: string;
  category: string;
  quantityBasis?: string;
  sourceIngredientId?: string;
};
export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  ingredients: Ingredient[];
  steps: string;
  servings: number;
  minutes: number;
  notes?: string;
  category?: string;
  favorite?: boolean;
  description?: string;
  mealTypes?: Slot[];
  dietaryTags?: string[];
  allergens?: string[];
  substitutions?: string[];
  keywords?: string[];
  image?: string;
  source?: "builtin" | "custom" | "imported";
  importFingerprint?: string;
};
export type PlannedMeal = {
  id: string;
  date: string;
  slot: Slot;
  recipeId: string;
  portion: number;
  status: "planned" | "eaten" | "skipped";
  notes?: string;
  eatenAt?: string;
  snapshot?: Recipe;
  loggedCost?: number;
  addedIngredients?: Ingredient[];
  removedIngredientIndexes?: number[];
  pantryUsed?: { pantryId: string; name: string; unit: string; qty: number }[];
};
export type Profile = {
  id: "me";
  name: string;
  goal: "gain" | "maintain" | "lose";
  weight: number;
  height: number;
  target: number;
  milestone: number;
  dailyBudget: number;
  weeklyBudget: number;
  currency: string;
  country: string;
  meals: number;
  currentMeals: number;
  teaTarget: number;
  restrictions: string;
  likes: string;
  avoids: string;
  mealTimes: Record<Slot, string>;
  onboarded: boolean;
  personalized?: boolean;
  activeTemplateId?: string;
  theme: "light" | "dark" | "system";
};
export type Price = {
  name: string;
  unit: string;
  price: number;
  qty: number;
  updatedAt: string;
};
export type Pantry = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  expiresOn?: string;
  leftover?: boolean;
  sourcePurchaseId?: string;
};
export type Purchase = {
  id: string;
  date: string;
  name: string;
  qty: number;
  unit: string;
  amount: number;
  checked: boolean;
  listWeek: string;
  listItemId?: string;
  pantryId?: string;
};
export type Weight = { id: string; date: string; kg: number; note: string };
export type Habit = { id: string; date: string; key: string; value: number };
export type ListItem = {
  id: string;
  week: string;
  name: string;
  qty: number;
  unit: string;
  category: string;
  checked: boolean;
  actualQty: number;
  actualCost: number;
};
export type IngredientInfo = {
  name: string;
  category: string;
  unit: string;
  fromPersonalPack?: boolean;
  sourceIngredientId?: string;
};
export type BudgetOverride = {
  id: string;
  period: "daily" | "weekly";
  date: string;
  amount: number;
  currency: string;
};
export type AppearancePreference = {
  id: "me";
  theme: "light" | "dark" | "system";
};
export function catalogFromRecipes(recipes: Recipe[]): IngredientInfo[] {
  const map = new Map<string, IngredientInfo>();
  for (const recipe of recipes)
    for (const item of recipe.ingredients)
      map.set(item.name.toLowerCase(), {
        name: item.name.toLowerCase(),
        category: item.category,
        unit: item.unit,
      });
  return [...map.values()];
}
export type Reminder = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
};
export type MealRecord = {
  id: string;
  date: string;
  slot: Slot;
  recipe: Recipe;
  portion: number;
  loggedAt: string;
  estimatedCost?: number;
};
export type PlanWeek = { week: string; templateId: string };
export type PlanTemplate = {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  sourceId?: string;
  sourceTimezone?: string;
  sourceGeneratedOn?: string;
  sourceImportMode?: string;
  sourceProfileNotes?: { tea: string; medical: string };
  importNotes?: string[];
  mealTimes?: Record<Slot, string>;
  items: {
    day: number;
    slot: Slot;
    recipeId: string;
    portion: number;
    sourceEntryId?: string;
  }[];
  rotation?: {
    anchorWeek: string;
    weeks: PlanTemplate["items"][];
  };
};
export const uid = () => {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === "function")
    source.getRandomValues(bytes);
  else
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};
export const today = () => format(new Date(), "yyyy-MM-dd");
export const weekOf = (date: string) =>
  format(
    startOfWeek(new Date(`${date}T12:00:00`), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
export const defaultProfile: Profile = {
  id: "me",
  name: "Friend",
  goal: "gain",
  weight: 52,
  height: 166,
  target: 65,
  milestone: 55,
  dailyBudget: 200,
  weeklyBudget: 1400,
  currency: "KES",
  country: "Kenya",
  meals: 4,
  currentMeals: 2,
  teaTarget: 5,
  restrictions: "",
  likes: "",
  avoids: "",
  mealTimes: {
    breakfast: "07:35",
    lunch: "13:00",
    dinner: "19:30",
    snack: "16:00",
  },
  onboarded: true,
  personalized: false,
  activeTemplateId: "template-gain",
  theme: "system",
};
export const categories: Record<string, string> = {
  eggs: "Dairy & eggs",
  bread: "Grains",
  ugali: "Grains",
  rice: "Grains",
  beans: "Legumes",
  ndengu: "Legumes",
  githeri: "Legumes",
  beef: "Meat",
  chicken: "Meat",
  pork: "Meat",
  omena: "Fish",
  tilapia: "Fish",
  sukuma: "Vegetables",
  cabbage: "Vegetables",
  "sweet potatoes": "Vegetables",
  arrowroots: "Vegetables",
  potatoes: "Vegetables",
  bananas: "Fruits",
  avocado: "Fruits",
  groundnuts: "Pantry essentials",
  milk: "Dairy & eggs",
  tea: "Pantry essentials",
  oil: "Pantry essentials",
  onion: "Vegetables",
  tomato: "Vegetables",
};
const i = (name: string, qty: number, unit = "g"): Ingredient => ({
  name,
  qty,
  unit,
  category: categories[name] || "Pantry essentials",
});
const recipe = (
  id: string,
  name: string,
  emoji: string,
  ingredients: Ingredient[],
  minutes = 25,
  steps = "Prepare ingredients and cook until ready. Season to taste.",
): Recipe => ({
  id,
  name,
  emoji,
  ingredients,
  minutes,
  steps,
  servings: 1,
  category: ["banana", "groundnuts", "leftovers"].includes(id)
    ? "Snack"
    : ["eggs-bread", "sweet-tea", "sweet-groundnuts"].includes(id)
      ? "Breakfast"
      : "Main meal",
  favorite: false,
});
export const seedRecipes: Recipe[] = [
  recipe(
    "eggs-bread",
    "Eggs & bread",
    "🍳",
    [i("eggs", 2, "pcs"), i("bread", 2, "slices")],
    12,
    "Cook eggs to preference. Serve with bread.",
  ),
  recipe(
    "ugali-beef",
    "Ugali, beef & sukuma",
    "🥘",
    [
      i("ugali", 100),
      i("beef", 120),
      i("sukuma", 100),
      i("onion", 30),
      i("tomato", 50),
      i("oil", 10, "ml"),
    ],
    40,
  ),
  recipe(
    "rice-beans",
    "Rice & beans",
    "🍚",
    [i("rice", 100), i("beans", 100), i("onion", 30), i("tomato", 50)],
    35,
  ),
  recipe(
    "sweet-tea",
    "Sweet potatoes & milk tea",
    "🍠",
    [i("sweet potatoes", 250), i("milk", 100, "ml"), i("tea", 3)],
    25,
  ),
  recipe(
    "githeri-sukuma",
    "Githeri & sukuma",
    "🫘",
    [i("githeri", 250), i("sukuma", 100), i("onion", 30)],
    30,
  ),
  recipe(
    "ugali-omena",
    "Ugali & omena",
    "🐟",
    [i("ugali", 100), i("omena", 100), i("tomato", 50), i("onion", 30)],
    30,
  ),
  recipe(
    "rice-chicken",
    "Rice & chicken stew",
    "🍗",
    [i("rice", 100), i("chicken", 130), i("tomato", 50), i("onion", 30)],
    45,
  ),
  recipe(
    "ugali-ndengu",
    "Ugali & ndengu",
    "🌿",
    [i("ugali", 100), i("ndengu", 110), i("tomato", 50)],
    35,
  ),
  recipe(
    "sweet-groundnuts",
    "Sweet potatoes & groundnuts",
    "🥜",
    [i("sweet potatoes", 250), i("groundnuts", 40)],
    25,
  ),
  recipe(
    "rice-beans-sukuma",
    "Rice, beans & sukuma",
    "🍲",
    [i("rice", 100), i("beans", 100), i("sukuma", 100)],
    35,
  ),
  recipe(
    "githeri-avocado",
    "Githeri & avocado",
    "🥑",
    [i("githeri", 250), i("avocado", 1, "pcs")],
    25,
  ),
  recipe(
    "ugali-pork",
    "Ugali, pork & sukuma",
    "🥘",
    [i("ugali", 100), i("pork", 120), i("sukuma", 100)],
    40,
  ),
  recipe(
    "ugali-tilapia",
    "Ugali, tilapia & sukuma",
    "🐠",
    [i("ugali", 100), i("tilapia", 150), i("sukuma", 100)],
    40,
  ),
  recipe(
    "rice-ndengu",
    "Rice & ndengu",
    "🍛",
    [i("rice", 100), i("ndengu", 110)],
    35,
  ),
  recipe(
    "banana",
    "Banana",
    "🍌",
    [i("bananas", 1, "pcs")],
    1,
    "Peel and enjoy.",
  ),
  recipe(
    "groundnuts",
    "Groundnuts",
    "🥜",
    [i("groundnuts", 40)],
    1,
    "Serve a small handful.",
  ),
  recipe(
    "leftovers",
    "Leftovers",
    "🍱",
    [],
    5,
    "Reheat stored food thoroughly. Add ingredients in recipe editor for a cost estimate.",
  ),
];
const seedPlan = [
  "eggs-bread",
  "ugali-beef",
  "rice-beans",
  "sweet-tea",
  "githeri-sukuma",
  "ugali-omena",
  "eggs-bread",
  "rice-chicken",
  "ugali-ndengu",
  "sweet-groundnuts",
  "rice-beans-sukuma",
  "githeri-avocado",
  "eggs-bread",
  "ugali-pork",
  "rice-beans",
  "sweet-tea",
  "ugali-tilapia",
  "rice-ndengu",
  "eggs-bread",
  "githeri-avocado",
  "rice-beans-sukuma",
];
export function weekFromTemplate(
  template: PlanTemplate,
  week: string,
): PlannedMeal[] {
  return templateItemsForWeek(template, week).map((item) => ({
    id: uid(),
    date: format(addDays(new Date(`${week}T12:00:00`), item.day), "yyyy-MM-dd"),
    slot: item.slot,
    recipeId: item.recipeId,
    portion: item.portion,
    status: "planned" as const,
  }));
}
export function templateItemsForWeek(template: PlanTemplate, week: string) {
  if (!template.rotation?.weeks.length) return template.items;
  const dayNumber = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  const offset = Math.round(
    (dayNumber(weekOf(week)) - dayNumber(template.rotation.anchorWeek)) / 7,
  );
  const index =
    ((offset % template.rotation.weeks.length) +
      template.rotation.weeks.length) %
    template.rotation.weeks.length;
  return template.rotation.weeks[index];
}
export const makeSeedWeek = (week: string): PlannedMeal[] => [
  ...seedPlan.map((recipeId, n) => ({
    id: uid(),
    date: format(
      addDays(new Date(`${week}T12:00:00`), Math.floor(n / 3)),
      "yyyy-MM-dd",
    ),
    slot: (["breakfast", "lunch", "dinner"] as Slot[])[n % 3],
    recipeId,
    portion: 1,
    status: "planned" as const,
  })),
  ...[
    "banana",
    "groundnuts",
    "leftovers",
    "banana",
    "groundnuts",
    "banana",
    "leftovers",
  ].map((recipeId, n) => ({
    id: uid(),
    date: format(addDays(new Date(`${week}T12:00:00`), n), "yyyy-MM-dd"),
    slot: "snack" as Slot,
    recipeId,
    portion: 1,
    status: "planned" as const,
  })),
];

export class NourishDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workoutDays!: EntityTable<WorkoutDay, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  ingredients!: EntityTable<IngredientInfo, "name">;
  budgets!: EntityTable<BudgetOverride, "id">;
  preferences!: EntityTable<AppearancePreference, "id">;
  templates!: EntityTable<PlanTemplate, "id">;
  planWeeks!: EntityTable<PlanWeek, "week">;
  mealRecords!: EntityTable<MealRecord, "id">;
  profiles!: EntityTable<Profile, "id">;
  recipes!: EntityTable<Recipe, "id">;
  meals!: EntityTable<PlannedMeal, "id">;
  prices!: EntityTable<Price, "name">;
  pantry!: EntityTable<Pantry, "id">;
  purchases!: EntityTable<Purchase, "id">;
  weights!: EntityTable<Weight, "id">;
  habits!: EntityTable<Habit, "id">;
  lists!: EntityTable<ListItem, "id">;
  reminders!: EntityTable<Reminder, "id">;
  constructor(name = "nourish") {
    super(name);
    this.version(1).stores({
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
    });
    this.version(2).stores({
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
    });
    this.version(3)
      .stores({
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
      })
      .upgrade(async (tx) => {
        await tx
          .table("profiles")
          .toCollection()
          .modify((p: Profile) => {
            if (p.currentMeals === undefined) p.currentMeals = 2;
          });
      });
    this.version(4)
      .stores({
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
      })
      .upgrade(async (tx) => {
        const eaten = (await tx
          .table("meals")
          .where("status")
          .equals("eaten")
          .toArray()) as PlannedMeal[];
        const recipes = (await tx.table("recipes").toArray()) as Recipe[];
        for (const m of eaten) {
          const recipe = m.snapshot || recipes.find((r) => r.id === m.recipeId);
          if (recipe)
            await tx.table("mealRecords").put({
              id: m.id,
              date: m.date,
              slot: m.slot,
              recipe,
              portion: m.portion,
              loggedAt: m.eatenAt || `${m.date}T12:00:00`,
              estimatedCost: m.loggedCost,
            });
        }
      });
    this.version(5)
      .stores({
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
        ingredients: "name",
        budgets: "id,date,period",
        preferences: "id",
      })
      .upgrade(async (tx) => {
        const recipes = (await tx.table("recipes").toArray()) as Recipe[];
        await tx.table("ingredients").bulkPut(catalogFromRecipes(recipes));
        const profile = (await tx.table("profiles").get("me")) as
          Profile | undefined;
        if (profile)
          await tx.table("preferences").put({ id: "me", theme: profile.theme });
      });
    this.version(6)
      .stores({
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
        ingredients: "name",
        budgets: "id,date,period",
        preferences: "id",
      })
      .upgrade(async (tx) => {
        const existing = new Set(
          (await tx.table("recipes").toCollection().primaryKeys()) as string[],
        );
        const additions = curatedRecipes.filter((r) => !existing.has(r.id));
        if (additions.length) await tx.table("recipes").bulkAdd(additions);
        const templateIds = new Set(
          (await tx
            .table("templates")
            .toCollection()
            .primaryKeys()) as string[],
        );
        const newTemplates = builtInTemplates.filter(
          (t) => !templateIds.has(t.id),
        );
        if (newTemplates.length)
          await tx.table("templates").bulkAdd(newTemplates);
        await tx.table("ingredients").bulkPut(catalogFromRecipes(additions));
      });
    this.version(7)
      .stores({
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
        ingredients: "name",
        budgets: "id,date,period",
        preferences: "id",
        planWeeks: "week",
      })
      .upgrade(async (tx) => {
        const meals = (await tx.table("meals").toArray()) as PlannedMeal[];
        const weeks = [...new Set(meals.map((m) => weekOf(m.date)))];
        if (weeks.length)
          await tx
            .table("planWeeks")
            .bulkPut(weeks.map((week) => ({ week, templateId: "existing" })));
      });
    this.version(8).stores({
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
      ingredients: "name",
      budgets: "id,date,period",
      preferences: "id",
      planWeeks: "week",
      exercises: "id",
      workoutDays: "id,day",
      workoutSessions: "id,date,status",
    });
  }
}
export const db = new NourishDB();
let initialization: Promise<void> | undefined;
export function initialize() {
  return (initialization ??= (async () => {
    if (
      !(await db.profiles.count()) &&
      !(
        typeof localStorage !== "undefined" &&
        localStorage.getItem("nourish-erased")
      )
    ) {
      await db.transaction(
        "rw",
        [
          db.profiles,
          db.recipes,
          db.meals,
          db.weights,
          db.ingredients,
          db.preferences,
          db.templates,
          db.planWeeks,
        ],
        async () => {
          await db.profiles.add(defaultProfile);
          await db.recipes.bulkAdd([...seedRecipes, ...curatedRecipes]);
          await db.templates.bulkPut(builtInTemplates);
          await db.ingredients.bulkPut(
            catalogFromRecipes([...seedRecipes, ...curatedRecipes]),
          );
          await db.preferences.put({ id: "me", theme: defaultProfile.theme });
          await db.meals.bulkAdd(
            weekFromTemplate(builtInTemplates[0], weekOf(today())),
          );
          await db.planWeeks.put({
            week: weekOf(today()),
            templateId: builtInTemplates[0].id,
          });
        },
      );
    }
    if (await db.profiles.count()) await ensureUpcomingPlan();
    if (!(
      typeof localStorage !== "undefined" &&
      localStorage.getItem("nourish-erased")
    )) {
      const { seedWorkoutPlan } = await import("./workouts");
      await seedWorkoutPlan();
    }
  })());
}
export async function ensureUpcomingPlan(
  date = today(),
  database: NourishDB = db,
) {
  const week = weekOf(date);
  const next = format(addDays(new Date(`${week}T12:00:00`), 7), "yyyy-MM-dd");
  await database.transaction(
    "rw",
    database.meals,
    database.planWeeks,
    database.templates,
    database.profiles,
    async () => {
      const profile = await database.profiles.get("me");
      const active = profile?.activeTemplateId
        ? await database.templates.get(profile.activeTemplateId)
        : undefined;
      const template = active || builtInTemplates[0];
      for (const w of [week, next]) {
        if (await database.planWeeks.get(w)) continue;
        const already = await database.meals
          .where("date")
          .between(
            w,
            format(addDays(new Date(`${w}T12:00:00`), 6), "yyyy-MM-dd"),
            true,
            true,
          )
          .count();
        if (!already)
          await database.meals.bulkAdd(weekFromTemplate(template, w));
        await database.planWeeks.put({
          week: w,
          templateId: already ? "existing" : template.id,
        });
      }
    },
  );
}
export async function setActiveTemplate(
  templateId: string,
  fromDate = today(),
) {
  await db.transaction(
    "rw",
    db.profiles,
    db.templates,
    db.meals,
    db.planWeeks,
    async () => {
      const nextTemplate = await db.templates.get(templateId);
      if (!nextTemplate) throw new Error("Plan template is unavailable.");
      await db.profiles.update("me", { activeTemplateId: templateId });
      const nextWeek = format(
        addDays(new Date(`${weekOf(fromDate)}T12:00:00`), 7),
        "yyyy-MM-dd",
      );
      const weekRecord = await db.planWeeks.get(nextWeek);
      if (
        !weekRecord ||
        weekRecord.templateId === "existing" ||
        weekRecord.templateId === templateId
      )
        return;
      const oldTemplate = await db.templates.get(weekRecord.templateId);
      if (!oldTemplate) return;
      const weekEnd = format(
        addDays(new Date(`${nextWeek}T12:00:00`), 6),
        "yyyy-MM-dd",
      );
      const weekMeals = await db.meals
        .where("date")
        .between(nextWeek, weekEnd, true, true)
        .toArray();
      const oldItems = templateItemsForWeek(oldTemplate, nextWeek);
      const matches =
        weekMeals.length === oldItems.length &&
        oldItems.every((item) => {
          const date = format(
            addDays(new Date(`${nextWeek}T12:00:00`), item.day),
            "yyyy-MM-dd",
          );
          const meal = weekMeals.find(
            (m) => m.date === date && m.slot === item.slot,
          );
          return (
            meal?.status === "planned" &&
            meal.recipeId === item.recipeId &&
            meal.portion === item.portion &&
            !meal.notes &&
            !meal.addedIngredients?.length &&
            !meal.removedIngredientIndexes?.length
          );
        });
      if (!matches) return;
      await db.meals.bulkDelete(weekMeals.map((meal) => meal.id));
      await db.meals.bulkAdd(weekFromTemplate(nextTemplate, nextWeek));
      await db.planWeeks.update(nextWeek, { templateId });
    },
  );
}
export function money(v: number, p: Profile) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: p.currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${p.currency} ${Math.round(v)}`;
  }
}
export function quantityInUnit(qty: number, from: string, to: string) {
  const units: Record<string, [string, number]> = {
    g: ["mass", 1],
    kg: ["mass", 1000],
    ml: ["volume", 1],
    l: ["volume", 1000],
    pcs: ["count", 1],
    piece: ["count", 1],
    pieces: ["count", 1],
  };
  const source = from.trim().toLowerCase();
  const target = to.trim().toLowerCase();
  if (source === target) return qty;
  if (!units[source] || !units[target] || units[source][0] !== units[target][0])
    return null;
  return (qty * units[source][1]) / units[target][1];
}
export function mealCost(recipe: Recipe, prices: Price[], portion = 1) {
  let total = 0;
  const missing: string[] = [];
  for (const item of recipe.ingredients) {
    const price = prices.find(
      (p) =>
        p.name.toLowerCase() === item.name.toLowerCase() &&
        quantityInUnit(p.qty, p.unit, item.unit) !== null,
    );
    const packageQty =
      price && quantityInUnit(price.qty, price.unit, item.unit);
    if (!price || !packageQty || !Number.isFinite(price.price))
      missing.push(item.name);
    else
      total +=
        ((price.price / packageQty) * item.qty * portion) / recipe.servings;
  }
  return { total, missing };
}
export function effectiveRecipe(meal: PlannedMeal, recipe: Recipe): Recipe {
  // Normalize the base recipe to one serving before appending foods chosen per serving.
  return {
    ...recipe,
    servings: 1,
    ingredients: [
      ...recipe.ingredients
        .filter((_, index) => !meal.removedIngredientIndexes?.includes(index))
        .map((i) => ({
          ...i,
          qty: i.qty / recipe.servings,
        })),
      ...(meal.addedIngredients || []),
    ],
  };
}
export async function addFoods(
  meal: PlannedMeal,
  ingredients: Ingredient[],
  scope: "meal" | "future",
  recipe: Recipe,
) {
  if (!ingredients.length) return;
  await db.transaction("rw", db.meals, db.recipes, async () => {
    if (scope === "meal") {
      const current = await db.meals.get(meal.id);
      await db.meals.update(meal.id, {
        addedIngredients: [
          ...(current?.addedIngredients || []),
          ...ingredients,
        ],
      });
    } else {
      const current = await db.recipes.get(recipe.id);
      if (current)
        await db.recipes.update(recipe.id, {
          ingredients: [...current.ingredients, ...ingredients],
        });
    }
  });
}
export async function addFood(
  meal: PlannedMeal,
  ingredient: Ingredient,
  scope: "meal" | "future",
  recipe: Recipe,
) {
  await addFoods(meal, [ingredient], scope, recipe);
}
export function shoppingNeeds(
  meals: PlannedMeal[],
  recipes: Recipe[],
  pantry: Pantry[],
  week: string,
) {
  const needed = new Map<string, ListItem>();
  for (const meal of meals.filter(
    (m) => weekOf(m.date) === week && m.status === "planned",
  )) {
    const recipe = recipes.find((r) => r.id === meal.recipeId);
    if (!recipe) continue;
    const effective = effectiveRecipe(meal, recipe);
    for (const ing of effective.ingredients) {
      const key = `${ing.name}|${ing.unit}`;
      const prev = needed.get(key);
      if (prev) prev.qty += (ing.qty * meal.portion) / effective.servings;
      else
        needed.set(key, {
          id: `needed:${week}:${encodeURIComponent(key)}`,
          week,
          name: ing.name,
          unit: ing.unit,
          qty: (ing.qty * meal.portion) / effective.servings,
          category: ing.category,
          checked: false,
          actualQty: 0,
          actualCost: 0,
        });
    }
  }
  const weekEnd = format(
    addDays(new Date(`${week}T12:00:00`), 6),
    "yyyy-MM-dd",
  );
  for (const item of needed.values()) {
    item.qty = Math.max(
      0,
      item.qty -
        pantry
          .filter(
            (p) =>
              p.name.toLowerCase() === item.name.toLowerCase() &&
              quantityInUnit(p.qty, p.unit, item.unit) !== null &&
              (!p.expiresOn || p.expiresOn >= weekEnd),
          )
          .reduce(
            (s, p) => s + (quantityInUnit(p.qty, p.unit, item.unit) || 0),
            0,
          ),
    );
  }
  return [...needed.values()].filter((i) => i.qty > 0);
}
export const slots: Slot[] = ["breakfast", "lunch", "dinner", "snack"];

export async function recordGroceryPurchase(
  input: {
    name: string;
    qty: number;
    unit: string;
    amount: number;
    date?: string;
    listWeek?: string;
    listItemId?: string;
    addToPantry?: boolean;
    updatePrice?: boolean;
  },
  database: NourishDB = db,
) {
  const name = input.name.trim().toLowerCase();
  const unit = input.unit.trim().toLowerCase();
  if (
    !name ||
    !unit ||
    !Number.isFinite(input.qty) ||
    input.qty <= 0 ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  )
    throw new Error("Enter a valid item, quantity and amount.");
  const date = input.date || today();
  const id = uid();
  const pantryId = input.addToPantry === false ? undefined : `purchase:${id}`;
  const purchase: Purchase = {
    id,
    date,
    name,
    qty: input.qty,
    unit,
    amount: input.amount,
    checked: true,
    listWeek: input.listWeek || weekOf(date),
    listItemId: input.listItemId,
    pantryId,
  };
  await database.transaction(
    "rw",
    database.purchases,
    database.pantry,
    database.prices,
    database.lists,
    async () => {
      if (
        input.listItemId &&
        (await database.lists.get(input.listItemId))?.checked
      )
        throw new Error("This item is already marked as purchased.");
      await database.purchases.add(purchase);
      if (pantryId)
        await database.pantry.add({
          id: pantryId,
          name,
          qty: input.qty,
          unit,
          sourcePurchaseId: id,
        });
      if (input.updatePrice !== false)
        await database.prices.put({
          name,
          qty: input.qty,
          unit,
          price: input.amount,
          updatedAt: date,
        });
      if (input.listItemId)
        await database.lists.update(input.listItemId, {
          checked: true,
          actualCost: input.amount,
          actualQty: input.qty,
        });
    },
  );
  return purchase;
}

export async function setMealStatus(
  meal: PlannedMeal,
  status: PlannedMeal["status"],
  recipes: Recipe[],
  prices: Price[],
  database: NourishDB = db,
) {
  const recipe = recipes.find((r) => r.id === meal.recipeId);
  await database.transaction(
    "rw",
    database.meals,
    database.mealRecords,
    database.pantry,
    async () => {
      const current = await database.meals.get(meal.id);
      if (!current) return;
      if (current.status === "eaten" && status === "eaten") return;
      for (const used of current.pantryUsed || []) {
        const stock = await database.pantry.get(used.pantryId);
        if (stock)
          await database.pantry.update(stock.id, { qty: stock.qty + used.qty });
      }
      if (status === "eaten" && recipe) {
        const snapshot = structuredClone(effectiveRecipe(meal, recipe));
        const loggedAt = new Date().toISOString();
        const estimate = mealCost(snapshot, prices, meal.portion);
        const estimatedCost = estimate.missing.length
          ? undefined
          : estimate.total;
        const pantryUsed: NonNullable<PlannedMeal["pantryUsed"]> = [];
        const stock = await database.pantry.toArray();
        for (const ingredient of snapshot.ingredients) {
          let needed = (ingredient.qty * meal.portion) / snapshot.servings;
          for (const item of stock
            .filter(
              (p) =>
                p.name.toLowerCase() === ingredient.name.toLowerCase() &&
                (!p.expiresOn || p.expiresOn >= meal.date) &&
                quantityInUnit(p.qty, p.unit, ingredient.unit) !== null,
            )
            .sort((a, b) =>
              (a.expiresOn || "9999").localeCompare(b.expiresOn || "9999"),
            )) {
            if (needed <= 0) break;
            const available =
              quantityInUnit(item.qty, item.unit, ingredient.unit) || 0;
            const taken = Math.min(needed, available);
            if (taken <= 0) continue;
            const stockQty = quantityInUnit(taken, ingredient.unit, item.unit)!;
            item.qty = Math.max(0, item.qty - stockQty);
            needed -= taken;
            pantryUsed.push({
              pantryId: item.id,
              name: item.name,
              unit: item.unit,
              qty: stockQty,
            });
            await database.pantry.update(item.id, { qty: item.qty });
          }
        }
        await database.mealRecords.put({
          id: meal.id,
          date: meal.date,
          slot: meal.slot,
          recipe: snapshot,
          portion: meal.portion,
          loggedAt,
          estimatedCost,
        });
        await database.meals.update(meal.id, {
          status,
          eatenAt: loggedAt,
          snapshot,
          loggedCost: estimatedCost,
          pantryUsed,
        });
      } else {
        if (current.pantryUsed?.length || current.status === "eaten")
          await database.mealRecords.delete(meal.id);
        await database.meals.update(meal.id, {
          status,
          eatenAt: undefined,
          pantryUsed: [],
          snapshot: undefined,
          loggedCost: undefined,
        });
      }
    },
  );
}
export function affordableAlternatives(
  current: Recipe,
  recipes: Recipe[],
  prices: Price[],
  restrictions: string,
) {
  const blocked = restrictions
    .toLowerCase()
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const currentCost = mealCost(current, prices);
  if (currentCost.missing.length) return [];
  return recipes
    .filter(
      (r) =>
        r.id !== current.id &&
        (r.category || "Main meal") === (current.category || "Main meal") &&
        !r.ingredients.some((i) =>
          blocked.some((b) => i.name.toLowerCase().includes(b)),
        ),
    )
    .map((r) => ({ recipe: r, cost: mealCost(r, prices) }))
    .filter((x) => !x.cost.missing.length && x.cost.total < currentCost.total)
    .sort((a, b) => a.cost.total - b.cost.total)
    .slice(0, 4);
}
export function budgetFor(
  profile: Profile,
  overrides: BudgetOverride[],
  period: "daily" | "weekly",
  date: string,
) {
  const key = period === "weekly" ? weekOf(date) : date;
  return (
    overrides.find(
      (b) => b.id === `${period}:${key}` && b.currency === profile.currency,
    )?.amount ??
    (period === "weekly" ? profile.weeklyBudget : profile.dailyBudget)
  );
}
