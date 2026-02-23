import React, { useEffect, useMemo, useRef, useState } from "react";

import { AssetsPanel } from "./components/AssetsPanel";
import { Inspector } from "./components/Inspector";
import { LeftPanel } from "./components/LeftPanel";
import { ViewPanel } from "./components/ViewPanel";
import { useStore } from "./hooks/useStore";
import { Actions, redo, undo, getState} from "./store";
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

  // ✅ HOTKEYS (Ctrl/Cmd + Z/Shift+Z/C/V/D)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // если фокус в input/textarea/contentEditable — не перехватываем
      if (isTypingTarget(e.target)) return;

      const key = (e.key || "").toLowerCase();

      // Delete / Backspace
if (key === "delete" || key === "backspace") {
  e.preventDefault();

  const s = getState();
  if (s.selectedObjectId) {
    Actions.deleteObject(s.selectedObjectId);
  } else {
    // удаляем screen только если их > 1
    if (s.project.screens.length > 1) Actions.deleteScreen(s.selectedScreenId);
  }
  return;
}
      const mod = e.ctrlKey || e.metaKey; // Windows/Linux: Ctrl, macOS: Cmd

      if (!mod || e.altKey) return;

      // Undo / Redo
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Ctrl+Y / Cmd+Y -> redo (на всякий)
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

    // capture=true — надёжнее (перехватывает раньше, чем какие-то внутренние обработчики)
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
    // если у тебя пока нет Actions.setProjectName — скажи, я добавлю в store.ts
    Actions.setProjectName?.(next);
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
          <div className="version">v0.0.1</div>
        </div>

        {/* CENTER (absolute centered) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
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
        </div>
      </div>

      {/* MAIN */}
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