import React from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

function TrashIcon({ onClick }: { onClick: () => void }) {
  return (
    <svg className="trash" viewBox="0 0 24 24" onClick={(e)=>{e.stopPropagation();onClick();}}>
      <path fill="white" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM7 9h2v10H7V9z" opacity="0.9"/>
    </svg>
  );
}

export function LeftPanel() {
  const screens = useStore(s => s.project.screens);
  const selectedScreenId = useStore(s => s.selectedScreenId);
  const selectedObjectId = useStore(s => s.selectedObjectId);
  // IMPORTANT: keep useStore snapshot stable.
  // Do NOT build new arrays/objects inside the selector (it breaks useSyncExternalStore).
  const selectedScreen = useStore(s => s.project.screens.find(x => x.id === s.selectedScreenId));
  const objects = React.useMemo(() => {
    const list = selectedScreen?.objects ?? [];
    return [...list].sort((a, b) => a.z - b.z);
  }, [selectedScreen?.objects, selectedScreen?.id]);

  return (
    <div className="left-panel">
      <div className="left-bg" />

      {/* Screens */}
      <div className="screens-view">
        <div className="screens-header">
          <div className="header-title">Screens</div>
        </div>
        <div className="list">
          {screens.map(sc => (
            <div
              key={sc.id}
              className={"list-item" + (sc.id === selectedScreenId ? " active" : "")}
              onClick={() => Actions.selectScreen(sc.id)}
            >
              <span>{sc.name}</span>
              {sc.id === selectedScreenId ? (
                <TrashIcon onClick={() => Actions.deleteScreen(sc.id)} />
              ) : (
                <svg className="trash" viewBox="0 0 24 24" style={{opacity:0}}><path fill="white" d="M9 3h6l1 2h5v2H3V5h5l1-2z"/></svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Objects */}
      <div className="objects-title">Objects</div>
      <div className="objects-view objects">
        <div className="objects-header">
          <div className="header-title">Objects</div>
        </div>
        <div className="list">
          {objects.map(o => (
            <div
              key={o.id}
              className={"list-item" + (o.id === selectedObjectId ? " active" : "")}
              onClick={() => Actions.selectObject(o.id)}
            >
              <span>{o.name}</span>
              {o.id === selectedObjectId ? (
                <TrashIcon onClick={() => Actions.deleteObject(o.id)} />
              ) : (
                <svg className="trash" viewBox="0 0 24 24" style={{opacity:0}}><path fill="white" d="M9 3h6l1 2h5v2H3V5h5l1-2z"/></svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
