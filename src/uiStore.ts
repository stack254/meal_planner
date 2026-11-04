import { create } from "zustand";
import { today } from "./data";
type View = "today" | "week" | "month";
type UIState = {
  plannerDate: string;
  plannerView: View;
  setPlannerDate: (date: string) => void;
  setPlannerView: (view: View) => void;
  resetPlanner: () => void;
};
export const useUiStore = create<UIState>((set) => ({
  plannerDate: today(),
  plannerView: "week",
  setPlannerDate: (plannerDate) => set({ plannerDate }),
  setPlannerView: (plannerView) => set({ plannerView }),
  resetPlanner: () => set({ plannerDate: today(), plannerView: "week" }),
}));
