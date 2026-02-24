import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { LabelObj } from "../types";
import { ColorPicker } from "./ColorPicker";
import { clamp, clampInt, normalizeHex } from "../utils/inspector";
import { Dropdown } from "./Dropdown";
import { DraftNumberInput } from "./DraftNumberInput";
import { PID_CATALOG } from "../pids";


function formatNumberForLabel(
  v: number,
  fmt?: {
    valueFormatMode?: "Auto" | "Integer" | "Decimal";
    valuePadDigits?: number;
    valueDecimals?: number;
    valueTrimZeros?: boolean;
  },
) {
  if (!Number.isFinite(v)) return "—";

  const mode = fmt?.valueFormatMode || "Auto";
  const pad = Math.max(0, Math.min(12, Math.floor(Number(fmt?.valuePadDigits ?? 0) || 0)));
  const dec = Math.max(0, Math.min(6, Math.floor(Number(fmt?.valueDecimals ?? 1) || 0)));
  const trimZeros = !!fmt?.valueTrimZeros;

  const padLeft = (s: string) => (pad > 0 ? s.padStart(pad, "0") : s);

  if (mode === "Integer") {
    const n = Math.round(v);
    return padLeft(String(n));
  }

  if (mode === "Decimal") {
    let s = (Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec);
    if (trimZeros && dec > 0) s = s.replace(/\.?0+$/, "");
    return s;
  }

  // Auto
  const a = Math.abs(v);
  if (a >= 100) return padLeft(String(Math.round(v)));
  if (a >= 10) return (Math.round(v * 10) / 10).toFixed(1);
  return (Math.round(v * 100) / 100).toFixed(2);
}


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
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="insField insTextarea" {...props} />;
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



/** Portal popover (NOT clipped by scroll/overflow) */
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
      const width = 372; // matches picker visually
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

export function LabelInspector({ obj }: { obj: LabelObj }) {
  const fonts = useStore((s) => s.project.assets.fonts);

  const fontName = useMemo(() => {
    const id = obj.settings.fontAssetId;
    if (!id) return "None";
    return fonts.find((f) => f.id === id)?.name ?? "None";
  }, [fonts, obj.settings.fontAssetId]);

  const [openTransform, setOpenTransform] = useState(true);
  const [openSettings, setOpenSettings] = useState(true);
  const [openStyle, setOpenStyle] = useState(true);
  const [openGauge, setOpenGauge] = useState(true);

  const colorHex = normalizeHex(obj.style.color);
  const alpha = clampInt(obj.style.alpha, 100);

  const dataTypeOptions = useMemo(
    () => [
      { value: "None", label: "None" },
      { value: "OBD_CAN", label: "OBD CAN" },
      { value: "CLUSTER_CAN", label: "Cluster CAN" },
    ],
    [],
  );

  const pidOptions = useMemo(() => {
    const list = Object.values(PID_CATALOG)
      .slice()
      .sort((a, b) => (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0))
      .map((p) => ({ value: p.pid, label: `${p.pid} — ${p.name_ru || p.name_en}${p.unit ? ` (${p.unit})` : ""}` }));
    return [{ value: "None", label: "None" }, ...list];
  }, []);

  // main color picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // shadow picker
  const [shadowOpen, setShadowOpen] = useState(false);
  const shadowBtnRef = useRef<HTMLButtonElement | null>(null);
  const shadowHex = normalizeHex(obj.style.shadowColor);

  // outline picker
  const [outlineOpen, setOutlineOpen] = useState(false);
  const outlineBtnRef = useRef<HTMLButtonElement | null>(null);
  const outlineHex = normalizeHex(obj.style.outlineColor);

  return (
    <div className="insRoot">
      <div className="insTypeBar">Label</div>

      <Label>Name</Label>
      <TextField value={obj.name} onChange={(e) => Actions.updateObject(obj.id, { name: e.target.value })} />

      <Collapse title="Transform" open={openTransform} onToggle={() => setOpenTransform((v) => !v)}>
        <Row2>
          <div>
            <Label>Position X</Label>
            <SpinNumber value={obj.transform.x} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "x"], v)} />
          </div>
          <div>
            <Label>Position Y</Label>
            <SpinNumber value={obj.transform.y} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "y"], v)} />
          </div>
        </Row2>

        <Row2>
          <div>
            <Label>Width</Label>
            <SpinNumber
              value={(obj.transform as any).width ?? 220}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "width"], Math.max(1, v))}
            />
          </div>
          <div>
            <Label>Height</Label>
            <SpinNumber
              value={(obj.transform as any).height ?? 60}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "height"], Math.max(1, v))}
            />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Label>Rotation</Label>
          <SpinNumber
            value={obj.transform.rotation}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "rotation"], v)}
          />
        </div>
      </Collapse>

      <Collapse title="Settings" open={openSettings} onToggle={() => setOpenSettings((v) => !v)}>
        <Label>Text</Label>
        <TextArea
          rows={3}
          value={obj.settings.text}
          onChange={(e) => Actions.updateObjectDeep(obj.id, ["settings", "text"], e.target.value)}
        />

        <div style={{ marginTop: 25 }}>
          <Label>Upload font</Label>
          <div className="insBgRow">
            <button
              className="insBtn"
              type="button"
              onClick={() => Actions.openAssets("Fonts", { objectId: obj.id, field: "fontAssetId" })}
            >
              Select
            </button>
            <TextField value={fontName} readOnly />
          </div>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Font Size</Label>
              <SpinNumber
                value={obj.settings.fontSize}
                min={1}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "fontSize"], v)}
              />
            </div>
            <div>
              <Label>Auto Size</Label>
              <Dropdown
                value={obj.settings.autoSize}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "autoSize"], v as any)}
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Bold</Label>
              <Dropdown
                value={obj.settings.bold}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "bold"], v as any)}
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </div>
            <div>
              <Label>Italic</Label>
              <Dropdown
                value={obj.settings.italic}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "italic"], v as any)}
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Align</Label>
              <Dropdown
                value={obj.settings.align}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "align"], v as any)}
                options={[
                  { value: "Left", label: "Left" },
                  { value: "Center", label: "Center" },
                  { value: "Right", label: "Right" },
                ]}
              />
            </div>
            <div>
              <Label>Wrap</Label>
              <Dropdown
                value={obj.settings.wrap}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "wrap"], v as any)}
                options={[
                  { value: "No wrap", label: "No wrap" },
                  { value: "Word", label: "Word" },
                  { value: "Char", label: "Char" },
                ]}
              />
            </div>
          </Row2>
