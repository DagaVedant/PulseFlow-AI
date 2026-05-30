/* React hook exposing simulation data and helpers derived from the store. */
"use client";
import { useCallback } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "./useWebSocket";
import { api } from "@/lib/api";

export function useSimulation() {
  const store = useSimulationStore();
  const { triggerEvent, updateConfig } = useWebSocket();

  const runOptimization = useCallback(async () => {
    store.setIsOptimizing(true);
    try {
      const result = await api.runOptimization();
      store.setLatestOptimization(result);
      return result;
    } finally {
      store.setIsOptimizing(false);
    }
  }, [store]);

  return {
    ...store,
    triggerEvent,
    updateConfig,
    runOptimization,
  };
}
