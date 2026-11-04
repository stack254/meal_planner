import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  StrictMode,
  type ReactNode,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { liveQuery } from "dexie";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  startOfMonth,
  startOfWeek,
  parseISO,
} from "date-fns";
import {
  Home,
  CalendarDays,
  ShoppingBasket,
  TrendingUp,
  Menu,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  PenLine,
  Trash2,
  Copy,
  Sun,
  Moon,
  Download,
  Upload,
  WifiOff,
  Leaf,
  Wallet,
  BookOpen,
  Settings,
  Archive,
  RefreshCw,
  X,
  Scale,
  Coffee,
  Droplets,
  AlertCircle,
  Search,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { motion, useReducedMotion } from "motion/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUiStore } from "./uiStore";
import {
  db,
  initialize,
  defaultProfile,
  seedRecipes,
  mealCost,
  shoppingNeeds,
  money,
  slots,
  today,
  weekOf,
  uid,
  setMealStatus,
  recordGroceryPurchase,
  quantityInUnit,
  affordableAlternatives,
  budgetFor,
  catalogFromRecipes,
  effectiveRecipe,
  addFoods,
  weekFromTemplate,
  templateItemsForWeek,
  ensureUpcomingPlan,
  setActiveTemplate,
  type PlanTemplate,
  type IngredientInfo,
  type BudgetOverride,
  type MealRecord,
  type Profile,
  type Recipe,
  type PlannedMeal,
  type Price,
  type Pantry,
  type Purchase,
  type Weight,
  type Habit,
  type ListItem,
  type Reminder,
  type Ingredient,
  type Slot,
} from "./data";
import { parseBackup } from "./backup";
import {
  parsePersonalMealPlan,
  importPersonalMealPlan,
  isPersonalMealPlanFile,
  type PersonalPlanPreview,
} from "./mealPlanImport";
import {
  parsePersonalPack,
  importPersonalPack,
  isPersonalPackFile,
  type PersonalPackPreview,
  type PackImportMode,
} from "./personalPackImport";
import { nextMeal, slotOrder } from "./schedule";
import { recipeMatchesQuery, recipeAllowedInSlot } from "./recipeSearch";
import { curatedRecipes, builtInTemplates } from "./catalog";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Modal } from "./components/ui/dialog";
const WeightChart = lazy(() =>
  import("./components/charts").then((m) => ({ default: m.WeightChart })),
);
const SpendingChart = lazy(() =>
  import("./components/charts").then((m) => ({ default: m.SpendingChart })),
);
import "./style.css";

