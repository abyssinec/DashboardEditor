import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Opt = { value: string; label: string };

export function Dropdown({
  value,
  options,
  onChange,
  disabled,
  className,
  placeholder,
}: {
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; flip: boolean }>({
    left: 0,
    top: 0,
    width: 240,
    flip: false,
  });

  const selectedLabel = useMemo(() => {
    const hit = options.find((o) => o.value === value);
    return hit ? hit.label : (placeholder ?? "");
  }, [options, value, placeholder]);

  function close() {
    setOpen(false);
  }

  function computePosition() {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // width = кнопка
    const width = Math.max(160, r.width);

    // максимально разумная высота списка
    const itemH = 34;
    const pad = 8;
    const maxH = Math.min(320, Math.max(140, vh * 0.45));
    const estimatedH = Math.min(maxH, pad * 2 + options.length * itemH);

    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;

    const flip = spaceBelow < estimatedH && spaceAbove > spaceBelow;

    // left clamp чтобы не улетало за экран
    let left = r.left;
    left = Math.max(8, Math.min(left, vw - width - 8));

    const top = flip ? (r.top - estimatedH - 6) : (r.bottom + 6);

    setPos({ left, top, width, flip });
  }

  // открытие: считаем позицию ДО рендера меню
  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, options.length]);

  // reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;

    const onWin = () => computePosition();
    window.addEventListener("resize", onWin, { passive: true });
    window.addEventListener("scroll", onWin, { passive: true, capture: true });

    return () => {
      window.removeEventListener("resize", onWin as any);
      window.removeEventListener("scroll", onWin as any, true as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options.length]);

  // close on outside + Escape
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;

      close();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  function pick(v: string) {
    onChange(v);
    close();
  }

  // keyboard on trigger
  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const menu = open ? (
  <div
    ref={menuRef}
    className={"dropdownPortal " + (pos.flip ? "flip" : "down")}
    style={{
      position: "fixed",
      left: pos.left,
      top: pos.top,
      width: pos.width,
      zIndex: 99999,
    }}
    role="listbox"
    aria-label="Dropdown"
  >
    <div className="dropdownMenu">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            className={"dropdownItem" + (active ? " isActive" : "")}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => pick(o.value)}
            role="option"
            aria-selected={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
) : null;


  return (
    <div ref={rootRef} className={"dropdownRoot " + (className ?? "")}>
      <button
        ref={btnRef}
        type="button"
        className={"dropdownTrigger" + (disabled ? " isDisabled" : "")}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="dropdownTriggerLabel">{selectedLabel}</span>
        <span className="dropdownTriggerCaret" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
          <path
            d="M2.2 4.2 6 8 9.8 4.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        </span>
      </button>

      {open ? createPortal(menu, document.body) : null}
    </div>
  );
}
