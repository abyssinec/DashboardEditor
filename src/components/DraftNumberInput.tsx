import React, { useEffect, useState } from "react";

import { clamp } from "../utils/ui";

type Props = {
  className?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function isTransient(s: string) {
  const t = s.trim();
  return t === "" || t === "-" || t === "+" || t === "-." || t === ".";
}

export function DraftNumberInput({ className, value, onChange, min, max, step }: Props) {
  const safeMin = min ?? -1e9;
  const safeMax = max ?? 1e9;

  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    // keep draft in sync if external value changes (but don't fight the user mid-typing too much)
    setDraft(String(value));
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="text"
      value={draft}
      onChange={(e) => {
        const s = e.target.value;
        setDraft(s);

        if (isTransient(s)) return;

        const n = Number(s);
        if (!Number.isFinite(n)) return;

        onChange(clamp(n, safeMin, safeMax));
      }}
      onBlur={() => {
        // normalize on blur
        if (isTransient(draft)) {
          setDraft(String(value));
          return;
        }
        const n = Number(draft);
        if (!Number.isFinite(n)) {
          setDraft(String(value));
          return;
        }
        const clamped = clamp(n, safeMin, safeMax);
        if (clamped !== value) onChange(clamped);
        setDraft(String(clamped));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (step && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? step : -step;
          const next = clamp(value + delta, safeMin, safeMax);
          onChange(next);
          setDraft(String(next));
        }
      }}
    />
  );
}
