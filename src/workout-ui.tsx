import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { useReducedMotion } from "motion/react";
import { db } from "./data";
import { animationForExercise } from "./workoutMedia";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import {
  dayForDate,
  newSession,
  workoutPlanName,
  type Exercise,
  type WorkoutDay,
  type WorkoutSession,
} from "./workouts";

type WorkoutData = {
  exercises: Exercise[];
  workoutDays: WorkoutDay[];
  workoutSessions: WorkoutSession[];
};
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const workoutSafety =
  "If you have had unintended weight loss, consider a medical evaluation before vigorous training. Stop for chest pain, dizziness or unusual breathlessness.";

export function WorkoutToday({
  data,
  navigate,
}: {
  data: WorkoutData;
  navigate: (path: string) => void;
}) {
  const now = new Date();
  const today = dayForDate(data.workoutDays, now);
  const next = Array.from({ length: 7 }, (_, i) =>
    dayForDate(data.workoutDays, addDays(now, i)),
  ).find((x) => x && x.type !== "rest" && !x.optional);
  const done = data.workoutSessions.filter(
    (x) => x.date === format(now, "yyyy-MM-dd") && x.status !== "active",
  );
  return (
    <Card className="workout-today">
      <div>
        <p className="eyebrow">MOVEMENT TODAY</p>
        <h2>{today?.title || "Your workout plan"}</h2>
        <p>
          {today?.type === "rest"
            ? "A rest day is part of the plan."
            : today?.optional
              ? "Gentle movement is optional today. Listen to your energy."
              : "Start easy and make room for regular meals."}
        </p>
        {done.length > 0 && (
          <small>
            {done.length} session{done.length === 1 ? "" : "s"} saved today
          </small>
        )}
        {next && today?.optional && (
          <small>Next strength day: {next.title}</small>
        )}
      </div>
      <Button onClick={() => navigate("/workouts")}>View workouts</Button>
    </Card>
  );
}

