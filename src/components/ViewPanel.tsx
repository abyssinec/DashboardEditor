import React from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

import { CanvasView } from "./CanvasView";
function IconPlus() {
  // выглядит как "выделение/рамка" (как на 2 скрине)
  return (
    <svg viewBox="0 0 24 24" fill="none">
      {/* рамка */}
      <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      {/* уголки/хэндлы */}
      <path d="M6 9V6h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 9V6h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 15v3h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 15v3h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLabel() {
  // буква "A" (как на 2 скрине)
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M7 19 12 5l5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 15h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconImage() {
  // картинка в "плашке" (как на 2 скрине)
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="m7 15 2-2 3 3 2-2 3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function IconArc() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M6 15a6 6 0 0 1 12 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBar() {
  // "тумблер" (как на 2 скрине)
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="9" width="14" height="6" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}


export function ViewPanel() {
  const screens = useStore((s) => s.project.screens);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const screen = useStore((s) => s.project.screens.find((x) => x.id === s.selectedScreenId)!);
  const objectsCount = useStore((s) => {
    const sc = s.project.screens.find((x) => x.id === s.selectedScreenId);
    return sc ? sc.objects.length : 0;
  });

  const screenIndex = Math.min(screens.findIndex((s) => s.id === selectedScreenId) + 1, screens.length);

  return (
    <div className="viewWrap">
      <div className="viewHeader">
        <div className="panelTitle insPanelTitle">View</div>
      </div>

      <div className="canvasHost">
        <div className="canvasFrame">
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


