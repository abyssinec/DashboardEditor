import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";

type Viewport = { zoom: number; panX: number; panY: number };

type ResizeHandle = "nw" | "ne" | "se" | "sw";
type ResizeState = {
  id: string;
  handle: ResizeHandle;
  startWorldX: number;
  startWorldY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

const MIN_OBJ_W = 1;
const MIN_OBJ_H = 1;

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

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  if (rr <= 0.001) {
    ctx.rect(x, y, w, h);
    return;
  }
  const x2 = x + w;
  const y2 = y + h;
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x2 - rr, y);
  ctx.quadraticCurveTo(x2, y, x2, y + rr);
  ctx.lineTo(x2, y2 - rr);
  ctx.quadraticCurveTo(x2, y2, x2 - rr, y2);
  ctx.lineTo(x + rr, y2);
  ctx.quadraticCurveTo(x, y2, x, y2 - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function baseObjectBounds(
  o: AnyObj,
  overrides?: Record<string, { x?: number; y?: number; rotation?: number; previewValue?: number; labelText?: string }>,
) {
  const ov = overrides ? overrides[o.id] : undefined;
  const ox = ov?.x ?? (o.transform as any).x ?? 0;
  const oy = ov?.y ?? (o.transform as any).y ?? 0;
  if (o.type === "Label") {
    const w = (o.transform as any).width ?? 220;
    const h = (o.transform as any).height ?? 60;
    return { x: ox, y: oy, w, h };
  }
 if (o.type === "Image") {
  const t: any = o.transform as any;

  // новый путь
  const wNew = t.width;
  const hNew = t.height;

  // legacy путь (старые проекты)
  const wLegacy = 220 * (t.scaleX || 1);
  const hLegacy = 140 * (t.scaleY || 1);

  const w = Number.isFinite(wNew) && wNew > 0 ? wNew : wLegacy;
  const h = Number.isFinite(hNew) && hNew > 0 ? hNew : hLegacy;

  return { x: ox, y: oy, w, h };
}
 if (o.type === "Arc") {
  const w = (o.transform as any).width ?? 240;
  const h = (o.transform as any).height ?? 240;
  return { x: ox, y: oy, w, h };
}
  if ((o as any).type === "Frame") {
    const w = (o.transform as any).width ?? 420;
    const h = (o.transform as any).height ?? 260;
    return { x: ox, y: oy, w, h };
  }
// Bar
  return { x: ox, y: oy, w: (o.transform as any).width, h: (o.transform as any).height };
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

  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const screen = useStore((s) => s.project.screens.find((x) => x.id === selectedScreenId)!);
  const selectedObjectId = useStore((s) => s.selectedObjectId);
  const playEnabled = useStore((s) => s.playMode.enabled);
  const playOverrides = useStore((s) => s.playMode.overrides);

  // Runtime-aware bounds (play mode can animate/move Image objects)
  const objectBounds = useMemo(() => {
    return (o: AnyObj) => baseObjectBounds(o, playOverrides as any);
  }, [playOverrides]);

  // Signature to force rerender on deep mutations (width/height/x/y/rotation/z/etc.)
  const screenSig = useStore((s) => {
    const sc = s.project.screens.find((x) => x.id === selectedScreenId);
    if (!sc) return "";
    const ov = (s.playMode && s.playMode.enabled ? s.playMode.overrides : {}) || {};
    const ovSig = s.playMode?.enabled
      ? Object.keys(ov)
          .sort()
          .map((id) => {
            const o = (ov as any)[id] || {};
            return [id, o.previewValue, o.labelText, o.x, o.y, o.rotation].join(",");
          })
          .join("|")
      : "";
    return (
      sc.id +
      "|" +
      sc.settings.width +
      "x" +
      sc.settings.height +
      "|" +
      (sc.style?.color ?? "") +
      "|" +
      (sc.style?.alpha ?? "") +
      "|" +
      ((sc.style as any)?.backgroundImageAssetId ?? "") +
      "|" +
      ((sc.style as any)?.fill ?? "") +
      "|" +
      sc.objects
        .map((o: any) =>
          [
            o.id,
            o.type,
            o.z,
            o.transform?.x,
            o.transform?.y,
            o.transform?.width,
            o.transform?.height,
            o.transform?.scaleX,
            o.transform?.scaleY,
            o.transform?.rotation,
            // label settings affecting hit-test and layout
            o.settings?.text,
            o.settings?.fontSize,
            o.settings?.wrap,
            o.settings?.align,
            o.settings?.bold,
            o.settings?.italic,
            o.settings?.autoSize,
            o.settings?.fontAssetId,
            // image settings
            (o.settings as any)?.imageAssetId,
            (o.settings as any)?.keepAspect,
            (o.settings as any)?.fillMode,
            // style
            (o.style as any)?.alpha,
            // Arc/Bar preview (affects rendering)
            (o.settings as any)?.previewValue,
            // Image animation settings (affects rendering in play mode)
            (o.settings as any)?.animation?.type,
            (o.settings as any)?.animation?.startX,
            (o.settings as any)?.animation?.startY,
            (o.settings as any)?.animation?.endX,
            (o.settings as any)?.animation?.endY,
            (o.settings as any)?.animation?.startRot,
            (o.settings as any)?.animation?.endRot,
          ].join(":"),
        )
        .join(",") +
      "|" +
      ovSig
    );
  });

  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const bgUrlRef = useRef<string | null>(null);
  const [bgVersion, setBgVersion] = useState<number>(0);
  const [imgVersion, setImgVersion] = useState<number>(0);


  const { sorted: sorted, parentOf, hiddenById } = useMemo(() => {
    // important: rely on screenSig so it updates even if objects mutated in place
    void screenSig;
    void imgVersion;

    const objs = [...screen.objects];
    const byId = new Map(objs.map((o) => [o.id, o] as const));

    const isFrame = (o: AnyObj | undefined) => !!o && (o as any).type === "Frame";

    // child -> parent frame
    const parentOf = new Map<string, string>();
    for (const o of objs) {
      if (isFrame(o)) {
        const kids = ((o as any).children ?? []) as string[];
        for (const cid of kids) parentOf.set(cid, o.id);
      }
    }
    // fallback: parentId field (in case children list is missing/out of sync)
    for (const o of objs) {
      const pid = (o as any).parentId;
      if (pid && !parentOf.has(o.id)) parentOf.set(o.id, pid);
    }

    // inherited visibility
    const hiddenById = new Map<string, boolean>();
    const isHidden = (id: string): boolean => {
      if (hiddenById.has(id)) return hiddenById.get(id)!;
      const o: any = byId.get(id);
      if (!o) {
        hiddenById.set(id, true);
        return true;
      }
      if (o.visible === false) {
        hiddenById.set(id, true);
        return true;
      }
      const p = parentOf.get(id);
      if (!p) {
        hiddenById.set(id, false);
        return false;
      }
      const v = isHidden(p);
      hiddenById.set(id, v);
      return v;
    };
    for (const o of objs) isHidden(o.id);

    // layout offsets per frame (computed from children order)
    const offsets = new Map<string, { x: number; y: number }>();
    const absPos = new Map<string, { x: number; y: number }>();

    const resolveAbs = (id: string): { x: number; y: number } => {
      const cached = absPos.get(id);
      if (cached) return cached;
      const o: any = byId.get(id);
      if (!o) {
        const v = { x: 0, y: 0 };
        absPos.set(id, v);
        return v;
      }

      const p = parentOf.get(id);
      if (!p) {
        const v = { x: o.transform?.x ?? 0, y: o.transform?.y ?? 0 };
        absPos.set(id, v);
        return v;
      }

      const pf: any = byId.get(p);
      const pAbs = resolveAbs(p);
      const pad = pf?.settings?.padding ?? { left: 0, top: 0, right: 0, bottom: 0 };

      // ensure frame offsets computed once
      if (isFrame(pf) && !offsets.has(`__frame__${p}`)) {
        offsets.set(`__frame__${p}`, { x: 0, y: 0 });
        const kids = ((pf as any).children ?? []) as string[];
        const layout = (pf as any).settings?.layout ?? "None";
        const gapX = (pf as any).settings?.gapX ?? 0;
        const gapY = (pf as any).settings?.gapY ?? 0;
        const b = objectBounds(pf);
        const contentW = Math.max(0, (b.w ?? 0) - (pad.left ?? 0) - (pad.right ?? 0));
        const contentH = Math.max(0, (b.h ?? 0) - (pad.top ?? 0) - (pad.bottom ?? 0));

        if (layout === "Vertical") {
          let cy = 0;
          for (const cid of kids) {
            const child = byId.get(cid);
            if (!child) continue;
            offsets.set(cid, { x: 0, y: cy });
            const cb = objectBounds(child);
            cy += (cb.h ?? 0) + gapY;
          }
        } else if (layout === "Horizontal") {
          let cx = 0;
          for (const cid of kids) {
            const child = byId.get(cid);
            if (!child) continue;
            offsets.set(cid, { x: cx, y: 0 });
            const cb = objectBounds(child);
            cx += (cb.w ?? 0) + gapX;
          }
        } else if (layout === "Grid") {
          const n = kids.length;
          const colsRaw = Math.max(1, Math.round((pf as any).settings?.gridCols ?? 2));
          const rowsRaw = Math.max(1, Math.round((pf as any).settings?.gridRows ?? 1));

          // Prefer explicit cols; rows is a hint (we keep both visible in inspector)
          const cols = colsRaw;
          const rows = Math.max(rowsRaw, Math.ceil(n / cols));

          const cellW = cols > 0 ? Math.max(0, (contentW - gapX * (cols - 1)) / cols) : contentW;
          const cellH = rows > 0 ? Math.max(0, (contentH - gapY * (rows - 1)) / rows) : contentH;

          for (let i = 0; i < n; i++) {
            const cid = kids[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            offsets.set(cid, { x: col * (cellW + gapX), y: row * (cellH + gapY) });
          }
        } else {
          // None: keep children's own local x/y
        }
      }

      const off = offsets.get(id);
      const pfLayout = (pf as any)?.settings?.layout ?? "None";
      const localX = pfLayout === "None" ? (o.transform?.x ?? 0) : (off?.x ?? 0);
      const localY = pfLayout === "None" ? (o.transform?.y ?? 0) : (off?.y ?? 0);

      const scrollX = (pf as any)?.settings?.scrollX ?? 0;
      const scrollY = (pf as any)?.settings?.scrollY ?? 0;

      const v = {
        x: (pAbs.x ?? 0) + (pad.left ?? 0) + localX - scrollX,
        y: (pAbs.y ?? 0) + (pad.top ?? 0) + localY - scrollY,
      };
      absPos.set(id, v);
      return v;
    };

    // Build resolved objects with overridden x/y
    const resolved = objs.map((o) => {
      const p = parentOf.get(o.id);
      if (!p) return o;
      const abs = resolveAbs(o.id);
      return {
        ...(o as any),
        transform: { ...(o as any).transform, x: abs.x, y: abs.y },
      } as AnyObj;
    });

    return {
      sorted: resolved.sort((a, b) => a.z - b.z),
      parentOf,
      hiddenById,
    };
  }, [screenSig, imgVersion, screen.objects]);

  const byIdResolved = useMemo(() => new Map(sorted.map((o) => [o.id, o] as const)), [sorted]);

  function topFrameAt(sx: number, sy: number, sw: number, sh: number): AnyObj | null {
    // top-most (highest z) frame containing point
    for (const o of [...sorted].reverse()) {
      if ((o as any).type !== "Frame") continue;
      if (hiddenById.get(o.id)) continue;

      const b = objectBounds(o);
      const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;

      if (sx >= p.sx && sx <= p.sx + w && sy >= p.sy && sy <= p.sy + h) return o;
    }
    return null;
  }

  function clipChainFor(id: string): string[] {
    const out: string[] = [];
    let cur = parentOf.get(id) || null;
    while (cur) {
      const pf: any = byIdResolved.get(cur);
      if (pf && pf.type === "Frame" && pf.settings?.clipContent !== false) out.push(cur);
      cur = parentOf.get(cur) || null;
    }
    return out.reverse();
  }

  function pointInsideAllClips(sx: number, sy: number, id: string, sw: number, sh: number): boolean {
    const chain = clipChainFor(id);
    for (const fid of chain) {
      const f = byIdResolved.get(fid) as any;
      if (!f) continue;
      const b = objectBounds(f);
      const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;
      if (!(sx >= p.sx && sx <= p.sx + w && sy >= p.sy && sy <= p.sy + h)) return false;
    }
    return true;
  }


  const fontAssets = useStore((s) => (s.project as any).assets?.fonts ?? []);
  const imageAssets = useStore((s) => (s.project as any).assets?.images ?? []);
  const assetBytes = useStore((s) => (s as any).assetBytes ?? {});

  useEffect(() => {
    const bgId = (screen as any).style?.backgroundImageAssetId as string | undefined;

    if (bgUrlRef.current) {
      try {
        URL.revokeObjectURL(bgUrlRef.current);
      } catch {}
      bgUrlRef.current = null;
    }
    bgImgRef.current = null;

    if (!bgId) {
      requestAnimationFrame(() => setBgVersion((v) => v + 1));
      return;
    }

    const a: any = (imageAssets as any[]).find((x) => x.id === bgId);
    const bytes: any = (assetBytes as any)[bgId];
    if (!a || !bytes) {
      requestAnimationFrame(() => setBgVersion((v) => v + 1));
      return;
    }

    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

    const blob = new Blob([ab], { type: a.mime || "image/png" });
    const url = URL.createObjectURL(blob);
    bgUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      requestAnimationFrame(() => setBgVersion((v) => v + 1));
    };
    img.onerror = () => {
      bgImgRef.current = null;
      requestAnimationFrame(() => setBgVersion((v) => v + 1));
    };
    img.src = url;

    return () => {
      if (bgUrlRef.current) {
        try {
          URL.revokeObjectURL(bgUrlRef.current);
        } catch {}
        bgUrlRef.current = null;
      }
    };
  }, [screen.id, (screen as any).style?.backgroundImageAssetId, (screen as any).style?.fill, imageAssets, assetBytes]);

  const [vp, setVp] = useState<Viewport>(() => ({ zoom: 1, panX: 0, panY: 0 }));
  const [fontVersion, setFontVersion] = useState(0); // redraw after async font registration
  // Keep latest viewport in a ref so native wheel handler always uses fresh values
  const vpRef = useRef(vp);
  useEffect(() => { vpRef.current = vp; }, [vp]);

  // Wheel zoom: native listener with { passive:false } so preventDefault works (no console warnings)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (playEnabled) return;

    const onWheelNative = (ev: WheelEvent) => {
      ev.preventDefault();

      const c = canvasRef.current;
      if (!c) return;

      const r = c.getBoundingClientRect();
      const sx = ev.clientX - r.left;
      const sy = ev.clientY - r.top;

      const v0 = vpRef.current;

      // screen -> world using latest vp
      const beforeX = (sx - c.width / 2) / v0.zoom - v0.panX;
      const beforeY = (sy - c.height / 2) / v0.zoom - v0.panY;
      // Wheel = zoom (no Ctrl)
      const delta = -ev.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;

      setVp((v) => {
        const nz = clamp(v.zoom * factor, 0.15, 3);

        // keep cursor point stable
        const x2 = (sx - c.width / 2) / nz - v.panX;
        const y2 = (sy - c.height / 2) / nz - v.panY;

        const dx = beforeX - x2;
        const dy = beforeY - y2;

        return { zoom: nz, panX: v.panX + dx, panY: v.panY + dy };
      });

      return;
// Try scrolling hovered frame (only if clipContent enabled)
      const frame = topFrameAt(sx, sy, sw, sh) as any;
      if (frame && frame.settings?.clipContent !== false) {
        const pad = frame.settings?.padding ?? { left: 0, top: 0, right: 0, bottom: 0 };
        const fb = objectBounds(frame);
        const innerW = Math.max(0, fb.w - (pad.left ?? 0) - (pad.right ?? 0));
        const innerH = Math.max(0, fb.h - (pad.top ?? 0) - (pad.bottom ?? 0));

        const scrollX = frame.settings?.scrollX ?? 0;
        const scrollY = frame.settings?.scrollY ?? 0;

        // Compute content extents in frame local space (add current scroll back)
        let contentW = 0;
        let contentH = 0;
        const kids: string[] = Array.isArray(frame.children) ? frame.children : [];
        for (const cid of kids) {
          const child: any = byIdResolved.get(cid);
          if (!child || hiddenById.get(cid)) continue;
          const cb = objectBounds(child);
          const relX = (child.transform?.x ?? 0) - (frame.transform?.x ?? 0) - (pad.left ?? 0) + scrollX;
          const relY = (child.transform?.y ?? 0) - (frame.transform?.y ?? 0) - (pad.top ?? 0) + scrollY;
          contentW = Math.max(contentW, relX + (cb.w ?? 0));
          contentH = Math.max(contentH, relY + (cb.h ?? 0));
        }

        const maxX = Math.max(0, contentW - innerW);
        const maxY = Math.max(0, contentH - innerH);

        // wheel deltas are in screen px -> world px
        const dxWorld = (ev.shiftKey ? ev.deltaY : ev.deltaX) / v0.zoom;
        const dyWorld = (ev.shiftKey ? 0 : ev.deltaY) / v0.zoom;

        if (maxX > 0 && Math.abs(dxWorld) > 0.01) {
          const nx = clamp(scrollX + dxWorld, 0, maxX);
          if (nx !== scrollX) Actions.updateObjectDeep(frame.id, ["settings", "scrollX"], nx);
        }
        if (maxY > 0 && Math.abs(dyWorld) > 0.01) {
          const ny = clamp(scrollY + dyWorld, 0, maxY);
          if (ny !== scrollY) Actions.updateObjectDeep(frame.id, ["settings", "scrollY"], ny);
        }

        // If can scroll, don't pan canvas
        if (maxX > 0 || maxY > 0) return;
      }

      // Pan canvas
      setVp((v) => ({
        ...v,
        panX: v.panX - ev.deltaX / v.zoom,
        panY: v.panY - ev.deltaY / v.zoom,
      }));
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [screen.settings.width, screen.settings.height, sorted, hiddenById, byIdResolved, playEnabled]);
  const [dragObj, setDragObj] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [resizing, setResizing] = useState<ResizeState | null>(null);



  // History batching for drag/resize (one undo step per gesture)
  const gestureActiveRef = useRef(false);
  const endDragRef = useRef<() => void>(() => {});

  // Throttle transform writes to the store to at most 1x per animation frame during drag/resize.
  const pendingTransformRef = useRef<{
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  } | null>(null);
  const transformRafRef = useRef<number | null>(null);

  function scheduleTransformWrite(update: { id: string; x?: number; y?: number; width?: number; height?: number }) {
    const cur = pendingTransformRef.current;
    pendingTransformRef.current = cur && cur.id === update.id ? { ...cur, ...update } : { ...update };

    if (transformRafRef.current != null) return;
    transformRafRef.current = requestAnimationFrame(() => {
      transformRafRef.current = null;
      const u = pendingTransformRef.current;
      pendingTransformRef.current = null;
      if (!u) return;

      if (u.x != null) Actions.updateObjectDeep(u.id, ["transform", "x"], u.x);
      if (u.y != null) Actions.updateObjectDeep(u.id, ["transform", "y"], u.y);
      if (u.width != null) Actions.updateObjectDeep(u.id, ["transform", "width"], u.width);
      if (u.height != null) Actions.updateObjectDeep(u.id, ["transform", "height"], u.height);
    });
  }

  useEffect(() => {
    const onUp = () => endDragRef.current();
    window.addEventListener("mouseup", onUp, true);
    window.addEventListener("mouseleave", onUp, true);
    return () => {
      window.removeEventListener("mouseup", onUp, true);
      window.removeEventListener("mouseleave", onUp, true);
    };
  }, []);

  // Register fonts (FontFace)
  useEffect(() => {
    const anyWin = window as any;
    if (!anyWin.__dash_fontReg) anyWin.__dash_fontReg = new Set<string>();
    const reg: Set<string> = anyWin.__dash_fontReg;

    (async () => {
      let added = false;
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
          added = true;
          try {
            URL.revokeObjectURL(url);
          } catch {}
        } catch {
          reg.add(id);
        }

      }

      if (added) {
        // Force a redraw so freshly loaded fonts apply immediately after import
        setFontVersion((v) => v + 1);
      }
    })();
  }, [fontAssets, assetBytes]);


  // Image objectURL cache housekeeping:
  // - revoke URLs once images are loaded (done in loader)
  // - revoke stale URLs when assets change
  // - revoke everything on unmount
  useEffect(() => {
    const cache: Map<string, HTMLImageElement> = ((CanvasView as any)._imgCache ??= new Map<string, HTMLImageElement>());
    const urlCache: Map<string, string> = ((CanvasView as any)._imgUrlCache ??= new Map<string, string>());

    const validIds = new Set<string>((imageAssets as any[]).map((a) => a.id).filter(Boolean));

    // Drop stale entries
    for (const [id, url] of [...urlCache.entries()]) {
      if (!validIds.has(id) || !(assetBytes as any)[id]) {
        try { URL.revokeObjectURL(url); } catch {}
        urlCache.delete(id);
      }
    }
    for (const id of [...cache.keys()]) {
      if (!validIds.has(id) || !(assetBytes as any)[id]) cache.delete(id);
    }

    return () => {
      for (const url of urlCache.values()) {
        try { URL.revokeObjectURL(url); } catch {}
      }
      urlCache.clear();
      cache.clear();
    };
  }, [imageAssets, assetBytes]);


  // Space for pan
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

  function hitResizeHandle(sel: AnyObj, sx: number, sy: number, sw: number, sh: number): ResizeHandle | null {
   if (!sel || (sel.type !== "Label" && sel.type !== "Image" && sel.type !== "Bar" && sel.type !== "Arc" && (sel as any).type !== "Frame")) return null;

    const b = objectBounds(sel);
    const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
    const w = b.w * vp.zoom;
    const h = b.h * vp.zoom;

    const hs = 10;
    const half = hs / 2;

    const corners = [
      { h: "nw", x: p.sx, y: p.sy },
      { h: "ne", x: p.sx + w, y: p.sy },
      { h: "se", x: p.sx + w, y: p.sy + h },
      { h: "sw", x: p.sx, y: p.sy + h },
    ] as const;

    for (const c2 of corners) {
      if (sx >= c2.x - half && sx <= c2.x + half && sy >= c2.y - half && sy <= c2.y + half) return c2.h;
    }
    return null;
  }

  // IMPORTANT: Label hit-test ONLY by actual text bounds (not whole rect)
  function hitTestScreen(sx: number, sy: number, ctx: CanvasRenderingContext2D): AnyObj | undefined {
    const sw = screen.settings.width;
    const sh = screen.settings.height;

    for (const o of [...sorted].reverse()) {
      // Skip hidden objects (inherited from parent frames)
      if (hiddenById.get(o.id)) continue;
      if (!pointInsideAllClips(sx, sy, o.id, sw, sh)) continue;
      const b = objectBounds(o);
      const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;

      if (o.type === "Label") {
        const txt = o.settings?.text?.length ? o.settings.text : o.name;

        const bold = o.settings?.bold === "Yes";
        const italic = o.settings?.italic === "Yes";
        const wrapMode = (o.settings?.wrap as any) ?? "No wrap";
        const align = (o.settings?.align as any) ?? "Left";
        const autoSize = (o.settings?.autoSize as any) === "Yes";

        const fontAssetId = (o.settings as any)?.fontAssetId;
        const family = fontAssetId ? `dash_font_${fontAssetId}` : "Inter";

        const padX = 6 * vp.zoom;
        const padY = 6 * vp.zoom;

        const maxW = Math.max(10, w - padX * 2);
        const maxH = Math.max(10, h - padY * 2);

        const baseSize = Math.max(10, (o.settings?.fontSize || 20)) * vp.zoom;
        let fontSize = baseSize;

        if (autoSize) {
          const tmpStart = Math.max(6, Math.round(baseSize));
          fontSize = fitFontSize(ctx, txt, family, bold, italic, tmpStart, maxW, maxH, wrapMode);
        }

        ctx.font = buildFont(fontSize, family, bold, italic);

        const lines = wrapLines(ctx, txt, maxW, wrapMode);
        const lineH = Math.ceil(fontSize * 1.2);

        let maxLineW = 0;
        for (const l of lines) maxLineW = Math.max(maxLineW, ctx.measureText(l).width);

        const textTop = p.sy + padY;
        const textH = lines.length * lineH;

        let textLeft = p.sx + padX;
        if (align === "Center") textLeft = p.sx + w / 2 - maxLineW / 2;
        else if (align === "Right") textLeft = p.sx + w - padX - maxLineW;

        const textRight = textLeft + maxLineW;
        const textBottom = textTop + textH;

        if (sx >= textLeft && sx <= textRight && sy >= textTop && sy <= textBottom) return o;
        continue;
      }

      // other types: rectangle hit-test
      if (sx >= p.sx && sx <= p.sx + w && sy >= p.sy && sy <= p.sy + h) return o;
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

    // softer grid
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#9E9E9E";
    ctx.lineWidth = 1;

    const step = 150 * vp.zoom;
    const offX = (c.width / 2 + vp.panX * vp.zoom) % step;
    const offY = (c.height / 2 + vp.panY * vp.zoom) % step;

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

    const bgAlpha = (screen.style.alpha ?? 100) / 100;

    // fill
    ctx.save();
    ctx.fillStyle = hexToRgba(screen.style.color || "#000000", bgAlpha);
    ctx.fillRect(tl.sx, tl.sy, srW, srH);
    ctx.restore();

    // bg image
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
            let sx = 0,
              sy = 0,
              sw2 = srcW,
              sh2 = srcH;

            if (screenAR > imgAR) {
              sh2 = Math.round(srcW / screenAR);
              sy = Math.round((srcH - sh2) / 2);
            } else {
              sw2 = Math.round(srcH * screenAR);
              sx = Math.round((srcW - sw2) / 2);
            }

            ctx.drawImage(bgImg, sx, sy, sw2, sh2, tl.sx, tl.sy, srW, srH);
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
      // Skip hidden objects (inherited from parent frames)
      if (hiddenById.get(o.id)) continue;
      const ov = playOverrides ? (playOverrides as any)[o.id] : undefined;
      const b = objectBounds(o);
      const p = worldToScreen(b.x - sw / 2, b.y - sh / 2);
      const w = b.w * vp.zoom;
      const h = b.h * vp.zoom;

      // rotation
      const rotDeg = (ov?.rotation ?? (o.transform as any).rotation) ?? 0;
      const rot = degToRad(rotDeg);
      const cx = p.sx + w / 2;
      const cy = p.sy + h / 2;

      ctx.save();
      const chain = clipChainFor(o.id);
      for (const fid of chain) {
        const f = byIdResolved.get(fid) as any;
        if (!f) continue;
        const fb = objectBounds(f);
        const fp = worldToScreen(fb.x - sw / 2, fb.y - sh / 2);
        const fw = fb.w * vp.zoom;
        const fh = fb.h * vp.zoom;
        ctx.beginPath();
        ctx.rect(fp.sx, fp.sy, fw, fh);
        ctx.clip();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);

      if (o.type === "Label") {
        const alpha = (o.style.alpha ?? 100) / 100;
        const txt = (ov?.labelText ?? (o.settings.text?.length ? o.settings.text : o.name)) as string;

        const bold = o.settings.bold === "Yes";
        const italic = o.settings.italic === "Yes";
        const wrapMode = (o.settings.wrap as any) ?? "No wrap";
        const align = (o.settings.align as any) ?? "Left";
        const autoSize = (o.settings.autoSize as any) === "Yes";

        const fontAssetId = (o.settings as any).fontAssetId;
        const family = fontAssetId ? `dash_font_${fontAssetId}` : "Inter";

        const padX = 6 * vp.zoom;
        const padY = 6 * vp.zoom;

        const maxW = Math.max(10, w - padX * 2);
        const maxH = Math.max(10, h - padY * 2);

        const baseSize = Math.max(10, o.settings.fontSize || 20) * vp.zoom;

        let fontSize = baseSize;
        if (autoSize) {
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

        // STYLE FX
        const textColor = normalizeHex(o.style.color || "#3EA3FF");
        const glow = Math.max(0, (o.style as any).glow ?? 0);
        const shadowColor = normalizeHex((o.style as any).shadowColor || "#000000");
        const shadowBlur = Math.max(0, (o.style as any).shadowBlur ?? 0);
        const shadowOffX = (o.style as any).shadowOffsetX ?? 0;
        const shadowOffY = (o.style as any).shadowOffsetY ?? 0;

        const outlineColor = normalizeHex((o.style as any).outlineColor || "#000000");
        const outlineThickness = Math.max(0, (o.style as any).outlineThickness ?? 0);

        if (glow > 0) {
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = glow * vp.zoom;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          const glowAlpha = clamp((glow / 200) * alpha, 0, 0.9);
          ctx.shadowColor = hexToRgba(textColor, glowAlpha);
          ctx.fillStyle = hexToRgba(textColor, alpha);

          for (let i = 0; i < lines.length; i++) {
            const yy = y0 + i * lineH;
            ctx.fillText(lines[i], x, yy);
          }
          ctx.restore();
        }

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

        if (outlineThickness > 0) {
          ctx.lineWidth = outlineThickness * vp.zoom;
          ctx.strokeStyle = hexToRgba(outlineColor, alpha);
          for (let i = 0; i < lines.length; i++) {
            const yy = y0 + i * lineH;
            ctx.strokeText(lines[i], x, yy);
          }
        }

        ctx.fillStyle = hexToRgba(textColor, alpha);
        for (let i = 0; i < lines.length; i++) {
          const yy = y0 + i * lineH;
          ctx.fillText(lines[i], x, yy);
        }

        ctx.restore();
      } else if ((o as any).type === "Frame") {
        // Frame is a container. We draw only a subtle outline (stronger when selected)
        const isSel = o.id === selectedObjectId;
        ctx.save();
        ctx.globalAlpha = isSel ? 0.45 : 0.12;
        ctx.strokeStyle = "#3EA3FF";
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.setLineDash(isSel ? [6, 4] : [4, 6]);
        ctx.strokeRect(p.sx, p.sy, w, h);
        ctx.restore();
      } else if (o.type === "Image") {
  const imgId = (o.settings as any)?.imageAssetId as string | undefined;

  // если нет ассета или bytes — плейсхолдер
  if (!imgId || !(assetBytes as any)[imgId]) {
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
  } else {
    // Кэш картинок по assetId
    const cache = ((CanvasView as any)._imgCache ??= new Map<string, HTMLImageElement>());
    const urlCache = ((CanvasView as any)._imgUrlCache ??= new Map<string, string>());

    let img = cache.get(imgId) || null;

    if (!img) {
      const bytes = (assetBytes as any)[imgId] as Uint8Array | ArrayBuffer | undefined;
      if (!bytes) {
        // Asset bytes not ready / missing (e.g. during import or after deletion)
        img = null;
      }
      if (bytes) {
        const mime = (imageAssets as any[]).find((a) => a.id === imgId)?.mime || "image/png";
        const blobPart = bytes instanceof ArrayBuffer ? bytes : (bytes as Uint8Array).buffer.slice(0);
      const blob = new Blob([blobPart], { type: mime });
        const url = URL.createObjectURL(blob);

      const im = new Image();
      im.onload = () => {
        cache.set(imgId, im);
        // Keep objectURL alive; revoke via housekeeping (on asset removal/unmount).
        requestAnimationFrame(() => setImgVersion((v) => v + 1));
      };
      im.onerror = () => {
        // On error, just drop cache entry; housekeeping will revoke.
        urlCache.delete(imgId);
      };
      im.src = url;

      urlCache.set(imgId, url);
      img = im;
      }
    }

    // если ещё не загрузилась — рисуем рамку
    if (!img || !(img as any).complete || (img as any).naturalWidth === 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = "#D9D9D9";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.sx, p.sy, w, h);
      ctx.restore();
    } else {
      const keepAspect = ((o.settings as any)?.keepAspect ?? "Yes") === "Yes";
      const fillMode = (o.settings as any)?.fillMode ?? "Fill"; // у тебя типом "Fill" пока

      ctx.save();
      ctx.globalAlpha = ((o.style as any)?.alpha ?? 100) / 100;

      if (!keepAspect) {
        // stretch
        ctx.drawImage(img, p.sx, p.sy, w, h);
      } else {
        const iw = (img as any).naturalWidth || 1;
        const ih = (img as any).naturalHeight || 1;
        const ir = iw / ih;
        const r = w / h;

        let dw = w;
        let dh = h;

        // Fill: заполняем, обрезая лишнее
        if (fillMode === "Fill") {
          if (r > ir) {
            dw = w;
            dh = w / ir;
          } else {
            dh = h;
            dw = h * ir;
          }
        } else {
          // если потом добавишь Fit — тут будет Fit
          if (r > ir) {
            dh = h;
            dw = h * ir;
          } else {
            dw = w;
            dh = w / ir;
          }
        }

        const dx = p.sx + (w - dw) / 2;
        const dy = p.sy + (h - dh) / 2;

        // clip чтобы Fill не выходил за рамку
        ctx.beginPath();
        ctx.rect(p.sx, p.sy, w, h);
        ctx.clip();

        ctx.drawImage(img, dx, dy, dw, dh);
      }

      ctx.restore();
    }
  }
} else if (o.type === "Arc") {
  const capToCanvas = (cap: any) => (cap === "Round" ? "round" : "butt");
  const alpha = (o.style.alpha ?? 100) / 100;

  const ccx = p.sx + w / 2;
  const ccy = p.sy + h / 2;

  const thickness = Math.max(2, (o.style.thickness || 20) * vp.zoom);
  const bgThickness = Math.max(2, (o.style.backgroundThickness || (o.style.thickness || 20)) * vp.zoom);

  const r = Math.max(1, Math.min(w, h) / 2 - Math.max(thickness, bgThickness) / 2);

  const startDeg = (o.transform as any).startAngle ?? 0;
  const endDeg = (o.transform as any).endAngle ?? 180;
  const clockwise = ((o.settings as any)?.clockwise ?? "Yes") === "Yes";

  // 0° сверху (как раньше с -PI/2)
  const startRad0 = degToRad(startDeg) - Math.PI / 2;
  let endRad0 = degToRad(endDeg) - Math.PI / 2;

  let anticlockwise = false;
  if (clockwise) {
    if (endRad0 <= startRad0) endRad0 += Math.PI * 2;
    anticlockwise = false;
  } else {
    if (endRad0 >= startRad0) endRad0 -= Math.PI * 2;
    anticlockwise = true;
  }

  // background arc
const bgGlow = (o.style.backgroundGlow ?? 0) * vp.zoom;
ctx.save();
ctx.globalAlpha = (o.style.backgroundAlpha ?? 40) / 100;

// glow
ctx.shadowColor = o.style.backgroundColor || "#3EA3FF";
ctx.shadowBlur = bgGlow;

// stroke style
ctx.strokeStyle = o.style.backgroundColor || "#3EA3FF";
ctx.lineWidth = bgThickness;
ctx.lineCap = capToCanvas(o.style.backgroundCapStyle ?? "Flat");

ctx.beginPath();
ctx.arc(ccx, ccy, r, startRad0, endRad0, anticlockwise);
ctx.stroke();
ctx.restore();

  // value arc
  const pv = (ov?.previewValue ?? (o.settings as any)?.previewValue ?? 100) as number;
  const value = clamp(pv / 100, 0, 1);
  const valueEnd = startRad0 + (endRad0 - startRad0) * value;

  const mainGlow = (o.style.glow ?? 0) * vp.zoom;

  ctx.save();
  ctx.globalAlpha = alpha;

  // glow
  ctx.shadowColor = o.style.color || "#3EA3FF";
  ctx.shadowBlur = mainGlow;

  // stroke style
  ctx.strokeStyle = o.style.color || "#3EA3FF";
  ctx.lineWidth = thickness;
  ctx.lineCap = capToCanvas(o.style.capStyle ?? "Flat");

  ctx.beginPath();
  ctx.arc(ccx, ccy, r, startRad0, valueEnd, anticlockwise);
  ctx.stroke();
  ctx.restore();
} else if (o.type === "Bar") {
        const alpha = (o.style.alpha ?? 100) / 100;
        const pv = (ov?.previewValue ?? (o.settings as any).previewValue ?? 50) as number;
        const value = clamp(pv / 100, 0, 1);

        const radius = o.style.radius ?? 0;
        const cap = (o.style.capStyle ?? "Flat") as any;
        const bgCap = (o.style.backgroundCapStyle ?? "Flat") as any;

        // NOTE: In this editor, CapStyle controls the bar end shape.
        // Flat = square ends (ignore radius); Round = capsule ends (>= h/2).
        const capRadius = (capStyle: any, baseRadius: number, hPx: number) =>
          capStyle === "Round" ? Math.max(baseRadius, hPx / 2) : 0;

        // Background (with glow)
        const bgGlow = (o.style.backgroundGlow ?? 0) * vp.zoom;
        ctx.save();
        ctx.globalAlpha = (o.style.backgroundAlpha ?? 40) / 100;

        ctx.shadowColor = o.style.backgroundColor || "#3EA3FF";
        ctx.shadowBlur = bgGlow;

        ctx.fillStyle = o.style.backgroundColor || "#3EA3FF";
        const radBg = capRadius(bgCap, radius, h);
        roundedRectPath(ctx, p.sx, p.sy, w, h, radBg);
        ctx.fill();
        ctx.restore();

        // Value fill (with glow)
        const mainGlow = (o.style.glow ?? 0) * vp.zoom;
        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.shadowColor = o.style.color || "#3EA3FF";
        ctx.shadowBlur = mainGlow;

        ctx.fillStyle = o.style.color || "#3EA3FF";
        const fillW = w * value;
        const radMain = capRadius(cap, radius, h);
        roundedRectPath(ctx, p.sx, p.sy, fillW, h, radMain);
        ctx.fill();
        ctx.restore();
      }

      // Selection highlight (only selected)
      if (o.id === selectedObjectId) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#3EA3FF";
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.sx, p.sy, w, h);
        ctx.restore();
      }

      // Resize handles (Label only, only when selected)
      // Resize handles (Label/Image/Bar, only when selected)
