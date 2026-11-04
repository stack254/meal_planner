import type { Recipe, Slot } from "./data";

export function recipeMatchesQuery(recipe: Recipe, query: string) {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const searchable = normalize(
    [
      recipe.name,
      ...recipe.ingredients.map((item) => item.name),
      ...(recipe.keywords || []),
    ].join(" "),
  );
  return terms.every((term) =>
    term === "fish"
      ? ["fish", "tilapia", "omena"].some((name) => searchable.includes(name))
      : searchable.includes(term),
  );
}

export function recipeAllowedInSlot(recipe: Recipe, slot: Slot) {
  return !recipe.mealTypes?.length || recipe.mealTypes.includes(slot);
}
