"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SESSION_SECONDS = 15 * 60;

export function AutoLogoutTimer() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);

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
    <span
      className={cn("mono", expiringSoon ? "text-status-critical" : "text-muted")}
      role="timer"
      aria-live="off"
    >
      {minutes}:{seconds}
    </span>
  );
}