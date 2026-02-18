import React, { useEffect, useMemo, useRef, useState } from "react";

import { useStore } from "../hooks/useStore";
import { Actions } from "../store";

function Caret({ open }: { open: boolean }) {
  return (
    <span className={"assetsCaret" + (open ? " open" : "")} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Trash({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="assetsIconBtn"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Delete"
      title="Delete"
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M9 3h6m-8 4h10m-9 0 1 14h6l1-14M10 11v7m4-7v7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Section({
  title,
  open,
  onToggle,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="assetsSection">
      <button className="assetsSectionHead" onClick={onToggle} type="button">
        <span className="assetsSectionTitle">{title}</span>
        <Caret open={open} />
      </button>
      {open ? <div className="assetsSectionBody">{children}</div> : null}
    </div>
  );
}

function isFontFile(f: File) {
  const name = (f.name || "").toLowerCase();
  const t = (f.type || "").toLowerCase();
  return (
    name.endsWith(".ttf") ||
    name.endsWith(".otf") ||
    name.endsWith(".woff") ||
    name.endsWith(".woff2") ||
    t.includes("font") ||
    t.includes("opentype") ||
    t.includes("truetype") ||
    t.includes("woff")
  );
}

export function AssetsPanel() {
  const tab = useStore((s) => s.assetsPanel.tab);
  const images = useStore((s) => s.project.assets.images);
  const fonts = useStore((s) => s.project.assets.fonts);
  const pickFor = useStore((s) => s.assetsPanel.pickFor);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [imagesOpen, setImagesOpen] = useState(tab === "Images");
  const [fontsOpen, setFontsOpen] = useState(tab === "Fonts");

  useEffect(() => {
    setImagesOpen(tab === "Images");
    setFontsOpen(tab === "Fonts");
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") Actions.closeAssets();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const accept = useMemo(() => "image/*,.ttf,.otf,.woff,.woff2", []);

  // restrict picking to the thing that opened the picker (image vs font)
  const pickForKind = (pickFor as any)?.kind || pickFor;
  const canPickImages = !(pickForKind === "font" || pickForKind === "Fonts");
  const canPickFonts  = !(pickForKind === "image" || pickForKind === "Images");

  function openFile() {
    fileRef.current?.click();
  }

  return (
    <div className="assetsOverlay" onMouseDown={() => Actions.closeAssets()}>
      <div className="assetsModal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="assetsHeaderLike">
          <div className="assetsHeaderTitle">Assets</div>
          <button className="assetsCloseBtn" onClick={() => Actions.closeAssets()} type="button" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="assetsBody">
          <div className="assetsScrollArea">
            <Section
              title="Images"
              open={imagesOpen}
              onToggle={() => {
                setImagesOpen((v) => !v);
                Actions.openAssets("Images", pickFor);
              }}
            >
              <div className="assetsList">
                {images.map((a) => (
                  <button
                    key={a.id}
                    className={"assetsRow" + (!canPickImages ? " isDisabled" : "")}
                    type="button"
                    onClick={() => {
                      if (canPickImages) Actions.pickAsset(a.id);
                    }}
                    disabled={!canPickImages}
                  >
                    <span className="assetsRowName">{a.name}</span>
                    <span className="assetsRowRight">
                      <Trash onClick={() => Actions.deleteAsset("image", a.id)} />
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <Section
              title="Fonts"
              open={fontsOpen}
              onToggle={() => {
                setFontsOpen((v) => !v);
                Actions.openAssets("Fonts", pickFor);
              }}
            >
              <div className="assetsList">
                {fonts.map((a) => (
                  <button
                    key={a.id}
                    className={"assetsRow" + (!canPickFonts ? " isDisabled" : "")}
                    type="button"
                    onClick={() => {
                      if (canPickFonts) Actions.pickAsset(a.id);
                    }}
                    disabled={!canPickFonts}
                  >
                    <span className="assetsRowName">{a.name}</span>
                    <span className="assetsRowRight">
                      <Trash onClick={() => Actions.deleteAsset("font", a.id)} />
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div className="assetsFooter">
            <button className="assetsUploadBtn" type="button" onClick={openFile}>
              Upload new asset
            </button>

            <input
              ref={fileRef}
              type="file"
              accept={accept}
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;

                await Actions.addAsset((isFontFile(f) ? "font" : "image") as any, f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



