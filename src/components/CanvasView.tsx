import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";

type Viewport = { zoom: number; panX: number; panY: number };

function objectBounds(o: AnyObj) {
  if (o.type === "Label") {
    return { x: o.transform.x, y: o.transform.y, w: 220, h: 60 };
  }
  if (o.type === "Image") {
    const w = 220 * o.transform.scaleX;
    const h = 140 * o.transform.scaleY;
    return { x: o.transform.x, y: o.transform.y, w, h };
  }
  if (o.type === "Arc") {
    return { x: o.transform.x, y: o.transform.y, w: 240, h: 240 };
  }
  // Bar
  return { x: o.transform.x, y: o.transform.y, w: o.transform.width, h: o.transform.height };
}

export function CanvasView() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const screen = useStore(s => s.project.screens.find(x => x.id === s.selectedScreenId)!);
  const selectedObjectId = useStore(s => s.selectedObjectId);

  const sorted = useMemo(() => [...screen.objects].sort((a,b)=>a.z-b.z), [screen.objects]);

  const [vp, setVp] = useState<Viewport>(() => ({ zoom: 0.5, panX: 0, panY: 0 }));
  const [dragObj, setDragObj] = useState<null | { id: string; dx: number; dy: number }>(null);
  const [panning, setPanning] = useState<null | { x: number; y: number; panX: number; panY: number }>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
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
    c.width = Math.round(r.width);
    c.height = Math.round(r.height);
  }

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

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

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;

    ctx.clearRect(0,0,c.width,c.height);

    // draw a faint grid like editor feel (very subtle)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    const step = 100 * vp.zoom;
    for (let x = (c.width/2) % step; x < c.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
    }
    for (let y = (c.height/2) % step; y < c.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }
    ctx.restore();

    // screen bounds (use screen.settings)
    const sw = screen.settings.width;
    const sh = screen.settings.height;
    // place screen center at world origin.
    const tl = worldToScreen(-sw/2, -sh/2);
    ctx.save();
    ctx.globalAlpha = 0.0; // screen background already via CSS
    ctx.restore();

    // objects
    for (const o of sorted) {
      const b = objectBounds(o);
      const p = worldToScreen(b.x - sw/2, b.y - sh/2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;

      ctx.save();
      ctx.strokeStyle = "#D9D9D9";
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.sx, p.sy, w, h);
      ctx.restore();

      if (o.id === selectedObjectId) {
        ctx.save();
        ctx.setLineDash([6,4]);
        ctx.strokeStyle = "#3EA3FF";
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.sx, p.sy, w, h);
        ctx.restore();
      }
    }
  }, [sorted, selectedObjectId, vp, screen.settings.width, screen.settings.height]);

  function hitTestWorld(wx: number, wy: number): AnyObj | undefined {
    const sw = screen.settings.width;
    const sh = screen.settings.height;
    const lx = wx + sw/2;
    const ly = wy + sh/2;
    for (const o of [...sorted].reverse()) {
      const b = objectBounds(o);
      if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) return o;
    }
    return undefined;
  }

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
      const objWorldX = (b.x - sw/2);
      const objWorldY = (b.y - sh/2);
      setDragObj({ id: hit.id, dx: w.x - objWorldX, dy: w.y - objWorldY });
    } else {
      Actions.selectObject(undefined);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (panning) {
      const dx = e.clientX - panning.x;
      const dy = e.clientY - panning.y;
      setVp(v => ({ ...v, panX: panning.panX + dx / v.zoom, panY: panning.panY + dy / v.zoom }));
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
    const newX = (w.x - dragObj.dx) + sw/2;
    const newY = (w.y - dragObj.dy) + sh/2;

    Actions.updateObjectDeep(dragObj.id, ["transform", "x"], Math.round(newX));
    Actions.updateObjectDeep(dragObj.id, ["transform", "y"], Math.round(newY));
  }

  function endDrag() {
    setDragObj(null);
    setPanning(null);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const before = screenToWorld(sx, sy);

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92;

    setVp(v => {
      const nz = Math.min(3, Math.max(0.15, v.zoom * factor));
      // keep cursor point stable
      const c2 = canvasRef.current!;
      const x2 = (sx - c2.width/2) / nz - v.panX;
      const y2 = (sy - c2.height/2) / nz - v.panY;
      const dx = before.x - x2;
      const dy = before.y - y2;
      return { zoom: nz, panX: v.panX + dx, panY: v.panY + dy };
    });
  }

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onContextMenu={(e)=>e.preventDefault()}
        onWheel={onWheel}
      />
    </div>
  );
}
