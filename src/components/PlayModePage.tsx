import React, { useEffect, useMemo, useRef, useState } from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj, GaugeCurvePoint } from "../types";

import { CanvasView } from "./CanvasView";

type BoundObj = {
  id: string;
  name: string;
  type: AnyObj["type"];
  rangeMin: number;
  rangeMax: number;
  updateRateMs: number;
  smoothing: number;
  curve?: GaugeCurvePoint[];
  anim?: any; // image animation
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mapNonLinear(input: number, curve: GaugeCurvePoint[]) {
  const pts = [...curve].filter((p) => Number.isFinite(p.input) && Number.isFinite(p.output));
  if (pts.length < 2) return NaN;
  pts.sort((a, b) => a.input - b.input);

  if (input <= pts[0].input) return pts[0].output;
  if (input >= pts[pts.length - 1].input) return pts[pts.length - 1].output;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (input >= a.input && input <= b.input) {
      const t = (input - a.input) / (b.input - a.input || 1);
      return lerp(a.output, b.output, clamp(t, 0, 1));
    }
  }
  return pts[pts.length - 1].output;
}

function mapLinear(input: number, min: number, max: number) {
  const den = max - min;
  if (!Number.isFinite(den) || Math.abs(den) < 1e-6) return 0;
  return ((input - min) / den) * 100;
}

function formatValue(v: number, mode: "Auto" | "WithDecimal" | "WithoutDecimal" = "Auto") {
  if (!Number.isFinite(v)) return "—";
  if (mode === "WithoutDecimal") return String(Math.round(v));
  if (mode === "WithDecimal") return (Math.round(v * 10) / 10).toFixed(1);

  // Auto
  const a = Math.abs(v);
  if (a >= 100) return String(Math.round(v));
  if (a >= 10) return (Math.round(v * 10) / 10).toFixed(1);
  return (Math.round(v * 100) / 100).toFixed(2);
}


function speedFactor(v: number) {
  // v: -100..100; 0 => 1x; negative slows, positive speeds up
  const n = clamp(v, -100, 100);
  if (n >= 0) return 1 + n / 50; // up to 3x
  return 1 / (1 + (-n) / 50); // down to ~0.33x
}

