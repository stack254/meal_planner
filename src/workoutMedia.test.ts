import { describe, expect, it } from "vitest";
import { animationForExercise, exerciseAnimations } from "./workoutMedia";
import { seedExercises } from "./workouts";

describe("workout media registry", () => {
  it("maps every exercise ID to its own playable local GIF", () => {
    expect(Object.keys(exerciseAnimations).sort()).toEqual(
      seedExercises.map((x) => x.id).sort(),
    );
    for (const exercise of seedExercises) {
      const animation = animationForExercise(exercise.id);
      expect(animation?.path).toBe(
        exercise.id === "incline_pushup"
          ? "/assets/workouts/incline_pushup_photoreal_sprite.png"
          : `/assets/workouts/${exercise.id}.gif`,
      );
    }
    expect(animationForExercise("incline_pushup")?.format).toBe("sprite");
    expect(animationForExercise("wall_pushup")).toBeUndefined();
  });
});
