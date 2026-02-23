import React from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

function TrashIcon({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="iconBtn"
      title="Delete"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 3h6m-9 4h12m-1 0-1 16H8L7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 11v8M14 11v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EyeIcon({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <div
      className="iconBtn"
      title={visible ? "Hide" : "Show"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ opacity: visible ? 1 : 0.55 }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        {visible ? (
          <>
            <path
              d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          </>
        ) : (
          <>
            <path
              d="M2 12s3.5-7 10-7c2.45 0 4.52.95 6.14 2.1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M22 12s-3.5 7-10 7c-2.6 0-4.78-1.02-6.45-2.22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

type DropHint = { overId: string; where: "before" | "after" };

export function LeftPanel() {
  const screens = useStore((s) => s.project.screens);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const selectedObjectId = useStore((s) => s.selectedObjectId);
  const selectedObjectIds = useStore((s) => (s as any).selectedObjectIds ?? (s.selectedObjectId ? [s.selectedObjectId] : []));

  const selectedScreen = useStore((s) => s.project.screens.find((x) => x.id === s.selectedScreenId));

  const objects = React.useMemo(() => {
    const list = selectedScreen?.objects ?? [];
    return [...list].sort((a, b) => a.z - b.z);
  }, [selectedScreen?.objects, selectedScreen?.id]);

  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropHint, setDropHint] = React.useState<DropHint | null>(null);

  const isDragging = !!dragId;

  const onObjDragStart = React.useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    setDropHint(null);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {}
  }, []);

  const onObjDragEnd = React.useCallback(() => {
    setDragId(null);
    setDropHint(null);
  }, []);

  const onObjDragOver = React.useCallback(
    (e: React.DragEvent, overId: string) => {
      if (!dragId || dragId === overId) return;
      e.preventDefault();

      const target = e.currentTarget as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const where: DropHint["where"] = y < rect.height / 2 ? "before" : "after";

      setDropHint({ overId, where });
    },
    [dragId],
  );

  const onObjDrop = React.useCallback(
    (e: React.DragEvent, overId: string) => {
      e.preventDefault();
      const id = dragId;
      if (!id || id === overId) {
        setDragId(null);
        setDropHint(null);
        return;
      }

      const fromIndex = objects.findIndex((o) => o.id === id);
      const overIndex = objects.findIndex((o) => o.id === overId);
      if (fromIndex < 0 || overIndex < 0) {
        setDragId(null);
        setDropHint(null);
        return;
      }

      const where = dropHint?.overId === overId ? dropHint.where : "before";
      let rawToIndex = overIndex + (where === "after" ? 1 : 0);
      if (fromIndex < rawToIndex) rawToIndex -= 1;

      const toIndex = Math.max(0, Math.min(rawToIndex, objects.length - 1));
      Actions.reorderObject(id, toIndex);

      setDragId(null);
      setDropHint(null);
    },
    [dragId, dropHint, objects],
  );

  const onObjDragLeave = React.useCallback(() => {
    setDropHint(null);
  }, []);

  return (
    <>
      <div className="panelTitle insPanelTitle">Screens</div>
      <div className="scrollArea">
        <div className="list">
          {screens.map((sc) => (
            <div
              key={sc.id}
              className={`listItem ${sc.id === selectedScreenId ? "active" : ""}`}
              onClick={() => Actions.selectScreen(sc.id)}
            >
              <div className="name">{sc.name}</div>
              <div className="itemRight">
                {sc.id === selectedScreenId && screens.length > 1 ? <TrashIcon onClick={() => Actions.deleteScreen(sc.id)} /> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 12 }} />

        <div className="panelTitle insPanelTitle" style={{ borderBottom: "none", padding: "0 0 8px 0" }}>
          Objects
        </div>

        <div className="list">
          {objects.map((o) => {
            const visible = (o as any).visible !== false; // default true
            const isActive = selectedObjectIds.includes(o.id) || o.id === selectedObjectId;

            const showBefore = isDragging && dropHint?.overId === o.id && dropHint.where === "before" && dragId !== o.id;
            const showAfter = isDragging && dropHint?.overId === o.id && dropHint.where === "after" && dragId !== o.id;

            return (
              <React.Fragment key={o.id}>
                {showBefore ? (
                  <div
                    style={{
                      height: 2,
                      margin: "2px 10px",
                      borderRadius: 2,
                      background: "rgba(62,163,255,0.95)",
                    }}
                  />
                ) : null}

                <div
                  className={`listItem ${isActive ? "active" : ""}`}
                  draggable
                  onDragStart={(e) => onObjDragStart(e, o.id)}
                  onDragEnd={onObjDragEnd}
                  onDragOver={(e) => onObjDragOver(e, o.id)}
                  onDrop={(e) => onObjDrop(e, o.id)}
                  onDragLeave={onObjDragLeave}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      Actions.selectRange(o.id);
                      return;
                    }
                    if (e.ctrlKey || e.metaKey) {
                      Actions.toggleObjectSelection(o.id);
                      return;
                    }
                    Actions.selectObject(o.id);
                  }}
                  style={{
                    cursor: "grab",
                    opacity: dragId === o.id ? 0.55 : 1,
                    outline: dragId === o.id ? "1px dashed rgba(62,163,255,0.6)" : undefined,
                  }}
                  title="Drag to reorder"
                >
                  <div className="name" style={{ opacity: visible ? 1 : 0.6 }}>
                    {o.name}
                  </div>

                  <div className="itemRight">
                    <EyeIcon visible={visible} onClick={() => Actions.toggleObjectVisible(o.id)} />
                    <TrashIcon onClick={() => Actions.deleteObject(o.id)} />
                  </div>
                </div>

                {showAfter ? (
                  <div
                    style={{
                      height: 2,
                      margin: "2px 10px",
                      borderRadius: 2,
                      background: "rgba(62,163,255,0.95)",
                    }}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}
