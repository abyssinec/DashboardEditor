import React from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

import { CanvasView } from "./CanvasView";
function IconPlus() {

  return (
   <svg viewBox="0 0 24 24" fill="none">
   <path d="M10 7.5
           C9 6.7 7.8 6.5 6.8 6.8
           C5.6 7.1 5 7.8 5 8.6
           C5 9.5 5.8 10 7.4 10.3
           C9.2 10.6 10 11.2 10 12.2
           C10 13.3 9 14.2 7.5 14.5
           C6.5 14.7 5.3 14.5 4.5 13.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"/>
  <path d="M12.5 10.5
           C12.5 9.3 13.4 8.5 14.8 8.5
           C15.8 8.5 16.6 9 17 9.8
           M17 13.2
           C16.6 14 15.8 14.5 14.8 14.5
           C13.4 14.5 12.5 13.7 12.5 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"/>
  <path d="M19 14.5 V8.5
           M19 11.2
           C19 9.6 20 8.5 21.5 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"/>
</svg>
  );
}

function IconLabel() {
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

function IconFrame() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
      </div>

      <div className="canvasHost">
        <div className="canvasFrame">
          <div className="canvasTitleOverlay">View</div>

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

            <div className="toolBtn" onClick={() => Actions.addObject("Frame")}> 
              <IconFrame />
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


