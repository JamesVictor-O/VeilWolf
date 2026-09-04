"use client";

import { useEffect, useState } from "react";

export interface PhaseTimerProps {
  /** Unix ms timestamp the phase is expected to end at. Purely cosmetic in
   * the MVP — no server-enforced deadline yet. */
  endsAt: number;
  label?: string;
  onExpire?: () => void;
  className?: string;
}

export function PhaseTimer({ endsAt, label, onExpire, className = "" }: PhaseTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (remainingMs === 0) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs === 0]);

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const urgent = remainingSec <= 10;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      )}
      <span
        className={`font-mono text-3xl font-bold tabular-nums ${
          urgent ? "text-destructive" : "text-foreground"
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