if (o.id === selectedObjectId && (o.type === "Label" || o.type === "Image" || o.type === "Bar" || o.type === "Arc" || (o as any).type === "Frame")) {
        const hs = 8;
        const half = hs / 2;

        ctx.save();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0B1C2A";
        ctx.strokeStyle = "#3EA3FF";
        ctx.lineWidth = 2;

        const corners = [
          { x: p.sx, y: p.sy },
          { x: p.sx + w, y: p.sy },
          { x: p.sx + w, y: p.sy + h },
          { x: p.sx, y: p.sy + h },
        ];

        for (const c2 of corners) {
          ctx.beginPath();
          ctx.rect(c2.x - half, c2.y - half, hs, hs);
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore(); // rotation scope
      ctx.restore(); // clip scope
    }
  }, [
    // force redraw on deep changes
    fontVersion,
    screenSig,
    sorted,
    selectedObjectId,
    vp,
    screen.settings.width,
    screen.settings.height,
    screen.style.color,
    screen.style.alpha,
    fontAssets,
    assetBytes,
    bgVersion,
]);

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

    const sw = screen.settings.width;
    const sh = screen.settings.height;

    // RESIZE: only if selected object and cursor is on handle
    if (selectedObjectId) {
      const sel = sorted.find((x) => x.id === selectedObjectId);
      if (sel) {
        const h = hitResizeHandle(sel, sx, sy, sw, sh);
        if (h) {
          const w0 = screenToWorld(sx, sy);
          const b0 = objectBounds(sel);

          if (!gestureActiveRef.current) { Actions.beginGesture(); gestureActiveRef.current = true; }

          setResizing({
            id: sel.id,
            handle: h,
            startWorldX: w0.x,
            startWorldY: w0.y,
            startX: b0.x,
            startY: b0.y,
            startW: b0.w,
            startH: b0.h,
          });
          return;
        }
      }
    }

    // SELECT by screen hit-test (Label: only text)
    const ctx = c.getContext("2d")!;
    const hit = hitTestScreen(sx, sy, ctx);

    if (hit) {
      Actions.selectObject(hit.id);

      // If object is inside a layouted Frame (Vertical/Horizontal/Grid), its position is controlled by the Frame.
      // We still allow selecting/editing it, but dragging is disabled to avoid "snapping back".
      const p = parentOf.get(hit.id);
      if (p) {
        const pf: any = screen.objects.find((o) => o.id === p);
        const lay = pf?.settings?.layout ?? "None";
        if (lay !== "None") return;
      }

      // start drag
      if (!gestureActiveRef.current) { Actions.beginGesture(); gestureActiveRef.current = true; }
      const w = screenToWorld(sx, sy);
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

    if (resizing) {
      const c = canvasRef.current!;
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;

      const wNow = screenToWorld(sx, sy);
      const dx = wNow.x - resizing.startWorldX;
      const dy = wNow.y - resizing.startWorldY;

      let newX = resizing.startX;
      let newY = resizing.startY;
      let newW = resizing.startW;
      let newH = resizing.startH;

      if (resizing.handle === "se") {
        newW = resizing.startW + dx;
        newH = resizing.startH + dy;
      } else if (resizing.handle === "ne") {
        newW = resizing.startW + dx;
        newH = resizing.startH - dy;
        newY = resizing.startY + dy;
      } else if (resizing.handle === "sw") {
        newW = resizing.startW - dx;
        newH = resizing.startH + dy;
        newX = resizing.startX + dx;
      } else if (resizing.handle === "nw") {
        newW = resizing.startW - dx;
        newH = resizing.startH - dy;
        newX = resizing.startX + dx;
        newY = resizing.startY + dy;
      }

      if (newW < MIN_OBJ_W) {
        const diff = MIN_OBJ_W - newW;
        if (resizing.handle === "nw" || resizing.handle === "sw") newX -= diff;
        newW = MIN_OBJ_W;
      }
      if (newH < MIN_OBJ_H) {
        const diff = MIN_OBJ_H - newH;
        if (resizing.handle === "nw" || resizing.handle === "ne") newY -= diff;
        newH = MIN_OBJ_H;
      }

      // If object is inside a Frame, store transform in parent's local space.
      const resizingResolved: any = byIdResolved.get(resizing.id);
      const rParentId = resizingResolved?.parentId ?? null;
      let rx = Math.round(newX);
      let ry = Math.round(newY);
      if (rParentId) {
        const rParent: any = byIdResolved.get(rParentId);
        if (rParent?.transform) {
          rx = Math.round(newX - rParent.transform.x);
          ry = Math.round(newY - rParent.transform.y);
        }
      }

      scheduleTransformWrite({
        id: resizing.id,
        x: rx,
        y: ry,
        width: Math.round(newW),
        height: Math.round(newH),
      });
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

    // If object is inside a Frame, its transform.x/y are stored in the parent's local space.
    // Convert absolute (screen) coords to local coords to avoid double-offset while dragging.
    const draggedResolved: any = byIdResolved.get(dragObj.id);
    const parentId = draggedResolved?.parentId ?? null;
    let writeX = Math.round(newX);
    let writeY = Math.round(newY);
    if (parentId) {
      const parentResolved: any = byIdResolved.get(parentId);
      if (parentResolved?.transform) {
        writeX = Math.round(newX - parentResolved.transform.x);
        writeY = Math.round(newY - parentResolved.transform.y);
      }
    }

    scheduleTransformWrite({
      id: dragObj.id,
      x: writeX,
      y: writeY,
    });

  }

  function endDrag() {
    const draggedId = dragObj?.id ?? null;
    const wasDragging = !!dragObj;
    const wasResizing = !!resizing;
    const wasPanning = !!panning;

    // end history batch if a drag/resize gesture was active
    if (gestureActiveRef.current) {
      Actions.endGesture();
      gestureActiveRef.current = false;
    }

    setDragObj(null);
    setPanning(null);
    setResizing(null);

    
    
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

    setVp((v) => {
      const nz = clamp(v.zoom * factor, 0.15, 3);

      const c2 = canvasRef.current!;
      const x2 = (sx - c2.width / 2) / nz - v.panX;
      const y2 = (sy - c2.height / 2) / nz - v.panY;
      const dx = before.x - x2;
      const dy = before.y - y2;

      return { zoom: nz, panX: v.panX + dx, panY: v.panY + dy };
    });
  }

  endDragRef.current = endDrag;

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0 }}
      onMouseDown={playEnabled ? undefined : onMouseDown}
      onMouseMove={playEnabled ? undefined : onMouseMove}
      onMouseUp={playEnabled ? undefined : endDrag}
      onMouseLeave={playEnabled ? undefined : endDrag}
      
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