import { create } from "zustand";

interface TourStore {
  active: boolean;
  stepIndex: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  active: false,
  stepIndex: 0,
  start: () => set({ active: true, stepIndex: 0 }),
  stop: () => set({ active: false }),
  next: () => set({ stepIndex: get().stepIndex + 1 }),
  prev: () => set({ stepIndex: Math.max(0, get().stepIndex - 1) }),
}));