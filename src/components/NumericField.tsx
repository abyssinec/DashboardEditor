import React, { useEffect, useState } from "react";

import { clamp } from "../utils/ui";

type Props = {
  label: string;
  value: number;
  onChange: (next: number) => void;

  min?: number;
  max?: number;
  step?: number;

  /** optional: show % suffix, px etc */
  suffix?: string;
};

function isTransient(s: string) {
  const t = s.trim();
  return t === "" || t === "-" || t === "+" || t === "-." || t === ".";
}

export function NumericField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: Props) {
  const safeMin = min ?? -1e9;
  const safeMax = max ?? 1e9;

  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="insRow">
      <div className="insLabel">{label}</div>

      <div className="numSpin">
        <input
          className="numInput"
          type="text"
          inputMode="text"
          value={draft}
          onChange={(e) => {
            const s = e.target.value;
            setDraft(s);

            if (isTransient(s)) return;
            const n = Number.parseInt(String(s), 10);
            if (!Number.isFinite(n)) return;

            onChange(clamp(n, safeMin, safeMax));
          }}
          onBlur={() => {
            if (isTransient(draft)) {
              setDraft(String(value));
              return;
            }
            const n = Number.parseInt(String(draft), 10);
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
          }}
        />

        <div className="numBtns">
          <button
            type="button"
            aria-label="Increase"
            onClick={() => {
              const next = clamp(value + step, safeMin, safeMax);
              onChange(next);
              setDraft(String(next));
            }}
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => {
              const next = clamp(value - step, safeMin, safeMax);
              onChange(next);
              setDraft(String(next));
            }}
          >
            ▼
          </button>
        </div>

        {suffix ? <div className="numSuffix">{suffix}</div> : null}
      </div>
    </div>
  );
}
