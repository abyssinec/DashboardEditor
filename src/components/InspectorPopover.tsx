import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rect = { left: number; top: number; width: number; height: number };

function useAnchorRect(open: boolean, anchorEl: HTMLElement | null) {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;

    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(anchorEl);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorEl]);

  return rect;
}

export function InspectorPopover({
  open,
  anchorRef,
  onClose,
  children,
  width = 380,
  offset = 8,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  offset?: number;
}) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const rect = useAnchorRect(open, anchorRef.current);

  // close on outside click
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && popRef.current.contains(t)) return;
      if (anchorRef.current && anchorRef.current.contains(t)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [open, onClose, anchorRef]);

  if (!open || !rect) return null;

  // position: under anchor, keep inside viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left;
  left = Math.max(12, Math.min(left, vw - width - 12));

  let top = rect.top + rect.height + offset;
  // if too low, try above
  const estH = 360;
  if (top + estH > vh - 12) {
    top = Math.max(12, rect.top - estH - offset);
  }

  return createPortal(
    <div
      ref={popRef}
      className="insPopPortal"
      style={{
        position: "fixed",
        left,
        top,
        width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}


