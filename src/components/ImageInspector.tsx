import React, { useMemo, useState } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";
import { Dropdown } from "./Dropdown";
import { DraftNumberInput } from "./DraftNumberInput";
import { PID_CATALOG } from "../pids";
import { clamp, clampInt } from "../utils/inspector";

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

export function ImageInspector({ obj }: { obj: AnyObj }) {
  const images = useStore((s) => (s.project as any).assets?.images ?? []);

  const imageObj: any = obj as any;
  const assetId: string | undefined = imageObj?.settings?.imageAssetId;

  const assetName = useMemo(() => {
    if (!assetId) return "None";
    const a = (images as any[]).find((x) => x.id === assetId);
    return a?.name ?? "None";
  }, [images, assetId]);

  const [openTransform, setOpenTransform] = useState(true);
  const [openSettings, setOpenSettings] = useState(true);
  const [openStyle, setOpenStyle] = useState(true);
  const [openAnimation, setOpenAnimation] = useState(true);
  const [openGauge, setOpenGauge] = useState(true);

  const x = imageObj?.transform?.x ?? 0;
  const y = imageObj?.transform?.y ?? 0;
  const rotation = imageObj?.transform?.rotation ?? 0;

  // width/height (fallback from legacy scale)
  const width = imageObj?.transform?.width ?? Math.round(220 * (imageObj?.transform?.scaleX ?? 1));
  const height = imageObj?.transform?.height ?? Math.round(140 * (imageObj?.transform?.scaleY ?? 1));

  const alpha = clampInt(imageObj?.style?.alpha, 100);

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


  const animationTypeOptions = useMemo(
    () => [
      { value: "None", label: "None" },
      { value: "Rotation", label: "Rotation" },
      { value: "Move", label: "Move" },
      { value: "Rotation+Move", label: "Rotation + Move" },
    ],
    [],
  );

  const keepAspectValue = (imageObj?.settings?.keepAspect ?? "Yes") as "Yes" | "No";
  const fillModeValue = (imageObj?.settings?.fillMode ?? "Fill") as "Fit" | "Fill" | "Stretch";

  return (
    <div className="insRoot">
      <div className="insTypeBar">Image</div>

      <Label>Name</Label>
      <TextField value={imageObj?.name ?? "Image"} onChange={(e) => Actions.updateObject(obj.id, { name: e.target.value })} />

      <Collapse title="Transform" open={openTransform} onToggle={() => setOpenTransform((v) => !v)}>
        <Row2>
          <div>
            <Label>Position X</Label>
            <SpinNumber value={x} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "x"], v)} />
          </div>
          <div>
            <Label>Position Y</Label>
            <SpinNumber value={y} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "y"], v)} />
          </div>
        </Row2>

        <div style={{ marginTop: 25 }}>
          <Label>Rotation</Label>
          <SpinNumber value={rotation} onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "rotation"], v)} />
        </div>

        <div style={{ marginTop: 25 }}>
          <Row2>
            <div>
              <Label>Width</Label>
              <SpinNumber
                value={width}
                min={MIN_OBJ_W}
                max={20000}
                step={1}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "width"], v)}
              />
            </div>
            <div>
              <Label>Height</Label>
              <SpinNumber
                value={height}
                min={MIN_OBJ_H}
                max={20000}
                step={1}
                onChange={(v) => Actions.updateObjectDeep(obj.id, ["transform", "height"], v)}
              />
            </div>
          </Row2>
        </div>
      </Collapse>

      <Collapse title="Settings" open={openSettings} onToggle={() => setOpenSettings((v) => !v)}>
        <Label>Image Asset</Label>

        <div className="insBgRow">
          <button className="insBtn" type="button" onClick={() => Actions.openAssets("Images", { objectId: obj.id, field: "imageAssetId" })}>
            Select
          </button>

          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <TextField value={assetName} readOnly />

            <button
              type="button"
              aria-label="Clear image"
              disabled={!assetId}
              onClick={() => Actions.updateObjectDeep(obj.id, ["settings", "imageAssetId"], undefined)}
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
                cursor: assetId ? "pointer" : "default",
                opacity: assetId ? 1 : 0.35,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 3h6m-9 4h12m-1 0-1 16H8L7 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 11v8M14 11v8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 25 }}>
          <Label>Keep Aspect</Label>
          <Dropdown
            value={keepAspectValue}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "keepAspect"], v as any)}
            options={[
              { value: "Yes", label: "Yes" },
              { value: "No", label: "No" },
            ]}
          />
        </div>

        <div style={{ marginTop: 25 }}>
          <Label>Fill Mode</Label>
          <Dropdown
            value={fillModeValue}
            onChange={(v) => Actions.updateObjectDeep(obj.id, ["settings", "fillMode"], v as any)}
            options={[
              { value: "Fit", label: "Fit" },
              { value: "Fill", label: "Fill" },
              { value: "Stretch", label: "Stretch" },
            ]}
          />
        </div>
      </Collapse>

      <Collapse title="Style" open={openStyle} onToggle={() => setOpenStyle((v) => !v)}>
        <Label>Alpha</Label>
        <SpinNumber value={alpha} min={0} max={100} step={1} onChange={(v) => Actions.updateObjectDeep(obj.id, ["style", "alpha"], v)} />
      </Collapse><Collapse title="Gauge settings" open={openGauge} onToggle={() => setOpenGauge((v) => !v)}>
        <div style={{ marginTop: 2 }}>
          <Label>Data type</Label>
          <Dropdown
            value={obj.gauge.dataType || "None"}
            options={dataTypeOptions as any}
            onChange={(v) => {
              Actions.updateObjectDeep(obj.id, ["gauge", "dataType"], v);
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

        <div style={{ marginTop: 14 }}>
          <Row2>
            <div>
              <Label>Range min (optional)</Label>
              <TextField
                value={obj.gauge.rangeMin ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number(raw);
                  Actions.updateObjectDeep(obj.id, ["gauge", "rangeMin"], raw.trim() === "" || !isFinite(n) ? undefined : n);
                }}
              />
            </div>
            <div>
              <Label>Range max (optional)</Label>
              <TextField
                value={obj.gauge.rangeMax ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number(raw);
                  Actions.updateObjectDeep(obj.id, ["gauge", "rangeMax"], raw.trim() === "" || !isFinite(n) ? undefined : n);
                }}
              />
            </div>
          </Row2>
        </div>

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
    

      
      <Collapse title="Animation settings" open={openAnimation} onToggle={() => setOpenAnimation((v) => !v)}>
        <div style={{ marginTop: 2 }}>
          <Label>Animation type</Label>
          <Dropdown
            value={(obj.settings as any).animation?.type || "None"}
            options={animationTypeOptions as any}
            onChange={(v) => {
              // ensure animation object exists
              if (!(obj.settings as any).animation || typeof (obj.settings as any).animation !== "object") {
                Actions.updateObjectDeep(obj.id, ["settings", "animation"], { type: "None" });
              }
              Actions.updateObjectDeep(obj.id, ["settings", "animation", "type"], v);

              // defaults: start pos/rot use current transform so user doesn't need to retype
              const needsMove = v === "Move" || v === "Rotation+Move";
              const needsRot = v === "Rotation" || v === "Rotation+Move";

              const anim = (obj.settings as any).animation || ({ type: "None" } as any);

              if (needsMove) {
                if (anim.startX === undefined) Actions.updateObjectDeep(obj.id, ["settings", "animation", "startX"], obj.transform.x);
                if (anim.startY === undefined) Actions.updateObjectDeep(obj.id, ["settings", "animation", "startY"], obj.transform.y);
              }
              if (needsRot) {
                if (anim.startRot === undefined)
                  Actions.updateObjectDeep(obj.id, ["settings", "animation", "startRot"], obj.transform.rotation || 0);
              }
            }}
          />
        </div>

        {((obj.settings as any).animation?.type === "Rotation" || (obj.settings as any).animation?.type === "Rotation+Move") && (
          <div style={{ marginTop: 14 }}>
            <Row2>
              <div>
                <Label>Start rotation</Label>
                <TextField
                  value={String((obj.settings as any).animation?.startRot ?? 0)}
                  onChange={(e) =>
                    Actions.updateObjectDeep(obj.id, ["settings", "animation", "startRot"], Number(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label>End rotation</Label>
                <TextField
                  value={String((obj.settings as any).animation?.endRot ?? 0)}
                  onChange={(e) =>
                    Actions.updateObjectDeep(obj.id, ["settings", "animation", "endRot"], Number(e.target.value) || 0)
                  }
                />
              </div>
            </Row2>
          </div>
        )}

        {((obj.settings as any).animation?.type === "Move" || (obj.settings as any).animation?.type === "Rotation+Move") && (
          <div style={{ marginTop: 14 }}>
            <Label style={{ marginBottom: 6 }}>Move (X/Y)</Label>
            <Row2>
              <div>
                <Label>Start X</Label>
                <TextField
                  value={String((obj.settings as any).animation?.startX ?? obj.transform.x)}
                  onChange={(e) =>
                    Actions.updateObjectDeep(obj.id, ["settings", "animation", "startX"], Number(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label>Start Y</Label>
                <TextField
                  value={String((obj.settings as any).animation?.startY ?? obj.transform.y)}
                  onChange={(e) =>
                    Actions.updateObjectDeep(obj.id, ["settings", "animation", "startY"], Number(e.target.value) || 0)
                  }
                />
              </div>
            </Row2>

            <div style={{ marginTop: 10 }}>
              <Row2>
                <div>
                  <Label>End X</Label>
                  <TextField
                    value={String((obj.settings as any).animation?.endX ?? obj.transform.x)}
                    onChange={(e) =>
                      Actions.updateObjectDeep(obj.id, ["settings", "animation", "endX"], Number(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label>End Y</Label>
                  <TextField
                    value={String((obj.settings as any).animation?.endY ?? obj.transform.y)}
                    onChange={(e) =>
                      Actions.updateObjectDeep(obj.id, ["settings", "animation", "endY"], Number(e.target.value) || 0)
                    }
                  />
                </div>
              </Row2>
            </div>
          </div>
        )}
      </Collapse>

</div>
  );
}