"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PrivacyMask({
  value,
  label,
  fieldId,
  className,
}: {
  value: string;
  label: string;
  fieldId: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className={className}>
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <span className="inline-flex items-center gap-2">
        <span
          id={fieldId}
          className="font-mono tabular-nums text-ink"
          aria-live="polite"
        >
          {revealed
            ? value
            : "•".repeat(Math.max(4, Math.min(value.length, 12)))}
        </span>
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
          className="inline-flex items-center justify-center w-11 h-11 -my-3 rounded text-muted hover:text-ink hover:bg-elevated"
        >
          {revealed ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </span>
    </span>
  );
}