type Data = {
  profile: Profile;
  recipes: Recipe[];
  meals: PlannedMeal[];
  prices: Price[];
  pantry: Pantry[];
  purchases: Purchase[];
  weights: Weight[];
  habits: Habit[];
  lists: ListItem[];
  reminders: Reminder[];
  templates: PlanTemplate[];
  mealRecords: MealRecord[];
  ingredients: IngredientInfo[];
  budgets: BudgetOverride[];
  planWeeks: { week: string; templateId: string }[];
};
function useData() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    let subscription: { unsubscribe: () => void } | undefined;
    initialize()
      .then(() => {
        if (!alive) return;
        subscription = liveQuery(async () => {
          const [
            profile,
            appearance,
            recipes,
            meals,
            prices,
            pantry,
            purchases,
            weights,
            habits,
            lists,
            reminders,
            templates,
            mealRecords,
            ingredients,
            budgets,
            planWeeks,
          ] = await Promise.all([
            db.profiles.get("me"),
            db.preferences.get("me"),
            db.recipes.toArray(),
            db.meals.toArray(),
            db.prices.toArray(),
            db.pantry.toArray(),
            db.purchases.toArray(),
            db.weights.toArray(),
            db.habits.toArray(),
            db.lists.toArray(),
            db.reminders.toArray(),
            db.templates.toArray(),
            db.mealRecords.toArray(),
            db.ingredients.toArray(),
            db.budgets.toArray(),
            db.planWeeks.toArray(),
          ]);
          const savedProfile = profile || defaultProfile;
          return {
            profile: {
              ...savedProfile,
              theme: appearance?.theme || savedProfile.theme,
            },
            recipes,
            meals,
            prices,
            pantry,
            purchases,
            weights,
            habits,
            lists,
            reminders,
            templates,
            mealRecords,
            ingredients,
            budgets,
            planWeeks,
          };
        }).subscribe({
          next: (x) => {
            if (alive) setData(x);
          },
          error: (e) => setError(String(e)),
        });
      })
      .catch((e) => setError(String(e)));
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);
  return { data, error };
}
function Empty({
  icon,
  heading,
  body,
  action,
}: {
  icon: ReactNode;
  heading: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{heading}</h3>
      <p>{body}</p>
      {action}
    </Card>
  );
}
function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
const fmt = (d: string) => format(parseISO(d), "EEE, d MMM");
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const inStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
function App() {
  const { data, error } = useData();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [update, setUpdate] = useState<(() => void) | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(inStandaloneMode);
  useEffect(() => {
    const offerInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const finishInstall = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", offerInstall);
    window.addEventListener("appinstalled", finishInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", offerInstall);
      window.removeEventListener("appinstalled", finishInstall);
    };
  }, []);
  const requestInstall = async () => {
    if (!installPrompt) return;
    const pending = installPrompt;
    setInstallPrompt(null);
    try {
      await pending.prompt();
      await pending.userChoice;
    } catch {
      // The browser menu remains available if its prompt is dismissed.
    }
  };
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updateSW(true));
      },
    });
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const dark =
      data.profile.theme === "dark" ||
      (data.profile.theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [data?.profile.theme]);
  if (error)
    return (
      <main className="center">
        <h1>Unable to open Nourish</h1>
        <p>{error}</p>
        <p>Check browser storage permissions and try again.</p>
      </main>
    );
  if (!data)
    return (
      <main className="app-loading" role="status" aria-live="polite">
        <div className="app-loading-brand">
          <span>
            <Leaf size={28} />
          </span>
          <strong>Nourish</strong>
        </div>
        <div className="app-loading-art" aria-hidden="true">
          <span>🍃</span>
          <span>🥑</span>
          <span>🥣</span>
        </div>
        <h1>Your day starts gently.</h1>
        <p>Opening your saved meals and plans…</p>
        <div className="app-loading-track" aria-hidden="true">
          <span />
        </div>
      </main>
    );

  return (
    <Shell
      data={data}
      offline={offline}
      update={update}
      installed={installed}
      installAvailable={Boolean(installPrompt)}
      onInstall={() => void requestInstall()}
    />
  );
}
function Shell({
  data,
  offline,
  update,
  installed,
  installAvailable,
  onInstall,
}: {
  data: Data;
  offline: boolean;
  update: (() => void) | null;
  installed: boolean;
  installAvailable: boolean;
  onInstall: () => void;
}) {
  const location = useLocation();
  const nav = useNavigate();
  const reduced = useReducedMotion();
  const tabs = [
    ["/", "Home", Home],
    ["/plan", "Planner", CalendarDays],
    ["/shop", "Shopping", ShoppingBasket],
    ["/progress", "Progress", TrendingUp],
    ["/more", "More", Menu],
  ] as const;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={21} />
          </span>
          <span>
            Nourish<small>Eat well. Spend wisely. Grow healthier.</small>
          </span>
        </div>
        <nav>
          {tabs.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          Small meals.
          <br />
          Better habits.
          <br />A healthier you.
        </div>
      </aside>
      <div className="main-area">
        {(offline || update) && (
          <div className="notice">
            {offline ? (
              <>
                <WifiOff size={16} /> Offline: saved data is still available.
              </>
            ) : (
              <>
                An update is ready.{" "}
                <button onClick={() => update?.()}>Reload now</button>
              </>
            )}
          </div>
        )}
        {installAvailable && !installed && (
          <div className="install-banner" role="status">
            <span>
              <Download size={20} />
            </span>
            <div>
              <b>Keep Nourish close</b>
              <p>Install it for quick access to your meals.</p>
            </div>
            <Button onClick={onInstall}>Install Nourish</Button>
          </div>
        )}
        <ReminderBanner data={data} />
        <motion.main
          key={location.pathname}
          className="content"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Routes>
            <Route
              path="/"
              element={<Dashboard data={data} navigate={nav} />}
            />
            <Route path="/plan" element={<Planner data={data} />} />
            <Route path="/shop" element={<Shop data={data} />} />
            <Route path="/progress" element={<Progress data={data} />} />
            <Route path="/more" element={<More />} />
            <Route path="/recipes" element={<Recipes data={data} />} />
            <Route path="/pantry" element={<PantryPage data={data} />} />
            <Route path="/habits" element={<Habits data={data} />} />
            <Route path="/budget" element={<BudgetPage data={data} />} />
            <Route path="/insights" element={<Insights data={data} />} />
            <Route path="/history" element={<MealHistory data={data} />} />
            <Route path="/profile" element={<ProfilePage data={data} />} />
            <Route path="/personalize" element={<Onboarding data={data} />} />
            <Route path="/backup" element={<Backup data={data} />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  data={data}
                  installed={installed}
                  installAvailable={installAvailable}
                  onInstall={onInstall}
                />
              }
            />
          </Routes>
        </motion.main>
      </div>
      <nav className="bottom-nav">
        {tabs.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            end={to === "/"}
            to={to}
            className={({ isActive }) =>
              `bottom-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function ReminderBanner({ data }: { data: Data }) {
  const [minute, setMinute] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  void minute;
  const day = today(),
    time = format(new Date(), "HH:mm");
  const due = [...data.reminders].filter(
    (r) =>
      r.enabled &&
      r.time <= time &&
      (!["breakfast", "lunch", "dinner", "snack"].includes(r.id) ||
        !data.mealRecords.some((m) => m.date === day && m.slot === r.id)) &&
      r.id !== "weigh",
  );
  const weigh = data.reminders.find(
    (r) =>
      r.id === "weigh" &&
      r.enabled &&
      r.time <= time &&
      new Date().getDay() === 0 &&
      !data.weights.some((w) => w.date >= weekOf(day)),
  );
  if (weigh) due.push(weigh);
  const reminder = due
    .sort((a, b) => b.time.localeCompare(a.time))
    .find(
      (r) =>
        !dismissed.includes(`${day}:${r.id}`) &&
        !sessionStorage.getItem(`nourish-reminder:${day}:${r.id}`),
    );
  if (!reminder) return null;
  return (
    <div className="reminder-banner" role="status">
      <span className="stat-icon sage">
        <Coffee size={18} />
      </span>
      <div>
        <b>{reminder.label} reminder</b>
        <p>
          {reminder.id === "weigh"
            ? "If today suits you, you can add a weight entry."
            : "Ready for a meal? Your plan is here whenever you are."}
        </p>
      </div>
      <button
        className="icon-btn"
        aria-label="Dismiss reminder"
        onClick={() => {
          sessionStorage.setItem(`nourish-reminder:${day}:${reminder.id}`, "1");
          setDismissed([...dismissed, `${day}:${reminder.id}`]);
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
function Onboarding({ data }: { data: Data }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(data.profile);
  const [busy, setBusy] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [pendingPlan, setPendingPlan] = useState<unknown | null>(null);
  const [restorePreview, setRestorePreview] = useState<ReturnType<
    typeof parseBackup
  > | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const readBackup = async (file: File) => {
    try {
      setRestoreError("");
      const raw: unknown = JSON.parse(await file.text());
      if (isPersonalPackFile(raw) || isPersonalMealPlanFile(raw)) {
        if (isPersonalPackFile(raw)) parsePersonalPack(raw);
        else parsePersonalMealPlan(raw);
        setPendingPlan(raw);
        setRestorePreview(null);
        return;
      }
      setPendingPlan(null);
      setRestorePreview(parseBackup(raw));
    } catch (e) {
      setRestoreError(
        e instanceof Error ? e.message : "Could not read this file.",
      );
      setRestorePreview(null);
      setPendingPlan(null);
    }
  };
  const restore = async () => {
    if (
      !restorePreview ||
      !confirm("Replace local Nourish data with this backup?")
    )
      return;
    setBusy(true);
    try {
      await db.transaction(
        "rw",
        tables.map((t) => db.table(t)),
        async () => {
          for (const t of tables) await db.table(t).clear();
          for (const t of tables)
            await db.table(t).bulkAdd(restorePreview.data[t]);
        },
      );
      localStorage.removeItem("nourish-erased");
      location.reload();
    } catch (e) {
      setRestoreError(String(e));
      setBusy(false);
    }
  };
  const set = (key: keyof Profile, value: unknown) =>
    setDraft((p) => ({ ...p, [key]: value }));
  const finish = async () => {
    setBusy(true);
    setFinishError("");
    try {
      await db.transaction(
        "rw",
        [
          db.profiles,
          db.preferences,
          db.recipes,
          db.ingredients,
          db.templates,
          db.meals,
          db.planWeeks,
        ],
        async () => {
          await db.profiles.put({
            ...draft,
            onboarded: true,
            personalized: true,
          });
          await db.preferences.put({ id: "me", theme: draft.theme });
          if (!data.recipes.length)
            await db.recipes.bulkPut([...seedRecipes, ...curatedRecipes]);
          if (!data.ingredients.length)
            await db.ingredients.bulkPut(
              catalogFromRecipes([...seedRecipes, ...curatedRecipes]),
            );
          if (!data.templates.length)
            await db.templates.bulkPut(builtInTemplates);
          if (!data.meals.length) {
            await db.meals.bulkAdd(
              weekFromTemplate(builtInTemplates[0], weekOf(today())),
            );
            await db.planWeeks.put({
              week: weekOf(today()),
              templateId: builtInTemplates[0].id,
            });
          }
        },
      );
      if (!data.planWeeks.length) await ensureUpcomingPlan();
      localStorage.removeItem("nourish-erased");
      navigate(
        pendingPlan ? "/plan" : "/",
        pendingPlan ? { state: { planFile: pendingPlan } } : undefined,
      );
    } catch (error) {
      setFinishError(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Please try again.",
      );
      setBusy(false);
    }
  };
  return (
    <main className="onboard">
      <div className="onboard-art">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={21} />
          </span>
          Nourish
        </div>
        <div className="art-bowl">
          🥑<span>🍚</span>
          <i>🥬</i>
        </div>
        <div>
          <p className="eyebrow light">WELCOME TO YOUR NEW ROUTINE</p>
          <h1>
            Small meals.
            <br />
            Better habits.
            <br />A healthier you.
          </h1>
          <p>
            Plan simply, shop wisely, and see your progress one day at a time.
          </p>
        </div>
      </div>
      <div className="onboard-form">
        <div className="step-dots">
          {[0, 1, 2].map((n) => (
            <span key={n} className={n === step ? "active" : ""} />
          ))}
        </div>
        {step === 0 ? (
          <>
            <p className="eyebrow">STEP 1 OF 3</p>
            <h2>Let’s make this yours.</h2>
            <p className="muted">You can change everything later.</p>
            <div className="onboard-restore">
              <label className="file-label">
                <Upload size={17} /> Restore a backup
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) =>
                    e.target.files?.[0] && readBackup(e.target.files[0])
                  }
                />
              </label>
              {restoreError && <p className="error">{restoreError}</p>}
              {pendingPlan !== null && (
                <p className="onboard-plan-ready" role="status">
                  Your weekly plan is ready. Finish your profile to review its
                  28 meals.
                </p>
              )}
              {restorePreview && (
                <div className="import-preview">
                  <b>Backup ready to restore</b>
                  <p>
                    {restorePreview.data.meals.length} planned meals ·{" "}
                    {restorePreview.data.weights.length} weight entries
                  </p>
                  <Button disabled={busy} onClick={restore}>
                    Replace local data and restore
                  </Button>
                </div>
              )}
            </div>
            <label>
              Your name
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Your goal
              <select
                value={draft.goal}
                onChange={(e) => set("goal", e.target.value)}
              >
                <option value="gain">Gain weight gradually</option>
                <option value="maintain">Maintain weight</option>
                <option value="lose">Lose weight gradually</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Current weight (kg)
                <input
                  type="number"
                  min="1"
                  value={draft.weight}
                  onChange={(e) => set("weight", +e.target.value)}
                />
              </label>
              <label>
                Height (cm)
                <input
                  type="number"
                  min="1"
                  value={draft.height}
                  onChange={(e) => set("height", +e.target.value)}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                First milestone (kg)
                <input
                  type="number"
                  min="1"
                  value={draft.milestone}
                  onChange={(e) => set("milestone", +e.target.value)}
                />
              </label>
              <label>
                Long-term goal (kg)
                <input
                  type="number"
                  min="1"
                  value={draft.target}
                  onChange={(e) => set("target", +e.target.value)}
                />
              </label>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <p className="eyebrow">STEP 2 OF 3</p>
            <h2>Meals that fit your life.</h2>
            <div className="form-grid">
              <label>
                Daily food budget
                <input
                  type="number"
                  min="0"
                  value={draft.dailyBudget}
                  onChange={(e) => set("dailyBudget", +e.target.value)}
                />
              </label>
              <label>
                Weekly food budget
                <input
                  type="number"
                  min="0"
                  value={draft.weeklyBudget}
                  onChange={(e) => set("weeklyBudget", +e.target.value)}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Country
                <input
                  value={draft.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </label>
              <label>
                Currency code
                <input
                  maxLength={3}
                  value={draft.currency}
                  onChange={(e) =>
                    set("currency", e.target.value.toUpperCase())
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Current meals per day
                <select
                  value={draft.currentMeals}
                  onChange={(e) => set("currentMeals", +e.target.value)}
                >
                  <option value="1">About 1</option>
                  <option value="2">About 2</option>
                  <option value="3">About 3</option>
                  <option value="4">About 4</option>
                </select>
              </label>
              <label>
                Desired meals per day
                <select
                  value={draft.meals}
                  onChange={(e) => set("meals", +e.target.value)}
                >
                  <option value="2">2 meals</option>
                  <option value="3">3 meals</option>
                  <option value="4">3 meals + snack</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              {slots.map((slot) => (
                <label key={slot}>
                  {slot} time
                  <input
                    type="time"
                    value={draft.mealTimes[slot]}
                    onChange={(e) =>
                      set("mealTimes", {
                        ...draft.mealTimes,
                        [slot]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">STEP 3 OF 3</p>
            <h2>Your tastes, your rules.</h2>
            <p className="muted">
              Optional details help you choose meals safely.
            </p>
            <label>
              Allergies or dietary restrictions
              <input
                placeholder="e.g. peanuts, vegetarian"
                value={draft.restrictions}
                onChange={(e) => set("restrictions", e.target.value)}
              />
            </label>
            <label>
              Foods you enjoy
              <input
                placeholder="e.g. beans, avocado"
                value={draft.likes}
                onChange={(e) => set("likes", e.target.value)}
              />
            </label>
            <label>
              Foods you avoid
              <input
                placeholder="e.g. fish"
                value={draft.avoids}
                onChange={(e) => set("avoids", e.target.value)}
              />
            </label>
            <p className="hint">
              Your information stays in this browser unless you export a backup.
            </p>
          </>
        )}
        <div className="onboard-actions">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button
            disabled={
              busy ||
              draft.weight <= 0 ||
              draft.height <= 0 ||
              draft.currency.length !== 3
            }
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          >
            {busy
              ? "Opening your plan…"
              : step < 2
                ? "Continue"
                : "Start my journey"}{" "}
            <ChevronRight size={18} />
          </Button>
        </div>
        {finishError && (
          <p className="error" role="alert">
            {finishError}
          </p>
        )}
      </div>
    </main>
  );
}
function Dashboard({
  data,
  navigate,
}: {
  data: Data;
  navigate: (path: string) => void;
}) {
  const {
    profile: p,
    meals,
    recipes,
    prices,
    weights,
    habits,
    purchases,
  } = data;
  const [now, setNow] = useState(() => new Date());
  const [actionMeal, setActionMeal] = useState<PlannedMeal | null>(null);
  const [actionTab, setActionTab] = useState<"food" | "replace" | "details">(
    "food",
  );
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const day = format(now, "yyyy-MM-dd");
  useEffect(() => {
    void ensureUpcomingPlan(day);
  }, [day]);
  const todays = meals
    .filter((m) => m.date === day)
    .sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
  const upcoming = nextMeal(meals, p.mealTimes, now);
  const next = upcoming?.meal;
  const recipe = recipes.find((r) => r.id === next?.recipeId);
  const completed = todays.filter((m) => m.status === "eaten").length;
  const dayMessage =
    completed === 0
      ? "Your day is ready. Begin with the next meal when it suits you."
      : completed >= todays.length
        ? "You made room for your meals today. Take a moment to notice what worked."
        : "One meal at a time is a good rhythm. Your plan is here when you need it.";
  const planned = todays
    .filter((m) => m.status !== "skipped")
    .reduce((s, m) => {
      const r = recipes.find((r) => r.id === m.recipeId);
      return (
        s + (r ? mealCost(effectiveRecipe(m, r), prices, m.portion).total : 0)
      );
    }, 0);
  const plannedMissing = todays.some((m) => {
    const r = recipes.find((x) => x.id === m.recipeId);
    return (
      r && mealCost(effectiveRecipe(m, r), prices, m.portion).missing.length > 0
    );
  });
  const shoppingCount = shoppingNeeds(meals, recipes, data.pantry, weekOf(day));
  const spent = purchases
    .filter((x) => x.date === day)
    .reduce((s, x) => s + x.amount, 0);
  const latest = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const milestoneProgress =
    p.milestone === p.weight
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            (((latest?.kg ?? p.weight) - p.weight) / (p.milestone - p.weight)) *
              100,
          ),
        );
  const tea = habits.find((h) => h.date === day && h.key === "tea")?.value || 0;
  const water =
    habits.find((h) => h.date === day && h.key === "water")?.value || 0;
  return (
    <>
      <div className="welcome">
        <div className="welcome-content">
          <p className="eyebrow">{format(now, "EEEE, d MMMM yyyy")}</p>
          <h1>
            Good{" "}
            {now.getHours() < 12
              ? "morning"
              : now.getHours() < 17
                ? "afternoon"
                : "evening"}
            , {p.name} <span>✳</span>
          </h1>
          <p>{dayMessage}</p>
          <div
            className="welcome-progress"
            aria-label={`${completed} of ${todays.length} meals enjoyed today`}
          >
            <div className="welcome-progress-dots" aria-hidden="true">
              {todays.map((meal) => (
                <span
                  key={meal.id}
                  className={
                    meal.status === "eaten"
                      ? "done"
                      : meal.status === "skipped"
                        ? "skipped"
                        : ""
                  }
                />
              ))}
            </div>
            <strong>
              {completed} of {todays.length} meals enjoyed today
            </strong>
          </div>
          <Button variant="secondary" onClick={() => navigate("/plan")}>
            See today’s plan <ChevronRight size={16} />
          </Button>
        </div>
        <div className="header-flower">✿</div>
      </div>
      {!p.personalized && (
        <Card className="starter-card">
          <div>
            <span className="starter-label">READY TO USE · SAMPLE PROFILE</span>
            <h2>Start with a plan, then make it yours.</h2>
            <p>
              Today’s four meals and shopping needs are prepared for you. The 52
              kg profile and KSh budget are examples—review them before using
              weight or budget insights.
            </p>
          </div>
          <div className="starter-actions">
            <Button onClick={() => navigate("/profile")}>
              Personalize profile
            </Button>
            <Button variant="secondary" onClick={() => navigate("/plan")}>
              Explore plans
            </Button>
          </div>
        </Card>
      )}
      <div className="stat-grid">
        <Card>
          <span className="stat-icon sage">
            <Check size={19} />
          </span>
          <p>Meals enjoyed</p>
          <strong>
            {completed}
            <small> / {todays.length || p.meals}</small>
          </strong>
          <span className="stat-foot">today</span>
        </Card>
        <Card>
          <span className="stat-icon peach">
            <Wallet size={19} />
          </span>
          <p>Planned meals</p>
          <strong>
            {prices.length && !plannedMissing ? money(planned, p) : "—"}
          </strong>
          <span className="stat-foot">
            {plannedMissing
              ? "some prices missing"
              : prices.length
                ? "estimated cost"
                : "add ingredient prices"}
          </span>
        </Card>
        <Card>
          <span className="stat-icon cream">
            <ShoppingBasket size={19} />
          </span>
          <p>Actual spending</p>
          <strong>{money(spent, p)}</strong>
          <span className="stat-foot">recorded today</span>
        </Card>
      </div>
      <div className="dashboard-grid">
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">COMING UP</p>
              <h2>Your next meal</h2>
            </div>
            <button className="text-btn" onClick={() => navigate("/plan")}>
              View plan <ChevronRight size={16} />
            </button>
          </div>
          {next && recipe ? (
            <Card className="next-meal">
              <div
                className="meal-illustration"
                style={
                  recipe.image
                    ? {
                        backgroundImage: `url(${recipe.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {!recipe.image && <span>{recipe.emoji}</span>}
                <div className="orb a" />
                <div className="orb b" />
              </div>
              <div className="meal-info">
                <span className="pill">
                  {next.slot === "dinner" ? "supper" : next.slot} ·{" "}
                  {p.mealTimes[next.slot]}
                </span>
                <p className="countdown" aria-live="polite">
                  {upcoming?.label}
                  {next.date !== day ? ` · ${fmt(next.date)}` : ""}
                </p>
                <h3>{recipe.name}</h3>
                <p>
                  {effectiveRecipe(next, recipe).ingredients.length
                    ? effectiveRecipe(next, recipe)
                        .ingredients.map((i) => `${i.qty} ${i.unit} ${i.name}`)
                        .join(" · ")
                    : "Add ingredients to this recipe"}
                </p>
                <div className="meal-meta">
                  <span>
                    ◷{" "}
                    {recipe.minutes > 0
                      ? `${recipe.minutes} min`
                      : "Time not set"}
                  </span>
                  <span>
                    {mealCost(
                      effectiveRecipe(next, recipe),
                      prices,
                      next.portion,
                    ).missing.length
                      ? "Cost needs prices"
                      : money(
                          mealCost(
                            effectiveRecipe(next, recipe),
                            prices,
                            next.portion,
                          ).total,
                          p,
                        )}
                  </span>
                  <span>
                    {next.portion} portion{next.portion === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="button-row">
                  <Button
                    onClick={() =>
                      setMealStatus(next, "eaten", recipes, prices)
                    }
                  >
                    <Check size={17} /> Mark eaten
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setMealStatus(next, "skipped", recipes, prices)
                    }
                  >
                    Skip
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionTab("details");
                      setActionMeal(next);
                    }}
                  >
                    View recipe
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionTab("food");
                      setActionMeal(next);
                    }}
                  >
                    Add food
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionTab("replace");
                      setActionMeal(next);
                    }}
                  >
                    Replace
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Empty
              icon={<CalendarDays />}
              heading="A fresh day to plan"
              body="Add a meal to see what’s next."
              action={
                <Button onClick={() => navigate("/plan")}>Open planner</Button>
              }
            />
          )}
          {actionMeal && (
            <MealActions
              meal={actionMeal}
              data={data}
              initialTab={actionTab}
              onClose={() => setActionMeal(null)}
            />
          )}
          <Card className="shopping-reminder">
            <ShoppingBasket size={20} />
            <div>
              <b>
                {shoppingCount.length
                  ? `${shoppingCount.length} ingredients to shop for`
                  : "Shopping list is ready"}
              </b>
              <p>
                {shoppingCount
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(" · ") ||
                  "Your planned meals are covered by your pantry."}
              </p>
            </div>
            <button onClick={() => navigate("/shop")}>
              Open list <ChevronRight size={16} />
            </button>
          </Card>
          <Card className="today-timeline">
            <h2>Today’s meals</h2>
            {todays.map((m) => {
              const r = recipes.find((x) => x.id === m.recipeId);
              return r ? (
                <div key={m.id}>
                  <span>
                    {p.mealTimes[m.slot]} ·{" "}
                    {m.slot === "dinner" ? "Supper" : m.slot}
                  </span>
                  <b>{r.name}</b>
                  <small>{m.status}</small>
                  <button
                    onClick={() => {
                      setActionTab("details");
                      setActionMeal(m);
                    }}
                    aria-label={`View ${r.name}`}
                  >
                    View
                  </button>
                </div>
              ) : null;
            })}
          </Card>
          <div className="section-heading">
            <div>
              <p className="eyebrow">A LITTLE EVERY DAY</p>
              <h2>Daily rhythm</h2>
            </div>
            <button className="text-btn" onClick={() => navigate("/habits")}>
              All habits <ChevronRight size={16} />
            </button>
          </div>
          <div className="habit-row">
            <Card>
              <Coffee size={22} />
              <div>
                <b>Tea</b>
                <span>
                  {tea} cups today · usual {p.teaTarget}
                </span>
              </div>
              <button
                className="round-add"
                aria-label="Add tea cup"
                onClick={() => setHabit(habits, "tea", tea + 1)}
              >
                +
              </button>
            </Card>
            <Card>
              <Droplets size={22} />
              <div>
                <b>Water</b>
                <span>{water} glasses today</span>
              </div>
              <button
                className="round-add"
                aria-label="Add water glass"
                onClick={() => setHabit(habits, "water", water + 1)}
              >
                +
              </button>
            </Card>
          </div>
        </div>
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR JOURNEY</p>
              <h2>Progress, gently</h2>
            </div>
          </div>
          <Card className="journey">
            <div className="journey-top">
              <span className="stat-icon peach">
                <Scale size={20} />
              </span>
              <span>Latest weight</span>
            </div>
            <strong>
              {latest?.kg ?? "—"}
              {latest && <small> kg</small>}
            </strong>
            <p>
              {latest
                ? `Starting point ${p.weight} kg · First milestone ${p.milestone} kg`
                : "No weigh-in recorded yet · Add one in Progress"}
            </p>
            <div
              className="milestone-line"
              role="progressbar"
              aria-label="Progress toward first milestone"
              aria-valuenow={Math.round(milestoneProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${milestoneProgress}%` }} />
            </div>
            <div className="journey-footer">
              <span>Goal {p.target} kg</span>
              <button
                className="text-btn"
                onClick={() => navigate("/progress")}
              >
                View journey <ChevronRight size={16} />
              </button>
            </div>
          </Card>
          <Card className="encourage">
            <span>✦</span>
            <h3>
              {completed
                ? "A little progress, your way."
                : "Start where you are."}
            </h3>
            <p>{dayMessage}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
async function setHabit(
  habits: Habit[],
  key: string,
  value: number,
  date = today(),
) {
  const existing = habits.find((h) => h.date === date && h.key === key);
  await db.habits.put({
    id: existing?.id || uid(),
    date,
    key,
    value: Math.max(0, value),
  });
}
function Planner({ data }: { data: Data }) {
  const navigate = useNavigate();
  const route = useLocation();
  const plannerDate = useUiStore((x) => x.plannerDate);
  const setPlannerDate = useUiStore((x) => x.setPlannerDate);
  const view = useUiStore((x) => x.plannerView);
  const setView = useUiStore((x) => x.setPlannerView);
  const week = weekOf(plannerDate);
  const weeklyLimit = budgetFor(data.profile, data.budgets, "weekly", week);
  const [editing, setEditing] = useState<Partial<PlannedMeal> | null>(null);
  const [actionMeal, setActionMeal] = useState<PlannedMeal | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [applying, setApplying] = useState(false);
  const [importPreview, setImportPreview] =
    useState<PersonalPlanPreview | null>(null);
  const [packPreview, setPackPreview] = useState<PersonalPackPreview | null>(
    null,
  );
  const [packMode, setPackMode] = useState<PackImportMode>("update-unchanged");
  const [packActivate, setPackActivate] = useState(true);
  const [packProfileDefaults, setPackProfileDefaults] = useState(false);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [expandedDays, setExpandedDays] = useState<string[]>([plannerDate]);
  useEffect(() => {
    const planFile = (route.state as { planFile?: unknown } | null)?.planFile;
    if (!planFile) return;
    try {
      setImportError("");
      if (isPersonalPackFile(planFile))
        setPackPreview(parsePersonalPack(planFile));
      else setImportPreview(parsePersonalMealPlan(planFile));
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Could not read this meal plan.",
      );
    }
    navigate(route.pathname, { replace: true, state: null });
  }, [route.state, route.pathname, navigate]);
  useEffect(() => setExpandedDays([plannerDate]), [plannerDate]);
  useEffect(() => {
    if (weekOf(plannerDate) >= weekOf(today()))
      void ensureUpcomingPlan(plannerDate);
  }, [plannerDate]);
  const { meals, recipes, prices, profile: p, templates } = data;
  const repeatingTemplate =
    templates.find((t) => t.id === p.activeTemplateId) || builtInTemplates[0];
  const days = Array.from({ length: 7 }, (_, n) =>
    format(addDays(parseISO(week), n), "yyyy-MM-dd"),
  );
  const visible = view === "today" ? [plannerDate] : days;
  const weekMeals = meals.filter((m) => days.includes(m.date));
  const estimate = weekMeals
    .filter((m) => m.status !== "skipped")
    .reduce((sum, m) => {
      const r = recipes.find((r) => r.id === m.recipeId);
      return (
        sum + (r ? mealCost(effectiveRecipe(m, r), prices, m.portion).total : 0)
      );
    }, 0);
  const missing = [
    ...new Set(
      weekMeals.flatMap((m) => {
        const r = recipes.find((r) => r.id === m.recipeId);
        return r
          ? mealCost(effectiveRecipe(m, r), prices, m.portion).missing
          : [];
      }),
    ),
  ];
  const save = async (m: Partial<PlannedMeal>) => {
    const old = m.id ? meals.find((x) => x.id === m.id) : undefined;
    const saved = {
      id: m.id || uid(),
      date: m.date || today(),
      slot: m.slot || "breakfast",
      recipeId: m.recipeId || recipes[0]?.id,
      portion: m.portion || 1,
      status: "planned" as const,
      notes: m.notes || "",
      addedIngredients: old?.addedIngredients,
      removedIngredientIndexes: old?.removedIngredientIndexes,
      eatenAt: old?.eatenAt,
      snapshot: old?.snapshot,
      loggedCost: old?.loggedCost,
      pantryUsed: old?.pantryUsed,
    };
    await db.meals.put(saved);
    if (m.status === "eaten")
      await setMealStatus(saved, "eaten", recipes, prices);
    else if (old?.status === "eaten" || m.status === "skipped")
      await setMealStatus(
        saved,
        m.status === "skipped" ? "skipped" : "planned",
        recipes,
        prices,
      );
    setEditing(null);
  };
  const createWeek = async () => {
    const occupied = new Set(weekMeals.map((m) => `${m.date}|${m.slot}`));
    const additions = weekFromTemplate(repeatingTemplate, week).filter(
      (m) => !occupied.has(`${m.date}|${m.slot}`),
    );
    if (!additions.length) return;
    await db.meals.bulkAdd(additions);
  };
  const saveTemplate = async () => {
    if (!templateName.trim() || !weekMeals.length) return;
    await db.templates.add({
      id: uid(),
      name: templateName.trim(),
      createdAt: today(),
      items: weekMeals
        .filter((m) => m.status !== "skipped")
        .map((m) => ({
          day: days.indexOf(m.date),
          slot: m.slot,
          recipeId: m.recipeId,
          portion: m.portion,
        })),
    });
    setTemplateName("");
  };
  const applyTemplate = async (id: string, repeat = false) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    const chosen =
      repeat && template.rotation
        ? { ...template, rotation: { ...template.rotation, anchorWeek: week } }
        : template;
    if (chosen !== template) await db.templates.put(chosen);
    await db.transaction("rw", db.meals, async () => {
      for (const item of templateItemsForWeek(chosen, week)) {
        const date = days[item.day];
        const existing = weekMeals.find(
          (m) => m.date === date && m.slot === item.slot,
        );
        if (existing?.status === "eaten" || existing?.status === "skipped")
          continue;
        if (existing)
          await db.meals.update(existing.id, {
            recipeId: item.recipeId,
            portion: item.portion,
            addedIngredients: [],
            removedIngredientIndexes: [],
          });
        else
          await db.meals.add({
            id: uid(),
            date,
            slot: item.slot,
            recipeId: item.recipeId,
            portion: item.portion,
            status: "planned",
          });
      }
    });
    if (repeat) await setActiveTemplate(id);
    if (chosen.mealTimes)
      await db.profiles.update("me", { mealTimes: chosen.mealTimes });
    setApplying(false);
  };
  const selectPlanFile = async (file?: File) => {
    setImportError("");
    setImportNotice("");
    setImportPreview(null);
    if (!file) return;
    if (file.size > 3_000_000) {
      setImportError("This file is too large for a meal plan (3 MB maximum).");
      return;
    }
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (isPersonalPackFile(raw)) {
        setPackPreview(parsePersonalPack(raw));
        return;
      }
      if (!isPersonalMealPlanFile(raw)) {
        setImportError(
          "This is not a weekly meal plan. For a full Nourish backup, go to More → Data & backup.",
        );
        return;
      }
      setImportPreview(parsePersonalMealPlan(raw));
    } catch (error) {
      setImportError(
        error instanceof SyntaxError
          ? "This file could not be read as JSON. Choose a weekly plan .json file."
          : error instanceof Error
            ? error.message
            : "Could not read this meal plan.",
      );
    }
  };
  const savePack = async () => {
    if (!packPreview) return;
    if (
      packMode === "replace-plan" &&
      templates.some((item) => item.id === packPreview.template.id) &&
      !confirm(
        "Replace this imported plan's default recipes and upcoming unchanged meals? Your meal history and edited meals will be kept.",
      )
    )
      return;
    setImportBusy(true);
    setImportError("");
    try {
      await importPersonalPack(packPreview, {
        mode: packMode,
        activate: packActivate,
        applyProfileDefaults: packProfileDefaults,
      });
      setImportNotice(
        packMode === "skip" &&
          templates.some((item) => item.id === packPreview.template.id)
          ? "This meal pack was already saved. Nothing changed."
          : packActivate
            ? "Your four-week rotation is active. This week and next week are ready."
            : "Meal pack saved. You can activate it from your plans.",
      );
      setPackPreview(null);
      if (packActivate) {
        setPlannerDate(today());
        setView("today");
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Meal pack could not be imported. No changes were saved.",
      );
    } finally {
      setImportBusy(false);
    }
  };
  const saveImportedPlan = async (activate: boolean) => {
    if (!importPreview) return;
    setImportBusy(true);
    setImportError("");
    try {
      await importPersonalMealPlan(importPreview, activate);
      setImportNotice(
        activate
          ? "Your personal plan is ready for this week and will repeat. Your meal history is safe."
          : "Plan saved. Choose it from your plans when you are ready.",
      );
      setImportPreview(null);
      if (activate) {
        setPlannerDate(today());
        setView("today");
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Import failed. Your data was not changed.",
      );
    } finally {
      setImportBusy(false);
    }
  };
  const move = (direction: number) => {
    const date = parseISO(plannerDate);
    setPlannerDate(
      format(
        view === "month"
          ? addMonths(date, direction)
          : view === "week"
            ? addWeeks(date, direction)
            : addDays(date, direction),
        "yyyy-MM-dd",
      ),
    );
  };
  const calendarStart = startOfWeek(startOfMonth(parseISO(plannerDate)), {
    weekStartsOn: 1,
  });
  const calendarDays = Array.from({ length: 42 }, (_, n) =>
    format(addDays(calendarStart, n), "yyyy-MM-dd"),
  );
  return (
    <>
      <Header
        title="Meal planner"
        subtitle="A flexible plan for every kind of week."
        action={
          <Button
            onClick={() =>
              setEditing({
                date: plannerDate,
                slot: "breakfast",
                portion: 1,
                status: "planned",
              })
            }
          >
            <Plus size={17} /> Add meal
          </Button>
        }
      />
      <Card className="plan-guide">
        <div>
          <span className="starter-label">YOUR WEEKLY RHYTHM</span>
          <h2>A plan is prepared for you.</h2>
          <p>
            Four meals are filled in each day. Change any meal, save your own
            week, or choose another plan. Future weeks follow{" "}
            <b>{repeatingTemplate.name}</b>.
          </p>
        </div>
        <div className="starter-actions">
          <Button onClick={() => setApplying(!applying)}>
            {applying ? "Hide plans" : "Choose a plan"}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/profile")}>
            Meal times & profile
          </Button>
          <label className="btn secondary plan-import-trigger">
            <Upload size={17} /> Import a weekly plan
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                void selectPlanFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <label className="btn secondary plan-import-trigger">
            <Upload size={17} /> Import Personal Meal Pack
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                void selectPlanFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {importNotice && (
          <p className="plan-import-notice" role="status">
            {importNotice}
          </p>
        )}
        {importError && !importPreview && (
          <p className="error" role="alert">
            {importError}
          </p>
        )}
        {applying && (
          <div className="plan-options">
            {templates.map((t) => (
              <div className="plan-option" key={t.id}>
                <div>
                  <h3>{t.name}</h3>
                  <p>{t.description || "A plan saved from your own week."}</p>
                  <small>
                    {t.rotation
                      ? `${t.rotation.weeks.length} weeks · ${t.rotation.weeks.reduce((sum, items) => sum + items.length, 0)} meals`
                      : `${t.items.length} meals`}{" "}
                    ·{" "}
                    {t.id === p.activeTemplateId
                      ? "Repeats automatically"
                      : "Ready to use"}
                  </small>
                </div>
                <div className="plan-option-actions">
                  <Button
                    variant="secondary"
                    onClick={() => applyTemplate(t.id)}
                  >
                    Use this week
                  </Button>
                  <Button onClick={() => applyTemplate(t.id, true)}>
                    Use & repeat
                  </Button>
                  {!t.id.startsWith("template-") && (
                    <button
                      className="icon-btn"
                      aria-label={`Delete ${t.name}`}
                      disabled={t.id === p.activeTemplateId}
                      title={
                        t.id === p.activeTemplateId
                          ? "Choose another repeating plan first"
                          : "Delete plan"
                      }
                      onClick={() =>
                        confirm(`Delete ${t.name}?`) &&
                        db.templates.delete(t.id)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {importPreview && (
        <Modal
          title="Use your weekly plan"
          className="plan-import-dialog"
          onClose={() => setImportPreview(null)}
        >
          <div className="plan-import-intro">
            <span className="eyebrow">READY TO REVIEW</span>
            <h3>My Personal Weight-Gain Plan</h3>
            <p>7 days · 28 meals · repeats every week</p>
          </div>
          <p className="plan-import-help">
            Check your meals below, then tap <b>Use this plan</b>. It starts
            this week and keeps your meal history and other plans.
          </p>
          <div
            className="plan-import-times"
            aria-label="Meal times from your file"
          >
            {(["breakfast", "lunch", "snack", "supper"] as const).map(
              (slot) => (
                <span key={slot}>
                  <b>{slot}</b> {importPreview.source.meal_times[slot]}
                </span>
              ),
            )}
          </div>
          <div className="plan-import-days">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <details
                key={day}
                className="plan-import-day"
                open={day === format(parseISO(today()), "EEEE")}
              >
                <summary>
                  <strong>{day}</strong>
                  <span>
                    4 meals <ChevronRight size={16} />
                  </span>
                </summary>
                {importPreview.source.meal_entries
                  .filter((entry) => entry.day === day)
                  .map((entry) => (
                    <div key={entry.id} className="plan-import-meal">
                      <span>
                        {entry.time} · {entry.slot}
                      </span>
                      <strong>{entry.title}</strong>
                      <small>
                        {entry.ingredients
                          .map(
                            (item) =>
                              `${item.quantity} ${item.unit} ${item.name}`,
                          )
                          .join(" · ")}
                      </small>
                      {entry.alternatives.length > 0 && (
                        <small>
                          Alternatives: {entry.alternatives.join(" · ")}
                        </small>
                      )}
                    </div>
                  ))}
              </details>
            ))}
          </div>
          {importError && (
            <p className="error" role="alert">
              {importError}
            </p>
          )}
          <div className="modal-actions plan-import-actions">
            <Button
              variant="secondary"
              disabled={importBusy}
              onClick={() => void saveImportedPlan(false)}
            >
              Save for later
            </Button>
            <Button
              disabled={importBusy}
              onClick={() => void saveImportedPlan(true)}
            >
              {importBusy ? "Saving…" : "Use this plan"}
            </Button>
          </div>
        </Modal>
      )}
      {packPreview && (
        <Modal
          title="Review your personal meal pack"
          className="plan-import-dialog"
          onClose={() => setPackPreview(null)}
        >
          <div className="plan-import-intro">
            <span className="eyebrow">FOUR-WEEK ROTATION</span>
            <h3>{packPreview.template.name}</h3>
            <p>
              {packPreview.recipes.length} recipes ·{" "}
              {packPreview.ingredientCount} ingredients with prices to enter · 4
              weeks · 112 meals
            </p>
          </div>
          <p className="plan-import-help">
            The four weeks repeat in order. Prices stay blank unless you have
            entered them yourself. Activating sets the four meal times shown
            below using your device's local timezone.
          </p>
          <div
            className="plan-import-times"
            aria-label="Meal times from your pack"
          >
            {(["breakfast", "lunch", "snack", "supper"] as const).map(
              (slot) => (
                <span key={slot}>
                  <b>{slot}</b> {packPreview.source.meal_times[slot]}
                </span>
              ),
            )}
          </div>
          <section className="plan-import-day pack-sample-day">
            <strong>Week 1 · Monday sample</strong>
            {packPreview.source.rotation.template_entries
              .filter(
                (entry) =>
                  entry.week_index === 1 &&
                  entry.weekday_index_monday_zero === 0,
              )
              .map((entry) => (
                <div key={entry.id} className="plan-import-meal">
                  <span>
                    {entry.time} · {entry.slot}
                  </span>
                  <strong>{entry.title}</strong>
                </div>
              ))}
          </section>
          {templates.some((item) => item.id === packPreview.template.id) && (
            <label className="pack-choice">
              If this pack was imported before
              <select
                value={packMode}
                onChange={(event) =>
                  setPackMode(event.target.value as PackImportMode)
                }
              >
                <option value="update-unchanged">
                  Update unchanged recipes and plan
                </option>
                <option value="replace-plan">
                  Replace this plan's defaults
                </option>
                <option value="skip">Skip this import</option>
              </select>
            </label>
          )}
          <label className="check-label pack-choice">
            <input
              type="checkbox"
              checked={packActivate}
              disabled={packMode === "skip"}
              onChange={(event) => setPackActivate(event.target.checked)}
            />
            Activate the rotation from this week
          </label>
          <label className="check-label pack-choice">
            <input
              type="checkbox"
              checked={packProfileDefaults}
              disabled={packMode === "skip"}
              onChange={(event) => setPackProfileDefaults(event.target.checked)}
            />
            Apply sample profile goals and KSh budgets from the pack
          </label>
          <p className="hint">
            Your existing weight entries, purchases, saved prices and edited or
            completed meals are kept.
          </p>
          {importError && (
            <p className="error" role="alert">
              {importError}
            </p>
          )}
          <div className="modal-actions plan-import-actions">
            <Button variant="secondary" onClick={() => setPackPreview(null)}>
              Cancel
            </Button>
            <Button disabled={importBusy} onClick={() => void savePack()}>
              {importBusy
                ? "Importing…"
                : packMode === "skip"
                  ? "Close without changes"
                  : packActivate
                    ? "Import & use rotation"
                    : "Save meal pack"}
            </Button>
          </div>
        </Modal>
      )}
      <div className="planner-toolbar">
        <div className="segmented">
          {(["today", "week", "month"] as const).map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v === "week" ? "7-day week" : v === "month" ? "Month" : "Today"}
            </button>
          ))}
        </div>
        <div className="week-switch">
          <button aria-label="Previous period" onClick={() => move(-1)}>
            <ChevronLeft size={18} />
          </button>
          <span>
            {view === "month"
              ? format(parseISO(plannerDate), "MMMM yyyy")
              : view === "today"
                ? fmt(plannerDate)
                : `${fmt(week)} – ${fmt(days[6])}`}
          </span>
          <button aria-label="Next period" onClick={() => move(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {view === "month" ? (
        <Card className="month-calendar">
          <div className="month-head">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
              <b key={x}>{x}</b>
            ))}
          </div>
          <div className="month-grid">
            {calendarDays.map((date) => {
              const entries = meals.filter((m) => m.date === date);
              return (
                <button
                  key={date}
                  className={`${date.slice(0, 7) !== plannerDate.slice(0, 7) ? "outside" : ""} ${date === today() ? "today" : ""}`}
                  onClick={() => {
                    setPlannerDate(date);
                    setView("today");
                  }}
                >
                  <b>{format(parseISO(date), "d")}</b>
                  <span>
                    {entries.length
                      ? `${entries.length} meal${entries.length > 1 ? "s" : ""}`
                      : "+"}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <>
          <Card className="budget-banner">
            <div>
              <span className="stat-icon sage">
                <Wallet size={20} />
              </span>
              <div>
                <b>Weekly plan estimate</b>
                <p>
                  {missing.length
                    ? `${missing.length} ingredients need prices to complete this estimate.`
                    : "Based on your saved ingredient prices."}
                </p>
              </div>
            </div>
            <strong>
              {missing.length
                ? estimate > 0
                  ? `${money(estimate, p)}+`
                  : "Add prices"
                : money(estimate, p)}
            </strong>
            <span
              className={`budget-tag ${estimate > weeklyLimit ? "over" : ""}`}
            >
              {estimate > weeklyLimit
                ? `${money(estimate - weeklyLimit, p)} over budget`
                : `Budget ${money(weeklyLimit, p)}`}
            </span>
          </Card>
          {estimate > weeklyLimit && (
            <p className="inline-tip">
              Known ingredient costs already exceed this week's target.{" "}
              {weekMeals
                .flatMap(
                  (m) =>
                    recipes.find((r) => r.id === m.recipeId)?.substitutions ||
                    [],
                )
                .slice(0, 4)
                .join(" · ") ||
                "Try beans, ndengu, omena or eggs as alternatives."}{" "}
              Check prices and preferences before switching.
            </p>
          )}
          {visible.map((date) => {
            const dayMeals = weekMeals.filter(
              (m) => m.date === date && m.status !== "skipped",
            );
            const knownCost = dayMeals.reduce((sum, m) => {
              const recipe = recipes.find((r) => r.id === m.recipeId);
              return (
                sum +
                (recipe
                  ? mealCost(effectiveRecipe(m, recipe), prices, m.portion)
                      .total
                  : 0)
              );
            }, 0);
            const limit = budgetFor(p, data.budgets, "daily", date);
            return knownCost > limit ? (
              <p className="inline-tip" key={`budget-${date}`} role="status">
                {fmt(date)}: known ingredient costs exceed the daily target by{" "}
                {money(knownCost - limit, p)}. Alternatives:{" "}
                {dayMeals
                  .flatMap(
                    (m) =>
                      recipes.find((r) => r.id === m.recipeId)?.substitutions ||
                      [],
                  )
                  .slice(0, 3)
                  .join(" · ") || "review lower-cost meals in Replace"}
                . Compare prices before changing meals.
              </p>
            ) : null;
          })}
          {view === "week" && (
            <div className="day-expand-controls">
              <button onClick={() => setExpandedDays(days)}>
                Expand all days
              </button>
              <button onClick={() => setExpandedDays([])}>
                Collapse all days
              </button>
            </div>
          )}
          {visible.map((date) => (
            <section className="day-section" key={date}>
              <div className="day-title">
                <button
                  className="day-toggle"
                  aria-expanded={
                    view === "today" || expandedDays.includes(date)
                  }
                  onClick={() =>
                    setExpandedDays((current) =>
                      current.includes(date)
                        ? current.filter((x) => x !== date)
                        : [...current, date],
                    )
                  }
                >
                  <span className="day-heading">
                    {date === today()
                      ? "Today"
                      : format(parseISO(date), "EEEE")}{" "}
                    <small>{format(parseISO(date), "d MMM")}</small>
                  </span>
                  <span className="day-count">
                    {
                      meals.filter(
                        (m) => m.date === date && m.status === "eaten",
                      ).length
                    }{" "}
                    eaten
                  </span>
                  {view === "today" || expandedDays.includes(date) ? (
                    <ChevronLeft className="day-chevron open" size={18} />
                  ) : (
                    <ChevronRight className="day-chevron" size={18} />
                  )}
                </button>
              </div>
              {view !== "today" && !expandedDays.includes(date) && (
                <div className="day-summary">
                  {slotOrder.map((slot) => {
                    const item = meals.find(
                      (m) => m.date === date && m.slot === slot,
                    );
                    const recipe = recipes.find((r) => r.id === item?.recipeId);
                    return recipe ? (
                      <span key={slot}>
                        <b>{slot === "dinner" ? "Supper" : slot}</b>{" "}
                        {recipe.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {(view === "today" || expandedDays.includes(date)) && (
                <>
                  <div className="day-meals">
                    {slotOrder
                      .filter(
                        (s) =>
                          s !== "snack" ||
                          p.meals === 4 ||
                          meals.some(
                            (m) => m.date === date && m.slot === "snack",
                          ),
                      )
                      .map((slot) => {
                        const entries = meals.filter(
                          (m) => m.date === date && m.slot === slot,
                        );
                        return (
                          <Card key={slot} className="plan-meal">
                            <div className="slot-label">
                              {slot === "dinner" ? "supper" : slot}{" "}
                              <small>{p.mealTimes[slot]}</small>
                            </div>
                            {entries.map((item) => {
                              const r =
                                item.status === "eaten" && item.snapshot
                                  ? item.snapshot
                                  : recipes.find((x) => x.id === item.recipeId);
                              return r ? (
                                <div
                                  className={`plan-entry ${item.status}`}
                                  key={item.id}
                                >
                                  <div className="plan-meal-body">
                                    <span className="recipe-emoji">
                                      {r.emoji}
                                    </span>
                                    <div>
                                      <h3>{r.name}</h3>
                                      <p>
                                        {item.status === "eaten"
                                          ? "Enjoyed"
                                          : item.status === "skipped"
                                            ? "Skipped"
                                            : `${item.portion} portion · ${r.minutes > 0 ? `${r.minutes} min` : "Time not set"}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="meal-actions">
                                    <button
                                      title="Add food or replace meal"
                                      aria-label={`Change ${r.name}`}
                                      onClick={() => setActionMeal(item)}
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button
                                      title="Edit meal"
                                      aria-label={`Edit ${r.name}`}
                                      onClick={() => setEditing(item)}
                                    >
                                      <PenLine size={16} />
                                    </button>
                                    <button
                                      title="Duplicate to tomorrow"
                                      aria-label={`Duplicate ${r.name}`}
                                      onClick={() =>
                                        db.meals.add({
                                          ...item,
                                          id: uid(),
                                          date: format(
                                            addDays(parseISO(date), 1),
                                            "yyyy-MM-dd",
                                          ),
                                          status: "planned",
                                          eatenAt: undefined,
                                          snapshot: undefined,
                                          pantryUsed: [],
                                          loggedCost: undefined,
                                        })
                                      }
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button
                                      title="Mark eaten"
                                      aria-label={`Mark ${r.name} eaten`}
                                      onClick={() =>
                                        setMealStatus(
                                          item,
                                          item.status === "eaten"
                                            ? "planned"
                                            : "eaten",
                                          recipes,
                                          prices,
                                        )
                                      }
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      title="Mark skipped"
                                      aria-label={`Mark ${r.name} skipped`}
                                      onClick={() =>
                                        setMealStatus(
                                          item,
                                          item.status === "skipped"
                                            ? "planned"
                                            : "skipped",
                                          recipes,
                                          prices,
                                        )
                                      }
                                    >
                                      ↷
                                    </button>
                                    <button
                                      title="Remove"
                                      aria-label={`Remove ${r.name}`}
                                      onClick={() =>
                                        confirm(
                                          `Remove ${r.name} from ${fmt(date)}?`,
                                        ) && db.meals.delete(item.id)
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : null;
                            })}
                            <button
                              className="add-slot"
                              onClick={() =>
                                setEditing({
                                  date,
                                  slot,
                                  portion: 1,
                                  status: "planned",
                                })
                              }
                            >
                              <Plus size={16} /> Add{" "}
                              {slot === "dinner" ? "supper" : slot}
                            </button>
                          </Card>
                        );
                      })}
                  </div>
                </>
              )}
            </section>
          ))}
          {!weekMeals.length && (
            <Empty
              icon={<CalendarDays />}
              heading="A clean slate"
              body="Build this week from scratch or add a sample plan."
              action={<Button onClick={createWeek}>Use sample week</Button>}
            />
          )}
          <div className="page-bottom-actions">
            <Button variant="secondary" onClick={createWeek}>
              <RefreshCw size={16} /> Fill empty slots from repeating plan
            </Button>
          </div>
          <Card className="template-panel">
            <h2>Save your own week</h2>
            <p>
              Keep this week as a reusable plan. You can choose it above and
              repeat it for future weeks.
            </p>
            <div className="button-row">
              <input
                aria-label="Template name"
                placeholder="Name this plan"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button
                onClick={saveTemplate}
                disabled={!templateName.trim() || !weekMeals.length}
              >
                Save plan
              </Button>
            </div>
          </Card>
        </>
      )}
      {actionMeal && (
        <MealActions
          meal={actionMeal}
          data={data}
          initialTab="replace"
          onClose={() => setActionMeal(null)}
        />
      )}
      {editing && (
        <MealEditor
          meal={editing}
          recipes={recipes}
          prices={prices}
          profile={p}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
function MealActions({
  meal,
  data,
  onClose,
  initialTab = "food",
}: {
  meal: PlannedMeal;
  data: Data;
  onClose: () => void;
  initialTab?: "food" | "replace" | "details";
}) {
  const { recipes, profile, prices, pantry } = data;
  const current = recipes.find((r) => r.id === meal.recipeId);
  const [tab, setTab] = useState<"food" | "replace" | "details">(initialTab);
  const [query, setQuery] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<Ingredient[]>([]);
  const [sideId, setSideId] = useState("");
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);
  const [replacementName, setReplacementName] = useState("");
  const [replacementQty, setReplacementQty] = useState(1);
  const [scope, setScope] = useState<"meal" | "future">("meal");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("name");
  const [pantryOnly, setPantryOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [group, setGroup] = useState("All");
  const [showAllMeals, setShowAllMeals] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [diet, setDiet] = useState("Any diet");
  const [error, setError] = useState("");
  const [date, setDate] = useState(meal.date);
  const [slot, setSlot] = useState<Slot>(meal.slot);
  const [portion, setPortion] = useState(meal.portion);
  useEffect(() => {
    if (tab !== "replace" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const dialog = document.querySelector<HTMLElement>(
      ".meal-change-dialog.is-replacing",
    );
    if (!dialog) return;
    const fitToKeyboard = () => {
      dialog.style.setProperty(
        "--replace-viewport-height",
        `${viewport.height}px`,
      );
      dialog.style.setProperty(
        "--replace-viewport-top",
        `${viewport.offsetTop}px`,
      );
    };
    fitToKeyboard();
    viewport.addEventListener("resize", fitToKeyboard);
    viewport.addEventListener("scroll", fitToKeyboard);
    return () => {
      viewport.removeEventListener("resize", fitToKeyboard);
      viewport.removeEventListener("scroll", fitToKeyboard);
    };
  }, [tab]);
  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [
    query,
    group,
    category,
    sort,
    pantryOnly,
    favoritesOnly,
    quickOnly,
    diet,
  ]);
  if (!current) return null;
  const existingNames = new Set(
    pantry.filter((p) => p.qty > 0).map((p) => p.name.toLowerCase()),
  );
  const blocked = `${profile.restrictions},${profile.avoids}`
    .toLowerCase()
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const currentCost = mealCost(
    effectiveRecipe(meal, current),
    prices,
    meal.portion,
  );
  const proteins = [
    "beef",
    "pork",
    "chicken",
    "tilapia",
    "omena",
    "beans",
    "ndengu",
    "eggs",
    "liver",
  ];
  const currentProteins = new Set(
    current.ingredients.map((i) => i.name).filter((x) => proteins.includes(x)),
  );
  const options = recipes.filter(
    (r) =>
      r.id !== current.id &&
      recipeAllowedInSlot(r, meal.slot) &&
      (group === "All" ||
        (group === "Similar" && r.category === current.category) ||
        (group === "Cheaper" &&
          !currentCost.missing.length &&
          !mealCost(r, prices, meal.portion).missing.length &&
          mealCost(r, prices, meal.portion).total < currentCost.total) ||
        (group === "Other proteins" &&
          r.ingredients.some(
            (i) => proteins.includes(i.name) && !currentProteins.has(i.name),
          )) ||
        (group === "Pantry" &&
          r.ingredients.every((i) =>
            existingNames.has(i.name.toLowerCase()),
          )) ||
        (group === "Quick" && r.minutes > 0 && r.minutes <= 20)) &&
      (diet === "Any diet" || r.dietaryTags?.includes(diet)) &&
      (category === "All" || r.category === category) &&
      (!favoritesOnly || r.favorite) &&
      (!quickOnly || (r.minutes > 0 && r.minutes <= 20)) &&
      (!pantryOnly ||
        r.ingredients.every((i) => existingNames.has(i.name.toLowerCase()))) &&
      !r.ingredients.some((i) =>
        blocked.some(
          (b) => i.name.toLowerCase().includes(b) || r.allergens?.includes(b),
        ),
      ) &&
      recipeMatchesQuery(r, query),
  );
  const textMatches = recipes.filter(
    (r) => r.id !== current.id && recipeMatchesQuery(r, query),
  );
  const slotMatches = textMatches.filter((r) =>
    recipeAllowedInSlot(r, meal.slot),
  );
  const currentIngredientNames = new Set(
    current.ingredients.map((item) => item.name.toLowerCase()),
  );
  const suggestedNames = new Set(
    current.substitutions?.map((name) => name.toLowerCase()) || [],
  );
  const suggestionScore = (recipe: Recipe) =>
    (suggestedNames.has(recipe.name.toLowerCase()) ? 100 : 0) +
    (recipe.category === current.category ? 12 : 0) +
    recipe.ingredients.filter((item) =>
      currentIngredientNames.has(item.name.toLowerCase()),
    ).length *
      8 +
    (recipe.favorite ? 3 : 0);
  const searchScore = (recipe: Recipe) => {
    const term = query.trim().toLowerCase();
    if (!term) return suggestionScore(recipe);
    return (
      (recipe.name.toLowerCase().startsWith(term) ? 40 : 0) +
      (recipe.name.toLowerCase().includes(term) ? 20 : 0) +
      suggestionScore(recipe)
    );
  };
  options.sort((a, b) =>
    sort === "price"
      ? (mealCost(a, prices, meal.portion).missing.length
          ? Infinity
          : mealCost(a, prices, meal.portion).total) -
        (mealCost(b, prices, meal.portion).missing.length
          ? Infinity
          : mealCost(b, prices, meal.portion).total)
      : sort === "time"
        ? (a.minutes || Infinity) - (b.minutes || Infinity)
        : searchScore(b) - searchScore(a) || a.name.localeCompare(b.name),
  );
  const visibleOptions =
    query.trim() || showAllMeals || group !== "All"
      ? options
      : options.slice(0, 12);
  const chosen = data.ingredients.find((i) => i.name === ingredientName);
  const add = async () => {
    const side = recipes.find((r) => r.id === sideId);
    const items = [
      ...selection,
      ...(chosen && quantity > 0
        ? [
            {
              name: chosen.name,
              category: chosen.category,
              unit: chosen.unit,
              qty: quantity,
            },
          ]
        : []),
      ...(side
        ? side.ingredients.map((i) => ({ ...i, qty: i.qty / side.servings }))
        : []),
    ];
    if (
      !items.length ||
      items.some((i) => !Number.isFinite(i.qty) || i.qty <= 0)
    ) {
      setError(
        "Choose at least one food or side dish with a positive quantity.",
      );
      return;
    }
    await addFoods(
      meal,
      items,
      current.source === "imported" ? "meal" : scope,
      current,
    );
    onClose();
  };
  const replace = async (id: string) => {
    await db.meals.update(meal.id, {
      recipeId: id,
      status: "planned",
      addedIngredients: [],
      removedIngredientIndexes: [],
    });
    onClose();
  };
  const categories = [
    "All",
    ...new Set(recipes.map((r) => r.category || "Other")),
  ];
  return (
    <Modal
      title={`${tab === "replace" ? "Replace" : "Change"} ${meal.slot === "dinner" ? "supper" : meal.slot}`}
      onClose={onClose}
      className={`meal-change-dialog ${tab === "replace" ? "is-replacing" : ""}`}
    >
      <div className="change-current">
        <span className="change-current-icon">{current.emoji}</span>
        <div>
          <small>
            {tab === "replace"
              ? "Instead of"
              : `Currently planned · ${meal.date} · ${profile.mealTimes[meal.slot]}`}
          </small>
          <strong>{current.name}</strong>
        </div>
        <span className="change-current-portion">
          {meal.portion} portion{meal.portion === 1 ? "" : "s"}
        </span>
      </div>
      {tab === "replace" && meal.status !== "eaten" && (
        <button
          className="replace-switch-action"
          onClick={() => setTab("food")}
        >
          Want to keep this meal? Add food to it instead
        </button>
      )}
      <div className="meal-tabs" role="tablist">
        <button
          className={tab === "food" ? "active" : ""}
          disabled={meal.status === "eaten"}
          onClick={() => setTab("food")}
        >
          Add food
        </button>
        <button
          className={tab === "replace" ? "active" : ""}
          disabled={meal.status === "eaten"}
          onClick={() => setTab("replace")}
        >
          Replace meal
        </button>
        <button
          className={tab === "details" ? "active" : ""}
          onClick={() => setTab("details")}
        >
          Recipe
        </button>
      </div>
      {meal.status === "eaten" && (
        <p>
          This meal is in your history. Change future planned meals instead.
        </p>
      )}
      {meal.status !== "eaten" && tab === "food" && (
        <div className="modal-form">
          <p>
            Add an ingredient to {current.name}. Shopping quantities and
            estimated cost will update.
          </p>
          <div className="change-form-grid">
            <label>
              Food
              <select
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
              >
                <option value="">Choose a food</option>
                {data.ingredients.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity ({chosen?.unit || "units"})
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
          </div>
          <Button
            variant="secondary"
            disabled={!chosen || quantity <= 0}
            onClick={() => {
              if (chosen && quantity > 0) {
                setSelection([
                  ...selection,
                  {
                    name: chosen.name,
                    category: chosen.category,
                    unit: chosen.unit,
                    qty: quantity,
                  },
                ]);
                setIngredientName("");
                setQuantity(1);
              }
            }}
          >
            Add another ingredient
          </Button>
          {selection.length > 0 && (
            <div className="selected-foods">
              {selection.map((i, n) => (
                <button
                  key={n}
                  onClick={() =>
                    setSelection(selection.filter((_, j) => j !== n))
                  }
                >
                  {i.qty} {i.unit} {i.name} ×
                </button>
              ))}
            </div>
          )}
          <div className="change-form-grid">
            <label>
              Or add a complete side dish
              <select
                value={sideId}
                onChange={(e) => setSideId(e.target.value)}
              >
                <option value="">No side dish</option>
                {recipes
                  .filter((r) => r.id !== current.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Save for
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "meal" | "future")}
              >
                <option value="meal">This meal only</option>
                {current.source !== "imported" && (
                  <option value="future">Future uses of this recipe</option>
                )}
              </select>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions change-actions">
            <Button onClick={add}>Add food</Button>
          </div>
        </div>
      )}
      {meal.status !== "eaten" && tab === "replace" && (
        <div className="replace-browser">
          <div className="replace-search">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Search meals"
              placeholder="Search meals or ingredients"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setGroup("All");
                setCategory("All");
                setDiet("Any diet");
                setFavoritesOnly(false);
                setPantryOnly(false);
                setQuickOnly(false);
                setShowAllMeals(false);
              }}
            />
            {query && (
              <button
                type="button"
                className="replace-clear-search"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="replace-quick-picks" aria-label="Quick searches">
            {["Beef", "Chicken", "Fish", "Beans", "Eggs"].map((term) => (
              <button
                key={term}
                className={
                  query.toLowerCase() === term.toLowerCase() ? "active" : ""
                }
                onClick={() => {
                  setQuery(term);
                  setGroup("All");
                  setCategory("All");
                  setDiet("Any diet");
                  setFavoritesOnly(false);
                  setPantryOnly(false);
                  setQuickOnly(false);
                  setShowAllMeals(false);
                }}
              >
                {term}
              </button>
            ))}
          </div>
          <details className="advanced-filters">
            <summary>Filters and sorting</summary>
            <div className="replace-groups">
              {[
                "All",
                "Similar",
                "Cheaper",
                "Other proteins",
                "Pantry",
                "Quick",
              ].map((g) => (
                <button
                  key={g}
                  className={group === g ? "active" : ""}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="replace-filters">
              <select
                aria-label="Dietary preference"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
              >
                <option>Any diet</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Sort meals"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="price">Estimated price</option>
                <option value="time">Preparation time</option>
              </select>
            </div>
            <div className="replace-filters">
              <label>
                <input
                  type="checkbox"
                  checked={pantryOnly}
                  onChange={(e) => setPantryOnly(e.target.checked)}
                />{" "}
                Pantry friendly
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                />{" "}
                Favorites
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quickOnly}
                  onChange={(e) => setQuickOnly(e.target.checked)}
                />{" "}
                20 min or less
              </label>
            </div>
          </details>
          <p className="replace-count" role="status">
            {query.trim()
              ? `${options.length} ${options.length === 1 ? "meal" : "meals"} for “${query.trim()}”`
              : group === "All" && !showAllMeals
                ? `Good matches for ${meal.slot === "dinner" ? "supper" : meal.slot}`
                : `${options.length} ${options.length === 1 ? "meal" : "meals"} to choose from`}
          </p>
          {query.trim() && !options.length && textMatches.length > 0 && (
            <p className="inline-tip" role="status">
              {slotMatches.length === 0
                ? `${textMatches.length} matching meals are for other meal times. Try a compatible slot.`
                : group === "Cheaper"
                  ? "Matching meals need ingredient prices before cheaper options can be compared. Choose All to browse them."
                  : "Matching meals are hidden by the selected filters or food restrictions. Choose All and clear More filters to see compatible meals."}
            </p>
          )}
          <div className="replace-results" ref={resultsRef}>
            {visibleOptions.slice(0, 100).map((r) => {
              const cost = mealCost(r, prices, meal.portion);
              return (
                <button key={r.id} onClick={() => replace(r.id)}>
                  <span>
                    {r.image ? (
                      <img src={r.image} alt="" />
                    ) : (
                      <span className="result-emoji">{r.emoji}</span>
                    )}
                  </span>
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.category} ·{" "}
                      {r.minutes > 0 ? `${r.minutes} min` : "Time not set"} ·{" "}
                      {cost.missing.length
                        ? "Price not entered"
                        : `${money(cost.total, profile)}${currentCost.missing.length ? "" : ` · ${cost.total - currentCost.total >= 0 ? "+" : ""}${money(cost.total - currentCost.total, profile)} vs current`}`}
                    </small>
                  </span>
                  <span className="result-select">
                    Use <ChevronRight size={15} />
                  </span>
                </button>
              );
            })}
            {!query.trim() &&
              group === "All" &&
              !showAllMeals &&
              options.length > 12 && (
                <button
                  className="replace-show-all"
                  onClick={() => setShowAllMeals(true)}
                >
                  Browse all {options.length} meals <ChevronRight size={17} />
                </button>
              )}
            {!options.length && (
              <div className="replace-empty">
                <Search size={26} />
                <b>No matching meals</b>
                <p>Try another search or clear the filters.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setGroup("All");
                    setCategory("All");
                    setDiet("Any diet");
                    setFavoritesOnly(false);
                    setPantryOnly(false);
                    setQuickOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "details" && (
        <div className="modal-form">
          <h3>{current.name}</h3>
          <p>{current.description}</p>
          <ul>
            {effectiveRecipe(meal, current).ingredients.map((i, n) => (
              <li key={n}>
                {i.qty} {i.unit} {i.name}
              </li>
            ))}
          </ul>
          {meal.status !== "eaten" && (
            <>
              <h3>Change an ingredient</h3>
              <div className="ingredient-change-list">
                {current.ingredients.map((i, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setReplacementIndex(index);
                      setReplacementName("");
                      setReplacementQty(i.qty / current.servings);
                    }}
                  >
                    {i.name} · {i.qty / current.servings} {i.unit}{" "}
                    <PenLine size={14} />
                  </button>
                ))}
              </div>
              {replacementIndex !== null && (
                <div className="ingredient-change-form">
                  <label>
                    Use instead
                    <select
                      value={replacementName}
                      onChange={(e) => setReplacementName(e.target.value)}
                    >
                      <option value="">Choose an ingredient</option>
                      {data.ingredients.map((i) => (
                        <option key={i.name} value={i.name}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity per serving
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={replacementQty}
                      onChange={(e) =>
                        setReplacementQty(Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Save for
                    <select
                      value={scope}
                      onChange={(e) =>
                        setScope(e.target.value as "meal" | "future")
                      }
                    >
                      <option value="meal">This meal only</option>
                      {current.source !== "imported" && (
                        <option value="future">
                          Future uses of this recipe
                        </option>
                      )}
                    </select>
                  </label>
                  <Button
                    onClick={async () => {
                      const chosen = data.ingredients.find(
                        (i) => i.name === replacementName,
                      );
                      if (!chosen || replacementQty <= 0) return;
                      if (scope === "meal" || current.source === "imported")
                        await db.meals.update(meal.id, {
                          removedIngredientIndexes: [
                            ...(meal.removedIngredientIndexes || []),
                            replacementIndex,
                          ],
                          addedIngredients: [
                            ...(meal.addedIngredients || []),
                            { ...chosen, qty: replacementQty },
                          ],
                        });
                      else
                        await db.recipes.update(current.id, {
                          ingredients: current.ingredients.map((i, n) =>
                            n === replacementIndex
                              ? {
                                  ...chosen,
                                  qty: replacementQty * current.servings,
                                }
                              : i,
                          ),
                        });
                      onClose();
                    }}
                  >
                    Replace ingredient
                  </Button>
                </div>
              )}
            </>
          )}
          <p>{current.steps}</p>
          <p>
            {current.minutes > 0 ? `${current.minutes} min` : "Time not set"} ·{" "}
            {current.servings} serving
            {current.servings === 1 ? "" : "s"}
          </p>
          {current.allergens?.length ? (
            <p>Allergens: {current.allergens.join(", ")}</p>
          ) : null}
          {meal.status !== "eaten" && (
            <>
              <label>
                Portions
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={portion}
                  onChange={(e) => setPortion(Number(e.target.value))}
                />
              </label>
              <label>
                Reschedule date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Meal slot
                <select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as Slot)}
                >
                  {slotOrder.map((x) => (
                    <option key={x} value={x}>
                      {x === "dinner" ? "Supper" : x}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <Button
                  onClick={async () => {
                    if (portion > 0 && date) {
                      await db.meals.update(meal.id, { portion, date, slot });
                      onClose();
                    }
                  }}
                >
                  Save schedule
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
const mealInputSchema = z.object({
  date: z.string().min(1),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId: z.string().min(1),
  portion: z.coerce.number().positive(),
  status: z.enum(["planned", "eaten", "skipped"]),
  notes: z.string().optional(),
});
function MealEditor({
  meal,
  recipes,
  prices,
  profile,
  onSave,
  onClose,
}: {
  meal: Partial<PlannedMeal>;
  recipes: Recipe[];
  prices: Price[];
  profile: Profile;
  onSave: (m: Partial<PlannedMeal>) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof mealInputSchema>>({
    defaultValues: {
      date: meal.date || today(),
      slot: meal.slot || "breakfast",
      recipeId: meal.recipeId || recipes[0]?.id,
      portion: meal.portion || 1,
      status: meal.status || "planned",
      notes: meal.notes || "",
    },
  });
  const [error, setError] = useState("");
  const selected = recipes.find((r) => r.id === watch("recipeId"));
  const alternatives = selected
    ? affordableAlternatives(
        selected,
        recipes,
        prices,
        `${profile.restrictions},${profile.avoids}`,
      )
    : [];
  const submit = handleSubmit((values) => {
    const parsed = mealInputSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check this meal.");
      return;
    }
    onSave({ ...meal, ...parsed.data });
  });
  return (
    <Modal
      title={meal.id ? "Edit planned meal" : "Add planned meal"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <label>
          Date
          <input type="date" required {...register("date")} />
        </label>
        <label>
          Meal time
          <select {...register("slot")}>
            {slots.map((s) => (
              <option key={s} value={s}>
                {s === "dinner" ? "supper" : s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recipe
          <select {...register("recipeId")}>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Portions
          <input
            type="number"
            min="0.25"
            step="0.25"
            required
            {...register("portion", { valueAsNumber: true })}
          />
        </label>
        <label>
          Status
          <select {...register("status")}>
            <option value="planned">Planned</option>
            <option value="eaten">Eaten</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
        <label>
          Notes
          <textarea
            {...register("notes")}
            placeholder="Preparation, leftovers, or a personal note"
          />
        </label>
        {errors.portion && <p className="error">Enter a valid portion.</p>}
        {error && <p className="error">{error}</p>}
        {selected && (
          <div className="alternatives">
            <h3>Affordable alternatives</h3>
            {alternatives.length ? (
              alternatives.map((x) => (
                <button
                  type="button"
                  key={x.recipe.id}
                  onClick={() => setValue("recipeId", x.recipe.id)}
                >
                  <span>
                    {x.recipe.emoji} {x.recipe.name}
                  </span>
                  <b>{money(x.cost.total, profile)}</b>
                </button>
              ))
            ) : (
              <p>
                Add prices for this recipe and others to compare alternatives.
              </p>
            )}
            <small>
              Costs are estimates. Alternatives may have different nutrition;
              confirm they suit your restrictions.
            </small>
          </div>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save meal</Button>
        </div>
      </form>
    </Modal>
  );
}
function Shop({ data }: { data: Data }) {
  const [week, setWeek] = useState(weekOf(today()));
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState("Pantry essentials");
  const [buying, setBuying] = useState<ListItem | null>(null);
  const [boughtQty, setBoughtQty] = useState(1);
  const [boughtUnit, setBoughtUnit] = useState("g");
  const [boughtAmount, setBoughtAmount] = useState("");
  const [addBoughtStock, setAddBoughtStock] = useState(true);
  const [purchaseError, setPurchaseError] = useState("");
  const { profile: p, meals, recipes, pantry, prices, lists, purchases } = data;
  const weeklyLimit = budgetFor(p, data.budgets, "weekly", week);
  const generated = shoppingNeeds(meals, recipes, pantry, week);
  const stored = lists.filter((x) => x.week === week);
  const active = stored.length ? stored : generated;
  const priceFor = (x: ListItem) => {
    const price = prices.find(
      (v) =>
        v.name.toLowerCase() === x.name.toLowerCase() &&
        quantityInUnit(v.qty, v.unit, x.unit) !== null,
    );
    const packageQty = price && quantityInUnit(price.qty, price.unit, x.unit);
    return price && packageQty ? (price.price * x.qty) / packageQty : 0;
  };
  const estimate = active.reduce((s, x) => s + priceFor(x), 0);
  const actual = purchases
    .filter((x) => x.listWeek === week)
    .reduce((s, x) => s + x.amount, 0);
  const missing = active.filter(
    (x) =>
      !prices.find(
        (v) =>
          v.name.toLowerCase() === x.name.toLowerCase() &&
          quantityInUnit(v.qty, v.unit, x.unit) !== null,
      ),
  );
  const saveList = async () => {
    if (
      stored.length &&
      !confirm(
        "Regenerate this list? Current item edits will be replaced. Purchase records remain saved.",
      )
    )
      return;
    await db.transaction("rw", db.lists, async () => {
      await db.lists.where("week").equals(week).delete();
      await db.lists.bulkAdd(generated);
    });
  };
  const ensureList = async () => {
    if (!stored.length) await db.lists.bulkAdd(generated);
  };
  const addCustom = async () => {
    await ensureList();
    await db.lists.add({
      id: uid(),
      week,
      name,
      qty,
      unit,
      category,
      checked: false,
      actualQty: 0,
      actualCost: 0,
    });
    setCustom(false);
    setName("");
  };
  const record = async (item: ListItem) => {
    if (item.checked) {
      const matched = purchases.filter((x) => x.listItemId === item.id);
      if (
        !confirm(
          `Remove this purchase of ${item.name}? Its remaining pantry stock will also be removed.`,
        )
      )
        return;
      await db.transaction(
        "rw",
        db.lists,
        db.purchases,
        db.pantry,
        async () => {
          await db.lists.update(item.id, {
            checked: false,
            actualCost: 0,
            actualQty: 0,
          });
          for (const x of matched) {
            if (x.pantryId) await db.pantry.delete(x.pantryId);
            await db.purchases.delete(x.id);
          }
        },
      );
      return;
    }
    setBuying(item);
    setBoughtQty(item.qty);
    setBoughtUnit(item.unit);
    setBoughtAmount("");
    setAddBoughtStock(true);
    setPurchaseError("");
  };
  return (
    <>
      <Header
        title="Shopping list"
        subtitle="Everything for the week, gathered in one place."
        action={
          <Button onClick={() => setCustom(true)}>
            <Plus size={17} /> Add item
          </Button>
        }
      />
      <div className="planner-toolbar">
        <div className="week-switch">
          <button
            onClick={() =>
              setWeek(format(subWeeks(parseISO(week), 1), "yyyy-MM-dd"))
            }
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {fmt(week)} –{" "}
            {fmt(format(addDays(parseISO(week), 6), "yyyy-MM-dd"))}
          </span>
          <button
            onClick={() =>
              setWeek(format(addWeeks(parseISO(week), 1), "yyyy-MM-dd"))
            }
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <Button variant="secondary" onClick={saveList}>
          <RefreshCw size={16} />{" "}
          {stored.length ? "Regenerate" : "Save generated list"}
        </Button>
      </div>
      <div className="shop-stats">
        <Card>
          <span>Estimated ingredients</span>
          <strong>
            {missing.length
              ? "Incomplete"
              : prices.length
                ? money(estimate, p)
                : "—"}
          </strong>
          <small>
            {missing.length
              ? `${missing.length} prices missing · known ${money(estimate, p)}`
              : "Based on saved prices"}
          </small>
        </Card>
        <Card>
          <span>Actual purchases</span>
          <strong>{money(actual, p)}</strong>
          <small>Recorded for this week</small>
        </Card>
        <Card>
          <span>Weekly budget</span>
          <strong>{money(weeklyLimit, p)}</strong>
          <small>
            {actual > weeklyLimit
              ? "Spending exceeds budget"
              : "Remainder " + money(weeklyLimit - actual, p)}
          </small>
        </Card>
      </div>
      <p className="inline-tip">
        Quantities combine planned recipes and subtract matching pantry stock.
        Prices estimate the portions needed; actual package spending is recorded
        separately.
      </p>
      {active.length ? (
        Object.entries(Object.groupBy(active, (x) => x.category)).map(
          ([group, items]) => (
            <section key={group} className="shopping-group">
              <div className="section-heading">
                <h2>{group}</h2>
                <span>{items?.length} items</span>
              </div>
              <Card>
                {items?.map((item) => (
                  <div key={item.id} className="shopping-item">
                    <button
                      className={`check-box ${item.checked ? "checked" : ""}`}
                      aria-label={`Mark ${item.name} purchased`}
                      onClick={() => record(item)}
                    >
                      {item.checked && <Check size={16} />}
                    </button>
                    <div>
                      <b>{item.name}</b>
                      <span>
                        {Math.round(item.qty * 100) / 100} {item.unit}
                        {item.checked && item.actualQty > 0
                          ? ` · bought ${item.actualQty} ${purchases.find((x) => x.listItemId === item.id)?.unit || item.unit}`
                          : ""}
                      </span>
                    </div>
                    <span className="item-price">
                      {prices.find(
                        (x) =>
                          x.name.toLowerCase() === item.name.toLowerCase() &&
                          quantityInUnit(x.qty, x.unit, item.unit) !== null,
                      )
                        ? money(priceFor(item), p)
                        : "Price not entered"}
                    </span>
                    {stored.length > 0 && (
                      <button
                        className="icon-btn"
                        title="Edit item"
                        onClick={async () => {
                          const value = Number(
                            prompt(
                              `Quantity of ${item.name} (${item.unit})`,
                              String(item.qty),
                            ),
                          );
                          if (Number.isFinite(value) && value >= 0)
                            await db.lists.update(item.id, { qty: value });
                        }}
                      >
                        <PenLine size={15} />
                      </button>
                    )}
                    {stored.length > 0 && (
                      <button
                        className="icon-btn"
                        title="Remove item"
                        onClick={() => db.lists.delete(item.id)}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          ),
        )
      ) : (
        <Empty
          icon={<ShoppingBasket />}
          heading="Nothing to buy yet"
          body="Add meals to your plan, then your ingredients will appear here."
        />
      )}
      {purchases.filter((x) => x.listWeek === week).length > 0 && (
        <section className="shopping-group">
          <div className="section-heading">
            <h2>Purchase history</h2>
          </div>
          <Card>
            {purchases
              .filter((x) => x.listWeek === week)
              .map((x) => (
                <div className="history-line" key={x.id}>
                  <span>
                    {x.name} · {x.qty} {x.unit} · {fmt(x.date)}
                  </span>
                  <b>{money(x.amount, p)}</b>
                  <button
                    className="icon-btn"
                    aria-label={`Delete purchase ${x.name}`}
                    onClick={async () => {
                      if (!confirm("Delete this purchase record?")) return;
                      await db.transaction(
                        "rw",
                        db.purchases,
                        db.lists,
                        db.pantry,
                        async () => {
                          if (x.pantryId) await db.pantry.delete(x.pantryId);
                          await db.purchases.delete(x.id);
                          if (x.listItemId)
                            await db.lists.update(x.listItemId, {
                              checked: false,
                              actualQty: 0,
                              actualCost: 0,
                            });
                        },
                      );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </Card>
        </section>
      )}
      {buying && (
        <Modal
          title={`Record purchase · ${buying.name}`}
          onClose={() => setBuying(null)}
        >
          <form
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await ensureList();
                await recordGroceryPurchase({
                  name: buying.name,
                  qty: boughtQty,
                  unit: boughtUnit,
                  amount: Number(boughtAmount),
                  listWeek: week,
                  listItemId: buying.id,
                  addToPantry: addBoughtStock,
                });
                setBuying(null);
              } catch (error) {
                setPurchaseError(
                  error instanceof Error
                    ? error.message
                    : "Purchase could not be saved.",
                );
              }
            }}
          >
            <p className="muted">
              Your list needs {Math.round(buying.qty * 100) / 100} {buying.unit}
              . Enter what you actually bought, even if it is more than this
              week's need.
            </p>
            <div className="form-grid">
              <label>
                Quantity bought
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={boughtQty}
                  onChange={(event) => setBoughtQty(Number(event.target.value))}
                />
              </label>
              <label>
                Unit
                <select
                  value={boughtUnit}
                  onChange={(event) => setBoughtUnit(event.target.value)}
                >
                  {[
                    ...new Set([
                      buying.unit,
                      "g",
                      "kg",
                      "ml",
                      "l",
                      "pcs",
                      "slices",
                    ]),
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Total paid ({p.currency})
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={boughtAmount}
                onChange={(event) => setBoughtAmount(event.target.value)}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={addBoughtStock}
                onChange={(event) => setAddBoughtStock(event.target.checked)}
              />
              Add what I bought to my pantry
            </label>
            <p className="hint">
              The full payment counts on today's budget. Meals use only their
              ingredient portion for estimates. Stock is reduced when you mark a
              meal eaten.
            </p>
            {purchaseError && (
              <p className="error" role="alert">
                {purchaseError}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setBuying(null)}>
                Cancel
              </Button>
              <Button type="submit">Save purchase</Button>
            </div>
          </form>
        </Modal>
      )}
      {custom && (
        <Modal title="Add shopping item" onClose={() => setCustom(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
          >
            <label>
              Item
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Quantity
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(+e.target.value)}
                />
              </label>
              <label>
                Unit
                <input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </label>
            </div>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Vegetables",
                  "Grains",
                  "Legumes",
                  "Meat",
                  "Fish",
                  "Dairy & eggs",
                  "Fruits",
                  "Pantry essentials",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setCustom(false)}>
                Cancel
              </Button>
              <Button type="submit">Add item</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Progress({ data }: { data: Data }) {
  const { weights, profile: p } = data;
  const [editing, setEditing] = useState<Partial<Weight> | null>(null);
  const [range, setRange] = useState<"week" | "month" | "all">("month");
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff =
    range === "week"
      ? format(addDays(new Date(), -7), "yyyy-MM-dd")
      : range === "month"
        ? format(addDays(new Date(), -30), "yyyy-MM-dd")
        : "0000-01-01";
  const chartWeights = sorted.filter((w) => w.date >= cutoff);
  const latest = sorted.at(-1);
  const delta = latest ? latest.kg - p.weight : 0;
  const save = async (w: Partial<Weight>) => {
    if (!w.kg || w.kg <= 0) return;
    await db.weights.put({
      id: w.id || uid(),
      date: w.date || today(),
      kg: w.kg,
      note: w.note || "",
    });
    setEditing(null);
  };
  const exportCsv = () => {
    const csv =
      "date,kg,note\n" +
      sorted
        .map((w) => `${w.date},${w.kg},"${w.note.replaceAll('"', '""')}"`)
        .join("\n");
    download("nourish-weight.csv", new Blob([csv], { type: "text/csv" }));
  };
  return (
    <>
      <Header
        title="Your progress"
        subtitle="A record of the journey, at your own pace."
        action={
          <Button
            onClick={() =>
              setEditing({ date: today(), kg: latest?.kg || p.weight })
            }
          >
            <Plus size={17} /> Log weight
          </Button>
        }
      />
      <div className="progress-stats">
        <Card>
          <span>Latest weight</span>
          <strong>
            {latest?.kg ?? "—"} {latest && <small>kg</small>}
          </strong>
          <p>{latest ? fmt(latest.date) : "No weigh-in recorded"}</p>
        </Card>
        <Card>
          <span>Change from start</span>
          <strong>
            {latest ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}{" "}
            {latest && <small>kg</small>}
          </strong>
          <p>Since {p.weight} kg</p>
        </Card>
        <Card>
          <span>First milestone</span>
          <strong>
            {p.milestone} <small>kg</small>
          </strong>
          <p>Long-term goal {p.target} kg</p>
        </Card>
      </div>
      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WEIGHT HISTORY</p>
            <h2>Your trend</h2>
          </div>
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
        </div>
        <div className="segmented" aria-label="Weight chart period">
          {(["week", "month", "all"] as const).map((x) => (
            <button
              key={x}
              className={range === x ? "active" : ""}
              onClick={() => setRange(x)}
            >
              {x === "week" ? "7 days" : x === "month" ? "30 days" : "All"}
            </button>
          ))}
        </div>
        {chartWeights.length > 1 ? (
          <div className="chart-wrap">
            <Suspense
              fallback={<div className="chart-empty">Loading chart…</div>}
            >
              <WeightChart records={chartWeights} />
            </Suspense>
          </div>
        ) : (
          <div className="chart-empty">
            <TrendingUp size={28} />
            <h3>A story in the making</h3>
            <p>Add another weight entry to see your trend. Gaps remain gaps.</p>
          </div>
        )}
      </Card>
      <section className="weight-history">
        <div className="section-heading">
          <h2>Journal</h2>
          <span>{weights.length} entries</span>
        </div>
        {[...sorted].reverse().map((w) => (
          <Card key={w.id} className="weight-entry">
            <span className="weight-dot" />
            <div>
              <b>{fmt(w.date)}</b>
              <p>{w.note || "No note"}</p>
            </div>
            <strong>{w.kg} kg</strong>
            <button
              className="icon-btn"
              aria-label="Edit weight entry"
              onClick={() => setEditing(w)}
            >
              <PenLine size={16} />
            </button>
            <button
              className="icon-btn"
              aria-label="Delete weight entry"
              onClick={() =>
                confirm("Delete this weight entry?") && db.weights.delete(w.id)
              }
            >
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Edit weight entry" : "Log weight"}
          onClose={() => setEditing(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              save(editing);
            }}
          >
            <label>
              Date
              <input
                type="date"
                required
                value={editing.date || today()}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
              />
            </label>
            <label>
              Weight (kg)
              <input
                type="number"
                min="1"
                max="500"
                step="0.1"
                required
                value={editing.kg || ""}
                onChange={(e) =>
                  setEditing({ ...editing, kg: +e.target.value })
                }
              />
            </label>
            <label>
              Optional note
              <textarea
                value={editing.note || ""}
                onChange={(e) =>
                  setEditing({ ...editing, note: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save entry</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Recipes({ data }: { data: Data }) {
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);
  const [imageError, setImageError] = useState("");
  const [ingredient, setIngredient] = useState<Ingredient>({
    name: "",
    qty: 100,
    unit: "g",
    category: "Pantry essentials",
  });
  const { recipes, prices, profile: p, meals, ingredients: catalog } = data;
  const save = async () => {
    if (!editing?.name?.trim()) return;
    await db.ingredients.bulkPut(
      catalogFromRecipes([
        {
          id: editing.id || "new",
          name: editing.name,
          emoji: editing.emoji || "🍽️",
          ingredients: editing.ingredients || [],
          steps: editing.steps || "",
          servings: editing.servings || 1,
          minutes: editing.minutes || 0,
        },
      ]),
    );
    await db.recipes.put({
      ...editing,
      id: editing.id || uid(),
      name: editing.name.trim(),
      emoji: editing.emoji || "🍽️",
      ingredients: editing.ingredients || [],
      steps: editing.steps || "",
      servings: editing.servings || 1,
      minutes: editing.minutes || 0,
      notes: editing.notes || "",
      category: editing.category || "Main meal",
      favorite: editing.favorite || false,
      source: "custom",
    });
    setEditing(null);
  };
  const updateIngredient = (index: number, patch: Partial<Ingredient>) =>
    setEditing((current) => ({
      ...current,
      ingredients: current?.ingredients?.map((i, n) =>
        n === index ? { ...i, ...patch } : i,
      ),
    }));
  const removeRecipe = async (id: string) => {
    if (
      id.startsWith("curated-") ||
      id.startsWith("imported:") ||
      seedRecipes.some((r) => r.id === id)
    )
      return;
    if (meals.some((m) => m.recipeId === id && m.status !== "eaten")) {
      alert(
        "Replace or remove planned meals using this recipe first. Logged meals are preserved with a snapshot.",
      );
      return;
    }
    if (!confirm("Delete this recipe from the library?")) return;
    await db.recipes.delete(id);
    setEditing(null);
  };
  const filtered = recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      (!favoritesOnly || r.favorite),
  );
  return (
    <>
      <Header
        title="Recipe library"
        subtitle="Familiar meals and your own creations."
        action={
          <Button
            onClick={() =>
              setEditing({
                name: "",
                emoji: "🍽️",
                ingredients: [],
                servings: 1,
                minutes: 20,
                category: "Main meal",
              })
            }
          >
            <Plus size={17} /> New recipe
          </Button>
        }
      />
      <div className="recipe-search">
        <label className="search-label">
          Search recipes
          <input
            placeholder="Find a meal…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className={`favorite-filter ${favoritesOnly ? "active" : ""}`}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          ♥ Favorites
        </button>
      </div>
      <div className="recipe-grid">
        {filtered.map((r) => {
          const cost = mealCost(r, prices);
          return (
            <Card key={r.id} className="recipe-card">
              <div
                className="recipe-card-art"
                style={
                  r.image
                    ? {
                        backgroundImage: `url(${r.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {!r.image && r.emoji}
                <button
                  className={`favorite-btn ${r.favorite ? "active" : ""}`}
                  aria-label={`${r.favorite ? "Remove" : "Add"} ${r.name} ${r.favorite ? "from" : "to"} favorites`}
                  onClick={() =>
                    db.recipes.update(r.id, { favorite: !r.favorite })
                  }
                >
                  {r.favorite ? "♥" : "♡"}
                </button>
              </div>
              <div className="recipe-card-body">
                <span className="recipe-category">
                  {r.category || "Main meal"}
                </span>
                <h3>{r.name}</h3>
                <p>
                  {r.ingredients.map((x) => x.name).join(" · ") ||
                    "Add ingredients"}
                </p>
                <div className="recipe-card-foot">
                  <span>
                    ◷ {r.minutes > 0 ? `${r.minutes} min` : "Time not set"}
                  </span>
                  <span>
                    {cost.missing.length
                      ? "Price not entered"
                      : money(cost.total, p)}
                  </span>
                </div>
                {r.source === "builtin" ||
                r.source === "imported" ||
                r.id.startsWith("curated-") ||
                seedRecipes.some((x) => x.id === r.id) ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditing({
                        ...r,
                        id: undefined,
                        name: `${r.name} (my version)`,
                        source: "custom",
                      })
                    }
                  >
                    <Copy size={16} /> Make my version
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setEditing(r)}>
                    <PenLine size={16} /> Edit recipe
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {!filtered.length && (
        <Empty
          icon={<BookOpen />}
          heading="No recipes found"
          body="Try another search or create your own meal."
        />
      )}
      {editing && (
        <Modal
          title={editing.id ? "Edit recipe" : "Create a recipe"}
          onClose={() => setEditing(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="form-grid">
              <label>
                Recipe name
                <input
                  required
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                Emoji
                <input
                  value={editing.emoji || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, emoji: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Category
                <select
                  value={editing.category || "Main meal"}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                >
                  {[
                    "Breakfast",
                    "Main meal",
                    "Snack",
                    "Side",
                    "Drink",
                    "Other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Servings
                <input
                  type="number"
                  min="1"
                  value={editing.servings || 1}
                  onChange={(e) =>
                    setEditing({ ...editing, servings: +e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Preparation time (minutes)
              <input
                type="number"
                min="0"
                value={editing.minutes || 0}
                onChange={(e) =>
                  setEditing({ ...editing, minutes: +e.target.value })
                }
              />
            </label>
            <h3>Ingredients</h3>
            <p className="hint">
              Change a name, quantity or unit to make an ingredient
              substitution. Costs recalculate from your price book.
            </p>
            {editing.ingredients?.map((x, n) => (
              <div className="recipe-edit-ingredient" key={n}>
                <input
                  aria-label={`Ingredient ${n + 1} name`}
                  value={x.name}
                  onChange={(e) => {
                    const known = catalog.find(
                      (i) => i.name === e.target.value.toLowerCase(),
                    );
                    updateIngredient(n, {
                      name: e.target.value,
                      category: known?.category || x.category,
                      unit: known?.unit || x.unit,
                    });
                  }}
                />
                <input
                  aria-label={`Ingredient ${n + 1} quantity`}
                  type="number"
                  min="0.01"
                  step="any"
                  value={x.qty}
                  onChange={(e) =>
                    updateIngredient(n, { qty: +e.target.value })
                  }
                />
                <input
                  aria-label={`Ingredient ${n + 1} unit`}
                  value={x.unit}
                  onChange={(e) =>
                    updateIngredient(n, { unit: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${x.name}`}
                  onClick={() =>
                    setEditing({
                      ...editing,
                      ingredients: editing.ingredients?.filter(
                        (_, j) => j !== n,
                      ),
                    })
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="ingredient-add">
              <input
                placeholder="New ingredient"
                aria-label="New ingredient"
                list="ingredient-catalog"
                value={ingredient.name}
                onChange={(e) => {
                  const known = catalog.find(
                    (i) => i.name === e.target.value.toLowerCase(),
                  );
                  setIngredient({
                    ...ingredient,
                    name: e.target.value,
                    category: known?.category || ingredient.category,
                    unit: known?.unit || ingredient.unit,
                  });
                }}
              />
              <input
                type="number"
                min="0.01"
                step="any"
                aria-label="New quantity"
                value={ingredient.qty}
                onChange={(e) =>
                  setIngredient({ ...ingredient, qty: +e.target.value })
                }
              />
              <input
                aria-label="New unit"
                value={ingredient.unit}
                onChange={(e) =>
                  setIngredient({ ...ingredient, unit: e.target.value })
                }
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Add ingredient"
                onClick={() => {
                  if (ingredient.name.trim() && ingredient.qty > 0) {
                    setEditing({
                      ...editing,
                      ingredients: [
                        ...(editing.ingredients || []),
                        {
                          ...ingredient,
                          name: ingredient.name.trim().toLowerCase(),
                        },
                      ],
                    });
                    setIngredient({
                      name: "",
                      qty: 100,
                      unit: "g",
                      category: "Pantry essentials",
                    });
                  }
                }}
              >
                <Plus size={18} />
              </button>
            </div>
            <datalist id="ingredient-catalog">
              {catalog.map((i) => (
                <option key={i.name} value={i.name} />
              ))}
            </datalist>
            <label>
              New ingredient category
              <select
                value={ingredient.category}
                onChange={(e) =>
                  setIngredient({ ...ingredient, category: e.target.value })
                }
              >
                {[
                  "Vegetables",
                  "Grains",
                  "Legumes",
                  "Meat",
                  "Fish",
                  "Dairy & eggs",
                  "Fruits",
                  "Pantry essentials",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Local recipe photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1024 * 1024) {
                    setImageError(
                      "Choose an image under 1 MB so backups stay manageable.",
                    );
                    return;
                  }
                  setImageError("");
                  const reader = new FileReader();
                  reader.onload = () =>
                    setEditing((prev) =>
                      prev ? { ...prev, image: String(reader.result) } : prev,
                    );
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {imageError && <p className="error">{imageError}</p>}
            {editing.image && (
              <img
                src={editing.image}
                alt="Recipe preview"
                className="recipe-image-preview"
              />
            )}
            <label>
              Preparation steps
              <textarea
                value={editing.steps || ""}
                onChange={(e) =>
                  setEditing({ ...editing, steps: e.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={editing.notes || ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              {editing.id && (
                <Button
                  variant="danger"
                  onClick={() => removeRecipe(editing.id!)}
                >
                  Delete
                </Button>
              )}
              <Button type="submit">Save recipe</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function PantryPage({ data }: { data: Data }) {
  const { pantry, prices, profile: p, ingredients } = data;
  const [tab, setTab] = useState<"stock" | "prices">("stock");
  const [item, setItem] = useState<Partial<Pantry> | null>(null);
  const [price, setPrice] = useState<Partial<Price> | null>(null);
  const [priceQuery, setPriceQuery] = useState("");
  const unpricedPackItems = ingredients.filter(
    (item) =>
      item.fromPersonalPack &&
      !prices.some((price) => price.name === item.name),
  );
  return (
    <>
      <Header
        title="Pantry & prices"
        subtitle="Keep stock and local prices up to date."
      />
      <div className="segmented">
        <button
          className={tab === "stock" ? "active" : ""}
          onClick={() => setTab("stock")}
        >
          My pantry
        </button>
        <button
          className={tab === "prices" ? "active" : ""}
          onClick={() => setTab("prices")}
        >
          Ingredient prices
        </button>
      </div>
      <div className="section-heading">
        <h2>{tab === "stock" ? "Ingredients on hand" : "Local price book"}</h2>
        <Button
          onClick={() =>
            tab === "stock"
              ? setItem({ name: "", qty: 1, unit: "g", leftover: false })
              : setPrice({ name: "", qty: 1, unit: "g", price: 0 })
          }
        >
          <Plus size={17} /> Add {tab === "stock" ? "stock" : "price"}
        </Button>
      </div>
      {tab === "stock" ? (
        pantry.length ? (
          pantry.map((x) => (
            <Card key={x.id} className="simple-row">
              <span className="stat-icon sage">
                <Archive size={18} />
              </span>
              <div>
                <b>{x.name}</b>
                <p>
                  {x.qty} {x.unit} available {x.leftover ? "· leftover" : ""}
                </p>
                {x.expiresOn && (
                  <p className={x.expiresOn < today() ? "pantry-expiry" : ""}>
                    {x.expiresOn < today() ? "Expired" : "Use by"}{" "}
                    {fmt(x.expiresOn)}
                  </p>
                )}
              </div>
              <button
                className="icon-btn"
                aria-label={`Edit ${x.name}`}
                onClick={() => setItem(x)}
              >
                <PenLine size={17} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Remove ${x.name}`}
                onClick={() =>
                  confirm("Remove this pantry item?") && db.pantry.delete(x.id)
                }
              >
                <Trash2 size={17} />
              </button>
            </Card>
          ))
        ) : (
          <Empty
            icon={<Archive />}
            heading="Your pantry starts here"
            body="Add ingredients you have so they are subtracted from shopping needs."
          />
        )
      ) : prices.length || unpricedPackItems.length ? (
        prices
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((x) => (
            <Card key={x.name} className="simple-row">
              <span className="stat-icon peach">
                <Wallet size={18} />
              </span>
              <div>
                <b>{x.name}</b>
                <p>
                  {money(x.price, p)} per {x.qty} {x.unit}
                </p>
              </div>
              <button
                className="icon-btn"
                aria-label={`Edit price of ${x.name}`}
                onClick={() => setPrice(x)}
              >
                <PenLine size={17} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Remove price of ${x.name}`}
                onClick={() =>
                  confirm("Remove this price?") && db.prices.delete(x.name)
                }
              >
                <Trash2 size={17} />
              </button>
            </Card>
          ))
      ) : (
        <Empty
          icon={<Wallet />}
          heading="Add prices you know"
          body="Meal estimates stay incomplete until matching ingredient prices are entered."
        />
      )}
      {tab === "prices" && unpricedPackItems.length > 0 && (
        <section className="shopping-group">
          <div className="section-heading">
            <div>
              <h2>Prices to enter from your meal pack</h2>
              <p className="muted">
                {unpricedPackItems.length} ingredients have no saved price. They
                are not treated as free.
              </p>
            </div>
          </div>
          <label>
            Search ingredients
            <input
              value={priceQuery}
              onChange={(event) => setPriceQuery(event.target.value)}
              placeholder="e.g. beef or rice"
            />
          </label>
          {unpricedPackItems
            .filter((item) =>
              item.name.includes(priceQuery.trim().toLowerCase()),
            )
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <Card key={item.name} className="simple-row">
                <span className="stat-icon peach">
                  <Wallet size={18} />
                </span>
                <div>
                  <b>{item.name}</b>
                  <p>Price not entered</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPrice({ name: item.name, qty: 1, unit: item.unit })
                  }
                >
                  Enter price
                </Button>
              </Card>
            ))}
        </section>
      )}
      {item && (
        <Modal title="Pantry stock" onClose={() => setItem(null)}>
          <form
            className="modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !item.name?.trim() ||
                !item.unit?.trim() ||
                !item.qty ||
                item.qty <= 0
              )
                return;
              await db.pantry.put({
                id: item.id || uid(),
                name: item.name.toLowerCase().trim(),
                qty: item.qty,
                unit: item.unit,
                expiresOn: item.expiresOn || undefined,
                leftover: !!item.leftover,
              });
              setItem(null);
            }}
          >
            <label>
              Ingredient
              <input
                required
                value={item.name || ""}
                onChange={(e) => setItem({ ...item, name: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Quantity
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={item.qty || ""}
                  onChange={(e) => setItem({ ...item, qty: +e.target.value })}
                />
              </label>
              <label>
                Unit
                <input
                  required
                  value={item.unit || ""}
                  onChange={(e) => setItem({ ...item, unit: e.target.value })}
                />
              </label>
            </div>
            <label>
              Use by date (optional)
              <input
                type="date"
                value={item.expiresOn || ""}
                onChange={(e) =>
                  setItem({ ...item, expiresOn: e.target.value })
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={!!item.leftover}
                onChange={(e) =>
                  setItem({ ...item, leftover: e.target.checked })
                }
              />{" "}
              This is a leftover
            </label>
            <p className="hint">
              Expired stock is excluded from future shopping deductions. Enter
              cooked leftovers as their own pantry item with the amount you
              actually saved.
            </p>
            <Button type="submit">Save stock</Button>
          </form>
        </Modal>
      )}
      {price && (
        <Modal title="Ingredient price" onClose={() => setPrice(null)}>
          <form
            className="modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !price.name?.trim() ||
                !price.unit?.trim() ||
                !price.qty ||
                price.qty <= 0 ||
                price.price === undefined ||
                price.price < 0
              )
                return;
              await db.prices.put({
                name: price.name.toLowerCase().trim(),
                qty: price.qty,
                unit: price.unit,
                price: price.price,
                updatedAt: today(),
              });
              setPrice(null);
            }}
          >
            <label>
              Ingredient
              <input
                required
                disabled={!!prices.find((x) => x.name === price.name)}
                value={price.name || ""}
                onChange={(e) => setPrice({ ...price, name: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Package quantity
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={price.qty || ""}
                  onChange={(e) => setPrice({ ...price, qty: +e.target.value })}
                />
              </label>
              <label>
                Unit
                <input
                  required
                  value={price.unit || ""}
                  onChange={(e) => setPrice({ ...price, unit: e.target.value })}
                />
              </label>
            </div>
            <label>
              Package price ({p.currency})
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price.price ?? ""}
                onChange={(e) => setPrice({ ...price, price: +e.target.value })}
              />
            </label>
            <p className="hint">
              Use the same unit as in recipes so costs can be calculated.
            </p>
            <Button type="submit">Save price</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Habits({ data }: { data: Data }) {
  const { habits, profile: p } = data;
  const day = today();
  const entries = [
    ["tea", "Tea cups", Coffee, p.teaTarget],
    ["water", "Water glasses", Droplets, 8],
    ["breakfast", "Breakfast eaten", Check, 1],
    ["lunch", "Lunch eaten", Check, 1],
    ["dinner", "Dinner eaten", Check, 1],
    ["weigh", "Weekly weigh-in", Scale, 1],
  ] as const;
  const customs = [...new Set(habits.map((x) => x.key))].filter(
    (x) => !entries.some((y) => y[0] === x),
  );
  const [newHabit, setNewHabit] = useState("");
  return (
    <>
      <Header
        title="Daily habits"
        subtitle="Notice your routine without pressure."
      />
      <Card className="habit-intro">
        <span>✦</span>
        <div>
          <h3>Little things count.</h3>
          <p>
            These are personal reminders, never a score. Tea is welcome in your
            routine; notice if it replaces a meal you wanted to eat.
          </p>
        </div>
      </Card>
      <div className="section-heading">
        <h2>{format(new Date(), "EEEE, d MMMM")}</h2>
      </div>
      <div className="habit-list">
        {[
          ...entries.map((e) => ({
            key: e[0],
            label: e[1],
            Icon: e[2],
            target: e[3],
          })),
          ...customs.map((key) => ({
            key,
            label: key,
            Icon: Check,
            target: 1,
          })),
        ].map(({ key, label, Icon, target }) => {
          const manual =
            habits.find((h) => h.date === day && h.key === key)?.value || 0;
          const loggedCount =
            key === "weigh"
              ? data.weights.some((w) => w.date >= weekOf(day))
                ? 1
                : 0
              : ["breakfast", "lunch", "dinner", "snack"].includes(key)
                ? data.mealRecords.filter(
                    (m) => m.date === day && m.slot === key,
                  ).length
                : 0;
          const val = Math.max(manual, loggedCount);
          return (
            <Card className="habit-item" key={key}>
              <span className="stat-icon sage">
                <Icon size={20} />
              </span>
              <div>
                <b>{label}</b>
                <p>
                  {val} today {key === "tea" ? `· usual ${target}` : ""}
                </p>
              </div>
              <div className="counter">
                <button
                  aria-label={`Decrease ${label}`}
                  disabled={val <= loggedCount}
                  onClick={() => setHabit(habits, key, val - 1)}
                >
                  −
                </button>
                <strong>{val}</strong>
                <button
                  aria-label={`Increase ${label}`}
                  onClick={() => setHabit(habits, key, val + 1)}
                >
                  +
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="add-habit">
        <h3>Make it personal</h3>
        <div className="button-row">
          <input
            placeholder="New habit name"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
          />
          <Button
            onClick={() => {
              if (newHabit.trim()) {
                setHabit(habits, newHabit.trim(), 1);
                setNewHabit("");
              }
            }}
          >
            Add habit
          </Button>
        </div>
      </Card>
    </>
  );
}
function MealHistory({ data }: { data: Data }) {
  const [search, setSearch] = useState("");
  const records = [...data.mealRecords]
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
    .filter((x) => x.recipe.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <Header
        title="Meal history"
        subtitle="What you recorded stays here when plans and recipes change."
      />
      <label className="search-label">
        Search enjoyed meals
        <input
          placeholder="Find a logged dish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {records.length ? (
        records.map((record) => (
          <Card className="history-meal" key={record.id}>
            <span className="recipe-emoji">{record.recipe.emoji}</span>
            <div>
              <b>{record.recipe.name}</b>
              <p>
                {fmt(record.date)} ·{" "}
                {record.slot === "dinner" ? "supper" : record.slot} ·{" "}
                {record.portion} portion
              </p>
            </div>
            <span>
              {record.estimatedCost !== undefined
                ? money(record.estimatedCost, data.profile)
                : "Cost unavailable"}
            </span>
          </Card>
        ))
      ) : (
        <Empty
          icon={<BookOpen />}
          heading="No logged meals yet"
          body="Mark a planned meal as eaten to build your history."
        />
      )}
    </>
  );
}
function BudgetPage({ data }: { data: Data }) {
  const { profile: p, meals, recipes, prices, purchases } = data;
  const [date, setDate] = useState(today());
  const week = weekOf(date);
  const dailyLimit = budgetFor(p, data.budgets, "daily", date);
  const weeklyLimit = budgetFor(p, data.budgets, "weekly", week);
  const [editBudget, setEditBudget] = useState(false);
  const [dailyDraft, setDailyDraft] = useState(dailyLimit);
  const [weeklyDraft, setWeeklyDraft] = useState(weeklyLimit);
  const saveBudget = async () => {
    if (dailyDraft < 0 || weeklyDraft < 0) return;
    await db.budgets.bulkPut([
      {
        id: `daily:${date}`,
        period: "daily",
        date,
        amount: dailyDraft,
        currency: p.currency,
      },
      {
        id: `weekly:${week}`,
        period: "weekly",
        date: week,
        amount: weeklyDraft,
        currency: p.currency,
      },
    ]);
    setEditBudget(false);
  };
  const dayMeals = meals.filter(
    (m) => m.date === date && m.status !== "skipped",
  );
  const weekMeals = meals.filter(
    (m) => weekOf(m.date) === week && m.status !== "skipped",
  );
  const projected = (records: PlannedMeal[]) =>
    records.reduce((sum, m) => {
      const r = recipes.find((x) => x.id === m.recipeId);
      return (
        sum + (r ? mealCost(effectiveRecipe(m, r), prices, m.portion).total : 0)
      );
    }, 0);
  const incomplete = (records: PlannedMeal[]) => [
    ...new Set(
      records.flatMap((m) => {
        const r = recipes.find((x) => x.id === m.recipeId);
        return r
          ? mealCost(effectiveRecipe(m, r), prices, m.portion).missing
          : [];
      }),
    ),
  ];
  const spent = (records: Purchase[]) =>
    records.reduce((sum, x) => sum + x.amount, 0);
  const daySpent = spent(purchases.filter((x) => x.date === date));
  const weekSpent = spent(purchases.filter((x) => weekOf(x.date) === week));
  const dayProjected = projected(dayMeals),
    weekProjected = projected(weekMeals);
  return (
    <>
      <Header
        title="Budget manager"
        subtitle="Plan costs and actual purchases in one place."
        action={
          <Button
            onClick={() => {
              setDailyDraft(dailyLimit);
              setWeeklyDraft(weeklyLimit);
              setEditBudget(true);
            }}
          >
            <PenLine size={16} /> Edit budgets
          </Button>
        }
      />
      <div className="planner-toolbar">
        <label>
          Review date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="budget-cards">
        <Card>
          <span className="stat-icon sage">
            <Wallet size={19} />
          </span>
          <h2>Daily</h2>
          <p>Food budget</p>
          <strong>{money(dailyLimit, p)}</strong>
          <div className="budget-detail">
            <span>Planned meals</span>
            <b>
              {money(dayProjected, p)}
              {incomplete(dayMeals).length ? " + unknown" : ""}
            </b>
          </div>
          <div className="budget-detail">
            <span>Actual purchases</span>
            <b>{money(daySpent, p)}</b>
          </div>
          <div className="budget-detail">
            <span>Remaining after purchases</span>
            <b>{money(dailyLimit - daySpent, p)}</b>
          </div>
        </Card>
        <Card>
          <span className="stat-icon peach">
            <CalendarDays size={19} />
          </span>
          <h2>Week of {fmt(week)}</h2>
          <p>Food budget</p>
          <strong>{money(weeklyLimit, p)}</strong>
          <div className="budget-detail">
            <span>Planned meals</span>
            <b>
              {money(weekProjected, p)}
              {incomplete(weekMeals).length ? " + unknown" : ""}
            </b>
          </div>
          <div className="budget-detail">
            <span>Actual purchases</span>
            <b>{money(weekSpent, p)}</b>
          </div>
          <div className="budget-detail">
            <span>Remaining after purchases</span>
            <b>{money(weeklyLimit - weekSpent, p)}</b>
          </div>
        </Card>
      </div>
      {dayProjected > dailyLimit && (
        <p className="inline-tip">
          The selected day's known meal costs are{" "}
          {money(dayProjected - dailyLimit, p)} above the daily budget. You can
          adjust portions or choose a suitable alternative.
        </p>
      )}
      {weekProjected > weeklyLimit && (
        <p className="inline-tip">
          The current plan is {money(weekProjected - weeklyLimit, p)} above the
          weekly budget based on known prices. Review expensive meals and choose
          alternatives that suit your restrictions.
        </p>
      )}
      {incomplete(weekMeals).length > 0 && (
        <p className="inline-tip">
          Missing prices: {incomplete(weekMeals).join(", ")}. Estimates are
          incomplete until these are entered.
        </p>
      )}
      <Card className="settings-card">
        <h2>How these numbers work</h2>
        <p>
          Planned cost uses ingredient quantities and your saved package prices.
          Actual spending comes only from purchases you record. Pantry stock
          lowers shopping needs but does not erase the cost of a planned meal.
        </p>
        <div className="button-row">
          <Button
            variant="secondary"
            onClick={() => location.assign("/profile")}
          >
            Edit profile defaults
          </Button>
          <Button
            variant="secondary"
            onClick={() => location.assign("/pantry")}
          >
            Edit prices
          </Button>
        </div>
      </Card>
      {editBudget && (
        <Modal title="Period budgets" onClose={() => setEditBudget(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveBudget();
            }}
          >
            <p className="hint">
              These amounts apply only to {fmt(date)} and the week of{" "}
              {fmt(week)}. Profile budgets remain your defaults.
            </p>
            <label>
              Daily budget ({p.currency})
              <input
                type="number"
                min="0"
                value={dailyDraft}
                onChange={(e) => setDailyDraft(+e.target.value)}
              />
            </label>
            <label>
              Weekly budget ({p.currency})
              <input
                type="number"
                min="0"
                value={weeklyDraft}
                onChange={(e) => setWeeklyDraft(+e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={async () => {
                  await db.budgets.bulkDelete([
                    `daily:${date}`,
                    `weekly:${week}`,
                  ]);
                  setEditBudget(false);
                }}
              >
                Use profile defaults
              </Button>
              <Button type="submit">Save budgets</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Insights({ data }: { data: Data }) {
  const { profile: p, meals, purchases, weights, mealRecords } = data;
  const last30 = Array.from({ length: 30 }, (_, i) =>
    format(addDays(new Date(), i - 29), "yyyy-MM-dd"),
  );
  const pastMeals = meals.filter(
    (m) =>
      last30.includes(m.date) &&
      (m.date < today() ||
        (m.date === today() &&
          p.mealTimes[m.slot] <= format(new Date(), "HH:mm"))),
  );
  const eaten = mealRecords.filter((m) => last30.includes(m.date));
  const loggedIds = new Set(eaten.map((m) => m.id));
  const scheduledIds = new Set([...pastMeals.map((m) => m.id), ...loggedIds]);
  const consistency = scheduledIds.size
    ? Math.round((eaten.length / scheduledIds.size) * 100)
    : 0;
  const variety = new Set(eaten.map((m) => m.recipe.name)).size;
  const weeks = Array.from({ length: 8 }, (_, i) =>
    format(subWeeks(parseISO(weekOf(today())), 7 - i), "yyyy-MM-dd"),
  );
  const spending = weeks.map((w) => ({
    label: format(parseISO(w), "d MMM"),
    amount: purchases
      .filter((x) => weekOf(x.date) === w)
      .reduce((sum, x) => sum + x.amount, 0),
  }));
  const weightData = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <Header
        title="Your insights"
        subtitle="Patterns based only on what you actually recorded."
      />
      <div className="progress-stats">
        <Card>
          <span>Meals enjoyed</span>
          <strong>{eaten.length}</strong>
          <p>In the last 30 days</p>
        </Card>
        <Card>
          <span>Meal consistency</span>
          <strong>{consistency}%</strong>
          <p>Of planned meals through today</p>
        </Card>
        <Card>
          <span>Food variety</span>
          <strong>{variety}</strong>
          <p>Different logged dishes</p>
        </Card>
      </div>
      <div className="insight-grid">
        <Card className="chart-card">
          <div className="section-heading">
            <h2>Grocery spending</h2>
          </div>
          <div className="chart-wrap">
            <Suspense
              fallback={<div className="chart-empty">Loading chart…</div>}
            >
              <SpendingChart
                records={spending}
                formatMoney={(amount) => money(amount, p)}
              />
            </Suspense>
          </div>
        </Card>
        <Card className="chart-card">
          <div className="section-heading">
            <h2>Weight records</h2>
          </div>
          {weightData.length > 1 ? (
            <div className="chart-wrap">
              <Suspense
                fallback={<div className="chart-empty">Loading chart…</div>}
              >
                <WeightChart records={weightData} />
              </Suspense>
            </div>
          ) : (
            <div className="chart-empty">
              <TrendingUp size={28} />
              <p>Add another weight record to see a trend.</p>
            </div>
          )}
        </Card>
      </div>
      <p className="hint">
        Consistency uses recorded planned meals. Missing days are not treated as
        skipped meals.
      </p>
    </>
  );
}
function More() {
  const nav = useNavigate();
  const links = [
    ["/recipes", "Recipe library", "Your meals and ingredients", BookOpen],
    ["/pantry", "Pantry & prices", "Stock and local costs", Archive],
    ["/habits", "Daily habits", "Tea, water and routines", Coffee],
    ["/budget", "Budget manager", "Planned cost and purchases", Wallet],
    ["/insights", "Insights", "Your recorded patterns", TrendingUp],
    ["/history", "Meal history", "Meals you have enjoyed", BookOpen],
    ["/profile", "Your profile", "Goals, budget and preferences", Scale],
    ["/settings", "Settings", "Appearance and reminders", Settings],
    ["/backup", "Data & backup", "Export, import and delete", Download],
  ] as const;
  return (
    <>
      <Header
        title="More"
        subtitle="Everything you need to make Nourish your own."
      />
      <div className="more-list">
        {links.map(([path, title, description, Icon]) => (
          <Card key={path} className="more-card">
            <button onClick={() => nav(path)}>
              <span className="stat-icon sage">
                <Icon size={21} />
              </span>
              <span>
                <b>{title}</b>
                <small>{description}</small>
              </span>
              <ChevronRight size={19} />
            </button>
          </Card>
        ))}
      </div>
      <Card className="about">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={21} />
          </span>
          Nourish
        </div>
        <p>Eat well. Spend wisely. Grow healthier.</p>
        <small>
          Made for everyday planning, with your records kept on this device.
        </small>
      </Card>
    </>
  );
}
function ProfilePage({ data }: { data: Data }) {
  const [draft, setDraft] = useState(data.profile);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof Profile, value: unknown) => {
    setDraft((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    await db.transaction("rw", db.profiles, db.preferences, async () => {
      await db.profiles.put({ ...draft, personalized: true });
      await db.preferences.put({ id: "me", theme: draft.theme });
    });
    setSaved(true);
  };
  return (
    <>
      <Header
        title="Your profile"
        subtitle="Keep this up to date as life changes."
      />
      {!data.profile.personalized && (
        <Card className="profile-sample-note">
          <b>These are starter examples.</b>
          <p>
            Review the weight, height, budget, location and meal times before
            saving your own profile. Saving does not create a weigh-in; record
            one in Progress when you measure.
          </p>
        </Card>
      )}
      <form className="profile-form" onSubmit={save}>
        <Card>
          <h2>About you</h2>
          <div className="form-grid">
            <label>
              Name
              <input
                value={draft.name}
                required
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Country
              <input
                value={draft.country}
                required
                onChange={(e) => set("country", e.target.value)}
              />
            </label>
          </div>
          <label>
            Primary goal
            <select
              value={draft.goal}
              onChange={(e) => set("goal", e.target.value)}
            >
              <option value="gain">Gain weight gradually</option>
              <option value="maintain">Maintain weight</option>
              <option value="lose">Lose weight gradually</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Starting weight (kg)
              <input
                type="number"
                min="1"
                step="0.1"
                value={draft.weight}
                onChange={(e) => set("weight", +e.target.value)}
              />
            </label>
            <label>
              Height (cm)
              <input
                type="number"
                min="1"
                value={draft.height}
                onChange={(e) => set("height", +e.target.value)}
              />
            </label>
            <label>
              First milestone (kg)
              <input
                type="number"
                min="1"
                step="0.1"
                value={draft.milestone}
                onChange={(e) => set("milestone", +e.target.value)}
              />
            </label>
            <label>
              Long-term goal (kg)
              <input
                type="number"
                min="1"
                step="0.1"
                value={draft.target}
                onChange={(e) => set("target", +e.target.value)}
              />
            </label>
          </div>
        </Card>
        <Card>
          <h2>Food and budget</h2>
          <div className="form-grid">
            <label>
              Daily food budget
              <input
                type="number"
                min="0"
                value={draft.dailyBudget}
                onChange={(e) => set("dailyBudget", +e.target.value)}
              />
            </label>
            <label>
              Weekly food budget
              <input
                type="number"
                min="0"
                value={draft.weeklyBudget}
                onChange={(e) => set("weeklyBudget", +e.target.value)}
              />
            </label>
            <label>
              Currency code
              <input
                maxLength={3}
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
            </label>
            <label>
              Current meals per day
              <select
                value={draft.currentMeals}
                onChange={(e) => set("currentMeals", +e.target.value)}
              >
                <option value="1">About 1</option>
                <option value="2">About 2</option>
                <option value="3">About 3</option>
                <option value="4">About 4</option>
              </select>
            </label>
            <label>
              Preferred meals
              <select
                value={draft.meals}
                onChange={(e) => set("meals", +e.target.value)}
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">3 + snack</option>
              </select>
            </label>
          </div>
          <label>
            Restrictions or allergies
            <input
              value={draft.restrictions}
              onChange={(e) => set("restrictions", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Foods you enjoy
              <input
                value={draft.likes}
                onChange={(e) => set("likes", e.target.value)}
              />
            </label>
            <label>
              Foods you avoid
              <input
                value={draft.avoids}
                onChange={(e) => set("avoids", e.target.value)}
              />
            </label>
          </div>
        </Card>
        <Card>
          <h2>Meal times</h2>
          <div className="form-grid">
            {slots.map((s) => (
              <label key={s}>
                {s === "dinner" ? "supper" : s}
                <input
                  type="time"
                  value={draft.mealTimes[s]}
                  onChange={(e) =>
                    set("mealTimes", {
                      ...draft.mealTimes,
                      [s]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Typical tea cups per day
            <input
              type="number"
              min="0"
              value={draft.teaTarget}
              onChange={(e) => set("teaTarget", +e.target.value)}
            />
          </label>
        </Card>
        <div className="form-save">
          <Button type="submit">Save profile</Button>
          {saved && (
            <span>
              <Check size={16} /> Saved on this device
            </span>
          )}
        </div>
      </form>
    </>
  );
}
function SettingsPage({
  data,
  installed,
  installAvailable,
  onInstall,
}: {
  data: Data;
  installed: boolean;
  installAvailable: boolean;
  onInstall: () => void;
}) {
  const { profile: p, reminders } = data;
  const [draft, setDraft] = useState(p);
  const isIPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const defaults = [
    ["breakfast", "Breakfast"],
    ["lunch", "Lunch"],
    ["dinner", "Dinner"],
    ["snack", "Snack"],
    ["weigh", "Weekly weigh-in"],
  ];
  return (
    <>
      <Header title="Settings" subtitle="Make the app comfortable for you." />
      <Card className="settings-card">
        <h2>Appearance</h2>
        <div className="choice-row">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button
              key={theme}
              className={draft.theme === theme ? "selected" : ""}
              onClick={async () => {
                setDraft({ ...draft, theme });
                await db.preferences.put({ id: "me", theme });
              }}
            >
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}{" "}
              {theme}
            </button>
          ))}
        </div>
      </Card>
      <Card className="settings-card">
        <h2>In-app reminders</h2>
        <p>
          Reminders appear while Nourish is open. The app does not send alerts
          while closed.
        </p>
        {defaults.map(([id, label]) => {
          const r = reminders.find((x) => x.id === id);
          const time = r?.time || p.mealTimes[id as Slot] || "09:00";
          return (
            <div className="reminder-row" key={id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={r?.enabled || false}
                  onChange={(e) =>
                    db.reminders.put({
                      id,
                      label,
                      time,
                      enabled: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) =>
                  db.reminders.put({
                    id,
                    label,
                    time: e.target.value,
                    enabled: r?.enabled || false,
                  })
                }
              />
            </div>
          );
        })}
      </Card>
      <Card className="settings-card install-help">
        <h2>Install Nourish</h2>
        {installed ? (
          <p>Nourish is open as an installed app on this device.</p>
        ) : (
          <>
            <p>
              Keep your meals and shopping list one tap away. Open the site once
              online to cache it for offline use.
            </p>
            {installAvailable && (
              <Button onClick={onInstall}>
                <Download size={17} /> Install Nourish
              </Button>
            )}
            {isIPhone ? (
              <ol>
                <li>Open Nourish in Safari.</li>
                <li>
                  Tap Share, then <b>Add to Home Screen</b>.
                </li>
                <li>
                  Turn on <b>Open as Web App</b> if shown, then tap Add.
                </li>
              </ol>
            ) : isAndroid ? (
              <ol>
                <li>Open Nourish in Chrome or Samsung Internet.</li>
                <li>
                  Open the browser menu and choose <b>Install app</b> or{" "}
                  <b>Add to Home screen</b>.
                </li>
                <li>
                  If the option is missing after removing the icon, check your
                  app drawer or Android Settings → Apps → Nourish. It may still
                  be installed.
                </li>
              </ol>
            ) : (
              <p>
                Use your browser’s install command, usually in the address bar
                or browser menu.
              </p>
            )}
            <p className="hint">
              Your records are stored on this device. Export a backup before
              clearing browser site data or uninstalling.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
const tables = [
  "profiles",
  "recipes",
  "meals",
  "prices",
  "pantry",
  "purchases",
  "weights",
  "habits",
  "lists",
  "reminders",
  "templates",
  "mealRecords",
  "ingredients",
  "budgets",
  "preferences",
  "planWeeks",
] as const;
type BackupData = Record<(typeof tables)[number], unknown[]>;
function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Backup({ data }: { data: Data }) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{
    schemaVersion: 5;
    exportedAt: string;
    data: BackupData;
  } | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    const records: Partial<BackupData> = {};
    for (const t of tables) records[t] = await db.table(t).toArray();
    const backup = {
      schemaVersion: 5,
      exportedAt: new Date().toISOString(),
      data: records,
    };
    download(
      `nourish-backup-${today()}.json`,
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
  };
  const read = async (file: File) => {
    setError("");
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (isPersonalPackFile(raw) || isPersonalMealPlanFile(raw)) {
        navigate("/plan", { state: { planFile: raw } });
        return;
      }
      setPreview(
        parseBackup(raw) as {
          schemaVersion: 5;
          exportedAt: string;
          data: BackupData;
        },
      );
    } catch (e) {
      setError(String(e));
      setPreview(null);
    }
  };
  const importData = async () => {
    if (!preview) return;
    if (
      mode === "replace" &&
      !confirm(
        "Replace all current Nourish data with this backup? This cannot be undone. Export your current data first.",
      )
    )
      return;
    setBusy(true);
    try {
      await db.transaction(
        "rw",
        tables.map((t) => db.table(t)),
        async () => {
          if (mode === "replace")
            for (const t of tables) await db.table(t).clear();
          for (const t of tables) {
            if (mode === "merge") await db.table(t).bulkPut(preview.data[t]);
            else await db.table(t).bulkAdd(preview.data[t]);
          }
        },
      );
      setPreview(null);
      alert("Backup imported successfully.");
    } catch (e) {
      setError(`Import failed. No partial changes were saved. ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const deleteAll = async () => {
    if (
      prompt("Type DELETE to erase all Nourish data from this browser.") !==
      "DELETE"
    )
      return;
    await db.transaction(
      "rw",
      tables.map((t) => db.table(t)),
      async () => {
        for (const t of tables) await db.table(t).clear();
      },
    );
    localStorage.setItem("nourish-erased", "1");
    location.reload();
  };
  return (
    <>
      <Header title="Data & backup" subtitle="Your records stay with you." />
      <Card className="backup-hero">
        <span className="stat-icon sage">
          <Download size={24} />
        </span>
        <h2>Keep a copy of your journey.</h2>
        <p>
          All Nourish data is stored in this browser. Clearing browser storage
          or uninstalling the app may delete it. Export a backup regularly and
          keep the file somewhere safe.
        </p>
        <Button onClick={exportData}>
          <Download size={17} /> Export JSON backup
        </Button>
      </Card>
      <Card className="plan-import-entry">
        <span className="plan-import-entry-icon">
          <CalendarDays size={22} />
        </span>
        <div>
          <span className="eyebrow">HAVE A WEEKLY MEAL PLAN?</span>
          <h2>Make your week your own.</h2>
          <p>
            Import your seven-day plan in Planner. You can preview all 28 meals
            before choosing to use it.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/plan")}>
          Import Meal Plan <ChevronRight size={16} />
        </Button>
      </Card>
      <Card className="settings-card">
        <h2>Restore a backup</h2>
        <p>Select a Nourish JSON backup to review before import.</p>
        <label className="file-label">
          <Upload size={18} /> Choose backup file
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
          />
        </label>
        {error && (
          <p className="error">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        {preview && (
          <div className="import-preview">
            <h3>Backup preview</h3>
            <p>
              Exported{" "}
              {preview.exportedAt
                ? new Date(preview.exportedAt).toLocaleString()
                : "on an unknown date"}
            </p>
            <div className="backup-counts">
              {tables.map((t) => (
                <span key={t}>
                  {t}: {preview.data[t].length}
                </span>
              ))}
            </div>
            <div className="choice-row">
              <button
                className={mode === "merge" ? "selected" : ""}
                onClick={() => setMode("merge")}
              >
                Merge by ID
              </button>
              <button
                className={mode === "replace" ? "selected" : ""}
                onClick={() => setMode("replace")}
              >
                Replace all data
              </button>
            </div>
            <p className="hint">
              Merge updates records with matching IDs and keeps other records.
              Replace deletes current records before importing this file.
            </p>
            <Button disabled={busy} onClick={importData}>
              {busy ? "Importing…" : "Import backup"}
            </Button>
          </div>
        )}
      </Card>
      <Card className="settings-card danger-zone">
        <h2>Delete local data</h2>
        <p>
          This erases your profile, plans, lists, purchases, weight entries and
          settings from this browser.
        </p>
        <Button variant="danger" onClick={deleteAll}>
          <Trash2 size={16} /> Delete all data
        </Button>
      </Card>
      <p className="hint">
        Current records: {data.meals.length} planned meals ·{" "}
        {data.weights.length} weight entries · {data.purchases.length}{" "}
        purchases.
      </p>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
