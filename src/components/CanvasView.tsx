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
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${clamp(alpha01, 0, 1)})`;
}

function normalizeHex(v: string) {
  let s = (v || "").trim();
  if (!s) return "#000000";
  if (!s.startsWith("#")) s = "#" + s;
  s = "#" + s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 4) {
    const r = s[1],
      g = s[2],
      b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (s.length >= 7) return s.slice(0, 7).toUpperCase();
  return (s + "000000").slice(0, 7).toUpperCase();
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

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, mode: "No wrap" | "Word" | "Char") {
  const t = (text ?? "").replace(/\r/g, "");
  if (!t) return [""];

  const baseLines = t.split("\n");
  if (mode === "No wrap") return baseLines;

  const out: string[] = [];

  for (const base of baseLines) {
    if (!base) {
      out.push("");
      continue;
    }

    if (mode === "Char") {
      let cur = "";
      for (const ch of base) {
        const next = cur + ch;
        if (ctx.measureText(next).width <= maxWidth || cur.length === 0) {
          cur = next;
        } else {
          out.push(cur);
          cur = ch;
        }
      }
      if (cur.length) out.push(cur);
      continue;
    }

    // Word wrap
    const parts = base.split(/(\s+)/);
    let cur = "";
    for (const p of parts) {
      const next = cur + p;
      if (ctx.measureText(next).width <= maxWidth || cur.trim().length === 0) {
        cur = next;
      } else {
        out.push(cur.trimEnd());
        cur = p.trimStart();
      }
    }
    if (cur.length) out.push(cur.trimEnd());
  }

  return out;
}

function buildFont(sizePx: number, family: string, bold: boolean, italic: boolean) {
  return `${italic ? "italic " : ""}${bold ? "700" : "400"} ${Math.max(6, Math.round(sizePx))}px ${family}`;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  bold: boolean,
  italic: boolean,
  startSize: number,
  maxW: number,
  maxH: number,
  wrapMode: "No wrap" | "Word" | "Char",
) {
  let size = Math.max(6, startSize);
  for (let i = 0; i < 80; i++) {
    ctx.font = buildFont(size, family, bold, italic);
    const lines = wrapLines(ctx, text, maxW, wrapMode);
    const lineH = Math.ceil(size * 1.2);
    const totalH = lines.length * lineH;

    let maxLineW = 0;
    for (const l of lines) maxLineW = Math.max(maxLineW, ctx.measureText(l).width);

    if (maxLineW <= maxW + 0.5 && totalH <= maxH + 0.5) return size;

    size -= 1;
    if (size <= 6) return 6;
  }
  return Math.max(6, size);
}

export function CanvasView() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const screen = useStore((s) => s.project.screens.find((x) => x.id === s.selectedScreenId)!);
  const selectedObjectId = useStore((s) => s.selectedObjectId);

  const sorted = useMemo(() => [...screen.objects].sort((a, b) => a.z - b.z), [screen.objects]);

  // assets: fonts + bytes (С‡С‚РѕР±С‹ РїСЂРёРјРµРЅСЏР»СЃСЏ РІС‹Р±СЂР°РЅРЅС‹Р№ С€СЂРёС„С‚ РёР· asset manager)
  const fontAssets = useStore((s) => (s.project as any).assets?.fonts ?? []);
  const imageAssets = useStore((s) => (s.project as any).assets?.images ?? []);
  const assetBytes = useStore((s) => (s as any).assetBytes ?? {});


  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const bgUrlRef = useRef<string | null>(null);
  const [bgVersion, setBgVersion] = useState<number>(0);
useEffect(() => {
    const bgId = (screen as any).style?.backgroundImageAssetId as string | undefined;
    if (bgUrlRef.current) {
      try { URL.revokeObjectURL(bgUrlRef.current); } catch { /* ignore */ }
      bgUrlRef.current = null;
    }
    bgImgRef.current = null;

    if (!bgId) {
      requestAnimationFrame(() => setBgVersion((v: number) => v + 1));return;
    }

    const a: any = (imageAssets as any[]).find((x) => x.id === bgId);
    const bytes: any = (assetBytes as any)[bgId];
    if (!a || !bytes) {
      requestAnimationFrame(() => setBgVersion((v: number) => v + 1));return;
    }

    // bytes may be Uint8Array/ArrayBufferLike; normalize to ArrayBuffer for BlobPart
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

    const blob = new Blob([ab], { type: a.mime || "image/png" });
    const url = URL.createObjectURL(blob);
    bgUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      requestAnimationFrame(() => setBgVersion((v: number) => v + 1));};
    img.onerror = () => {
      bgImgRef.current = null;
      requestAnimationFrame(() => setBgVersion((v: number) => v + 1));};
    img.src = url;

    return () => {
      if (bgUrlRef.current) {
        try { URL.revokeObjectURL(bgUrlRef.current); } catch { /* ignore */ }
        bgUrlRef.current = null;
      }
    };
  }, [screen.id, (screen as any).style?.backgroundImageAssetId, (screen as any).style?.fill, imageAssets, assetBytes]);
  const [vp, setVp] = useState<Viewport>(() => ({ zoom: 1, panX: 0, panY: 0 }));
  const [dragObj, setDragObj] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  // Register fonts (FontFace)
  useEffect(() => {
    const anyWin = window as any;
    if (!anyWin.__dash_fontReg) anyWin.__dash_fontReg = new Set<string>();
    const reg: Set<string> = anyWin.__dash_fontReg;

    (async () => {
      for (const a of fontAssets) {
        const id = a?.id;
        if (!id) continue;
        if (reg.has(id)) continue;

        const bytes: Uint8Array | undefined = assetBytes[id];
        if (!bytes) continue;

        try {
          const ab =
            bytes.buffer instanceof ArrayBuffer
              ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
              : new Uint8Array(bytes).buffer.slice(0);
          const blob = new Blob([ab], { type: a.mime || "font/ttf" });
          const url = URL.createObjectURL(blob);
          const family = `dash_font_${id}`;
          const ff = new FontFace(family, `url(${url})`);
          await ff.load();
          (document as any).fonts.add(ff);
          reg.add(id);
        } catch {
          // РµСЃР»Рё РЅРµ Р·Р°РіСЂСѓР·РёР»СЃСЏ вЂ” РїСЂРѕСЃС‚Рѕ fallback РЅР° Inter
          reg.add(id);
        }
      }
    })();
  }, [fontAssets, assetBytes]);

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
      const fit = Math.min(c.width / screen.settings.width, c.height / screen.settings.height) * 0.8;
      setVp((v) => ({ ...v, zoom: clamp(fit || 1, 0.15, 3) }));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
     
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
ctx.globalAlpha = 0.07;
ctx.strokeStyle = "#9E9E9E";
ctx.lineWidth = 1;

const step = 150 * vp.zoom;

// привязываем грид к мировым координатам (чтобы ехал вместе с паном)
const offX = ((c.width / 2) + vp.panX * vp.zoom) % step;
const offY = ((c.height / 2) + vp.panY * vp.zoom) % step;

for (let x = offX; x < c.width; x += step) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, c.height);
  ctx.stroke();
}
for (let y = offY; y < c.height; y += step) {
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

    // draw screen background image (if set)
    // (bgVersion is used only to trigger redraw when image loads)
    void bgVersion;
const bgImg = bgImgRef.current;
    if (bgImg) {
      const srcW = (bgImg as any).naturalWidth || bgImg.width;
      const srcH = (bgImg as any).naturalHeight || bgImg.height;

      if (srcW > 0 && srcH > 0) {
        const fillMode = (screen.style as any).fill || "Fit";

        ctx.save();
        ctx.globalAlpha = bgAlpha;

        if (fillMode === "Stretch") {
          ctx.drawImage(bgImg, tl.sx, tl.sy, srW, srH);
        } else {
          const screenAR = srW / srH;
          const imgAR = srcW / srcH;

          if (fillMode === "Fill") {
            let sx = 0, sy = 0, sw = srcW, sh = srcH;

            if (screenAR > imgAR) {
              sh = Math.round(srcW / screenAR);
              sy = Math.round((srcH - sh) / 2);
            } else {
              sw = Math.round(srcH * screenAR);
              sx = Math.round((srcW - sw) / 2);
            }

            ctx.drawImage(bgImg, sx, sy, sw, sh, tl.sx, tl.sy, srW, srH);
          } else {
            const scale = Math.min(srW / srcW, srH / srcH);
            const dw = srcW * scale;
            const dh = srcH * scale;
            const dx = tl.sx + (srW - dw) / 2;
            const dy = tl.sy + (srH - dh) / 2;
            ctx.drawImage(bgImg, dx, dy, dw, dh);
          }
        }

        ctx.restore();
      }
    }

    // screen border
    ctx.save();
    ctx.globalAlpha = 0.25;
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

      // rotation (РІ РіСЂР°РґСѓСЃР°С…)
      const rotDeg = (o.transform as any).rotation ?? 0;
      const rot = degToRad(rotDeg);
      const cx = p.sx + w / 2;
      const cy = p.sy + h / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);

      // preview draw per type
      if (o.type === "Label") {
        const alpha = (o.style.alpha ?? 100) / 100;

        const txt = o.settings.text?.length ? o.settings.text : o.name;

        const bold = o.settings.bold === "Yes";
        const italic = o.settings.italic === "Yes";

        const wrapMode = (o.settings.wrap as any) ?? "No wrap";
        const align = (o.settings.align as any) ?? "Left";
        const autoSize = (o.settings.autoSize as any) === "Yes";

        // font asset
        const fontAssetId = (o.settings as any).fontAssetId;
        const family = fontAssetId ? `dash_font_${fontAssetId}` : "Inter";

        // padding inside label box (world px -> screen px via zoom)
        const padX = 6 * vp.zoom;
        const padY = 6 * vp.zoom;

        // available box for text (in screen px)
        const maxW = Math.max(10, w - padX * 2);
        const maxH = Math.max(10, h - padY * 2);

        // base font size in screen px
        const baseSize = Math.max(10, o.settings.fontSize || 20) * vp.zoom;

        // compute size (autosize shrinks)
        let fontSize = baseSize;
        if (autoSize) {
          // IMPORTANT: fitFontSize expects unscaled sizes, so we fit in screen px with screen px size
          const tmpStart = Math.max(6, Math.round(baseSize));
          fontSize = fitFontSize(ctx, txt, family, bold, italic, tmpStart, maxW, maxH, wrapMode);
        }

        ctx.font = buildFont(fontSize, family, bold, italic);
        ctx.textBaseline = "top";

        if (align === "Center") ctx.textAlign = "center";
        else if (align === "Right") ctx.textAlign = "right";
        else ctx.textAlign = "left";

        const lines = wrapLines(ctx, txt, maxW, wrapMode);
        const lineH = Math.ceil(fontSize * 1.2);

        const x = align === "Center" ? p.sx + w / 2 : align === "Right" ? p.sx + w - padX : p.sx + padX;
        const y0 = p.sy + padY;

        // ----- STYLE FX -----
        const textColor = normalizeHex(o.style.color || "#3EA3FF");
        const glow = Math.max(0, (o.style as any).glow ?? 0);
        const shadowColor = normalizeHex((o.style as any).shadowColor || "#000000");
        const shadowBlur = Math.max(0, (o.style as any).shadowBlur ?? 0);
        const shadowOffX = (o.style as any).shadowOffsetX ?? 0;
        const shadowOffY = (o.style as any).shadowOffsetY ?? 0;

        const outlineColor = normalizeHex((o.style as any).outlineColor || "#000000");
        const outlineThickness = Math.max(0, (o.style as any).outlineThickness ?? 0);

        // 1) glow pass (behind)
        if (glow > 0) {
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = glow * vp.zoom;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // glowAlpha РЅРµ РґРµР»Р°РµРј РѕРіСЂРѕРјРЅС‹Рј вЂ” С‡С‚РѕР±С‹ РЅРµ Р·Р°СЃРІРµС‡РёРІР°Р»Рѕ
          const glowAlpha = clamp((glow / 200) * alpha, 0, 0.9);
          ctx.shadowColor = hexToRgba(textColor, glowAlpha);
          ctx.fillStyle = hexToRgba(textColor, alpha);

          for (let i = 0; i < lines.length; i++) {
            const yy = y0 + i * lineH;
            ctx.fillText(lines[i], x, yy);
          }
          ctx.restore();
        }

        // 2) shadow + outline + fill
        ctx.save();
        ctx.globalAlpha = 1;

        if (shadowBlur > 0 || shadowOffX !== 0 || shadowOffY !== 0) {
          ctx.shadowBlur = shadowBlur * vp.zoom;
          ctx.shadowOffsetX = shadowOffX * vp.zoom;
          ctx.shadowOffsetY = shadowOffY * vp.zoom;
          ctx.shadowColor = hexToRgba(shadowColor, alpha);
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowColor = "transparent";
        }

        // outline first
        if (outlineThickness > 0) {
          ctx.lineWidth = outlineThickness * vp.zoom;
          ctx.strokeStyle = hexToRgba(outlineColor, alpha);
          for (let i = 0; i < lines.length; i++) {
            const yy = y0 + i * lineH;
            ctx.strokeText(lines[i], x, yy);
          }
        }

        // fill
        ctx.fillStyle = hexToRgba(textColor, alpha);
        for (let i = 0; i < lines.length; i++) {
          const yy = y0 + i * lineH;
          ctx.fillText(lines[i], x, yy);
        }

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
        const ccx = p.sx + w / 2;
        const ccy = p.sy + h / 2;
        const r = Math.min(w, h) * 0.38;
        const thickness = Math.max(2, (o.style.thickness || 20) * vp.zoom);

        // background arc
        ctx.save();
        ctx.globalAlpha = (o.style.backgroundAlpha ?? 40) / 100;
        ctx.strokeStyle = o.style.backgroundColor || "#3EA3FF";
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // value arc
        const value = clamp((o.settings.previewValue ?? 100) / 100, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = o.style.color || "#3EA3FF";
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(ccx, ccy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * value);
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

      ctx.restore(); // rotation scope
    }
  }, [
    sorted,
    selectedObjectId,
    vp,
    screen.settings.width,
    screen.settings.height,
    screen.style.color,
    screen.style.alpha,
    fontAssets,
    assetBytes, bgVersion]);

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

    const newX = w.x - dragObj.dx + sw / 2;
    const newY = w.y - dragObj.dy + sh / 2;

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