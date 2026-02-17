import React, { useRef } from "react";
import { useStore } from "./hooks/useStore";
import { Actions } from "./store";
import { exportDashboard, importDashboard } from "./utils/dashboardFormat";
import { LeftPanel } from "./components/LeftPanel";
import { Inspector } from "./components/Inspector";
import { AssetsPanel } from "./components/AssetsPanel";
import { ViewPanel } from "./components/ViewPanel";

export default function App() {
  const project = useStore(s => s.project);
  const assetsOpen = useStore(s => s.assetsPanel.isOpen);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onExport() {
    const blob = await exportDashboard(project, "0.0.1");
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
    // Hard reset by reloading.
    window.location.reload();
  }

  return (
    <div className="main">
      <div className="title">DashboardEditor</div>
      <div className="version">v0.0.1</div>

      <div className="top-buttons">
        <div className="top-button" onClick={onNew}>New</div>
        <div className="top-button" onClick={onImportClick}>Import</div>
        <div className="top-button" onClick={onExport}>Export</div>
      </div>

      <div className="project-name">{project.project.name}</div>
      <div className="account">Account</div>

      <LeftPanel />
      <ViewPanel />

      {assetsOpen ? <AssetsPanel /> : <Inspector />}

      <input
        ref={fileRef}
        type="file"
        accept=".dashboard"
        style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