export function PlayModePage() {
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const screen = useStore((s) => s.project.screens.find((x) => x.id === selectedScreenId)!);
  const playEnabled = useStore((s) => s.playMode.enabled);

  const objs = (screen?.objects ?? []) as AnyObj[];
  const byId = useMemo(() => new Map<string, AnyObj>(objs.map((o) => [o.id, o] as const)), [objs]);

  const bound = useMemo<BoundObj[]>(() => {
    const list = objs
      .filter((o) => {
        const g: any = (o as any).gauge;
        if (!g) return false;
        if ((g.dataType || "None") === "None") return false;
        if ((g.gaugeType || "None") === "None") return false;
        return true;
      })
      .map((o) => {
        const g: any = (o as any).gauge;
        const rmin = Number.isFinite(g.rangeMin) ? g.rangeMin : 0;
        const rmax = Number.isFinite(g.rangeMax) ? g.rangeMax : 100;
        return {
          id: o.id,
          name: o.name || o.id,
          type: o.type,
          rangeMin: rmin,
          rangeMax: rmax,
          updateRateMs: Math.max(16, Number(g.updateRateMs) || 100),
          smoothing: clamp(Number(g.smoothingFactor) || 0, 0, 1),
          curve: Array.isArray(g.curve) ? (g.curve as GaugeCurvePoint[]) : undefined,
          anim: (o.type === "Image" ? (o as any).settings?.animation : undefined) as any,
        } as BoundObj;
      });
    // Sorting: by z (visual order) then name
    list.sort((a, b) => {
      const za = (byId.get(a.id) as any)?.z ?? 0;
      const zb = (byId.get(b.id) as any)?.z ?? 0;
      if (za !== zb) return za - zb;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [objs, byId]);

  // Raw simulated values per object (in gauge input domain)
  const [raw, setRaw] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(0); // -100..100

  // Smooth value state in 0..100 (percent)
  const smoothRef = useRef<Record<string, number>>({});
  const timeAccRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  // Init sliders when list changes
  useEffect(() => {
    const next: Record<string, number> = {};
    for (const b of bound) {
      const cur = raw[b.id];
      const init = Number.isFinite(cur) ? cur : (b.rangeMin + b.rangeMax) / 2;
      next[b.id] = clamp(init, b.rangeMin, b.rangeMax);
    }
    setRaw(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bound.map((b) => b.id).join("|")]);

  // Apply overrides to the renderer
  useEffect(() => {
    if (!playEnabled) return;
     const overrides: any = {};

    for (const b of bound) {
      const o: any = byId.get(b.id);
      const input = raw[b.id];
      const hasCurve = Array.isArray(b.curve) && b.curve.length >= 2;
      const pctRaw = hasCurve ? mapNonLinear(input, b.curve!) : mapLinear(input, b.rangeMin, b.rangeMax);
      const pctTarget = clamp(Number.isFinite(pctRaw) ? pctRaw : 0, 0, 100);

      const prev = smoothRef.current[b.id];
      const sm = Number.isFinite(prev) ? prev : pctTarget;
      const k = b.smoothing;
      const pct = k > 0 ? sm + (pctTarget - sm) * k : pctTarget;
      smoothRef.current[b.id] = pct;

      // Arc/Bar
      if (b.type === "Arc" || b.type === "Bar") {
        overrides[b.id] = { ...(overrides[b.id] || {}), previewValue: pct };
      }

      // Label: show input value
      if (b.type === "Label") {
        overrides[b.id] = { ...(overrides[b.id] || {}), labelText: formatValue(input, (o?.gauge?.valueFormat || o?.settings?.valueFormat || "Auto")) };
      }

      // Image: animation based on t=percent
      if (b.type === "Image" && b.anim && b.anim.type && b.anim.type !== "None") {
        const t = clamp(pct / 100, 0, 1);
        // base object already resolved above
        const baseX = o?.transform?.x ?? 0;
        const baseY = o?.transform?.y ?? 0;
        const baseRot = o?.transform?.rotation ?? 0;

        const ax0 = Number.isFinite(b.anim.startX) ? b.anim.startX : baseX;
        const ay0 = Number.isFinite(b.anim.startY) ? b.anim.startY : baseY;
        const ax1 = Number.isFinite(b.anim.endX) ? b.anim.endX : baseX;
        const ay1 = Number.isFinite(b.anim.endY) ? b.anim.endY : baseY;
        const r0 = Number.isFinite(b.anim.startRot) ? b.anim.startRot : baseRot;
        const r1 = Number.isFinite(b.anim.endRot) ? b.anim.endRot : baseRot;

        const next: any = {};
        if (b.anim.type === "Move" || b.anim.type === "Rotation+Move") {
          next.x = lerp(ax0, ax1, t);
          next.y = lerp(ay0, ay1, t);
        }
        if (b.anim.type === "Rotation" || b.anim.type === "Rotation+Move") {
          next.rotation = lerp(r0, r1, t);
        }
        overrides[b.id] = { ...(overrides[b.id] || {}), ...next };
      }
    }

    Actions.setPlayOverrides(overrides);
  }, [playEnabled, bound, raw, screen.objects]);

  // Simulation loop
  useEffect(() => {
    if (!playEnabled || !running) return;

    let last = performance.now();
    const dirRef: Record<string, 1 | -1> = {};

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      setRaw((prev) => {
        const next = { ...prev };
        for (const b of bound) {
          const acc = (timeAccRef.current[b.id] || 0) + dt;
          const stepEvery = Math.max(16, b.updateRateMs);
          if (acc < stepEvery) {
            timeAccRef.current[b.id] = acc;
            continue;
          }
          timeAccRef.current[b.id] = acc % stepEvery;

          const cur = Number.isFinite(prev[b.id]) ? prev[b.id] : (b.rangeMin + b.rangeMax) / 2;
          const dir = dirRef[b.id] ?? 1;
          const span = b.rangeMax - b.rangeMin;
          const stepBase = span === 0 ? 0 : span / 120; // ~2 seconds full travel at 60fps
          const step = stepBase * speedFactor(simSpeed); // ~2 seconds full travel at 60fps
          let v = cur + step * dir;

          if (v >= b.rangeMax) {
            v = b.rangeMax;
            dirRef[b.id] = -1;
          } else if (v <= b.rangeMin) {
            v = b.rangeMin;
            dirRef[b.id] = 1;
          } else {
            dirRef[b.id] = dir;
          }
          next[b.id] = v;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playEnabled, running, bound, simSpeed]);
  // When leaving play page, clean overrides
  useEffect(() => {
    if (!playEnabled) {
      setRunning(false);
      Actions.clearPlayOverrides();
    }
  }, [playEnabled]);

  return (
    <div className="playRoot">
      <div className="playCanvasWrap">
        <div className="playCanvasFrame">
          <div className="canvasTitleOverlay">Play</div>
          <CanvasView />
        </div>
      </div>

      <div className="playControls">
        <div className="playControlsTop">
          <div className="playHint">Simulation speed ({(1 + simSpeed/50).toFixed(2)}x)
        <input
          className="playSlider"
          type="range"
          min={-100}
          max={100}
          step={1}
          value={simSpeed}
          onChange={(e) => setSimSpeed(Number(e.target.value))}
        />
        <div style={{height:12}} />
        Binded objects: {bound.length}</div>
          <button className="playBtn" onClick={() => setRunning((v) => !v)} disabled={!bound.length}>
            {running ? "Stop" : "Simulate"}
          </button>
        </div>

        <div className="playSliders scrollArea">
          {!bound.length ? (
            <div className="playEmpty">No objects with dataType != None.</div>
          ) : (
            bound.map((b) => {
              const v = raw[b.id];
              return (
                <div key={b.id} className="playSliderRow">
                  <div className="playSliderLabel">
                    <div className="n">{b.name}</div>
                    <div className="t">{b.type}</div>
                  </div>
                  <input
                    className="playSlider"
                    type="range"
                    min={b.rangeMin}
                    max={b.rangeMax}
                    step={(b.rangeMax - b.rangeMin) / 500 || 1}
                    value={Number.isFinite(v) ? v : (b.rangeMin + b.rangeMax) / 2}
                    onChange={(e) => {
                      const nv = Number(e.target.value);
                      setRaw((p) => ({ ...p, [b.id]: nv }));
                    }}
                  />
                  <div className="playSliderValue">{formatValue(v)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}