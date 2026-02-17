import React, { useRef } from "react";
import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

function XIcon({ onClick }: { onClick: () => void }) {
  return (
    <svg className="assets-close" viewBox="0 0 24 24" onClick={onClick}>
      <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function ChevronSmall() {
  return (
    <svg viewBox="0 0 10 7" style={{width:10,height:7,opacity:.85}}>
      <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashSmall({ onClick }: { onClick: () => void }) {
  return (
    <svg className="asset-trash" viewBox="0 0 24 24" onClick={(e)=>{e.stopPropagation();onClick();}}>
      <path fill="white" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM7 9h2v10H7V9z"/>
    </svg>
  );
}

export function AssetsPanel() {
  const tab = useStore(s => s.assetsPanel.tab);
  const images = useStore(s => s.project.assets.images);
  const fonts = useStore(s => s.project.assets.fonts);
  const pickFor = useStore(s => s.assetsPanel.pickFor);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const kind = tab === "Images" ? "image" : "font";

  const list = tab === "Images" ? images : fonts;

  function openFile() {
    fileRef.current?.click();
  }

  return (
    <div className="assets-panel">
      <div className="assets-bg" />
      <div className="assets-head">Assets</div>
      <XIcon onClick={() => Actions.closeAssets()} />

      <div className="assets-body">
        <div className="assets-section">
          <div className="assets-section-title" style={{cursor:"pointer"}} onClick={() => Actions.openAssets("Images", pickFor)}>
            <span>Images</span>
            <ChevronSmall />
          </div>
          {tab === "Images" && images.map(a => (
            <div key={a.id} className="asset-item" onClick={() => Actions.pickAsset(a.id)}>
              <span>{a.name}</span>
              <TrashSmall onClick={() => Actions.deleteAsset("image", a.id)} />
            </div>
          ))}
        </div>

        <div className="assets-section" style={{marginTop:16}}>
          <div className="assets-section-title" style={{cursor:"pointer"}} onClick={() => Actions.openAssets("Fonts", pickFor)}>
            <span>Fonts</span>
            <ChevronSmall />
          </div>
          {tab === "Fonts" && fonts.map(a => (
            <div key={a.id} className="asset-item" onClick={() => Actions.pickAsset(a.id)}>
              <span>{a.name}</span>
              <TrashSmall onClick={() => Actions.deleteAsset("font", a.id)} />
            </div>
          ))}
        </div>
      </div>

      <div className="assets-upload" onClick={openFile}>
        <span>Upload new asset</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={tab === "Images" ? "image/*" : ".ttf,.otf,.woff,.woff2"}
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await Actions.addAsset(kind as any, f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
