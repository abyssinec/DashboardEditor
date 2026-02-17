import React from "react";
import { Actions } from "../store";
import { useStore } from "../hooks/useStore";
import { CanvasView } from "./CanvasView";

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconLabel() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 19V5h10v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconImage() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" />
      <path d="m7 14 2-2 3 3 2-2 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconArc() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 16a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 10h14v4H5v-4Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function ViewPanel() {
  const screens = useStore((s) => s.project.screens);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const screen = useStore((s) =>
    s.project.screens.find((x) => x.id === s.selectedScreenId)!
  );
  const objectsCount = useStore((s) => {
    const sc = s.project.screens.find((x) => x.id === s.selectedScreenId);
    return sc ? sc.objects.length : 0;
  });

  const screenIndex = Math.min(
    screens.findIndex((s) => s.id === selectedScreenId) + 1,
    screens.length
  );

  return (
    <div className="viewWrap">
      <div className="viewHeader">
        <div className="viewTitle">View</div>
        {/* ❌ Убрали дублирующее название Screen справа */}
      </div>

      <div className="canvasHost">
        <div className="canvasFrame">
          <div className="canvasOverlayTag">{screen.name}</div>
          <CanvasView />

          <div className="viewTools">
            <div className="toolBtn" onClick={() => Actions.addScreen()}>
              <IconPlus />
            </div>
            <div className="toolBtn" onClick={() => Actions.addObject("Label")}>
              <IconLabel />
            </div>
            <div className="toolBtn" onClick={() => Actions.addObject("Image")}>
              <IconImage />
            </div>
            <div className="toolBtn" onClick={() => Actions.addObject("Arc")}>
              <IconArc />
            </div>
            <div className="toolBtn" onClick={() => Actions.addObject("Bar")}>
              <IconBar />
            </div>

            <div className="counter">
              <div className="k1">Screens:</div>
              <div className="v1">
                {screenIndex}/{screens.length}
              </div>
              <div className="k2">Objects:</div>
              <div className="v2">{objectsCount}/10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
