/* WebSocket connection hook with senders for events, config, optimization, and bottlenecks.
   Also exports useSimulation (folded in from hooks/useSimulation.ts). */
"use client";
import { useEffect, useRef, useCallback } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { api } from "@/lib/api";
import type { HospitalState } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Manages the WebSocket connection to the backend simulation server.
 * Automatically connects on mount, parses incoming hospital state messages, and retries on disconnect.
 * @returns An object with helper functions to send messages, trigger events, request optimization, update config, and manage bottlenecks.
 * Called from: CommandCenterPage (indirectly via useSimulation), SandboxPage, CopilotPage, OperationsPage.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const {
    setConnected,
    setConnectionError,
    updateHospitalState,
    setLatestOptimization,
  } = useSimulationStore();

  /**
   * Opens a new WebSocket connection to the simulation server and registers all event handlers.
   * If already connected, this function does nothing.
   * On close, it schedules an automatic reconnect attempt with increasing delay (up to 15 seconds).
   * Called from: the useEffect inside useWebSocket on component mount.
   */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "hospital_state") {
            updateHospitalState(data as HospitalState);
          } else if (data.type === "optimization_result") {
            setLatestOptimization(data.result);
          } else if (data.type === "ping") {

          }
        } catch {

        }
      };

      ws.onerror = () => {
        setConnectionError("WebSocket connection error");
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (!mountedRef.current) return;
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(RECONNECT_DELAY * reconnectAttemptsRef.current, 15000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setConnectionError("Unable to connect to simulation server");
        }
      };
    } catch (err) {
      setConnectionError("Failed to create WebSocket connection");
    }
  }, [setConnected, setConnectionError, updateHospitalState, setLatestOptimization]);

  /**
   * Sends a JSON message to the backend over the WebSocket connection.
   * Silently does nothing if the connection is not currently open.
   * @param data - The JavaScript object to serialize and send as a JSON string.
   * Called from: triggerEvent, requestOptimization, updateConfig, addBottleneck, removeBottleneck.
   */
  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  /**
   * Sends a message to the backend asking it to trigger a simulation crisis event.
   * @param eventType - The name of the event to trigger, e.g. "flu_outbreak" or "ct_failure".
   * @param params - Optional additional parameters for the event (e.g. { count: 15 } for mass casualty).
   * @returns void — the event is fire-and-forget over WebSocket.
   * Called from: SandboxPage when the user clicks an event button.
   */
  const triggerEvent = useCallback(
    (eventType: string, params?: object) => {
      sendMessage({ type: "trigger_event", event_type: eventType, params: params || {} });
    },
    [sendMessage]
  );

  /**
   * Sends a message to the backend asking it to run the optimization engine immediately.
   * The result will be received as a WebSocket message of type "optimization_result".
   * @returns void — the request is fire-and-forget over WebSocket.
   * Called from: useSimulation's runOptimization helper.
   */
  const requestOptimization = useCallback(() => {
    sendMessage({ type: "request_optimization" });
  }, [sendMessage]);

  /**
   * Sends a configuration update to the backend to change how the simulation runs.
   * @param config - An object of key-value pairs to merge into the simulation config (e.g. { arrival_rate: 12 }).
   * @returns void — the update is fire-and-forget over WebSocket.
   * Called from: SandboxPage when the user moves a slider, and CopilotPage when applying recommendations.
   */
  const updateConfig = useCallback(
    (config: object) => {
      sendMessage({ type: "update_config", config });
    },
    [sendMessage]
  );

  /**
   * Sends a message to the backend to register a new fixed operational bottleneck constraint.
   * @param bottleneck - An object describing the resource that is unavailable (name, type, priority, etc.).
   * @returns void — fire-and-forget over WebSocket.
   * Called from: OperationsPage when the user submits the bottleneck form.
   */
  const addBottleneck = useCallback(
    (bottleneck: object) => {
      sendMessage({ type: "add_bottleneck", bottleneck });
    },
    [sendMessage]
  );

  /**
   * Sends a message to the backend to remove a previously registered fixed bottleneck constraint.
   * @param bottleneckId - The unique ID string of the bottleneck to remove.
   * @returns void — fire-and-forget over WebSocket.
   * Called from: OperationsPage when the user clicks the X button on a bottleneck row.
   */
  const removeBottleneck = useCallback(
    (bottleneckId: string) => {
      sendMessage({ type: "remove_bottleneck", bottleneck_id: bottleneckId });
    },
    [sendMessage]
  );

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { sendMessage, triggerEvent, requestOptimization, updateConfig, addBottleneck, removeBottleneck };
}

/**
 * A convenience hook that combines the Zustand simulation store with WebSocket actions.
 * Provides all store state plus triggerEvent, updateConfig, and a runOptimization async function.
 * @returns An object containing all store fields and action helpers.
 * Called from: any component that needs both live simulation state and the ability to send WebSocket commands.
 */
export function useSimulation() {
  const store = useSimulationStore();
  const { triggerEvent, updateConfig } = useWebSocket();
  /**
   * Calls the backend REST API to run the optimization engine and stores the result in the simulation store.
   * Sets isOptimizing to true while the request is in flight, and back to false when it completes.
   * @returns A Promise that resolves with the OptimizationResult from the backend.
   * Called from: useSimulation — exposed to components that need to trigger optimization.
   */
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
  return { ...store, triggerEvent, updateConfig, runOptimization };
}
