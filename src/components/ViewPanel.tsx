import React from "react";
import { Actions } from "../store";
import { useStore } from "../hooks/useStore";
import { CanvasView } from "./CanvasView";

function IconScreen() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" rx="2" ry="2" fill="none" stroke="white" strokeWidth="2"/>
      <path d="M8 18v2h8v-2" fill="none" stroke="white" strokeWidth="2"/>
      <path d="M12 9v6" stroke="white" strokeWidth="2"/>
      <path d="M9 12h6" stroke="white" strokeWidth="2"/>
    </svg>
  );
}
function IconLabel() {
  return <div style={{fontSize:22,fontWeight:600,opacity:.9}}>A</div>;
}
function IconImage() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="2"/>
      <path d="M7 15l3-3 4 4 3-3 2 2" fill="none" stroke="white" strokeWidth="2"/>
      <circle cx="9" cy="10" r="1.5" fill="white"/>
    </svg>
  );
}
function IconArc() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 16a8 8 0 0 1 12 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 16a7 7 0 0 1 10 0" fill="none" stroke="white" strokeWidth="2" opacity=".6"/>
    </svg>
  );
}
function IconBar() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="4" rx="2" fill="none" stroke="white" strokeWidth="2"/>
      <rect x="5" y="10" width="8" height="4" rx="2" fill="white" opacity=".75"/>
    </svg>
  );
}

export function ViewPanel() {
  const screens = useStore(s => s.project.screens);
  const selectedScreenId = useStore(s => s.selectedScreenId);
  const screen = useStore(s => s.project.screens.find(x => x.id === s.selectedScreenId)!);
  const objectsCount = useStore(s => {
    const sc = s.project.screens.find(x => x.id === s.selectedScreenId);
    return sc ? sc.objects.length : 0;
  });

  return (
    <div className="view-panel">
      <div className="view-title">View</div>

      <div className="view-screen-wrap">
        <div className="screen-tag" />
        <div className="screen-tag-text">{screen.name}</div>
        <div className="screen-bg">
          <CanvasView />
        </div>
      </div>

      <div className="bottom-center">
        <div className="tool-btn" onClick={() => Actions.addScreen()} title="Add screen"><IconScreen/></div>
        <div className="tool-btn" onClick={() => Actions.addObject("Label")} title="Add label"><IconLabel/></div>
        <div className="tool-btn" onClick={() => Actions.addObject("Image")} title="Add image"><IconImage/></div>
        <div className="tool-btn" onClick={() => Actions.addObject("Arc")} title="Add arc"><IconArc/></div>
        <div className="tool-btn" onClick={() => Actions.addObject("Bar")} title="Add bar"><IconBar/></div>

        <div className="counter" aria-label="counter">
          <div className="k1">Screens:</div>
          <div className="v1">{Math.min( screens.findIndex(s=>s.id===selectedScreenId)+1, screens.length)}/{screens.length}</div>
          <div className="k2">Objects:</div>
          <div className="v2">{objectsCount}/10</div>
        </div>
      </div>
    </div>
  );
}
