import React, { useEffect, useMemo, useRef, useState } from "react";

function PlayIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M9 7.7c0-1.28 1.39-2.06 2.48-1.38l8.34 5.3c1.02.65 1.02 2.12 0 2.77l-8.34 5.3C10.39 20.36 9 19.58 9 18.3V7.7z"
        fill="currentColor"
      />
    </svg>
  );
}

function StopIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2.2" fill="currentColor" />
    </svg>
  );
}

import { AssetsPanel } from "./components/AssetsPanel";
import { Inspector } from "./components/Inspector";
import { LeftPanel } from "./components/LeftPanel";
import { PlayModePage } from "./components/PlayModePage";
import { ViewPanel } from "./components/ViewPanel";
import { useStore } from "./hooks/useStore";
import { Actions, getState, redo, undo } from "./store";
import { exportDashboard, importDashboard } from "./utils/dashboardFormat";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

export default function App() {
  const project = useStore((s) => s.project);
  const assetBytes = useStore((s) => s.assetBytes);
  const assetsOpen = useStore((s) => s.assetsPanel.isOpen);
  const playEnabled = useStore((s) => s.playMode.enabled);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const projectName = project.project.name || "ProjectName";

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingName) setNameDraft(projectName);
  }, [projectName, editingName]);

  useEffect(() => {
    if (editingName) {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      });
    }
  }, [editingName]);

  // ✅ HOTKEYS
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // не перехватываем когда печатаем
      if (isTypingTarget(e.target)) return;

      // In play mode: keep it minimal
      const ps = getState().playMode?.enabled;
      if (ps) {
        const key = (e.key || "").toLowerCase();
        if (key === "escape") {
          e.preventDefault();
          Actions.setPlayModeEnabled(false);
          Actions.clearPlayOverrides();
        }
        return;
      }

      const key = (e.key || "").toLowerCase();
      const mod = e.ctrlKey || e.metaKey; // Ctrl / Cmd

      // Esc -> clear selection
      if (key === "escape") {
        e.preventDefault();
        Actions.clearSelection();
        return;
      }

      // Delete / Backspace -> delete selected objects, else delete screen (if > 1)
      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        const s = getState();
        const hasObj = (s.selectedObjectIds?.length ?? 0) > 0 || !!s.selectedObjectId;
        if (hasObj) Actions.deleteSelectedObjects();
        else if (s.project.screens.length > 1) Actions.deleteScreen(s.selectedScreenId);
        return;
      }

      if (!mod || e.altKey) return;

      // Ctrl/Cmd + A -> select all objects
      if (key === "a") {
        e.preventDefault();
        Actions.selectAllObjects();
        return;
      }

      // Undo / Redo
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Ctrl/Cmd + Y -> redo
      if (key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Copy / Paste / Duplicate
      if (key === "c") {
        e.preventDefault();
        Actions.copySelected();
        return;
      }

      if (key === "v") {
        e.preventDefault();
        Actions.paste();
        return;
      }

      if (key === "d") {
        e.preventDefault();
        Actions.duplicateSelected();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const safeFileName = useMemo(() => {
    const base = (projectName || "project").trim();
    const cleaned = base.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
    return cleaned || "project";
  }, [projectName]);

  async function onExport() {
    const blob = await exportDashboard(project, "0.0.1", assetBytes);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeFileName}.dashboard`;
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

  function commitProjectName(nextRaw: string) {
    const next = (nextRaw || "").trim();
    if (!next) {
      setNameDraft(projectName);
      setEditingName(false);
      return;
    }
    Actions.setProjectName(next);
    setEditingName(false);
  }

  function cancelEdit() {
    setNameDraft(projectName);
    setEditingName(false);
  }

  return (
    <div className="appRoot">
      {/* TOP BAR */}
      <div
        className="topBar"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 30,
        }}
      >
        {/* LEFT */}
        <div className="brand" style={{ display: "flex", flexDirection: "column" }}>
          <div className="title">DashboardEditor</div>
          <div className="version">v1.0.5</div>
        </div>

        {/* CENTER */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            minWidth: 0,
          }}
        >
          {!editingName ? (
            <div
              className="projectName"
              onClick={() => setEditingName(true)}
              onDoubleClick={() => setEditingName(true)}
              style={{
                cursor: "text",
                fontSize: 18,
                fontWeight: 600,
                whiteSpace: "nowrap",
                maxWidth: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title="Click to rename"
            >
              {projectName}
            </div>
          ) : (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => commitProjectName(nameDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitProjectName(nameDraft);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              style={{
                width: 360,
                maxWidth: "40vw",
                textAlign: "center",
                background: "rgba(255,255,255,0.06)",
                border: "0px solid rgba(255,255,255,0.12)",
                color: "white",
                borderRadius: 10,
                padding: "6px 12px",
                outline: "none",
                fontSize: 18,
                fontWeight: 600,
              }}
            />
          )}
        </div>

        {/* RIGHT */}
        <div className="topActions" style={{ display: "flex", gap: 16 }}>
          <div className="topBtn" onClick={onNew}>
            New
          </div>
          <div className="topBtn" onClick={onImportClick}>
            Import
          </div>
          <div className="topBtn" onClick={() => void onExport()}>
            Export
          </div>
          <div 
            className="topBtn"
            onClick={() => {
              Actions.setPlayModeEnabled(!playEnabled);
              if (playEnabled) Actions.clearPlayOverrides();
            }}
            style={{ opacity: playEnabled ? 1 : 0.92 }}
          >
            {playEnabled ? <span style={{ color: "var(--insGreen)" }}><StopIcon /></span> : <span style={{ color: "var(--insGreen)" }}><PlayIcon /></span>}
          </div>
        </div>
      </div>

      {/* MAIN */}
      {!playEnabled ? (
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
      ) : (
        <PlayModePage />
      )}

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
