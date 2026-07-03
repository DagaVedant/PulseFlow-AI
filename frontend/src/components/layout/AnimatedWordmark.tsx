"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WORDMARK_TEXT = "PulseFlow AI";
const TYPING_SPEED_MS = 90;
const DELETING_SPEED_MS = 40;
const HOLD_AFTER_TYPED_MS = 1600;
const PAUSE_AFTER_DELETED_MS = 500;

export function AnimatedWordmark({ className }: { className?: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    if (!isDeleting && displayedText === WORDMARK_TEXT) {
      const timeout = setTimeout(
        () => setIsDeleting(true),
        HOLD_AFTER_TYPED_MS,
      );
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedText === "") {
      const timeout = setTimeout(
        () => setIsDeleting(false),
        PAUSE_AFTER_DELETED_MS,
      );
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setDisplayedText((current) =>
          isDeleting
            ? WORDMARK_TEXT.slice(0, current.length - 1)
            : WORDMARK_TEXT.slice(0, current.length + 1),
        );
      },
      isDeleting ? DELETING_SPEED_MS : TYPING_SPEED_MS,
    );
    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, reducedMotion]);

  const text = reducedMotion ? WORDMARK_TEXT : displayedText;

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <style>{`
        @keyframes wordmark-cursor-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <span className="font-display font-bold text-ink">{text}</span>
      <span
        style={{
          color: "rgb(85, 231, 177)",
          animation: reducedMotion
            ? "none"
            : "wordmark-cursor-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      >
        |
      </span>
    </span>
  );
}
