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

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const triggerEvent = useCallback(
    (eventType: string, params?: object) => {
      sendMessage({ type: "trigger_event", event_type: eventType, params: params || {} });
    },
    [sendMessage]
  );

  const requestOptimization = useCallback(() => {
    sendMessage({ type: "request_optimization" });
  }, [sendMessage]);

  const updateConfig = useCallback(
    (config: object) => {
      sendMessage({ type: "update_config", config });
    },
    [sendMessage]
  );

  const addBottleneck = useCallback(
    (bottleneck: object) => {
      sendMessage({ type: "add_bottleneck", bottleneck });
    },
    [sendMessage]
  );

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
  return { ...store, triggerEvent, updateConfig, runOptimization };
}
