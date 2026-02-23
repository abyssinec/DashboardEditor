import { produce } from "immer";
import { nanoid } from "nanoid";

import type { AnyObj, Asset, AssetKind, Project, Screen } from "./types";

export type AssetsPanelState = {
  isOpen: boolean;
  tab: "Images" | "Fonts";
  pickFor?: {
    objectId: string;
    field: "screenBackground" | "imageAssetId" | "fontAssetId";
  };
};

type State = {
  project: Project;
  selectedScreenId: string;
  selectedObjectId?: string;
  assetBytes: Record<string, Uint8Array>;
  assetsPanel: AssetsPanelState;
};

export const defaultProject = (): Project => {
  const screen1: Screen = makeDefaultScreen("screen_1", "Screen 1");

  return {
    project: { id: "proj_" + nanoid(6), name: "ProjectName" },
    assets: { images: [], fonts: [] },
    screens: [screen1],
  };
};

const initial: State = {
  project: defaultProject(),
  selectedScreenId: "screen_1",
  selectedObjectId: undefined,
  assetBytes: {},
  assetsPanel: { isOpen: false, tab: "Images" },
};

type Listener = () => void;
const listeners = new Set<Listener>();
let state: State = initial;

// --- Undo / Redo history ---
type History = {
  past: State[];
  future: State[];
  limit: number;
};

const history: History = {
  past: [],
  future: [],
  limit: 200,
};

// --- Copy / Paste (internal clipboard) ---
let clipboardObject: AnyObj | null = null;

function cloneSnapshot(s: State): State {
  return structuredClone(s);
}