export function WorkoutsPage({ data }: { data: WorkoutData }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [reps, setReps] = useState("");
  const [error, setError] = useState("");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const day = data.workoutDays.find((x) => x.day === selectedDay);
  const active = [...data.workoutSessions].find((x) => x.status === "active");
  const current =
    active && active.currentIndex >= 0
      ? data.exercises.find(
          (x) => x.id === active.exerciseIds[active.currentIndex],
        )
      : undefined;
  const completedForCurrent =
    active && current
      ? active.sets.filter((x) => x.exerciseId === current.id).length
      : 0;
  const rest =
    active?.restUntil && !active.paused
      ? Math.max(0, Math.ceil((active.restUntil - tick) / 1000))
      : active?.restRemaining || 0;
  const save = async (session: WorkoutSession) => {
    try {
      setError("");
      await db.workoutSessions.put(session);
    } catch (e) {
      setError(String(e));
    }
  };
  const start = async (selected: WorkoutDay) => {
    await save({ ...newSession(selected), currentIndex: -1 });
    setReps("");
  };
  const finish = async (status: "finished" | "stopped") => {
    if (!active) return;
    await save({
      ...active,
      status,
      endedAt: new Date().toISOString(),
      restUntil: undefined,
      restRemaining: 0,
      paused: false,
    });
  };
  const advance = async () => {
    if (!active) return;
    await save({
      ...active,
      currentIndex: active.currentIndex + 1,
      restUntil: undefined,
      restRemaining: 0,
      paused: false,
    });
    setReps("");
  };
  const logSet = async () => {
    if (!active || !current || !reps.trim()) return;
    await save({
      ...active,
      sets: [
        ...active.sets,
        {
          exerciseId: current.id,
          reps: reps.trim().slice(0, 60),
          completedAt: new Date().toISOString(),
        },
      ],
      restUntil: Date.now() + active.restSeconds * 1000,
      restRemaining: undefined,
    });
    setReps("");
  };
  const pause = async () => {
    if (!active) return;
    await save(
      active.paused
        ? {
            ...active,
            paused: false,
            restUntil: active.restRemaining
              ? Date.now() + active.restRemaining * 1000
              : undefined,
            restRemaining: undefined,
          }
        : {
            ...active,
            paused: true,
            restRemaining: rest,
            restUntil: undefined,
          },
    );
  };
  const changeDay = async (update: WorkoutDay) => {
    try {
      setError("");
      await db.workoutDays.put(update);
    } catch (e) {
      setError(String(e));
    }
  };
  const history = [...data.workoutSessions]
    .filter((x) => x.status !== "active")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div className="workouts-page">
      <header className="workout-page-header">
        <p className="eyebrow">NOURISH · WORKOUTS</p>
        <h1>{workoutPlanName}</h1>
        <p>Beginner strength, easy movement and recovery across the week.</p>
      </header>
      <Card className="workout-safety">
        <p>{workoutSafety}</p>
        <p>
          Keep eating regular meals and snacks; exercise should not replace
          them.
        </p>
      </Card>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {active ? (
        <Card className="session-player">
          <div className="session-heading">
            <div>
              <p className="eyebrow">SESSION IN PROGRESS · {active.date}</p>
              <h2>{active.title}</h2>
            </div>
            <Button variant="ghost" onClick={() => void finish("stopped")}>
              Stop and save
            </Button>
          </div>
          {active.currentIndex < 0 ? (
            <div className="workout-session-step">
              <h3>Warm up gently</h3>
              <p>
                Move comfortably for 3–5 minutes before strength work. You can
                stop early and keep any completed sets.
              </p>
              <Button onClick={() => void advance()}>Begin exercises</Button>
            </div>
          ) : current ? (
            <div className="exercise-player workout-session-step">
              <p className="eyebrow">
                EXERCISE {active.currentIndex + 1} OF{" "}
                {active.exerciseIds.length}
              </p>
              <h3>{current.name}</h3>
              <ExerciseInstructions
                exercise={current}
                reducedMotion={!!reducedMotion}
              />
              <p>
                {completedForCurrent} of {current.defaultSets} suggested sets ·{" "}
                {current.defaultRepsOrDuration} per set
              </p>
              <label>
                Reps or duration completed
                <input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={current.defaultRepsOrDuration}
                  maxLength={60}
                />
              </label>
              <div className="workout-actions">
                <Button
                  disabled={!reps.trim() || active.paused}
                  onClick={() => void logSet()}
                >
                  Save set
                </Button>
                <Button variant="secondary" onClick={() => void advance()}>
                  Skip / next exercise
                </Button>
              </div>
              <div className="rest-panel">
                <label>
                  Rest seconds
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={active.restSeconds}
                    onChange={(e) =>
                      void save({
                        ...active,
                        restSeconds: Math.max(
                          15,
                          Math.min(300, Number(e.target.value) || 60),
                        ),
                      })
                    }
                  />
                </label>
                <strong role="timer">
                  {rest > 0 ? `Rest: ${rest}s` : "Ready when you are"}
                </strong>
                <Button variant="ghost" onClick={() => void pause()}>
                  {active.paused ? "Resume" : "Pause"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="workout-session-step">
              <h3>Cool down</h3>
              <p>Take 2–3 minutes of gentle movement and breathing.</p>
              <Button onClick={() => void finish("finished")}>
                Finish and save
              </Button>
            </div>
          )}
          <div className="session-notes">
            <label>
              How did it feel?
              <select
                value={active.difficulty}
                onChange={(e) =>
                  void save({
                    ...active,
                    difficulty: e.target.value as WorkoutSession["difficulty"],
                  })
                }
              >
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Session note (optional)
              <textarea
                value={active.note}
                onChange={(e) =>
                  void save({ ...active, note: e.target.value.slice(0, 500) })
                }
              />
            </label>
          </div>
        </Card>
      ) : null}
      <div
        className="workout-days"
        role="group"
        aria-label="Weekly workout days"
      >
        {[1, 2, 3, 4, 5, 6, 0].map((n) => (
          <button
            key={n}
            className={selectedDay === n ? "selected" : ""}
            onClick={() => {
              setSelectedDay(n);
              setEditing(false);
            }}
          >
            {dayNames[n].slice(0, 3)}
          </button>
        ))}
      </div>
      {day && (
        <Card className="workout-day-detail">
          <div className="session-heading">
            <div>
              <p className="eyebrow">
                {dayNames[day.day].toUpperCase()} · {day.type.toUpperCase()}
                {day.optional ? " · OPTIONAL" : ""}
              </p>
              <h2>{day.title}</h2>
            </div>
            <Button variant="ghost" onClick={() => setEditing(!editing)}>
              {editing ? "Done" : "Edit day"}
            </Button>
          </div>
          {day.type === "rest" ? (
            <p>A full rest day. There is no session to complete.</p>
          ) : (
            <>
              {day.exerciseIds.map((id, index) => {
                const exercise = data.exercises.find((x) => x.id === id);
                return (
                  exercise && (
                    <div
                      className="workout-exercise-row"
                      key={`${id}-${index}`}
                    >
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>
                          {exercise.defaultSets} suggested sets ·{" "}
                          {exercise.defaultRepsOrDuration}
                        </small>
                      </div>
                      {editing && (
                        <>
                          <select
                            aria-label={`Substitute ${exercise.name}`}
                            value={id}
                            onChange={(e) =>
                              void changeDay({
                                ...day,
                                exerciseIds: day.exerciseIds.map((v, i) =>
                                  i === index ? e.target.value : v,
                                ),
                              })
                            }
                          >
                            {data.exercises.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                          <label>
                            Sets
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={exercise.defaultSets}
                              onChange={(e) =>
                                void db.exercises.update(exercise.id, {
                                  defaultSets: Math.max(
                                    1,
                                    Math.min(5, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            Reps / duration
                            <input
                              value={exercise.defaultRepsOrDuration}
                              onChange={(e) =>
                                void db.exercises.update(exercise.id, {
                                  defaultRepsOrDuration:
                                    e.target.value.slice(0, 60) || "1",
                                })
                              }
                            />
                          </label>
                          <button
                            onClick={() =>
                              void changeDay({
                                ...day,
                                exerciseIds: day.exerciseIds.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  )
                );
              })}
              {editing && (
                <label>
                  Add exercise
                  <select
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      void changeDay({
                        ...day,
                        exerciseIds: [...day.exerciseIds, e.target.value],
                      })
                    }
                  >
                    <option value="">Choose one</option>
                    {data.exercises.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button
                disabled={!!active || !day.exerciseIds.length}
                onClick={() => void start(day)}
              >
                {active ? "Finish current session first" : "Start session"}
              </Button>
            </>
          )}
          {editing && (
            <div className="workout-day-settings">
              <label>
                Day title
                <input
                  value={day.title}
                  onChange={(e) =>
                    void changeDay({ ...day, title: e.target.value })
                  }
                />
              </label>
              <label>
                Intensity
                <select
                  value={day.type}
                  onChange={(e) =>
                    void changeDay({
                      ...day,
                      type: e.target.value as WorkoutDay["type"],
                      optional: e.target.value !== "strength",
                    })
                  }
                >
                  <option value="strength">Strength</option>
                  <option value="recovery">Recovery</option>
                  <option value="mobility">Mobility</option>
                  <option value="optional">Optional activity</option>
                  <option value="rest">Rest</option>
                </select>
              </label>
            </div>
          )}
        </Card>
      )}
      <section className="workout-history-section">
        <h2>Session history</h2>
        {history.length ? (
          history.map((x) => (
            <Card key={x.id} className="workout-history">
              <strong>{x.title}</strong>
              <span>
                {x.date} ·{" "}
                {x.status === "stopped" ? "Stopped early" : "Finished"} ·{" "}
                {x.sets.length} sets · {x.difficulty}
              </span>
              {x.note && <p>{x.note}</p>}
              <details>
                <summary>Completed sets</summary>
                {x.sets.length ? (
                  <ul>
                    {x.sets.map((set, i) => (
                      <li key={i}>
                        {data.exercises.find((e) => e.id === set.exerciseId)
                          ?.name || set.exerciseId}
                        : {set.reps}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No sets logged.</p>
                )}
              </details>
            </Card>
          ))
        ) : (
          <p className="muted">Your saved sessions will appear here.</p>
        )}
      </section>
      <Card className="workout-meals">
        <h2>Meal ideas for active days</h2>
        <p>
          From your recipe library: Eggs & bread with milk, Ugali with beans
          stew, or Rice with ndengu stew. Choose meals that suit your appetite
          and budget. Workout sessions never change your food targets.
        </p>
        <a href="/recipes">Browse recipes</a>
      </Card>
    </div>
  );
}

function ExerciseInstructions({
  exercise,
  reducedMotion,
}: {
  exercise: Exercise;
  reducedMotion: boolean;
}) {
  const animation = animationForExercise(exercise.id);
  const [playing, setPlaying] = useState(!reducedMotion);
  useEffect(() => setPlaying(!reducedMotion), [exercise.id, reducedMotion]);
  return (
    <div className="exercise-instructions">
      {animation && (
        <figure>
          {playing ? (
            <img
              src={animation.path}
              width="640"
              height="508"
              loading="lazy"
              alt={`Visual prototype of ${exercise.name}; follow the written instructions below`}
            />
          ) : (
            <div
              className="workout-animation-paused"
              role="img"
              aria-label={`${exercise.name} animation paused`}
            >
              {exercise.name} animation paused. Use the written cues below.
            </div>
          )}
          <figcaption>
            <span>Visual prototype; form has not been reviewed.</span>
            <button type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Pause animation" : "Play animation"}
            </button>
          </figcaption>
        </figure>
      )}
      <p>{exercise.instructions}</p>
      <p>
        <strong>Form cue:</strong> {exercise.formCue}
      </p>
      {exercise.caution && (
        <p>
          <strong>Take care:</strong> {exercise.caution}
        </p>
      )}
    </div>
  );
}
