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

function UpIcon({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="iconBtn"
      title="Bring forward"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 5 6 11h4v8h4v-8h4L12 5Z" fill="currentColor" />
      </svg>
    </div>
  );
}

function DownIcon({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="iconBtn"
      title="Send backward"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 19l6-6h-4V5h-4v8H6l6 6Z" fill="currentColor" />
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
          {objects.map((o) => (
            <div
              key={o.id}
              className={`listItem ${o.id === selectedObjectId ? "active" : ""}`}
              onClick={() => Actions.selectObject(o.id)}
            >
              <div className="name">{o.name}</div>

              <div className="itemRight">
                <DownIcon onClick={() => Actions.moveObject(o.id, -1)} />
                <UpIcon onClick={() => Actions.moveObject(o.id, +1)} />
                <TrashIcon onClick={() => Actions.deleteObject(o.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


