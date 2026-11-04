import { addDays, format, parseISO } from "date-fns";
import type { PlannedMeal, Profile, Slot } from "./data";
export const slotOrder: Slot[] = ["breakfast", "lunch", "snack", "dinner"];
export function mealTime(meal: PlannedMeal, times: Profile["mealTimes"]): Date {
  const [hours, minutes] = (times[meal.slot] || "12:00").split(":").map(Number);
  const date = parseISO(meal.date);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
export function nextMeal(
  meals: PlannedMeal[],
  times: Profile["mealTimes"],
  now = new Date(),
) {
  const planned = meals
    .filter((m) => m.status === "planned")
    .sort((a, b) => +mealTime(a, times) - +mealTime(b, times));
  const upcoming = planned.find((m) => +mealTime(m, times) >= +now);
  // Keep an overdue meal visible until its slot has passed by two hours.
  const overdue = [...planned].reverse().find((m) => {
    const delta = +now - +mealTime(m, times);
    return delta > 0 && delta <= 2 * 60 * 60 * 1000;
  });
  const meal = overdue || upcoming;
  if (!meal) return null;
  const minutes = Math.ceil((+mealTime(meal, times) - +now) / 60000);
  return {
    meal,
    minutes,
    label:
      minutes > 0
        ? `${meal.slot === "dinner" ? "Supper" : meal.slot[0].toUpperCase() + meal.slot.slice(1)} in ${minutes} minute${minutes === 1 ? "" : "s"}`
        : minutes >= -2
          ? `${meal.slot === "dinner" ? "Supper" : meal.slot[0].toUpperCase() + meal.slot.slice(1)} is due now`
          : `${meal.slot === "dinner" ? "Supper" : meal.slot[0].toUpperCase() + meal.slot.slice(1)} was due ${Math.abs(minutes)} minutes ago`,
  };
}
export function nextWeekDate(current: string) {
  return format(addDays(parseISO(current), 7), "yyyy-MM-dd");
}
