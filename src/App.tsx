import React, { useEffect, useRef } from "react";

import { AssetsPanel } from "./components/AssetsPanel";
import { Inspector } from "./components/Inspector";
import { LeftPanel } from "./components/LeftPanel";
import { ViewPanel } from "./components/ViewPanel";
import { useStore } from "./hooks/useStore";
import { Actions, redo, undo } from "./store";
import { exportDashboard, importDashboard } from "./utils/dashboardFormat";

export default function App() {
  const project = useStore((s) => s.project);
  const assetBytes = useStore((s) => s.assetBytes);
  const assetsOpen = useStore((s) => s.assetsPanel.isOpen);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      // Don't hijack undo/redo while user is typing in inputs.
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();

      // Undo / Redo
      if (e.ctrlKey && !e.altKey && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Common redo shortcut
      if (e.ctrlKey && !e.altKey && key === "y") {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown as any);
  }, []);

  async function onExport() {
    const blob = await exportDashboard(project, "0.0.1", assetBytes);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.project.name.replace(/\s+/g, "_") || "project"}.dashboard`;
    a.click();
  }

  async function onImportFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imported = await importDashboard(bytes);
    Actions.hydrate(imported.project as any, imported.assetBytes);
  }

  function onImportClick() {
    fileRef.current?.click();
  }

  function onNew() {
    window.location.reload();
  }

  return (
    <div className="appRoot">
      {/* Top */}
      <div className="topBar">
        <div className="brand">
          <div className="title">DashboardEditor</div>
          <div className="version">v0.0.1</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <div className="topActions">
            <div className="topBtn" onClick={onNew}>
              New
            </div>
            <div className="topBtn" onClick={onImportClick}>
              Import
            </div>
            <div className="topBtn" onClick={() => void onExport()}>
              Export
            </div>
          </div>

          <div className="projectName">{project.project.name}</div>
        </div>

        {/* <div className="account">Account</div> */}
      </div>

      {/* Main */}
      <div className="mainGrid">
        <div className="panel">
          <div className="panelInner">
            <LeftPanel />
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <ViewPanel />
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">{assetsOpen ? <AssetsPanel /> : <Inspector />}</div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        accept=".dashboard"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}