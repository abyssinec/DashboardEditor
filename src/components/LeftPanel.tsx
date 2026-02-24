import React from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";
import type { AnyObj } from "../types";

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
            <path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path
              d="M3 3l18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12s3.5-7 10-7c2.3 0 4.2.7 5.8 1.7M22 12s-3.5 7-10 7c-2.3 0-4.2-.7-5.8-1.7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      style={{
        width: 14,
        height: 14,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms ease",
        opacity: 0.85,
      }}
    >
      <path d="M10 7l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DropHint = { overId: string | null; where: "before" | "after" | "inside" };

function isFrame(o: AnyObj | undefined): o is Extract<AnyObj, { type: "Frame" }> {
  return !!o && (o as any).type === "Frame";
}

export function LeftPanel() {
  const screens = useStore((s) => s.project.screens);
  const selectedScreenId = useStore((s) => s.selectedScreenId);
  const selectedObjectId = useStore((s) => s.selectedObjectId);
  const selectedObjectIds = useStore((s) => s.selectedObjectIds);

  const selectedScreen = screens.find((x) => x.id === selectedScreenId);
  const objects = React.useMemo(() => {
    const list = selectedScreen?.objects ?? [];
    return [...list].sort((a, b) => a.z - b.z);
  }, [selectedScreen?.objects, selectedScreen?.id]);

  const byId = React.useMemo(() => new Map(objects.map((o) => [o.id, o] as const)), [objects]);

  // Build children lists from frame.children (authoritative) + object.parentId (fallback).
  const childrenOf = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const o of objects) {
      if (isFrame(o)) {
        const kids = Array.isArray((o as any).children) ? ((o as any).children as string[]) : [];
        map.set(o.id, kids.filter((id) => byId.has(id)));
      }
    }
    // fallback: if an object has parentId but isn't present in parent's children list, add it at end (non-destructive UI)
    for (const o of objects) {
      const pid = (o as any).parentId;
      if (!pid) continue;
      if (!byId.has(pid)) continue;
      const arr = map.get(pid) ?? [];
      if (!arr.includes(o.id)) arr.push(o.id);
      map.set(pid, arr);
    }
    return map;
  }, [objects, byId]);

  const topLevelIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const o of objects) {
      const pid = (o as any).parentId;
      if (!pid) set.add(o.id);
    }
    return objects.filter((o) => set.has(o.id)).map((o) => o.id);
  }, [objects]);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const isExpanded = React.useCallback((id: string) => expanded[id] !== false, [expanded]);

  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropHint, setDropHint] = React.useState<DropHint | null>(null);
  const isDragging = !!dragId;

  const onObjDragStart = React.useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    setDropHint(null);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    } catch {}
  }, []);

  const onObjDragEnd = React.useCallback(() => {
    setDragId(null);
    setDropHint(null);
  }, []);

  const calcWhere = (e: React.DragEvent, targetId: string): DropHint => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const y = e.clientY - r.top;

    // "Figma-like" drop zones:
    // - Top edge  -> before
    // - Bottom edge -> after
    // - Middle area -> inside (for frames; or into closest frame when dropping on a child row)
    const edge = 4; // Figma-like thin edge zones; most of row counts as "inside" for frames

    const target = byId.get(targetId);

    // If hovering a frame row: allow inside in the middle.
    if (target && isFrame(target)) {
      if (y <= edge) return { overId: targetId, where: "before" };
      if (y >= r.height - edge) return { overId: targetId, where: "after" };
      return { overId: targetId, where: "inside" };
    }

    // If hovering a non-frame row, but it has a parent frame:
    // allow "inside" in the middle so user can drop into that frame by aiming at its children area.
    const parentId = target ? (((target as any).parentId as string) ?? null) : null;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && isFrame(parent)) {
      if (y <= edge) return { overId: targetId, where: "before" };
      if (y >= r.height - edge) return { overId: targetId, where: "after" };
      // inside on the child row will be interpreted by store.moveObject as "closest frame"
      return { overId: targetId, where: "inside" };
    }

    return { overId: targetId, where: y < r.height / 2 ? "before" : "after" };
  };

  const onObjDragOver = React.useCallback(
    (e: React.DragEvent, targetId: string) => {
      if (!dragId || dragId === targetId) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDropHint(calcWhere(e, targetId));
    },
    [dragId, byId],
  );

  const onObjDrop = React.useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const id = dragId ?? e.dataTransfer.getData("text/plain");
      if (!id || id === targetId) return;
      const hint = dropHint ?? calcWhere(e, targetId);
      Actions.moveObject(id, hint.overId, hint.where);
      setDragId(null);
      setDropHint(null);
    },
    [dragId, dropHint, byId],
  );

  const onDropToRoot = React.useCallback(
    (e: React.DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      // drop to root end
      Actions.moveObject(dragId, null, "after");
      setDragId(null);
      setDropHint(null);
    },
    [dragId],
  );

  const renderNode = (id: string, depth: number, parentVisible: boolean) => {
    const o = byId.get(id);
    if (!o) return null;

    const ownVisible = (o as any).visible !== false;
    const effectiveVisible = parentVisible && ownVisible;
    const isActive = selectedObjectIds.includes(o.id) || o.id === selectedObjectId;

    const isFr = isFrame(o);
    const kids = isFr ? childrenOf.get(o.id) ?? [] : [];
    const open = isFr ? isExpanded(o.id) : false;

    const showBefore = isDragging && dropHint?.overId === o.id && dropHint.where === "before" && dragId !== o.id;
    const showAfter = isDragging && dropHint?.overId === o.id && dropHint.where === "after" && dragId !== o.id;
    const showInside = isDragging && dropHint?.overId === o.id && dropHint.where === "inside" && dragId !== o.id;

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
            paddingLeft: 10 + depth * 14,
            opacity: effectiveVisible ? 1 : 0.45,
            background: showInside ? "rgba(62,163,255,0.10)" : undefined,
          }}
        >
          {isFr ? (
            <div
              className="iconBtn"
              title={open ? "Collapse" : "Expand"}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((m) => ({ ...m, [o.id]: !open }));
              }}
              style={{ marginRight: 2 }}
            >
              <Caret open={open} />
            </div>
          ) : (
            <div style={{ width: 26 }} />
          )}

          <div className="name" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ opacity: 0.9 }}>{o.name}</span>
            {isFr ? <span style={{ fontSize: 11, opacity: 0.45 }}>Frame</span> : null}
          </div>

          <div className="itemRight">
            <EyeIcon
              visible={ownVisible}
              onClick={() => Actions.updateObject(o.id, { visible: ownVisible ? false : true })}
            />
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

        {isFr && open ? kids.map((cid) => renderNode(cid, depth + 1, effectiveVisible)) : null}
      </React.Fragment>
    );
  };

  return (
    <div className="leftPanel">
      <div className="panelTitle">Screens</div>
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

        <div className="list" onDragOver={(e) => (dragId ? e.preventDefault() : undefined)} onDrop={onDropToRoot}>
          {topLevelIds.map((id) => renderNode(id, 0, true))}
        </div>
      </div>
    </div>
  );
}
