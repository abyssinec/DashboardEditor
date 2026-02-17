import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { LabelObj } from "../types";
import { ColorPicker } from "./ColorPicker";

function clampInt(v: any, fallback: number) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

function Label({ children }: { children: React.ReactNode }) {
  return <div className="insLbl">{children}</div>;
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

/** Custom dropdown (so options are readable and styled) */
function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && rootRef.current.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [open]);

  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={rootRef} className="insDrop">
      <button
        type="button"
        className="insDropBtn"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className="insDropCaret" />
      </button>
      {open ? (
        <div className="insDropMenu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`insDropItem ${o.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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

  // color picker (close outside)
  const [pickerOpen, setPickerOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!pickerOpen) return;
      const t = e.target as Node;
      if (popRef.current && popRef.current.contains(t)) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      setPickerOpen(false);
    }
    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [pickerOpen]);

  const colorHex = normalizeHex(obj.style.color);
  const alpha = clampInt(obj.style.alpha, 100);

  return (
    <div className="insRoot">
      <div className="insTypeBar">Label</div>

      {/* Name */}
      <Label>Name</Label>
      <TextField
        value={obj.name}
        onChange={(e) => Actions.updateObject(obj.id, { name: e.target.value })}
      />

      <Collapse
        title="Transform"
        open={openTransform}
        onToggle={() => setOpenTransform((v) => !v)}
      >
        <Row2>
          <div>
            <Label>Position X</Label>
            <SpinNumber
              value={obj.transform.x}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "x"], v)}
            />
          </div>
          <div>
            <Label>Position Y</Label>
            <SpinNumber
              value={obj.transform.y}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "y"], v)}
            />
          </div>
        </Row2>

        <div style={{ marginTop: 12 }}>
          <Label>Rotation</Label>
          <SpinNumber
            value={obj.transform.rotation}
            onChange={(v) =>
              Actions.updateObjectDeep(obj.id, ["transform", "rotation"], v)
            }
          />
        </div>
      </Collapse>

      <Collapse
        title="Settings"
        open={openSettings}
        onToggle={() => setOpenSettings((v) => !v)}
      >
        <Label>Text</Label>
        <TextArea
          rows={3}
          value={obj.settings.text}
          onChange={(e) =>
            Actions.updateObjectDeep(obj.id, ["settings", "text"], e.target.value)
          }
        />

        <div style={{ marginTop: 12 }}>
          <Label>Upload font</Label>
          <div className="insBgRow">
            <button
              className="insBtn"
              type="button"
              onClick={() =>
                Actions.openAssets("Fonts", { objectId: obj.id, field: "fontAssetId" })
              }
            >
              Select
            </button>
            <TextField value={fontName} readOnly />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Font Size</Label>
              <SpinNumber
                value={obj.settings.fontSize}
                min={1}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "fontSize"], v)
                }
              />
            </div>

            <div>
              <Label>Auto Size</Label>
              <Dropdown
                value={obj.settings.autoSize}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "autoSize"], v as any)
                }
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Bold</Label>
              <Dropdown
                value={obj.settings.bold}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "bold"], v as any)
                }
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
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "italic"], v as any)
                }
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Align</Label>
              <Dropdown
                value={obj.settings.align}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "align"], v as any)
                }
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
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["settings", "wrap"], v as any)
                }
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

      <Collapse
        title="Style"
        open={openStyle}
        onToggle={() => setOpenStyle((v) => !v)}
      >
        <Row2>
          <div style={{ position: "relative" }}>
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
                onChange={(e) =>
                  Actions.updateObjectDeep(obj.id, ["style", "color"], normalizeHex(e.target.value))
                }
              />
            </div>

            {pickerOpen ? (
              <div ref={popRef} className="insPickerPopover">
                <ColorPicker
                  value={colorHex}
                  alpha={alpha}
                  onChange={(nextHex, nextAlpha) => {
                    Actions.updateObjectDeep(obj.id, ["style", "color"], normalizeHex(nextHex));
                    Actions.updateObjectDeep(obj.id, ["style", "alpha"], clampInt(nextAlpha, alpha));
                  }}
                />
              </div>
            ) : null}
          </div>

          <div>
            <Label>Alpha</Label>
            <SpinNumber
              value={alpha}
              min={0}
              max={100}
              onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "alpha"], v)}
            />
          </div>
        </Row2>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Glow</Label>
              <SpinNumber
                value={obj.style.glow}
                min={0}
                max={1000}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["style", "glow"], v)
                }
              />
            </div>
            <div />
          </Row2>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Shadow Color</Label>
          <div className="insColorRow">
            <button
              type="button"
              className="insColorSwatchBtn"
              style={{ background: normalizeHex(obj.style.shadowColor) }}
              onClick={() => {}}
              title="Shadow color (hex)"
            />
            <TextField
              value={normalizeHex(obj.style.shadowColor)}
              onChange={(e) =>
                Actions.updateObjectDeep(obj.id, ["style", "shadowColor"], normalizeHex(e.target.value))
              }
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Shadow Offset X</Label>
              <SpinNumber
                value={obj.style.shadowOffsetX}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["style", "shadowOffsetX"], v)
                }
              />
            </div>
            <div>
              <Label>Shadow Offset Y</Label>
              <SpinNumber
                value={obj.style.shadowOffsetY}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["style", "shadowOffsetY"], v)
                }
              />
            </div>
          </Row2>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Shadow Blur</Label>
          <SpinNumber
            value={obj.style.shadowBlur}
            min={0}
            max={1000}
            onChange={(v) =>
              Actions.updateObjectDeep(obj.id, ["style", "shadowBlur"], v)
            }
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Outline Color</Label>
          <div className="insColorRow">
            <button
              type="button"
              className="insColorSwatchBtn"
              style={{ background: normalizeHex(obj.style.outlineColor) }}
              onClick={() => {}}
              title="Outline color (hex)"
            />
            <TextField
              value={normalizeHex(obj.style.outlineColor)}
              onChange={(e) =>
                Actions.updateObjectDeep(obj.id, ["style", "outlineColor"], normalizeHex(e.target.value))
              }
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Outline Thickness</Label>
          <SpinNumber
            value={obj.style.outlineThickness}
            min={0}
            max={1000}
            onChange={(v) =>
              Actions.updateObjectDeep(obj.id, ["style", "outlineThickness"], v)
            }
          />
        </div>
      </Collapse>

      <Collapse
        title="Gauge settings"
        open={openGauge}
        onToggle={() => setOpenGauge((v) => !v)}
      >
        <div style={{ marginTop: 2 }}>
          <Label>Gauge Type</Label>
          <TextField
            value={obj.gauge.gaugeType}
            onChange={(e) =>
              Actions.updateObjectDeep(obj.id, ["gauge", "gaugeType"], e.target.value)
            }
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Row2>
            <div>
              <Label>Update rate (ms)</Label>
              <SpinNumber
                value={obj.gauge.updateRateMs}
                min={1}
                max={100000}
                onChange={(v) =>
                  Actions.updateObjectDeep(obj.id, ["gauge", "updateRateMs"], v)
                }
              />
            </div>
            <div>
              <Label>Smoothing factor</Label>
              <TextField
                value={String(obj.gauge.smoothingFactor)}
                onChange={(e) =>
                  Actions.updateObjectDeep(
                    obj.id,
                    ["gauge", "smoothingFactor"],
                    Number(e.target.value) || 0
                  )
                }
              />
            </div>
          </Row2>
        </div>
      </Collapse>
    </div>
  );
}
