/* Client provider that opens the shared WebSocket connection for the whole app. */
"use client";
import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}
