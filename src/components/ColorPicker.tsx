import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string;            // hex "#RRGGBB"
  alpha: number;            // 0..100
  onChange: (hex: string, alpha: number) => void;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeHex(v: string) {
  let s = (v || "").trim();
  if (!s) return "#000000";
  if (!s.startsWith("#")) s = "#" + s;
  s = "#" + s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 4) {
    const r = s[1], g = s[2], b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (s.length >= 7) return s.slice(0, 7).toUpperCase();
  return (s + "000000").slice(0, 7).toUpperCase();
}

function hexToRgb(hex: string) {
  const h = normalizeHex(hex);
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

// HSV <-> RGB
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0, gp = 0, bp = 0;
  if (0 <= h && h < 60) { rp = c; gp = x; bp = 0; }
  else if (60 <= h && h < 120) { rp = x; gp = c; bp = 0; }
  else if (120 <= h && h < 180) { rp = 0; gp = c; bp = x; }
  else if (180 <= h && h < 240) { rp = 0; gp = x; bp = c; }
  else if (240 <= h && h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

export function ColorPicker({ value, alpha, onChange }: Props) {
  const svRef = useRef<HTMLCanvasElement | null>(null);

  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsv = useMemo(() => rgbToHsv(rgb.r, rgb.g, rgb.b), [rgb.r, rgb.g, rgb.b]);

  const [h, setH] = useState(hsv.h);
  const [s, setS] = useState(hsv.s);
  const [v, setV] = useState(hsv.v);
  const [a, setA] = useState(clamp(alpha, 0, 100));

  // sync from outside
  useEffect(() => {
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }, [hsv.h, hsv.s, hsv.v]);

  useEffect(() => {
    setA(clamp(alpha, 0, 100));
  }, [alpha]);

  function commit(nextH: number, nextS: number, nextV: number, nextA: number) {
    const { r, g, b } = hsvToRgb(nextH, nextS, nextV);
    onChange(rgbToHex(r, g, b), clamp(Math.round(nextA), 0, 100));
  }

  // draw SV square for current hue
  useEffect(() => {
    const c = svRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const w = c.width, hgt = c.height;

    ctx.clearRect(0, 0, w, hgt);
    ctx.fillStyle = `hsl(${h}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, hgt);

    const white = ctx.createLinearGradient(0, 0, w, 0);
    white.addColorStop(0, "rgba(255,255,255,1)");
    white.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, w, hgt);

    const black = ctx.createLinearGradient(0, 0, 0, hgt);
    black.addColorStop(0, "rgba(0,0,0,0)");
    black.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, w, hgt);
  }, [h]);

  function pickSVFromEvent(e: React.PointerEvent) {
    const c = svRef.current;
    if (!c) return;
    const rct = c.getBoundingClientRect();
    const x = clamp((e.clientX - rct.left) / rct.width, 0, 1);
    const y = clamp((e.clientY - rct.top) / rct.height, 0, 1);
    const nextS = x;
    const nextV = 1 - y;
    setS(nextS);
    setV(nextV);
    commit(h, nextS, nextV, a);
  }

  const svCursor = {
    left: `${s * 100}%`,
    top: `${(1 - v) * 100}%`,
  };

  const hueBg =
    "linear-gradient(to right, " +
    "rgb(255,0,0), rgb(255,255,0), rgb(0,255,0), rgb(0,255,255), rgb(0,0,255), rgb(255,0,255), rgb(255,0,0))";

  const alphaBg = useMemo(() => {
    const { r, g, b } = hsvToRgb(h, s, v);
    const c1 = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0)`;
    const c2 = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},1)`;
    return `linear-gradient(to right, ${c1}, ${c2})`;
  }, [h, s, v]);

  return (
    <div className="cpRoot">
      <div className="cpSVWrap">
        <canvas
          ref={svRef}
          width={240}
          height={160}
          className="cpSV"
          onPointerDown={(e) => {
            (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            pickSVFromEvent(e);
          }}
          onPointerMove={(e) => {
            if ((e.buttons & 1) !== 1) return;
            pickSVFromEvent(e);
          }}
        />
        <div className="cpSVCursor" style={svCursor as any} />
      </div>

      {/* Hue */}
      <div className="cpRow">
        <div className="cpHueIcon" />
        <div className="cpSlider">
          <div className="cpTrack" style={{ background: hueBg }} />
          <input
            className="cpRange"
            type="range"
            min={0}
            max={360}
            value={Math.round(h)}
            onChange={(e) => {
              const nextH = clamp(parseInt(e.target.value, 10), 0, 360);
              setH(nextH);
              commit(nextH, s, v, a);
            }}
          />
        </div>
      </div>

      {/* Alpha */}
      <div className="cpRow">
        <div className="cpChecker" />
        <div className="cpSlider">
          <div className="cpTrack cpAlphaTrack" style={{ background: alphaBg }} />
          <input
            className="cpRange"
            type="range"
            min={0}
            max={100}
            value={Math.round(a)}
            onChange={(e) => {
              const nextA = clamp(parseInt(e.target.value, 10), 0, 100);
              setA(nextA);
              commit(h, s, v, nextA);
            }}
          />
        </div>

        <div className="cpPct">
          <input
            className="cpPctInput"
            type="number"
            min={0}
            max={100}
            value={Math.round(a)}
            onChange={(e) => {
              const nextA = clamp(parseInt(e.target.value, 10) || 0, 0, 100);
              setA(nextA);
              commit(h, s, v, nextA);
            }}
          />
          <div className="cpPctSym">%</div>
        </div>
      </div>

      {/* Bottom: RGB label + editable numbers */}
      <div className="cpBottom">
        <div className="cpModeText">RGB</div>

        <div className="cpRgb">
          <input
            className="cpNum"
            type="number"
            min={0}
            max={255}
            value={rgb.r}
            onChange={(e) => {
              const nr = clamp(parseInt(e.target.value, 10) || 0, 0, 255);
              const { h, s, v } = rgbToHsv(nr, rgb.g, rgb.b);
              setH(h); setS(s); setV(v);
              commit(h, s, v, a);
            }}
          />
          <input
            className="cpNum"
            type="number"
            min={0}
            max={255}
            value={rgb.g}
            onChange={(e) => {
              const ng = clamp(parseInt(e.target.value, 10) || 0, 0, 255);
              const { h, s, v } = rgbToHsv(rgb.r, ng, rgb.b);
              setH(h); setS(s); setV(v);
              commit(h, s, v, a);
            }}
          />
          <input
            className="cpNum"
            type="number"
            min={0}
            max={255}
            value={rgb.b}
            onChange={(e) => {
              const nb = clamp(parseInt(e.target.value, 10) || 0, 0, 255);
              const { h, s, v } = rgbToHsv(rgb.r, rgb.g, nb);
              setH(h); setS(s); setV(v);
              commit(h, s, v, a);
            }}
          />
        </div>
      </div>
    </div>
  );
}
