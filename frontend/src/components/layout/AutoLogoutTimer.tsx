"use client";
import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

const SESSION_SECONDS = 15 * 60;

export function AutoLogoutTimer() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const remainingRef = useRef(SESSION_SECONDS);
  remainingRef.current = remaining;

  useEffect(() => {
    const reset = () => setRemaining(SESSION_SECONDS);
    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset));
    const interval = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, reset));
      clearInterval(interval);
    };
  }, []);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const expiringSoon = remaining <= 60;

  return (
    <div
      className="flex items-center gap-2 border rounded px-3 py-1.5 border-clinical-border bg-clinical-surface"
      role="timer"
      aria-live="off"
    >
      <Lock
        className={`w-4 h-4 ${expiringSoon ? "text-crit-ink" : "text-muted"}`}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-muted uppercase tracking-wide">
        Auto-logout
      </span>
      <span
        className={`text-sm font-mono tabular-nums font-semibold ${
          expiringSoon ? "text-crit-ink" : "text-ink"
        }`}
      >
        {minutes}:{seconds}
      </span>
    </div>
  );
}