</div>
      </Collapse>

      <Collapse title="Gauge settings" open={openGauge} onToggle={() => setOpenGauge((v) => !v)}>
  <div style={{ marginTop: 2 }}>
    <Label>Data type</Label>
    <Dropdown
      value={obj.gauge.dataType || "None"}
      options={dataTypeOptions as any}
      onChange={(v) => {
        Actions.updateObjectDeep(obj.id, ["gauge", "dataType"], v);
        // if switching away from OBD, clear gaugeType to None (safe default)
        if (v !== "OBD_CAN" && obj.gauge.gaugeType !== "None") {
          Actions.updateObjectDeep(obj.id, ["gauge", "gaugeType"], "None");
        }
      }}
    />
  </div>

  <div style={{ marginTop: 14 }}>
    <Label>Gauge type</Label>
    <Dropdown
      value={obj.gauge.gaugeType || "None"}
      options={(obj.gauge.dataType === "OBD_CAN" ? pidOptions : [{ value: "None", label: "(empty)" }]) as any}
            disabled={obj.gauge.dataType !== "OBD_CAN"}
      onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "gaugeType"], v)}
    />
  </div>

  <Row2>
    <div style={{ marginTop: 18 }}>
      <Label>Range min (optional)</Label>
      <SpinNumber
        value={Number(obj.gauge.rangeMin ?? 0)}
        min={-1000000}
        max={1000000}
        onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "rangeMin"], v)}
      />
    </div>
    <div style={{ marginTop: 18 }}>
      <Label>Range max (optional)</Label>
      <SpinNumber
        value={Number(obj.gauge.rangeMax ?? 100)}
        min={-1000000}
        max={1000000}
        onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "rangeMax"], v)}
      />
    </div>
  </Row2>

  {obj.gauge.dataType !== "None" && (
    <div style={{ marginTop: 14 }}>
      <Label>Value format</Label>
      <Dropdown
        value={(obj.gauge as any).valueFormatMode || "Auto"}
        onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "valueFormatMode"], v as any)}
        options={[
          { value: "Auto", label: "Auto" },
          { value: "Integer", label: "Integer" },
          { value: "Decimal", label: "Decimal" },
        ]}
      />

      {(obj.gauge as any).valueFormatMode === "Integer" && (
        <Row2>
          <div style={{ marginTop: 10 }}>
            <Label>Min digits (pad)</Label>
            <SpinNumber
              value={Number((obj.gauge as any).valuePadDigits || 0)}
              min={0}
              max={12}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "valuePadDigits"], v)}
            />
          </div>
          <div />
        </Row2>
      )}

      {(obj.gauge as any).valueFormatMode === "Decimal" && (
        <Row2>
          <div style={{ marginTop: 10 }}>
            <Label>Decimals</Label>
            <SpinNumber
              value={Number((obj.gauge as any).valueDecimals ?? 1)}
              min={0}
              max={6}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "valueDecimals"], v)}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <Label>Trim zeros</Label>
            <div className="insCheckRow">
              <input
                type="checkbox"
                checked={!!(obj.gauge as any).valueTrimZeros}
                onChange={(e) => Actions.updateObjectDeep(obj.id, ["gauge", "valueTrimZeros"], e.target.checked)}
              />
              <div className="insCheckText">Remove trailing 0s</div>
            </div>
          </div>
        </Row2>
      )}

      <div className="insHint" style={{ marginTop: 10 }}>
        Preview:{" "}
        <b>
          {formatNumberForLabel(7, obj.gauge as any)} / {formatNumberForLabel(0.1, obj.gauge as any)} /{" "}
          {formatNumberForLabel(0.01, obj.gauge as any)}
        </b>
      </div>
    </div>
  )}

  <div style={{ marginTop: 18 }}>
    <Row2>
      <div>
        <Label>Update rate (ms)</Label>
        <SpinNumber
          value={obj.gauge.updateRateMs}
          min={1}
          max={100000}
          onChange={(v) => Actions.updateObjectDeep(obj.id, ["gauge", "updateRateMs"], v)}
        />
      </div>
      <div>
        <Label>Smoothing factor</Label>
        <TextField
          value={String(obj.gauge.smoothingFactor)}
          onChange={(e) =>
            Actions.updateObjectDeep(obj.id, ["gauge", "smoothingFactor"], Number(e.target.value) || 0)
          }
        />
      </div>
    </Row2>
  </div>
</Collapse>
    </div>
  );
}