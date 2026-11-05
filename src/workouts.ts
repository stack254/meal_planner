import { format } from "date-fns";
import plan from "./workout-plan.json";
import { db, uid } from "./data";
import { animationForExercise } from "./workoutMedia";

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  instructions: string;
  formCue: string;
  caution: string;
  defaultSets: number;
  defaultRepsOrDuration: string;
  restSeconds: number;
  mediaPath?: string;
};
export type WorkoutDay = {
  id: string;
  day: number;
  title: string;
  type: "strength" | "recovery" | "mobility" | "optional" | "rest";
  exerciseIds: string[];
  optional: boolean;
};
export type WorkoutSet = {
  exerciseId: string;
  reps: string;
  completedAt: string;
};
export type WorkoutSession = {
  id: string;
  date: string;
  dayId: string;
  title: string;
  exerciseIds: string[];
  sets: WorkoutSet[];
  currentIndex: number;
  status: "active" | "finished" | "stopped";
  startedAt: string;
  endedAt?: string;
  difficulty: "easy" | "moderate" | "hard";
  note: string;
  restSeconds: number;
  restUntil?: number;
  restRemaining?: number;
  paused: boolean;
};

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
export const seedExercises: Exercise[] = plan.exerciseLibrary.map((item) => ({
  id: item.id,
  name: item.name,
  muscleGroup: item.muscleGroup,
  instructions:
    item.id === "plank"
      ? "Place forearms under shoulders and brace body from head to heels; breathe steadily."
      : item.instructions,
  formCue: item.formCue,
  caution: item.caution,
  defaultSets: item.defaultSets,
  defaultRepsOrDuration: item.defaultRepsOrDuration,
  restSeconds: parseInt(item.restBetweenSets, 10) || 60,
  mediaPath: animationForExercise(item.id)?.path,
}));
export const seedWorkoutDays: WorkoutDay[] = plan.weeklySchedule.map(
  (item) => ({
    id: item.day,
    day: weekdays.indexOf(item.day),
    title: item.title,
    type: item.type as WorkoutDay["type"],
    exerciseIds: item.exerciseIds,
    optional: item.optional,
  }),
);
export const workoutPlanName = plan.title;
export const dayForDate = (days: WorkoutDay[], date: Date) =>
  days.find((d) => d.day === date.getDay());
export const sessionDate = (date = new Date()) => format(date, "yyyy-MM-dd");
export function newSession(
  day: WorkoutDay,
  date = sessionDate(),
): WorkoutSession {
  return {
    id: uid(),
    date,
    dayId: day.id,
    title: day.title,
    exerciseIds: [...day.exerciseIds],
    sets: [],
    currentIndex: 0,
    status: "active",
    startedAt: new Date().toISOString(),
    difficulty: "easy",
    note: "",
    restSeconds: 60,
    paused: false,
  };
}
export async function seedWorkoutPlan() {
  await db.transaction("rw", db.exercises, db.workoutDays, async () => {
    const exerciseIds = new Set(
      await db.exercises.toCollection().primaryKeys(),
    );
    const dayIds = new Set(await db.workoutDays.toCollection().primaryKeys());
    const exercises = seedExercises.filter((x) => !exerciseIds.has(x.id));
    const days = seedWorkoutDays.filter((x) => !dayIds.has(x.id));
    if (exercises.length) await db.exercises.bulkAdd(exercises);
    if (days.length) await db.workoutDays.bulkAdd(days);
  });
}
