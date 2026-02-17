import React from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";
import { PID_CATALOG } from "../pids";

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 10 7">
      <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-row">
      <div className="field-label">{label}</div>
      <div className="field-box">
        {children}
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cell">
      <div className="field-label">{label}</div>
      <div className="field-box">{children}</div>
    </div>
  );
}

function SelectLike({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <>
      <select className="field-input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <Chevron />
    </>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input className="field-input" value={String(value)} onChange={e => onChange(Number(e.target.value) || 0)} />
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input className="field-input" value={value} onChange={e => onChange(e.target.value)} />
  );
}

function SelectButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="select-btn" onClick={(e)=>{e.preventDefault();onClick();}}>Select</button>
  );
}

export function Inspector() {
  const screen = useStore(s => s.project.screens.find(x => x.id === s.selectedScreenId)!);
  const selectedObjectId = useStore(s => s.selectedObjectId);
  const obj = useStore(s => {
    const sc = s.project.screens.find(x => x.id === s.selectedScreenId)!;
    return sc.objects.find(o => o.id === s.selectedObjectId);
  });

  const pillText = obj ? obj.type : "Screen";

  const pidOptions = ["None", ...Object.keys(PID_CATALOG)];

  return (
    <div className="right-panel">
      <div className="right-bg" />
      <div className="inspector-title">Inspector</div>

      <div className="type-pill">
        <div className="pill" />
        <div className="pill-text">{pillText}</div>
      </div>

      <div className="inspector-frame">
        <div className="inspector-scroll">
          <div className="insp">

            {/* Name */}
            <div className="section">
              <Field label="Name">
                <TextInput
                  value={obj ? obj.name : screen.name}
                  onChange={v => {
                    if (obj) Actions.updateObject(obj.id, { name: v });
                    else Actions.updateScreen(screen.id, { name: v });
                  }}
                />
              </Field>
            </div>

            {/* Transform / Screen Settings */}
            {!obj ? (
              <>
                <div className="section">
                  <div className="section-title">Settings</div>
                  <div className="grid2">
                    <Cell label="Width">
                      <NumberInput value={screen.settings.width} onChange={v => Actions.updateScreen(screen.id, { settings: { ...screen.settings, width: v } })} />
                    </Cell>
                    <Cell label="Height">
                      <NumberInput value={screen.settings.height} onChange={v => Actions.updateScreen(screen.id, { settings: { ...screen.settings, height: v } })} />
                    </Cell>
                  </div>
                </div>

                <div className="section">
                  <div className="section-title">Style</div>

                  <div className="grid2">
                    <Cell label="Color">
                      <TextInput value={screen.style.color} onChange={v => Actions.updateScreen(screen.id, { style: { ...screen.style, color: v } })} />
                    </Cell>
                    <Cell label="Alpha">
                      <NumberInput value={screen.style.alpha} onChange={v => Actions.updateScreen(screen.id, { style: { ...screen.style, alpha: v } })} />
                    </Cell>
                  </div>

                  <Field label="Background">
                    <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                      <div style={{flex:1}}>
                        <input className="field-input" value={screen.style.backgroundImageAssetId ? "bg.png" : "None"} readOnly />
                      </div>
                      <SelectButton onClick={() => Actions.openAssets("Images", { field: "screenBackground" })} />
                      <Chevron />
                    </div>
                  </Field>

                  <Field label="Fill">
                    <SelectLike value={screen.style.fill} onChange={v => Actions.updateScreen(screen.id, { style: { ...screen.style, fill: v as any } })} options={["Fit"]} />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="section">
                  <div className="section-title">Transform</div>

                  {obj.type === "Label" && (
                    <div className="grid2">
                      <Cell label="X"><NumberInput value={obj.transform.x} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","x"], v)} /></Cell>
                      <Cell label="Y"><NumberInput value={obj.transform.y} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","y"], v)} /></Cell>
                    </div>
                  )}

                  {obj.type === "Image" && (
                    <>
                      <div className="grid2">
                        <Cell label="X"><NumberInput value={obj.transform.x} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","x"], v)} /></Cell>
                        <Cell label="Y"><NumberInput value={obj.transform.y} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","y"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Rotation"><NumberInput value={obj.transform.rotation} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","rotation"], v)} /></Cell>
                        <Cell label="Scale">
                          <div style={{display:"flex",gap:6,width:"100%"}}>
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.scaleX)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","scaleX"], Number(e.target.value)||0)} />
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.scaleY)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","scaleY"], Number(e.target.value)||0)} />
                          </div>
                        </Cell>
                      </div>
                    </>
                  )}

                  {obj.type === "Arc" && (
                    <>
                      <div className="grid2">
                        <Cell label="X"><NumberInput value={obj.transform.x} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","x"], v)} /></Cell>
                        <Cell label="Y"><NumberInput value={obj.transform.y} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","y"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Rotation"><NumberInput value={obj.transform.rotation} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","rotation"], v)} /></Cell>
                        <Cell label="Angles">
                          <div style={{display:"flex",gap:6,width:"100%"}}>
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.startAngle)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","startAngle"], Number(e.target.value)||0)} />
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.endAngle)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","endAngle"], Number(e.target.value)||0)} />
                          </div>
                        </Cell>
                      </div>
                    </>
                  )}

                  {obj.type === "Bar" && (
                    <>
                      <div className="grid2">
                        <Cell label="X"><NumberInput value={obj.transform.x} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","x"], v)} /></Cell>
                        <Cell label="Y"><NumberInput value={obj.transform.y} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","y"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Rotation"><NumberInput value={obj.transform.rotation} onChange={v => Actions.updateObjectDeep(obj.id, ["transform","rotation"], v)} /></Cell>
                        <Cell label="Size">
                          <div style={{display:"flex",gap:6,width:"100%"}}>
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.width)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","width"], Number(e.target.value)||0)} />
                            <input className="field-input" style={{width:"50%"}} value={String(obj.transform.height)} onChange={e => Actions.updateObjectDeep(obj.id, ["transform","height"], Number(e.target.value)||0)} />
                          </div>
                        </Cell>
                      </div>
                    </>
                  )}
                </div>

                <div className="section">
                  <div className="section-title">Settings</div>

                  {obj.type === "Label" && (
                    <>
                      <Field label="Text">
                        <TextInput value={obj.settings.text} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","text"], v)} />
                      </Field>
                      <Field label="Font">
                        <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                          <div style={{flex:1}}>
                            <input className="field-input" value={obj.settings.fontAssetId ? "Roboto.ttf" : "None"} readOnly />
                          </div>
                          <SelectButton onClick={() => Actions.openAssets("Fonts", { objectId: obj.id, field: "fontAssetId" })} />
                          <Chevron />
                        </div>
                      </Field>
                      <div className="grid2">
                        <Cell label="Size"><NumberInput value={obj.settings.fontSize} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","fontSize"], v)} /></Cell>
                        <Cell label="Autosize"><SelectLike value={obj.settings.autoSize} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","autoSize"], v)} options={["No"]} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Bold"><SelectLike value={obj.settings.bold} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","bold"], v)} options={["No"]} /></Cell>
                        <Cell label="Italic"><SelectLike value={obj.settings.italic} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","italic"], v)} options={["No"]} /></Cell>
                      </div>
                      <Field label="Align"><SelectLike value={obj.settings.align} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","align"], v)} options={["Left"]} /></Field>
                      <Field label="Wrap"><SelectLike value={obj.settings.wrap} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","wrap"], v)} options={["No wrap"]} /></Field>
                    </>
                  )}

                  {obj.type === "Image" && (
                    <>
                      <Field label="Image">
                        <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                          <div style={{flex:1}}>
                            <input className="field-input" value={obj.settings.imageAssetId ? "image.png" : "None"} readOnly />
                          </div>
                          <SelectButton onClick={() => Actions.openAssets("Images", { objectId: obj.id, field: "imageAssetId" })} />
                          <Chevron />
                        </div>
                      </Field>
                      <div className="grid2">
                        <Cell label="Keep aspect"><SelectLike value={obj.settings.keepAspect} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","keepAspect"], v)} options={["Yes"]} /></Cell>
                        <Cell label="Fill"><SelectLike value={obj.settings.fillMode} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","fillMode"], v)} options={["Fill"]} /></Cell>
                      </div>
                      <Field label="Flip"><SelectLike value={obj.settings.flip} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","flip"], v)} options={["None"]} /></Field>
                    </>
                  )}

                  {obj.type === "Arc" && (
                    <>
                      <div className="grid2">
                        <Cell label="Segments"><NumberInput value={obj.settings.segments} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","segments"], v)} /></Cell>
                        <Cell label="Clockwise"><SelectLike value={obj.settings.clockwise} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","clockwise"], v)} options={["Yes"]} /></Cell>
                      </div>
                      <Field label="Preview"><NumberInput value={obj.settings.previewValue} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","previewValue"], v)} /></Field>
                    </>
                  )}

                  {obj.type === "Bar" && (
                    <Field label="Preview"><NumberInput value={obj.settings.previewValue} onChange={v => Actions.updateObjectDeep(obj.id, ["settings","previewValue"], v)} /></Field>
                  )}
                </div>

                <div className="section">
                  <div className="section-title">Style</div>

                  {obj.type === "Label" && (
                    <>
                      <div className="grid2">
                        <Cell label="Color"><TextInput value={obj.style.color} onChange={v => Actions.updateObjectDeep(obj.id, ["style","color"], v)} /></Cell>
                        <Cell label="Alpha"><NumberInput value={obj.style.alpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","alpha"], v)} /></Cell>
                      </div>
                      <Field label="Glow"><NumberInput value={obj.style.glow} onChange={v => Actions.updateObjectDeep(obj.id, ["style","glow"], v)} /></Field>
                      <div className="grid2">
                        <Cell label="Shadow color"><TextInput value={obj.style.shadowColor} onChange={v => Actions.updateObjectDeep(obj.id, ["style","shadowColor"], v)} /></Cell>
                        <Cell label="Shadow blur"><NumberInput value={obj.style.shadowBlur} onChange={v => Actions.updateObjectDeep(obj.id, ["style","shadowBlur"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Shadow X"><NumberInput value={obj.style.shadowOffsetX} onChange={v => Actions.updateObjectDeep(obj.id, ["style","shadowOffsetX"], v)} /></Cell>
                        <Cell label="Shadow Y"><NumberInput value={obj.style.shadowOffsetY} onChange={v => Actions.updateObjectDeep(obj.id, ["style","shadowOffsetY"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Outline color"><TextInput value={obj.style.outlineColor} onChange={v => Actions.updateObjectDeep(obj.id, ["style","outlineColor"], v)} /></Cell>
                        <Cell label="Outline"><NumberInput value={obj.style.outlineThickness} onChange={v => Actions.updateObjectDeep(obj.id, ["style","outlineThickness"], v)} /></Cell>
                      </div>
                    </>
                  )}

                  {obj.type === "Image" && (
                    <Field label="Alpha"><NumberInput value={obj.style.alpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","alpha"], v)} /></Field>
                  )}

                  {obj.type === "Arc" && (
                    <>
                      <div className="grid2">
                        <Cell label="Color"><TextInput value={obj.style.color} onChange={v => Actions.updateObjectDeep(obj.id, ["style","color"], v)} /></Cell>
                        <Cell label="Alpha"><NumberInput value={obj.style.alpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","alpha"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Glow"><NumberInput value={obj.style.glow} onChange={v => Actions.updateObjectDeep(obj.id, ["style","glow"], v)} /></Cell>
                        <Cell label="Thickness"><NumberInput value={obj.style.thickness} onChange={v => Actions.updateObjectDeep(obj.id, ["style","thickness"], v)} /></Cell>
                      </div>
                      <Field label="Cap"><SelectLike value={obj.style.capStyle} onChange={v => Actions.updateObjectDeep(obj.id, ["style","capStyle"], v)} options={["Flat"]} /></Field>

                      <div className="grid2">
                        <Cell label="Bg color"><TextInput value={obj.style.backgroundColor} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundColor"], v)} /></Cell>
                        <Cell label="Bg alpha"><NumberInput value={obj.style.backgroundAlpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundAlpha"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Bg glow"><NumberInput value={obj.style.backgroundGlow} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundGlow"], v)} /></Cell>
                        <Cell label="Bg thick"><NumberInput value={obj.style.backgroundThickness} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundThickness"], v)} /></Cell>
                      </div>
                      <Field label="Bg cap"><SelectLike value={obj.style.backgroundCapStyle} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundCapStyle"], v)} options={["Flat"]} /></Field>
                    </>
                  )}

                  {obj.type === "Bar" && (
                    <>
                      <div className="grid2">
                        <Cell label="Color"><TextInput value={obj.style.color} onChange={v => Actions.updateObjectDeep(obj.id, ["style","color"], v)} /></Cell>
                        <Cell label="Alpha"><NumberInput value={obj.style.alpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","alpha"], v)} /></Cell>
                      </div>
                      <Field label="Glow"><NumberInput value={obj.style.glow} onChange={v => Actions.updateObjectDeep(obj.id, ["style","glow"], v)} /></Field>
                      <div className="grid2">
                        <Cell label="Bg color"><TextInput value={obj.style.backgroundColor} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundColor"], v)} /></Cell>
                        <Cell label="Bg alpha"><NumberInput value={obj.style.backgroundAlpha} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundAlpha"], v)} /></Cell>
                      </div>
                      <div className="grid2">
                        <Cell label="Bg glow"><NumberInput value={obj.style.backgroundGlow} onChange={v => Actions.updateObjectDeep(obj.id, ["style","backgroundGlow"], v)} /></Cell>
                        <Cell label="Radius"><NumberInput value={obj.style.radius} onChange={v => Actions.updateObjectDeep(obj.id, ["style","radius"], v)} /></Cell>
                      </div>
                      <Field label="Cap"><SelectLike value={obj.style.capStyle} onChange={v => Actions.updateObjectDeep(obj.id, ["style","capStyle"], v)} options={["Flat"]} /></Field>
                    </>
                  )}
                </div>

                <div className="section">
                  <div className="section-title">Gauge settings</div>

                  <Field label="Gauge Type">
                    <SelectLike
                      value={obj.gauge.gaugeType === "None" ? "None" : obj.gauge.gaugeType}
                      onChange={v => Actions.updateObjectDeep(obj.id, ["gauge","gaugeType"], v)}
                      options={pidOptions}
                    />
                  </Field>

                  <div className="grid2">
                    <Cell label="Update rate"><NumberInput value={obj.gauge.updateRateMs} onChange={v => Actions.updateObjectDeep(obj.id, ["gauge","updateRateMs"], v)} /></Cell>
                    <Cell label="Smoothing"><NumberInput value={obj.gauge.smoothingFactor} onChange={v => Actions.updateObjectDeep(obj.id, ["gauge","smoothingFactor"], v)} /></Cell>
                  </div>
                </div>

              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
