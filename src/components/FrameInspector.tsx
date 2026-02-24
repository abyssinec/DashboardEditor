import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Actions } from "../store";
import type { FrameObj, LayoutType } from "../types";
import { clampInt } from "../utils/inspector";
import { Dropdown } from "./Dropdown";

/** Same inspector UI building blocks used across objects (Figma-like). */
function Label({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <div className="insLbl" style={style}>
      {children}
    </div>
  );
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div className="insRow2">{children}</div>;
}
function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      className="insField"
      value={value as any}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      min={min as any}
      max={max as any}
    />
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      className={`insCaret ${open ? "open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Collapse({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="insSection">
      <button type="button" className="insSectionHead" onClick={onToggle}>
        <span>{title}</span>
        <Caret open={open} />
      </button>
      {open ? <div className="insSectionBody">{children}</div> : null}
    </div>
  );
}

/** Custom number with up/down like reference */
function SpinNumber({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="insSpin">
      <input
        className="insField insSpinInput"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const raw = clampInt(parseInt(e.target.value || "0", 10), 0);
          const n = Math.max(min, Math.min(max, raw));
          onChange(n);
        }}
        inputMode="numeric"
      />
      <div className="insSpinBtns">
        <button
          type="button"
          className="insSpinBtn"
          onClick={() => onChange((Math.max(min, Math.min(max, clampInt((value ?? 0) + step, 0)))))}
        >
          ▲
        </button>
        <button
          type="button"
          className="insSpinBtn"
          onClick={() => onChange((Math.max(min, Math.min(max, clampInt((value ?? 0) - step, 0)))))}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function PortalPopover({
  open,
  anchor,
  children,
  onClose,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ left: 0, top: 0, w: 240, flip: false });

  React.useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = Math.max(240, r.width);
    const left = Math.round(r.left);
    const preferBelow = r.bottom + 8 + 260 < window.innerHeight;
    const top = preferBelow ? Math.round(r.bottom + 6) : Math.round(r.top - 6);
    setPos({ left, top, w, flip: !preferBelow });
  }, [open, anchor]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: any) => {
      if (!anchor) return;
      if (anchor.contains(e.target)) return;
      onClose();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="insPickerPopover"
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.w,
        transform: pos.flip ? "translateY(-100%)" : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function FrameInspector({ obj }: { obj: FrameObj }) {
  const [secTransform, setSecTransform] = useState(true);
  const [secLayout, setSecLayout] = useState(true);
  const [secPadding, setSecPadding] = useState(false);

  const t: any = obj.transform as any;
  const s: any = obj.settings as any;

  const layoutOpts = useMemo(
    () =>
      [
        { value: "None", label: "None" },
        { value: "Vertical", label: "Vertical" },
        { value: "Horizontal", label: "Horizontal" },
        { value: "Grid", label: "Grid" },
      ] as { value: LayoutType; label: string }[],
    [],
  );

  const setLayout = (v: LayoutType) => {
    Actions.updateObjectDeep(obj.id, ["settings", "layout"], v);
  };

  const pad = (s?.padding ?? { left: 0, top: 0, right: 0, bottom: 0 }) as any;

  return (
    <div className="insRoot">
      <div className="insTypeBar">Frame</div>

      <Label>Name</Label>
      <TextField value={obj.name} onChange={(v) => Actions.updateObject(obj.id, { name: v })} />


      <Collapse title="Transform" open={secTransform} onToggle={() => setSecTransform((v) => !v)}>
        <Row2>
          <div>
            <Label>X</Label>
            <SpinNumber
              value={t.x ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "x"], v)}
              step={1}
            />
          </div>
          <div>
            <Label>Y</Label>
            <SpinNumber
              value={t.y ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "y"], v)}
              step={1}
            />
          </div>
        </Row2>

        <Row2>
          <div>
            <Label>W</Label>
            <SpinNumber
              value={t.width ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "width"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
          <div>
            <Label>H</Label>
            <SpinNumber
              value={t.height ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "height"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
        </Row2>

        <div>
          <Label>Rot</Label>
          <SpinNumber
            value={t.rotation ?? 0}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "rotation"], v)}
            step={1}
          />
        </div>
      </Collapse>

      <Collapse title="Layout" open={secLayout} onToggle={() => setSecLayout((v) => !v)}>
        <div>
          <Label>Type</Label>
          <Dropdown value={(s?.layout ?? "None") as any} options={layoutOpts as any} onChange={(v) => setLayout(v as any)} />
        </div>

        <Row2>
          <div>
            <Label>Gap X</Label>
            <SpinNumber
              value={s?.gapX ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "gapX"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
          <div>
            <Label>Gap Y</Label>
            <SpinNumber
              value={s?.gapY ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "gapY"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
        </Row2>

        <Row2>
          <div>
            <Label>Clip content</Label>
            <Dropdown
              value={(s as any)?.clipContent === false ? "No" : "Yes"}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "clipContent"], v === "Yes")}
            />
          </div>
          <div />
        </Row2>

        <Row2>
          <div>
            <Label>Scroll X</Label>
            <SpinNumber
              value={(s as any)?.scrollX ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "scrollX"], Math.max(0, v))}
              step={10}
              min={0}
            />
          </div>
          <div>
            <Label>Scroll Y</Label>
            <SpinNumber
              value={(s as any)?.scrollY ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "scrollY"], Math.max(0, v))}
              step={10}
              min={0}
            />
          </div>
        </Row2>

        {(s?.layout ?? "None") === "Grid" ? (
          <Row2>
            <div>
              <Label>Cols</Label>
              <SpinNumber
                value={s?.gridCols ?? 2}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "gridCols"], Math.max(1, v))}
                step={1}
                min={1}
              />
            </div>
            <div>
              <Label>Rows</Label>
              <SpinNumber
                value={s?.gridRows ?? 2}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "gridRows"], Math.max(1, v))}
                step={1}
                min={1}
              />
            </div>
          </Row2>
        ) : null}
      </Collapse>

      <Collapse title="Padding" open={secPadding} onToggle={() => setSecPadding((v) => !v)}>
        <Row2>
          <div>
            <Label>Left</Label>
            <SpinNumber
              value={pad.left ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "padding", "left"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
          <div>
            <Label>Top</Label>
            <SpinNumber
              value={pad.top ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "padding", "top"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
        </Row2>

        <Row2>
          <div>
            <Label>Right</Label>
            <SpinNumber
              value={pad.right ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "padding", "right"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
          <div>
            <Label>Bottom</Label>
            <SpinNumber
              value={pad.bottom ?? 0}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "padding", "bottom"], Math.max(0, v))}
              step={1}
              min={0}
            />
          </div>
        </Row2>
      </Collapse>
    </div>
  );
}
