import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj, Screen } from "../types";
import { ColorPicker } from "./ColorPicker";

function clampInt(v: any, fallback: number) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHex(v: string) {
  let s = (v || "").trim();
  if (!s) return "#000000";
  if (!s.startsWith("#")) s = "#" + s;
  s = "#" + s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 4) {
    const r = s[1], g = s[2], b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (s.length >= 7) return s.slice(0, 7).toUpperCase();
  return (s + "000000").slice(0, 7).toUpperCase();
}

function useSelectedScreen(): Screen {
  return useStore((s) => s.project.screens.find((x: Screen) => x.id === s.selectedScreenId)!);
}

function useSelectedObject(): AnyObj | undefined {
  return useStore((s) => {
    const sc = s.project.screens.find((x: Screen) => x.id === s.selectedScreenId)!;
    if (!s.selectedObjectId) return undefined;
    return sc.objects.find((o: AnyObj) => o.id === s.selectedObjectId);
  });
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

function NumberField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="insField" type="number" inputMode="numeric" {...props} />;
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="insField insSelect" {...props} />;
}

function Caret({ open }: { open: boolean }) {
  return (
    <span className={`insCaret ${open ? "open" : ""}`}>
      <svg viewBox="0 0 12 12" fill="none">
        <path d="M2.2 4.2 6 8 9.8 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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

export function Inspector() {
  const screen = useSelectedScreen();
  const obj = useSelectedObject();

  return (
    <>
      <div className="panelTitle insPanelTitle">Inspector</div>
      <div className="scrollArea inspector-scroll">
        {!obj ? <ScreenInspector screen={screen} /> : <div className="insRoot">TODO: next объектные инспекторы</div>}
      </div>
    </>
  );
}

function ScreenInspector({ screen }: { screen: Screen }) {
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

  // close picker on any click outside
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
      <TextField value={screen.name} onChange={(e) => Actions.updateScreen(screen.id, { name: e.target.value })} />

      <Collapse title="Settings" open={openSettings} onToggle={() => setOpenSettings((v) => !v)}>
        <Row2>
          <div>
            <Label>Width</Label>
            <NumberField
              value={screen.settings.width}
              step={1}
              min={1}
              onChange={(e) =>
                Actions.updateScreen(screen.id, {
                  settings: { ...screen.settings, width: clampInt(e.target.value, screen.settings.width) },
                })
              }
            />
          </div>
          <div>
            <Label>Height</Label>
            <NumberField
              value={screen.settings.height}
              step={1}
              min={1}
              onChange={(e) =>
                Actions.updateScreen(screen.id, {
                  settings: { ...screen.settings, height: clampInt(e.target.value, screen.settings.height) },
                })
              }
            />
          </div>
        </Row2>
      </Collapse>

      {/* Style теперь включает: Color/Alpha + Background Image + Fill */}
      <Collapse title="Style" open={openStyle} onToggle={() => setOpenStyle((v) => !v)}>
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
                  Actions.updateScreen(screen.id, { style: { ...screen.style, color: normalizeHex(e.target.value) } })
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
                      style: { ...screen.style, color: normalizeHex(nextHex), alpha: clampInt(nextAlpha, alpha) },
                    });
                  }}
                />
              </div>
            ) : null}
          </div>

          <div>
            <Label>Alpha</Label>
            <NumberField
              value={alpha}
              step={1}
              min={0}
              max={100}
              onChange={(e) =>
                Actions.updateScreen(screen.id, {
                  style: { ...screen.style, alpha: clampInt(e.target.value, alpha) },
                })
              }
            />
          </div>
        </Row2>

        <div style={{ marginTop: 12 }}>
          <Label>Background Image</Label>
          <div className="insBgRow">
            <button
              className="insBtn"
              type="button"
              onClick={() => Actions.openAssets("Images", { objectId: "", field: "screenBackground" })}
            >
              Select
            </button>
            <TextField value={bgAssetName} readOnly />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Fill</Label>
          <SelectField
            value={screen.style.fill}
            onChange={(e) =>
              Actions.updateScreen(screen.id, { style: { ...screen.style, fill: e.target.value as any } })
            }
          >
            <option value="Fit">Fit</option>
            <option value="Fill">Fill</option>
            <option value="Stretch">Stretch</option>
          </SelectField>
        </div>
      </Collapse>
    </div>
  );
}
