import manifest from "./exercise_animation_manifest.json";

type Animation = {
  path: string;
  status: string;
  visualType: string;
  displayName: string;
};

export const exerciseAnimations = manifest.exercises as Record<
  string,
  Animation
>;

export function animationForExercise(
  exerciseId: string,
): Animation | undefined {
  return exerciseAnimations[exerciseId];
}
