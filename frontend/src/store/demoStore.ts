/* Global demo orchestration store — persists across Next.js client-side navigation. */
import { create } from "zustand";

export type DemoAction =
  | "analyze_patients"
  | "run_copilot"
  | "sandbox_demo"
  | "add_constraint"
  | "remove_constraint"
  | null;

interface DemoStore {
  isRunning: boolean;
  currentStep: number;
  pendingAction: DemoAction;
  setRunning: (v: boolean) => void;
  setCurrentStep: (s: number) => void;
  setPendingAction: (a: DemoAction) => void;
  clearAction: () => void;
}

export const useDemoStore = create<DemoStore>((set) => ({
  isRunning: false,
  currentStep: -1,
  pendingAction: null,
  setRunning: (v) => set({ isRunning: v }),
  setCurrentStep: (s) => set({ currentStep: s }),
  setPendingAction: (a) => set({ pendingAction: a }),
  clearAction: () => set({ pendingAction: null }),
}));
