import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Actions } from "../store";
import type { AnyObj } from "../types";
import { ColorPicker } from "./ColorPicker";
import { clamp, clampInt, normalizeHex } from "../utils/inspector";
import { Dropdown } from "./Dropdown";

const MIN_OBJ_W = 1;
const MIN_OBJ_H = 1;

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
function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="insField" {...props} />;
}

function Caret({ open }: { open: boolean }) {
  return (
    <span className={`insCaret ${open ? "open" : ""}`}>
      <svg viewBox="0 0 12 12" fill="none">
        <path
          d="M2.2 4.2 6 8 9.8 4.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
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
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const next = clampInt(e.target.value, value);
          onChange(clamp(next, min ?? -1e9, max ?? 1e9));
        }}
      />
      <div className="insSpinBtns">
        <button
          type="button"
          className="insSpinBtn"
          onClick={() => onChange(clamp(value + step, min ?? -1e9, max ?? 1e9))}
          aria-label="Increase"
        >
          ▲
        </button>
        <button
          type="button"
          className="insSpinBtn"
          onClick={() => onChange(clamp(value - step, min ?? -1e9, max ?? 1e9))}
          aria-label="Decrease"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

/** Portal popover (SAME as LabelInspector) */
function PortalPopover({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const width = 372;
      const heightGuess = 360;

      let left = r.left;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

      let top = r.bottom + 8;
      if (top + heightGuess > window.innerHeight - 12) {
        top = Math.max(12, r.top - heightGuess - 8);
      }

      setPos({ left, top });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current && popRef.current.contains(t)) return;
      if (anchorRef.current && anchorRef.current.contains(t)) return;
      onClose();
    }

    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [open, anchorRef, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={popRef}
      className="insPopPortal"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export function ArcInspector({ obj }: { obj: AnyObj }) {
  const arc: any = obj as any;

  const [openTransform, setOpenTransform] = useState(true);
  const [openSettings, setOpenSettings] = useState(true);
  const [openStyle, setOpenStyle] = useState(true);

  // main color picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // background picker
  const [bgOpen, setBgOpen] = useState(false);
  const bgBtnRef = useRef<HTMLButtonElement | null>(null);

  const colorHex = normalizeHex(arc?.style?.color ?? "#3EA3FF");
  const alpha = clampInt(arc?.style?.alpha, 100);

  const bgHex = normalizeHex(arc?.style?.backgroundColor ?? "#3EA3FF");
  const bgAlpha = clampInt(arc?.style?.backgroundAlpha, 40);

  return (
    <div className="insRoot">
      <div className="insTypeBar">Arc</div>

      <Label>Name</Label>
      <TextField value={arc?.name ?? "Arc"} onChange={(e) => Actions.updateObject(obj.id, { name: e.target.value })} />

      <Collapse title="Transform" open={openTransform} onToggle={() => setOpenTransform((v) => !v)}>
        <Row2>
          <div>
            <Label>Position X</Label>
            <SpinNumber value={arc.transform?.x ?? 0} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "x"], v)} />
          </div>
          <div>
            <Label>Position Y</Label>
            <SpinNumber value={arc.transform?.y ?? 0} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "y"], v)} />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Label>Rotation</Label>
          <SpinNumber value={arc.transform?.rotation ?? 0} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "rotation"], v)} />
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Width</Label>
              <SpinNumber
                value={arc.transform?.width ?? 240}
                min={MIN_OBJ_W}
                max={20000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "width"], v)}
              />
            </div>
            <div>
              <Label>Height</Label>
              <SpinNumber
                value={arc.transform?.height ?? 240}
                min={MIN_OBJ_H}
                max={20000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "height"], v)}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Start Angle</Label>
              <SpinNumber value={arc.transform?.startAngle ?? 0} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "startAngle"], v)} />
            </div>
            <div>
              <Label>End Angle</Label>
              <SpinNumber value={arc.transform?.endAngle ?? 180} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "endAngle"], v)} />
            </div>
          </Row2>
        </div>
      </Collapse>

      <Collapse title="Settings" open={openSettings} onToggle={() => setOpenSettings((v) => !v)}>
        <Row2>
          <div>
            <Label>Segments</Label>
            <SpinNumber
              value={arc.settings?.segments ?? 64}
              min={3}
              max={4096}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "segments"], v)}
            />
          </div>
          <div>
            <Label>Clockwise</Label>
            <Dropdown
              value={(arc.settings?.clockwise ?? "Yes") as any}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "clockwise"], v as any)}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Label>Preview Value</Label>
          <SpinNumber
            value={arc.settings?.previewValue ?? 50}
            min={0}
            max={100}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "previewValue"], v)}
          />
        </div>
      </Collapse>

      <Collapse title="Style" open={openStyle} onToggle={() => setOpenStyle((v) => !v)}>
        {/* Main color (same layout as LabelInspector) */}
        <Row2>
          <div>
            <Label>Color</Label>
            <div className="insColorRow">
              <button
                ref={btnRef}
                type="button"
                className="insColorSwatchBtn"
                onClick={() => setPickerOpen((v) => !v)}
                title="Pick color"
                style={{ background: colorHex }}
              />
              <TextField
                value={colorHex}
                onChange={(e) => Actions.updateObjectDeep(obj.id, ["style", "color"], normalizeHex(e.target.value))}
              />
            </div>

            <PortalPopover open={pickerOpen} anchorRef={btnRef as any} onClose={() => setPickerOpen(false)}>
              <div className="insPickerPopover" style={{ position: "static" }}>
                <ColorPicker
                  value={colorHex}
                  alpha={alpha}
                  onChange={(nextHex, nextAlpha) => {
                    Actions.updateObjectDeep(obj.id, ["style", "color"], normalizeHex(nextHex));
                    Actions.updateObjectDeep(obj.id, ["style", "alpha"], clampInt(nextAlpha, alpha));
                  }}
                />
              </div>
            </PortalPopover>
          </div>

          <div>
            <Label>Alpha</Label>
            <SpinNumber value={alpha} min={0} max={100} onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "alpha"], v)} />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Glow</Label>
              <SpinNumber
                value={arc.style?.glow ?? 0}
                min={0}
                max={1000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "glow"], v)}
              />
            </div>
            <div>
              <Label>Thickness</Label>
              <SpinNumber
                value={arc.style?.thickness ?? 20}
                min={1}
                max={2000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "thickness"], v)}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 25 }}>
          <Label>Cap Style</Label>
          <Dropdown
            value={(arc.style?.capStyle ?? "Flat") as any}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "capStyle"], v as any)}
            options={[{ value: "Flat", label: "Flat" },
                    { value: "Round", label: "Round" }]}
          />
        </div>

        {/* Background (same feel as Label: plain fields, not a weird header) */}
        <div style={{ marginTop: 25 }}>
          <Label>Background Color</Label>
          <div className="insColorRow">
            <button
              ref={bgBtnRef}
              type="button"
              className="insColorSwatchBtn"
              onClick={() => setBgOpen((v) => !v)}
              title="Pick color"
              style={{ background: bgHex }}
            />
            <TextField
              value={bgHex}
              onChange={(e) => Actions.updateObjectDeep(obj.id, ["style", "backgroundColor"], normalizeHex(e.target.value))}
            />
          </div>

          <PortalPopover open={bgOpen} anchorRef={bgBtnRef as any} onClose={() => setBgOpen(false)}>
            <div className="insPickerPopover" style={{ position: "static" }}>
              <ColorPicker
                value={bgHex}
                alpha={bgAlpha}
                onChange={(nextHex, nextAlpha) => {
                  Actions.updateObjectDeep(obj.id, ["style", "backgroundColor"], normalizeHex(nextHex));
                  Actions.updateObjectDeep(obj.id, ["style", "backgroundAlpha"], clampInt(nextAlpha, bgAlpha));
                }}
              />
            </div>
          </PortalPopover>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Background Alpha</Label>
              <SpinNumber
                value={bgAlpha}
                min={0}
                max={100}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "backgroundAlpha"], v)}
              />
            </div>
            <div>
              <Label>Background Glow</Label>
              <SpinNumber
                value={arc.style?.backgroundGlow ?? 0}
                min={0}
                max={1000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "backgroundGlow"], v)}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Background Thickness</Label>
              <SpinNumber
                value={arc.style?.backgroundThickness ?? (arc.style?.thickness ?? 20)}
                min={1}
                max={2000}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "backgroundThickness"], v)}
              />
            </div>
            <div>
              <Label>Background Cap Style</Label>
              <Dropdown
                value={(arc.style?.backgroundCapStyle ?? "Flat") as any}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "backgroundCapStyle"], v as any)}
                options={[{ value: "Flat", label: "Flat" },
                { value: "Round", label: "Round" }]}
              />
            </div>
          </Row2>
        </div>
      </Collapse>
    </div>
  );
}