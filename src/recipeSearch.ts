import type { Recipe, Slot } from "./data";

export function recipeMatchesQuery(recipe: Recipe, query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return true;
  return [
    recipe.name,
    ...recipe.ingredients.map((item) => item.name),
    ...(recipe.keywords || []),
  ].some((value) => value.toLocaleLowerCase().includes(term));
}

export function recipeAllowedInSlot(recipe: Recipe, slot: Slot) {
  return !recipe.mealTypes?.length || recipe.mealTypes.includes(slot);
}