export function getState() {
  return state;
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

type SetStateOpts = {
  // If false, do not write this update into history (useful for selection/UI-only changes).
  history?: boolean;
};

function notify() {
  listeners.forEach((l) => l());
}

function pushPastSnapshotOnce() {
  const prevSnap = cloneSnapshot(state);
  history.past.push(prevSnap);
  if (history.past.length > history.limit) history.past.shift();
  // new change clears redo
  history.future = [];
}

// ✅ Gesture/batch history: during drag/resize we commit only once
let historyBatchDepth = 0;

export function beginHistoryBatch() {
  if (historyBatchDepth === 0) {
    pushPastSnapshotOnce();
  }
  historyBatchDepth++;
}

export function endHistoryBatch() {
  historyBatchDepth = Math.max(0, historyBatchDepth - 1);
}

function commit(next: State) {
  pushPastSnapshotOnce();
  state = next;
  notify();
}

function setState(next: State, opts?: SetStateOpts) {
  const wantHistory = opts?.history !== false;
  const useHistory = wantHistory && historyBatchDepth === 0;

  if (useHistory) commit(next);
  else {
    state = next;
    notify();
  }
}

export function undo() {
  const prev = history.past.pop();
  if (!prev) return;
  history.future.push(cloneSnapshot(state));
  state = prev;
  notify();
}

export function redo() {
  const next = history.future.pop();
  if (!next) return;
  history.past.push(cloneSnapshot(state));
  if (history.past.length > history.limit) history.past.shift();
  state = next;
  notify();
}

export function canUndo() {
  return history.past.length > 0;
}

export function canRedo() {
  return history.future.length > 0;
}

function nextZ(screen: Screen) {
  const max = screen.objects.reduce((m, o) => Math.max(m, o.z), -1);
  return max < 0 ? 0 : max + 1;
}

function getSelectedScreen(s: State): Screen {
  return s.project.screens.find((x) => x.id === s.selectedScreenId) ?? s.project.screens[0];
}

function getSelectedObject(s: State): AnyObj | undefined {
  const screen = getSelectedScreen(s);
  if (!s.selectedObjectId) return undefined;
  return screen.objects.find((o) => o.id === s.selectedObjectId);
}

function cloneObjectForPaste(src: AnyObj, screen: Screen): AnyObj {
  const o = structuredClone(src) as AnyObj;
  o.id = "obj_" + nanoid(6);
  o.z = nextZ(screen);
  o.name = `${src.name} Copy`;
  return o;
}

function makeDefaultScreen(id = "screen_1", name = "Screen 1"): Screen {
  return {
    id,
    name,
    settings: { width: 1920, height: 1080 },
    style: {
      color: "#000000",
      alpha: 100,
      backgroundImageAssetId: undefined,
      fill: "Fit",
    },
    objects: [],
  };
}

function ensureProjectHasAtLeastOneScreen(d: { project: Project; selectedScreenId: string }) {
  if (!d.project.screens || d.project.screens.length === 0) {
    const s = makeDefaultScreen("screen_1", "Screen 1");
    d.project.screens = [s];
    d.selectedScreenId = s.id;
    return;
  }
  const exists = d.project.screens.some((s) => s.id === d.selectedScreenId);
  if (!exists) d.selectedScreenId = d.project.screens[0].id;
}

function getSelectedScreenDraft(d: { project: Project; selectedScreenId: string }): Screen {
  ensureProjectHasAtLeastOneScreen(d);
  return d.project.screens.find((s) => s.id === d.selectedScreenId) ?? d.project.screens[0];
}

export const Actions = {
  hydrate(project: Project, assetBytes: Record<string, Uint8Array>) {
    const safeProject: Project = {
      ...project,
      screens: project.screens && project.screens.length ? project.screens : [makeDefaultScreen("screen_1", "Screen 1")],
    };
    const first = safeProject.screens[0].id;
    setState(
      {
        ...state,
        project: safeProject,
        assetBytes,
        selectedScreenId: first,
        selectedObjectId: undefined,
        assetsPanel: { isOpen: false, tab: "Images" },
      },
      { history: false },
    );
  },

  // ✅ for drag/resize batching
  beginGesture() {
    beginHistoryBatch();
  },
  endGesture() {
    endHistoryBatch();
  },

  selectScreen(id: string) {
    const ok = state.project.screens.some((s) => s.id === id);
    setState(
      {
        ...state,
        selectedScreenId: ok ? id : (state.project.screens[0]?.id ?? "screen_1"),
        selectedObjectId: undefined,
      },
      { history: false },
    );
  },

  selectObject(id?: string) {
    setState({ ...state, selectedObjectId: id }, { history: false });
  },

  copySelected() {
    const obj = getSelectedObject(state);
    clipboardObject = obj ? (structuredClone(obj) as AnyObj) : null;
  },

  paste() {
    if (!clipboardObject) return;
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const pasted = cloneObjectForPaste(clipboardObject!, s);
        s.objects.push(pasted);
        d.selectedObjectId = pasted.id;
      }),
    );
  },

  duplicateSelected() {
    const src = getSelectedObject(state);
    if (!src) return;
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const dup = cloneObjectForPaste(src, s);
        s.objects.push(dup);
        d.selectedObjectId = dup.id;
      }),
    );
  },

  addScreen() {
    const id = "screen_" + nanoid(4);
    const screen: Screen = {
      id,
      name: `Screen ${state.project.screens.length + 1}`,
      settings: { width: 1920, height: 1080 },
      style: {
        color: "#000000",
        alpha: 100,
        backgroundImageAssetId: undefined,
        fill: "Fit",
      },
      objects: [],
    };

    setState(
      produce(state, (d) => {
        d.project.screens.push(screen);
        d.selectedScreenId = id;
        d.selectedObjectId = undefined;
      }),
    );
  },

  deleteScreen(screenId: string) {
    setState(
      produce(state, (d) => {
        if (d.project.screens.length <= 1) return;
        d.project.screens = d.project.screens.filter((s) => s.id !== screenId);
        if (d.selectedScreenId === screenId) {
          d.selectedScreenId = d.project.screens[0].id;
          d.selectedObjectId = undefined;
        }
      }),
    );
  },

  addObject(type: AnyObj["type"]) {
    const screen = getSelectedScreenDraft(state);
    const id = "obj_" + nanoid(6);
    const z = nextZ(screen);

    let obj: AnyObj;

    if (type === "Label") {
      obj = {
        id,
        type,
        name: `Label ${screen.objects.filter((o) => o.type === "Label").length + 1}`,
        z,
        gauge: { gaugeType: "None", updateRateMs: 100, smoothingFactor: 0 },
        transform: { x: 0, y: 0, width: 220, height: 60, rotation: 0 },
        settings: {
          text: "",
          fontAssetId: undefined,
          fontSize: 20,
          autoSize: "No",
          bold: "No",
          italic: "No",
          align: "Left",
          wrap: "No wrap",
        },
        style: {
          color: "#3EABFE",
          alpha: 100,
          glow: 100,
          shadowColor: "#000000",
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowBlur: 0,
          outlineColor: "#000000",
          outlineThickness: 0,
        },
      };
    } else if (type === "Image") {
      obj = {
        id,
        type,
        name: `Image ${screen.objects.filter((o) => o.type === "Image").length + 1}`,
        z,
        gauge: { gaugeType: "None", updateRateMs: 100, smoothingFactor: 0 },
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        settings: {
          imageAssetId: undefined,
          keepAspect: "Yes",
          fillMode: "Fill",
          flip: "None",
        },
        style: { alpha: 100 },
      };
    } else if (type === "Arc") {
      obj = {
        id,
        type,
        name: `Arc ${screen.objects.filter((o) => o.type === "Arc").length + 1}`,
        z,
        gauge: { gaugeType: "None", updateRateMs: 100, smoothingFactor: 0 },
        transform: { x: 0, y: 0, rotation: 0, startAngle: 0, endAngle: 0 },
        settings: { segments: 25, clockwise: "Yes", previewValue: 100 },
        style: {
          color: "#3EABFE",
          alpha: 100,
          glow: 100,
          thickness: 20,
          capStyle: "Flat",
          backgroundColor: "#3EABFE",
          backgroundAlpha: 40,
          backgroundGlow: 0,
          backgroundThickness: 20,
          backgroundCapStyle: "Flat",
        },
      };
    } else {
      obj = {
        id,
        type,
        name: `Bar ${screen.objects.filter((o) => o.type === "Bar").length + 1}`,
        z,
        gauge: { gaugeType: "None", updateRateMs: 100, smoothingFactor: 0 },
        transform: { x: 0, y: 0, rotation: 0, width: 250, height: 25 },
        settings: { previewValue: 50 },
        style: {
          color: "#3EABFE",
          alpha: 100,
          glow: 100,
          backgroundColor: "#3EABFE",
          backgroundAlpha: 40,
          backgroundGlow: 0,
          radius: 10,
          capStyle: "Flat",
        },
      };
    }

    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        s.objects.push(obj);
        d.selectedObjectId = id;
      }),
    );
  },

  deleteObject(objectId: string) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        s.objects = s.objects.filter((o) => o.id !== objectId);
        if (d.selectedObjectId === objectId) d.selectedObjectId = undefined;
      }),
    );
  },

  moveObject(objectId: string, dir: -1 | 1) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const sorted = [...s.objects].sort((a, b) => a.z - b.z);
        const idx = sorted.findIndex((o) => o.id === objectId);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= sorted.length) return;
        const a = sorted[idx];
        const b = sorted[j];
        const tmp = a.z;
        a.z = b.z;
        b.z = tmp;
      }),
    );
  },

  updateScreen(screenId: string, patch: Partial<Screen>) {
    setState(
      produce(state, (d) => {
        const s = d.project.screens.find((x) => x.id === screenId);
        if (!s) return;
        Object.assign(s, patch);
      }),
    );
  },

  updateObject(objectId: string, patch: any) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const obj = s.objects.find((o) => o.id === objectId);
        if (!obj) return;
        Object.assign(obj as any, patch);
      }),
    );
  },

  updateObjectDeep(objectId: string, path: string[], value: any) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const obj: any = s.objects.find((o: any) => o.id === objectId);
        if (!obj) return;
        let cur = obj;
        for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
        cur[path[path.length - 1]] = value;
      }),
    );
  },

  openAssets(tab: "Images" | "Fonts", pickFor?: AssetsPanelState["pickFor"]) {
    setState({ ...state, assetsPanel: { isOpen: true, tab, pickFor } }, { history: false });
  },

  closeAssets() {
    setState({ ...state, assetsPanel: { isOpen: false, tab: "Images" } }, { history: false });
  },

  async addAsset(kind: AssetKind, file: File) {
    const id = `${kind}_${nanoid(6)}`;
    const ext = file.name.split(".").pop() ?? "bin";
    const folder = kind === "image" ? "assets/images" : "assets/fonts";
    const path = `${folder}/${id}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const asset: Asset = {
      id,
      kind,
      name: file.name,
      path,
      mime: file.type || "application/octet-stream",
    };

    setState(
      produce(state, (d) => {
        if (kind === "image") d.project.assets.images.push(asset);
        else d.project.assets.fonts.push(asset);
        d.assetBytes[id] = bytes;
      }),
    );
  },

  deleteAsset(kind: AssetKind, assetId: string) {
    setState(
      produce(state, (d) => {
        if (kind === "image") d.project.assets.images = d.project.assets.images.filter((a) => a.id !== assetId);
        else d.project.assets.fonts = d.project.assets.fonts.filter((a) => a.id !== assetId);

        delete d.assetBytes[assetId];

        // unlink
        for (const s of d.project.screens) {
          if (s.style.backgroundImageAssetId === assetId) s.style.backgroundImageAssetId = undefined;

          for (const o of s.objects as any[]) {
            if (o.type === "Image" && o.settings.imageAssetId === assetId) o.settings.imageAssetId = undefined;
            if (o.type === "Label" && o.settings.fontAssetId === assetId) o.settings.fontAssetId = undefined;
          }
        }
      }),
    );
  },

  pickAsset(assetId: string) {
    const pick = state.assetsPanel.pickFor;
    if (!pick) return;

    setState(
      produce(state, (d) => {
        if (pick.field === "screenBackground") {
          const s = getSelectedScreenDraft(d);
          s.style.backgroundImageAssetId = assetId;
        } else {
          const s = getSelectedScreenDraft(d);
          const o: any = s.objects.find((x: any) => x.id === pick.objectId);
          if (!o) return;
          if (pick.field === "imageAssetId" && o.type === "Image") o.settings.imageAssetId = assetId;
          if (pick.field === "fontAssetId" && o.type === "Label") o.settings.fontAssetId = assetId;
        }

        d.assetsPanel = { isOpen: false, tab: "Images" };
      }),
    );
  },
};