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

export function LeftPanel() {
  const screens = useStore((s) => s.project.screens);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const selectedObjectId = useStore((s) => s.selectedObjectId);

  const selectedScreen = useStore((s) => s.project.screens.find((x) => x.id === s.selectedScreenId));

  const objects = React.useMemo(() => {
    const list = selectedScreen?.objects ?? [];
    return [...list].sort((a, b) => a.z - b.z);
  }, [selectedScreen?.objects, selectedScreen?.id]);

  // --- Drag & Drop state for objects ---
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropHint, setDropHint] = React.useState<{ overId: string; where: "before" | "after" } | null>(null);

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

  const onObjDragOver = React.useCallback((e: React.DragEvent, overId: string) => {
    if (!dragId) return;
    if (overId === dragId) return;

    e.preventDefault(); // обязательно, иначе drop не сработает
    e.dataTransfer.dropEffect = "move";

    const el = e.currentTarget as HTMLDivElement;
    const r = el.getBoundingClientRect();
    const midY = r.top + r.height / 2;
    const where: "before" | "after" = e.clientY < midY ? "before" : "after";

    setDropHint({ overId, where });
  }, [dragId]);

  const onObjDrop = React.useCallback((e: React.DragEvent, overId: string) => {
    e.preventDefault();

    const idFromData = (() => {
      try {
        return e.dataTransfer.getData("text/plain");
      } catch {
        return "";
      }
    })();

    const id = idFromData || dragId;
    if (!id) {
      setDragId(null);
      setDropHint(null);
      return;
    }
    if (id === overId) {
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

    // куда вставляем: до или после элемента, на который навели
    const where = dropHint?.overId === overId ? dropHint.where : "before";
    let rawToIndex = overIndex + (where === "after" ? 1 : 0);

    // корректировка индекса из-за удаления элемента из списка при move
    // если мы тащим сверху вниз и вставляем "после", то после удаления индекс уменьшается на 1
    if (fromIndex < rawToIndex) rawToIndex -= 1;

    const toIndex = Math.max(0, Math.min(rawToIndex, objects.length - 1));

    Actions.reorderObject(id, toIndex);

    setDragId(null);
    setDropHint(null);
  }, [dragId, dropHint, objects]);

  const onObjDragLeave = React.useCallback(() => {
    // если хотим — можно не сбрасывать, но лучше убрать подсказку
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
                {sc.id === selectedScreenId && screens.length > 1 ? (
                  <TrashIcon onClick={() => Actions.deleteScreen(sc.id)} />
                ) : null}
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
            const showBefore = isDragging && dropHint?.overId === o.id && dropHint.where === "before" && dragId !== o.id;
            const showAfter = isDragging && dropHint?.overId === o.id && dropHint.where === "after" && dragId !== o.id;

            return (
              <React.Fragment key={o.id}>
                {/* drop line BEFORE */}
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
                  className={`listItem ${o.id === selectedObjectId ? "active" : ""}`}
                  draggable
                  onDragStart={(e) => onObjDragStart(e, o.id)}
                  onDragEnd={onObjDragEnd}
                  onDragOver={(e) => onObjDragOver(e, o.id)}
                  onDrop={(e) => onObjDrop(e, o.id)}
                  onDragLeave={onObjDragLeave}
                  onClick={() => Actions.selectObject(o.id)}
                  style={{
                    cursor: "grab",
                    opacity: dragId === o.id ? 0.55 : 1,
                    // маленький visual, чтобы понятно было что можно перетаскивать
                    outline: dragId === o.id ? "1px dashed rgba(62,163,255,0.6)" : undefined,
                  }}
                  title="Drag to reorder"
                >
                  <div className="name">{o.name}</div>

                  <div className="itemRight">
                    <TrashIcon onClick={() => Actions.deleteObject(o.id)} />
                  </div>
                </div>

                {/* drop line AFTER */}
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