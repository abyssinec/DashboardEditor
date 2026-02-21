import React from "react";

import { useStore } from "../hooks/useStore";
import type { AnyObj, Screen } from "../types";

import { LabelInspector } from "./LabelInspector";
import { ScreenInspector } from "./ScreenInspector";
import { ImageInspector } from "./ImageInspector";

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

export function Inspector() {
  const screen = useSelectedScreen();
  const obj = useSelectedObject();

  return (
    <>
      <div className="panelTitle insPanelTitle">Inspector</div>
      <div className="scrollArea inspector-scroll">
        {!obj ? (
          <ScreenInspector screen={screen} />
        ) : obj.type === "Label" ? (
          <LabelInspector obj={obj} />
        ) : obj.type === "Image" ? (
          <ImageInspector obj={obj} />
        ) : (
          <div className="insRoot">TODO: next объектные инспекторы</div>
        )}
      </div>
    </>
  );
}