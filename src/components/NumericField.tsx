import React from "react";

import { clamp, clampInt } from "../utils/ui";

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

  return (
    <div className="insRow">
      <div className="insLabel">{label}</div>

      <div className="numSpin">
        <input
          className="numInput"
          type="text"
          inputMode="numeric"
          value={Number.isFinite(value) ? String(value) : "0"}
          onChange={(e) => {
            const next = clampInt(e.target.value, value);
            onChange(clamp(next, safeMin, safeMax));
          }}
        />

        <div className="numBtns">
          <button
            type="button"
            aria-label="Increase"
            onClick={() => onChange(clamp(value + step, safeMin, safeMax))}
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => onChange(clamp(value - step, safeMin, safeMax))}
          >
            ▼
          </button>
        </div>

        {suffix ? <div className="numSuffix">{suffix}</div> : null}
      </div>
    </div>
  );
}
