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
      className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] dark:bg-[rgba(42,40,34,0.5)] backdrop-blur-xl rounded-2xl px-3.5 py-2"
      role="timer"
      aria-live="off"
    >
      <Lock
        className={`w-4 h-4 ${expiringSoon ? "text-crit-ink" : "text-muted"}`}
        aria-hidden="true"
      />
      <span className="text-xs text-muted">Auto-logout</span>
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
