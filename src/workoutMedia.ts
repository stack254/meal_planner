import manifest from "./exercise_animation_manifest.json";

type Animation = {
  path: string;
  format: "gif" | "sprite";
  status: string;
  visualType: string;
  displayName: string;
};

export const exerciseAnimations = manifest.exercises as Record<
  string,
  Animation
>;

const inclinePushupAnimation: Animation = {
  path: "/assets/workouts/incline_pushup_photoreal_sprite.png",
  format: "sprite",
  status: "prototype_needs_form_review",
  visualType: "generated_3d_style",
  displayName: "Incline push-up",
};

export function animationForExercise(
  exerciseId: string,
): Animation | undefined {
  if (exerciseId === "incline_pushup") return inclinePushupAnimation;
  return exerciseAnimations[exerciseId];
}
