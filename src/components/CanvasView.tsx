import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";

type Viewport = { zoom: number; panX: number; panY: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hexToRgba(hex: string, alpha01: number) {
  const h = (hex || "#000000").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${clamp(alpha01, 0, 1)})`;
}

function objectBounds(o: AnyObj) {
  if (o.type === "Label") return { x: o.transform.x, y: o.transform.y, w: 220, h: 60 };
  if (o.type === "Image") {
    const w = 220 * (o.transform.scaleX || 1);
    const h = 140 * (o.transform.scaleY || 1);
    return { x: o.transform.x, y: o.transform.y, w, h };
  }
  if (o.type === "Arc") return { x: o.transform.x, y: o.transform.y, w: 240, h: 240 };
  // Bar
  return { x: o.transform.x, y: o.transform.y, w: o.transform.width, h: o.transform.height };
}

export function CanvasView() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const screen = useStore((s) => s.project.screens.find((x) => x.id === s.selectedScreenId)!);
  const selectedObjectId = useStore((s) => s.selectedObjectId);

  const sorted = useMemo(() => [...screen.objects].sort((a, b) => a.z - b.z), [screen.objects]);

  const [vp, setVp] = useState<Viewport>(() => ({ zoom: 1, panX: 0, panY: 0 }));
  const [dragObj, setDragObj] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  // Key handling (Space for pan)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function resizeCanvas() {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const r = w.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width));
    c.height = Math.max(1, Math.round(r.height));
  }

  // Fit zoom on mount / screen change / resize
  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      const c = canvasRef.current;
      const w = wrapRef.current;
      if (!c || !w) return;
      const fit = Math.min(c.width / screen.settings.width, c.height / screen.settings.height) * 0.9;
      setVp((v) => ({ ...v, zoom: clamp(fit || 1, 0.15, 3) }));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id, screen.settings.width, screen.settings.height]);

  function worldToScreen(x: number, y: number) {
    const c = canvasRef.current!;
    const sx = (x + vp.panX) * vp.zoom + c.width / 2;
    const sy = (y + vp.panY) * vp.zoom + c.height / 2;
    return { sx, sy };
  }

  function screenToWorld(sx: number, sy: number) {
    const c = canvasRef.current!;
    const x = (sx - c.width / 2) / vp.zoom - vp.panX;
    const y = (sy - c.height / 2) / vp.zoom - vp.panY;
    return { x, y };
  }

  function hitTestWorld(wx: number, wy: number): AnyObj | undefined {
    const sw = screen.settings.width;
    const sh = screen.settings.height;
    const lx = wx + sw / 2;
    const ly = wy + sh / 2;

    for (const o of [...sorted].reverse()) {
      const b = objectBounds(o);
      if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) return o;
    }
    return undefined;
  }

  // Draw
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);

    const sw = screen.settings.width;
    const sh = screen.settings.height;

// softer grid (less visible)
ctx.save();
ctx.globalAlpha = 0.07;           // было 0.10
ctx.strokeStyle = "#9E9E9E";      // вместо белого
ctx.lineWidth = 1;

const step = 140 * vp.zoom;       // реже линии
for (let x = (c.width / 2) % step; x < c.width; x += step) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, c.height);
  ctx.stroke();
}
for (let y = (c.height / 2) % step; y < c.height; y += step) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(c.width, y);
  ctx.stroke();
}
ctx.restore();


    // screen rect (centered at world origin)
    const tl = worldToScreen(-sw / 2, -sh / 2);
    const srW = sw * vp.zoom;
    const srH = sh * vp.zoom;

    // screen fill
    const bgAlpha = (screen.style.alpha ?? 100) / 100;
    ctx.save();
    ctx.fillStyle = hexToRgba(screen.style.color || "#000000", bgAlpha);
    ctx.fillRect(tl.sx, tl.sy, srW, srH);
    ctx.restore();

    // screen border
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#3EA3FF";
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.sx, tl.sy, srW, srH);
    ctx.restore();

    // objects
    for (const o of sorted) {
      const b = objectBounds(o);
      const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;

      // preview draw per type
      if (o.type === "Label") {
        const alpha = (o.style.alpha ?? 100) / 100;
        ctx.save();
        ctx.fillStyle = hexToRgba(o.style.color || "#3EA3FF", alpha);
        ctx.globalAlpha = 1;
        ctx.font = `${o.settings.bold === "Yes" ? "700" : "400"} ${Math.max(10, (o.settings.fontSize || 20) * vp.zoom)}px Inter`;
        ctx.textBaseline = "top";
        const txt = o.settings.text?.length ? o.settings.text : o.name;
        ctx.fillText(txt, p.sx + 6, p.sy + 6);
        ctx.restore();
      } else if (o.type === "Image") {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#D9D9D9";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.sx, p.sy, w, h);
        ctx.beginPath();
        ctx.moveTo(p.sx, p.sy);
        ctx.lineTo(p.sx + w, p.sy + h);
        ctx.moveTo(p.sx + w, p.sy);
        ctx.lineTo(p.sx, p.sy + h);
        ctx.stroke();
        ctx.restore();
      } else if (o.type === "Arc") {
        const alpha = (o.style.alpha ?? 100) / 100;
        const cx = p.sx + w / 2;
        const cy = p.sy + h / 2;
        const r = Math.min(w, h) * 0.38;
        const thickness = Math.max(2, (o.style.thickness || 20) * vp.zoom);

        // background arc
        ctx.save();
        ctx.globalAlpha = (o.style.backgroundAlpha ?? 40) / 100;
        ctx.strokeStyle = o.style.backgroundColor || "#3EA3FF";
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // value arc
        const value = clamp((o.settings.previewValue ?? 100) / 100, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = o.style.color || "#3EA3FF";
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * value);
        ctx.stroke();
        ctx.restore();
      } else if (o.type === "Bar") {
        const alpha = (o.style.alpha ?? 100) / 100;
        const value = clamp((o.settings.previewValue ?? 50) / 100, 0, 1);

        // background
        ctx.save();
        ctx.globalAlpha = (o.style.backgroundAlpha ?? 40) / 100;
        ctx.fillStyle = o.style.backgroundColor || "#3EA3FF";
        ctx.fillRect(p.sx, p.sy, w, h);
        ctx.restore();

        // fill
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = o.style.color || "#3EA3FF";
        ctx.fillRect(p.sx, p.sy, w * value, h);
        ctx.restore();
      }

      // bounds (subtle)
      ctx.save();
      ctx.strokeStyle = "#D9D9D9";
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.sx, p.sy, w, h);
      ctx.restore();

      // selection highlight
      if (o.id === selectedObjectId) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#3EA3FF";
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.sx, p.sy, w, h);
        ctx.restore();
      }
    }
  }, [sorted, selectedObjectId, vp, screen.settings.width, screen.settings.height, screen.style.color, screen.style.alpha]);

  function onMouseDown(e: React.MouseEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;

    // pan: middle button OR space+LMB
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      setPanning({ x: e.clientX, y: e.clientY, panX: vp.panX, panY: vp.panY });
      return;
    }
    if (e.button !== 0) return;

    const w = screenToWorld(sx, sy);
    const hit = hitTestWorld(w.x, w.y);
    if (hit) {
      Actions.selectObject(hit.id);

      const sw = screen.settings.width;
      const sh = screen.settings.height;
      const b = objectBounds(hit);
      const objWorldX = b.x - sw / 2;
      const objWorldY = b.y - sh / 2;
      setDragObj({ id: hit.id, dx: w.x - objWorldX, dy: w.y - objWorldY });
    } else {
      Actions.selectObject(undefined);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (panning) {
      const dx = e.clientX - panning.x;
      const dy = e.clientY - panning.y;
      setVp((v) => ({ ...v, panX: panning.panX + dx / v.zoom, panY: panning.panY + dy / v.zoom }));
      return;
    }
    if (!dragObj) return;

    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const w = screenToWorld(sx, sy);

    const sw = screen.settings.width;
    const sh = screen.settings.height;

    const newX = (w.x - dragObj.dx) + sw / 2;
    const newY = (w.y - dragObj.dy) + sh / 2;

    Actions.updateObjectDeep(dragObj.id, ["transform", "x"], Math.round(newX));
    Actions.updateObjectDeep(dragObj.id, ["transform", "y"], Math.round(newY));
  }

  function endDrag() {
    setDragObj(null);
    setPanning(null);
  }

  function onWheel(e: React.WheelEvent) {
    // IMPORTANT: prevent page/parent scroll
    e.preventDefault();

    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;

    const before = screenToWorld(sx, sy);

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92;

    setVp((v) => {
      const nz = clamp(v.zoom * factor, 0.15, 3);

      // keep cursor point stable
      const c2 = canvasRef.current!;
      const x2 = (sx - c2.width / 2) / nz - v.panX;
      const y2 = (sy - c2.height / 2) / nz - v.panY;
      const dx = before.x - x2;
      const dy = before.y - y2;

      return { zoom: nz, panX: v.panX + dx, panY: v.panY + dy };
    });
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onWheelCapture={onWheel}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
