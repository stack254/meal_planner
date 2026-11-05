import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { db, initialize } from "./data";
import { parseBackup } from "./backup";
import { newSession, seedWorkoutPlan } from "./workouts";

describe("workout persistence", () => {
  it("seeds once, preserves edits, saves completed sets and includes them in backups", async () => {
    await initialize();
    expect(await db.exercises.count()).toBe(16);
    expect(await db.workoutDays.count()).toBe(7);
    const monday = (await db.workoutDays.get("monday"))!;
    expect(monday.exerciseIds[0]).toBe("incline_pushup");
    expect((await db.exercises.get("squat"))?.mediaPath).toBe(
      "/assets/workouts/squat.gif",
    );
    expect((await db.exercises.get("reverse_lunge"))?.mediaPath).toBe(
      "/assets/workouts/reverse_lunge.gif",
    );
    await db.workoutDays.update("monday", { title: "My easier Monday" });
    await seedWorkoutPlan();
    expect((await db.workoutDays.get("monday"))?.title).toBe(
      "My easier Monday",
    );
    const session = newSession(monday, "2026-11-02");
    session.sets.push({
      exerciseId: "incline_pushup",
      reps: "6",
      completedAt: "2026-11-02T10:00:00.000Z",
    });
    session.status = "stopped";
    session.endedAt = "2026-11-02T10:05:00.000Z";
    await db.workoutSessions.put(session);
    db.close();
    await db.open();
    expect((await db.workoutSessions.get(session.id))?.sets[0].reps).toBe("6");
    const backup = parseBackup({
      schemaVersion: 6,
      exportedAt: "2026-11-02T10:06:00.000Z",
      data: {
        profiles: await db.profiles.toArray(),
        recipes: await db.recipes.toArray(),
        meals: await db.meals.toArray(),
        prices: await db.prices.toArray(),
        pantry: await db.pantry.toArray(),
        purchases: await db.purchases.toArray(),
        weights: await db.weights.toArray(),
        habits: await db.habits.toArray(),
        lists: await db.lists.toArray(),
        reminders: await db.reminders.toArray(),
        templates: await db.templates.toArray(),
        mealRecords: await db.mealRecords.toArray(),
        ingredients: await db.ingredients.toArray(),
        budgets: await db.budgets.toArray(),
        preferences: await db.preferences.toArray(),
        planWeeks: await db.planWeeks.toArray(),
        exercises: await db.exercises.toArray(),
        workoutDays: await db.workoutDays.toArray(),
        workoutSessions: await db.workoutSessions.toArray(),
      },
    });
    expect(backup.data.workoutSessions[0].sets).toHaveLength(1);
    await db.delete();
  });
});
