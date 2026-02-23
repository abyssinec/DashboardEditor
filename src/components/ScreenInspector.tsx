import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Dropdown } from "./Dropdown";
import { Actions } from "../store";
import type { Screen } from "../types";
import { ColorPicker } from "./ColorPicker";
import { clamp, clampInt, normalizeHex } from "../utils/inspector";

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


export function ScreenInspector({ screen }: { screen: Screen }) {
  const images = useStore((s) => s.project.assets.images);

  const bgAssetName = useMemo(() => {
    const id = screen.style.backgroundImageAssetId;
    if (!id) return "None";
    const a = images.find((x: any) => x.id === id);
    return a?.name ?? "None";
  }, [images, screen.style.backgroundImageAssetId]);

  const [openSettings, setOpenSettings] = useState(true);
  const [openStyle, setOpenStyle] = useState(true);

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

  const hex = normalizeHex(screen.style.color || "#000000");
  const alpha = clampInt(screen.style.alpha, 100);

  return (
    <div className="insRoot">
      <div className="insTypeBar">Screen</div>

      <Label>Name</Label>
      <TextField
        value={screen.name}
        onChange={(e) => Actions.updateScreen(screen.id, { name: e.target.value })}
      />

      <Collapse
        title="Settings"
        open={openSettings}
        onToggle={() => setOpenSettings((v) => !v)}
      >
        <Row2>
          <div>
            <Label>Width</Label>
            <SpinNumber
              value={screen.settings.width}
              min={1}
              step={1}
              onChange={(v) =>
                Actions.updateScreen(screen.id, {
                  settings: { ...screen.settings, width: v },
                })
              }
            />
          </div>
          <div>
            <Label>Height</Label>
            <SpinNumber
              value={screen.settings.height}
              min={1}
              step={1}
              onChange={(v) =>
                Actions.updateScreen(screen.id, {
                  settings: { ...screen.settings, height: v },
                })
              }
            />
          </div>
        </Row2>
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
                style={{ background: hex }}
              />
              <TextField
                value={hex}
                onChange={(e) =>
                  Actions.updateScreen(screen.id, {
                    style: { ...screen.style, color: normalizeHex(e.target.value) },
                  })
                }
              />
            </div>

            {pickerOpen ? (
              <div ref={popRef} className="insPickerPopover">
                <ColorPicker
                  value={hex}
                  alpha={alpha}
                  onChange={(nextHex, nextAlpha) => {
                    Actions.updateScreen(screen.id, {
                      style: {
                        ...screen.style,
                        color: normalizeHex(nextHex),
                        alpha: clampInt(nextAlpha, alpha),
                      },
                    });
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
              step={1}
              onChange={(v) =>
                Actions.updateScreen(screen.id, {
                  style: { ...screen.style, alpha: v },
                })
              }
            />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Label>Background Image</Label>
          <div className="insBgRow">
  <button
    className="insBtn"
    type="button"
    onClick={() =>
      Actions.openAssets("Images", { objectId: "", field: "screenBackground" })
    }
  >
    Select
  </button>

  <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
    <TextField value={bgAssetName} readOnly />

    <button
      type="button"
      aria-label="Clear background image"
      disabled={!screen.style.backgroundImageAssetId}
      onClick={() =>
        Actions.updateScreen(screen.id, {
          style: { ...screen.style, backgroundImageAssetId: undefined },
        })
      }
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        lineHeight: 0,
        cursor: screen.style.backgroundImageAssetId ? "pointer" : "default",
        opacity: screen.style.backgroundImageAssetId ? 1 : 0.35,
      }}
    >
      <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
>
  <path
    d="M9 3h6m-9 4h12m-1 0-1 16H8L7 7"
    stroke="#ffffff"
    strokeWidth="2"
    strokeLinecap="round"
  />
  <path
    d="M10 11v8M14 11v8"
    stroke="#ffffff"
    strokeWidth="2"
    strokeLinecap="round"
  />
</svg>
    </button>
  </div>
</div>
        </div>

        <div style={{ marginTop: 25 }}>
          <Label>Fill</Label>
          <Dropdown
            value={screen.style.fill}
            onChange={(v) =>
              Actions.updateScreen(screen.id, {
                style: { ...screen.style, fill: v as any },
              })
            }
            options={[
              { value: "Fit", label: "Fit" },
              { value: "Fill", label: "Fill" },
              { value: "Stretch", label: "Stretch" },
            ]}
          />
        </div>
      </Collapse>
    </div>
  );
}



