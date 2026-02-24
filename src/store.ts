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

export type State = {
  project: Project;
  selectedScreenId: string;

  // Primary selection (kept for backwards compatibility)
  selectedObjectId?: string;

  // Multi-selection
  selectedObjectIds: string[];
  selectionAnchorId?: string;

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
  selectedObjectIds: [],
  selectionAnchorId: undefined,
  assetBytes: {},
  assetsPanel: { isOpen: false, tab: "Images" },
};

type Listener = () => void;
const listeners = new Set<Listener>();
let state: State = initial;

// --- Undo / Redo history (project-only snapshots) ---
// We intentionally DO NOT store heavy/ephemeral UI state (selection, panels, assetBytes) in history.
// This prevents huge memory usage and avoids undo/redo changing UI selection unexpectedly.
type HistorySnapshot = {
  project: Project;
  selectedScreenId: string;
};

function safeClone<T>(v: T): T {
  // Prefer structuredClone, fallback to JSON for cases where runtime objects accidentally contain non-cloneables.
  try {
    // @ts-ignore
    return safeClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
}


type History = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  limit: number;
};

const history: History = {
  past: [],
  future: [],
  limit: 200,
};

// --- Clipboard (object(s) OR screen) ---
type Clipboard =
  | { kind: "object"; obj: AnyObj }
  | { kind: "objects"; objs: AnyObj[] }
  | { kind: "screen"; screen: Screen }
  | null;

let clipboard: Clipboard = null;

function cloneHistorySnapshot(s: State): HistorySnapshot {
  // Project data is serializable (no functions), so structuredClone is OK and fast enough.
  return safeClone({ project: s.project, selectedScreenId: s.selectedScreenId });
}

function ensureValidSelection(next: State): State {
  const screen = next.project.screens.find((x) => x.id === next.selectedScreenId) ?? next.project.screens[0];
  const selectedScreenId = screen?.id ?? next.selectedScreenId;

  let selectedObjectId = next.selectedObjectId;
  let selectedObjectIds = next.selectedObjectIds ?? [];

  const objects = (screen?.objects ?? []) as AnyObj[];
  const idsSet = new Set(objects.map((o) => o.id));

  // Drop ids that no longer exist after undo/redo.
  selectedObjectIds = selectedObjectIds.filter((id) => idsSet.has(id));
  if (selectedObjectId && !idsSet.has(selectedObjectId)) selectedObjectId = undefined;

  // If we have multi-selection but no primary, pick the last one.
  if (!selectedObjectId && selectedObjectIds.length) selectedObjectId = selectedObjectIds[selectedObjectIds.length - 1];

  return {
    ...next,
    selectedScreenId,
    selectedObjectId,
    selectedObjectIds,
  };
}

function applyHistorySnapshot(base: State, snap: HistorySnapshot): State {
  // Preserve UI/ephemeral parts from `base`, but swap project data.
  const merged: State = {
    ...base,
    project: snap.project,
    selectedScreenId: snap.selectedScreenId,
  };
  return ensureValidSelection(merged);
}

export function getState() {
  return state;
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

type SetStateOpts = {
  history?: boolean;
};

function notify() {
  listeners.forEach((l) => l());
}

function pushPastSnapshotOnce() {
  const prevSnap = cloneHistorySnapshot(state);
  history.past.push(prevSnap);
  if (history.past.length > history.limit) history.past.shift();
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

  // Only record history when project data or active screen changes, and we are not inside a gesture batch.
  const projectChanged = next.project !== state.project || next.selectedScreenId !== state.selectedScreenId;
  const useHistory = wantHistory && projectChanged && historyBatchDepth === 0;

  if (useHistory) commit(next);
  else {
    state = next;
    notify();
  }
}

export function undo() {
  const prev = history.past.pop();
  if (!prev) return;
  history.future.push(cloneHistorySnapshot(state));
  state = applyHistorySnapshot(state, prev);
  notify();
}

export function redo() {
  const next = history.future.pop();
  if (!next) return;
  history.past.push(cloneHistorySnapshot(state));
  if (history.past.length > history.limit) history.past.shift();
  state = applyHistorySnapshot(state, next);
  notify();
}

export function canUndo() {
  return history.past.length > 0;
}

export function canRedo() {
  return history.future.length > 0;
}

function nextZ(screen: Screen) {
  const max = (screen.objects ?? []).reduce((m, o) => Math.max(m, o.z), -1);
  return max < 0 ? 0 : max + 1;
}

function isFrame(o: AnyObj | undefined): o is Extract<AnyObj, { type: "Frame" }> {
  return !!o && (o as any).type === "Frame";
}

function collectDescendants(screen: Screen, rootId: string): string[] {
  const byId = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));
  const out: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    const o = byId.get(id);
    if (!o) continue;
    out.push(id);
    if (isFrame(o)) {
      for (const cid of (o as any).children ?? []) stack.push(cid);
    }
  }
  return out;
}

function removeFromAllFrames(screen: Screen, ids: string[]) {
  const set = new Set(ids);
  for (const o of screen.objects ?? []) {
    if (isFrame(o) && Array.isArray((o as any).children) && (o as any).children.length) {
      (o as any).children = (o as any).children.filter((id: string) => !set.has(id));
    }
  }
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

function getSelectedScreen(s: State): Screen {
  return s.project.screens.find((x) => x.id === s.selectedScreenId) ?? s.project.screens[0];
}

function getSelectedScreenDraft(d: { project: Project; selectedScreenId: string }): Screen {
  ensureProjectHasAtLeastOneScreen(d);
  return d.project.screens.find((s) => s.id === d.selectedScreenId) ?? d.project.screens[0];
}

function orderedObjectIds(screen: Screen) {
  return [...(screen.objects ?? [])].sort((a, b) => a.z - b.z).map((o) => o.id);
}

function getSelectedObject(s: State): AnyObj | undefined {
  const screen = getSelectedScreen(s);
  if (!s.selectedObjectId) return undefined;
  return (screen.objects ?? []).find((o) => o.id === s.selectedObjectId);
}

function getSelectedObjects(s: State): AnyObj[] {
  const screen = getSelectedScreen(s);
  const ids = s.selectedObjectIds?.length ? s.selectedObjectIds : s.selectedObjectId ? [s.selectedObjectId] : [];
  if (!ids.length) return [];
  const map = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));
  return ids.map((id) => map.get(id)).filter(Boolean) as AnyObj[];
}

function collectFrameDescendants(screen: Screen, frameId: string): string[] {
  const byId = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));
  const out: string[] = [];
  const stack: string[] = [frameId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    const o = byId.get(id);
    if (!o) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (isFrame(o)) {
      const ch = Array.isArray((o as any).children) ? ((o as any).children as string[]) : [];
      for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
    }
  }
  return out;
}

/**
 * Clone a single object. If it's a Frame, clones the entire subtree (frame + descendants)
 * and remaps children/parentId to the new ids. Returns all clones and the cloned root.
 */
function cloneObjectOrSubtreeForPaste(src: AnyObj, screen: Screen): { root: AnyObj; all: AnyObj[] } {
  const byId = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));

  // 1) Determine which ids to clone
  let idsToClone: string[] = [src.id];
  if (isFrame(src)) {
    idsToClone = collectFrameDescendants(screen, src.id);
  }

  // 2) Create id mapping old->new
  const idMap = new Map<string, string>();
  for (const oldId of idsToClone) idMap.set(oldId, "obj_" + nanoid(6));

  // 3) Clone objects
  const clonesByOld = new Map<string, AnyObj>();
  for (const oldId of idsToClone) {
    const orig = byId.get(oldId);
    if (!orig) continue;
    const c = safeClone(orig) as AnyObj;
    c.id = idMap.get(oldId)!;
    c.z = nextZ(screen);
    c.name = `${orig.name} Copy`;

    const oldPid = (orig as any).parentId as string | undefined;
    if (oldPid && idMap.has(oldPid)) (c as any).parentId = idMap.get(oldPid);
    else delete (c as any).parentId;

    if (isFrame(c)) {
      const oldChildren = Array.isArray((orig as any).children) ? ((orig as any).children as string[]) : [];
      (c as any).children = oldChildren.map((cid) => idMap.get(cid)).filter(Boolean);
    }

    clonesByOld.set(oldId, c);
  }

  // Root will be inserted into ctx parent/root later
  const rootClone = clonesByOld.get(src.id)!;
  delete (rootClone as any).parentId;

  const all = idsToClone.map((oldId) => clonesByOld.get(oldId)).filter(Boolean) as AnyObj[];
  return { root: rootClone, all };
}

function clonePackedObjectsForPaste(pack: AnyObj[], screen: Screen): { roots: AnyObj[]; all: AnyObj[] } {
  const byOld = new Map(pack.map((o) => [o.id, o] as const));
  const idSet = new Set(pack.map((o) => o.id));
  const idMap = new Map<string, string>();
  for (const o of pack) idMap.set(o.id, "obj_" + nanoid(6));

  const clonesByOld = new Map<string, AnyObj>();
  for (const o of pack) {
    const c = safeClone(o) as AnyObj;
    c.id = idMap.get(o.id)!;
    c.z = nextZ(screen);
    c.name = `${o.name} Copy`;

    const oldPid = (o as any).parentId as string | undefined;
    if (oldPid && idSet.has(oldPid)) (c as any).parentId = idMap.get(oldPid);
    else delete (c as any).parentId;

    if (isFrame(c)) {
      const oldChildren = Array.isArray((o as any).children) ? ((o as any).children as string[]) : [];
      (c as any).children = oldChildren.map((cid) => idMap.get(cid)).filter(Boolean);
    }

    clonesByOld.set(o.id, c);
  }

  const rootsOld = pack
    .filter((o) => {
      const pid = (o as any).parentId as string | undefined;
      return !pid || !idSet.has(pid);
    })
    .map((o) => o.id);

  const roots = rootsOld.map((id) => clonesByOld.get(id)!).filter(Boolean) as AnyObj[];
  const all = pack.map((o) => clonesByOld.get(o.id)!).filter(Boolean) as AnyObj[];

  for (const r of roots) delete (r as any).parentId;

  return { roots, all };
}

function cloneScreenForPaste(src: Screen): Screen {
  const s = safeClone(src) as Screen;
  s.id = "screen_" + nanoid(5);
  s.name = `${src.name} Copy`;

  // give NEW ids to all objects to avoid collisions
  s.objects = (s.objects || []).map((o: AnyObj) => {
    const c = safeClone(o) as AnyObj;
    c.id = "obj_" + nanoid(6);
    return c;
  });

  return s;
}

function ensureParentLinks(screen: Screen) {
  const byId = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));

  // 1) Normalize frame children lists and set child.parentId accordingly.
  for (const o of screen.objects ?? []) {
    if (!isFrame(o)) continue;
    const f: any = o as any;

    // Defaults for new frame settings (back-compat)
    if (!f.settings) f.settings = {};
    if (f.settings.clipContent == null) f.settings.clipContent = true;
    if (typeof f.settings.scrollX !== "number") f.settings.scrollX = 0;
    if (typeof f.settings.scrollY !== "number") f.settings.scrollY = 0;
    const raw = Array.isArray(f.children) ? f.children : [];
    const next: string[] = [];
    const seen = new Set<string>();
    for (const cid of raw) {
      if (typeof cid !== "string") continue;
      if (seen.has(cid)) continue;
      const child = byId.get(cid);
      if (!child) continue;
      // prevent self-cycles
      if (cid === o.id) continue;
      seen.add(cid);
      next.push(cid);
      (child as any).parentId = o.id;
    }
    f.children = next;
  }

  // 2) Any non-frame object that references a missing parent -> root.
  for (const o of screen.objects ?? []) {
    const pid = (o as any).parentId;
    if (!pid) continue;
    const p = byId.get(pid);
    if (!p || !isFrame(p)) {
      (o as any).parentId = null;
    }
  }
  // 3) Ensure that every object with parentId is present in the parent's children list (append if missing).
  // This keeps tree structure consistent for paste/duplicate/import cases.
  for (const o of screen.objects ?? []) {
    const pid = (o as any).parentId ?? null;
    if (!pid) continue;
    const p = byId.get(pid);
    if (!p || !isFrame(p)) continue;
    if (o.id === pid) continue;
    const f: any = p as any;
    f.children = Array.isArray(f.children) ? f.children : [];
    if (!f.children.includes(o.id)) f.children.push(o.id);
  }
}



function getPasteContext(screen: Screen, selectedObjectId?: string): { parentId: string | null; afterId: string | null } {
  const objs = screen.objects ?? [];
  const byId = new Map(objs.map((o) => [o.id, o] as const));
  const sel = selectedObjectId ? byId.get(selectedObjectId) : undefined;
  if (!sel) return { parentId: null, afterId: null };

  // If selection is a Frame: paste/duplicate should create a sibling next to it (same parent), not inside itself.
  if (isFrame(sel as any)) {
    const pid = ((sel as any).parentId as string) ?? null;
    return { parentId: pid, afterId: sel.id };
  }

  const pid = ((sel as any).parentId as string) ?? null;

  // If selection is inside a frame: user wants paste/duplicate to go to the END of that frame (so layout order works).
  if (pid) {
    const p = byId.get(pid);
    if (p && isFrame(p as any)) {
      const ch = Array.isArray((p as any).children) ? ((p as any).children as string[]) : [];
      return { parentId: pid, afterId: ch.length ? ch[ch.length - 1] : null };
    }
  }

  // Root: place right after the selected object (best match to Figma and user's expectation).
  return { parentId: null, afterId: sel.id };
}

function insertObjectIntoParent(
  screen: Screen,
  obj: AnyObj,
  ctx: { parentId: string | null; afterId: string | null },
) {
  const objs = screen.objects ?? [];
  const byId = new Map(objs.map((o) => [o.id, o] as const));

  // Frame parent: use children ordering
  if (ctx.parentId) {
    const p = byId.get(ctx.parentId);
    if (p && isFrame(p as any)) {
      (obj as any).parentId = ctx.parentId;
      const f: any = p as any;
      f.children = Array.isArray(f.children) ? f.children : [];
      const afterIdx = ctx.afterId ? f.children.indexOf(ctx.afterId) : -1;
      const ins = afterIdx >= 0 ? afterIdx + 1 : f.children.length;
      f.children.splice(ins, 0, obj.id);
      return;
    }
  }

  // Root parent
  (obj as any).parentId = null;

  // Preserve relative order at root using z as a seed for rebuildZ().
  const afterObj = ctx.afterId ? byId.get(ctx.afterId) : undefined;
  const maxZ = objs.reduce((m, o) => Math.max(m, o.z ?? 0), 0);
  obj.z = afterObj ? (afterObj.z ?? 0) + 0.01 : maxZ + 1;
}
function getTopLevelIds(screen: Screen): string[] {
  const objs = screen.objects ?? [];
  return objs
    .filter((o) => !(o as any).parentId)
    .sort((a, b) => a.z - b.z)
    .map((o) => o.id);
}

function rebuildZ(screen: Screen) {
  const byId = new Map((screen.objects ?? []).map((o) => [o.id, o] as const));
  const out: AnyObj[] = [];
  const visit = (id: string) => {
    const o = byId.get(id);
    if (!o) return;
    out.push(o);
    if (isFrame(o)) {
      const kids = ((o as any).children ?? []) as string[];
      for (const cid of kids) visit(cid);
    }
  };

  const top = getTopLevelIds(screen);
  for (const id of top) visit(id);

  // any orphaned objects (not reached due to stale children lists) — append at end
  const seen = new Set(out.map((o) => o.id));
  for (const o of screen.objects ?? []) {
    if (!seen.has(o.id)) out.push(o);
  }

  // assign z in traversal order
  for (let i = 0; i < out.length; i++) {
    out[i].z = i;
  }
}

function removeFromParent(screen: Screen, objectId: string, parentId: string | null | undefined) {
  if (!parentId) return;
  const p = (screen.objects ?? []).find((o) => o.id === parentId);
  if (!p || !isFrame(p)) return;
  (p as any).children = Array.isArray((p as any).children) ? (p as any).children : [];
  (p as any).children = ((p as any).children as string[]).filter((id) => id !== objectId);
}

function insertIntoParent(
  screen: Screen,
  objectId: string,
  parentId: string | null,
  index: number | null,
) {
  if (!parentId) {
    // root level — we encode order through z, so index handling happens by adjusting z later
    return;
  }
  const p = (screen.objects ?? []).find((o) => o.id === parentId);
  if (!p || !isFrame(p)) return;
  (p as any).children = Array.isArray((p as any).children) ? (p as any).children : [];
  const arr = (p as any).children as string[];
  const cleaned = arr.filter((id) => id !== objectId);
  const at = index == null ? cleaned.length : Math.max(0, Math.min(cleaned.length, index));
  cleaned.splice(at, 0, objectId);
  (p as any).children = cleaned;
}

export const Actions = {
  hydrate(project: Project, assetBytes: Record<string, Uint8Array>) {
    const safeProject: Project = {
      ...project,
      screens: project.screens && project.screens.length ? project.screens : [makeDefaultScreen("screen_1", "Screen 1")],
    };
    for (const s of safeProject.screens) {
      for (const o of s.objects) {
        // migrate gauge defaults (old projects may miss dataType/range fields)
        (o as any).gauge = makeDefaultGauge((o as any).gauge);
        // migrate image animation defaults
        if ((o as any).type === "Image") {
          const anim = (o as any).settings?.animation;
          if (!anim || typeof anim.type !== "string") {
            (o as any).settings = { ...(o as any).settings, animation: { type: "None" } };
          }
        }
      }
      ensureParentLinks(s);
      rebuildZ(s);
    }
    const first = safeProject.screens[0].id;
    setState(
      {
        ...state,
        project: safeProject,
        assetBytes,
        selectedScreenId: first,
        selectedObjectId: undefined,
        selectedObjectIds: [],
        selectionAnchorId: undefined,
        assetsPanel: { isOpen: false, tab: "Images" },
      },
      { history: false },
    );
  },

  // for drag/resize batching
  beginGesture() {
    beginHistoryBatch();
  },
  endGesture() {
    endHistoryBatch();
  },

  setProjectName(name: string) {
    setState(
      produce(state, (d) => {
        d.project.project.name = name;
      }),
    );
  },

  selectScreen(id: string) {
    const ok = state.project.screens.some((s) => s.id === id);
    setState(
      {
        ...state,
        selectedScreenId: ok ? id : (state.project.screens[0]?.id ?? "screen_1"),
        selectedObjectId: undefined,
        selectedObjectIds: [],
        selectionAnchorId: undefined,
      },
      { history: false },
    );
  },

  selectObject(id?: string) {
    setState(
      {
        ...state,
        selectedObjectId: id,
        selectedObjectIds: id ? [id] : [],
        selectionAnchorId: id,
      },
      { history: false },
    );
  },

  toggleObjectSelection(id: string) {
    const cur = state.selectedObjectIds?.length ? [...state.selectedObjectIds] : state.selectedObjectId ? [state.selectedObjectId] : [];
    const has = cur.includes(id);
    const next = has ? cur.filter((x) => x !== id) : [...cur, id];
    const primary = next.length ? next[next.length - 1] : undefined;

    setState(
      {
        ...state,
        selectedObjectIds: next,
        selectedObjectId: primary,
        selectionAnchorId: state.selectionAnchorId ?? id,
      },
      { history: false },
    );
  },

  selectRange(toId: string) {
    const screen = getSelectedScreen(state);
    const ordered = orderedObjectIds(screen);
    const anchor = state.selectionAnchorId ?? state.selectedObjectId ?? toId;

    const ia = ordered.indexOf(anchor);
    const ib = ordered.indexOf(toId);
    if (ia < 0 || ib < 0) {
      Actions.selectObject(toId);
      return;
    }

    const [from, to] = ia <= ib ? [ia, ib] : [ib, ia];
    const ids = ordered.slice(from, to + 1);

    setState(
      {
        ...state,
        selectedObjectIds: ids,
        selectedObjectId: toId,
        selectionAnchorId: anchor,
      },
      { history: false },
    );
  },

  clearSelection() {
    setState(
      {
        ...state,
        selectedObjectId: undefined,
        selectedObjectIds: [],
        selectionAnchorId: undefined,
      },
      { history: false },
    );
  },

  selectAllObjects() {
    const screen = getSelectedScreen(state);
    const ids = orderedObjectIds(screen);
    const primary = ids.length ? ids[ids.length - 1] : undefined;
    setState(
      {
        ...state,
        selectedObjectIds: ids,
        selectedObjectId: primary,
        selectionAnchorId: ids[0],
      },
      { history: false },
    );
  },

  // ✅ COPY: object(s) if selected, otherwise screen
  copySelected() {
    const objs = getSelectedObjects(state);
    const scr = getSelectedScreen(state);

    if (objs.length === 1 && scr && isFrame(objs[0])) {
      const byId = new Map((scr.objects ?? []).map((o) => [o.id, o] as const));
      const ids = collectFrameDescendants(scr, objs[0].id);
      const pack = ids.map((id) => safeClone(byId.get(id)!) as AnyObj).filter(Boolean) as AnyObj[];
      clipboard = { kind: "objects", objs: pack };
      return;
    }

    if (objs.length === 1) {
      clipboard = { kind: "object", obj: safeClone(objs[0]) as AnyObj };
      return;
    }
    if (objs.length > 1) {
      clipboard = { kind: "objects", objs: safeClone(objs) as AnyObj[] };
      return;
    }

    if (scr) clipboard = { kind: "screen", screen: safeClone(scr) as Screen };
  },

  // ✅ PASTE: object(s) OR screen depending on clipboard
  paste() {
    if (!clipboard) return;

    if (clipboard.kind === "object") {
      setState(
        produce(state, (d) => {
          const s = getSelectedScreenDraft(d);
          ensureParentLinks(s);

          const ctx = getPasteContext(s, d.selectedObjectId);

          // Clipboard object may come from another screen, so clone directly from the packed data.
          const { roots, all } = clonePackedObjectsForPaste([clipboard!.obj], s);
          const root = roots[0];
          if (!root) return;

          for (const o of all) s.objects.push(o);

          insertObjectIntoParent(s, root, ctx);

          // If inserted into a frame, nudge inside padding a bit for visibility.
          if (ctx.parentId) {
            const p = (s.objects ?? []).find((o) => o.id === ctx.parentId);
            if (p && isFrame(p)) {
              const pad = (p as any).settings?.padding ?? { left: 0, top: 0 };
              (root as any).transform.x = (pad.left ?? 0) + 6;
              (root as any).transform.y = (pad.top ?? 0) + 6;
            }
          }

          rebuildZ(s);

          d.selectedObjectId = root.id;
          d.selectedObjectIds = [root.id];
          d.selectionAnchorId = root.id;
        }),
      );
      return;
    }

    if (clipboard.kind === "objects") {
  setState(
    produce(state, (d) => {
      const s = getSelectedScreenDraft(d);
      ensureParentLinks(s);

      const ctx = getPasteContext(s, d.selectedObjectId);

      const { roots, all } = clonePackedObjectsForPaste(clipboard!.objs, s);
      for (const o of all) s.objects.push(o);

      const created: string[] = [];
      for (const r of roots) {
        insertObjectIntoParent(s, r, ctx);

        if (ctx.parentId) {
          const p = (s.objects ?? []).find((o) => o.id === ctx.parentId);
          if (p && isFrame(p)) {
            const pad = (p as any).settings?.padding ?? { left: 0, top: 0 };
            (r as any).transform.x = (pad.left ?? 0) + 6;
            (r as any).transform.y = (pad.top ?? 0) + 6;
          }
        }

        created.push(r.id);

        if (!ctx.parentId && ctx.afterId) ctx.afterId = r.id;
      }

      rebuildZ(s);

      d.selectedObjectIds = created;
      d.selectedObjectId = created.length ? created[created.length - 1] : undefined;
      d.selectionAnchorId = created.length ? created[0] : undefined;
    }),
  );
  return;
}

    if (clipboard.kind === "screen") {
      setState(
        produce(state, (d) => {
          const cloned = cloneScreenForPaste(clipboard!.screen);
          d.project.screens.push(cloned);
          d.selectedScreenId = cloned.id;
          d.selectedObjectId = undefined;
          d.selectedObjectIds = [];
          d.selectionAnchorId = undefined;
        }),
      );
    }
  },

  // ✅ DUPLICATE: object(s) if selected, otherwise screen
  duplicateSelected() {
    const objs = getSelectedObjects(state);
    if (objs.length) {
      setState(
        produce(state, (d) => {
          const s = getSelectedScreenDraft(d);
          ensureParentLinks(s);

          const ctx = getPasteContext(s, d.selectedObjectId);


          const created: string[] = [];
          for (const src of objs) {
            const { root, all } = cloneObjectOrSubtreeForPaste(src, s);
            for (const o of all) s.objects.push(o);

            insertObjectIntoParent(s, root, ctx);

            if (ctx.parentId) {
              const p = (s.objects ?? []).find((o) => o.id === ctx.parentId);
              if (p && isFrame(p)) {
                const pad = (p as any).settings?.padding ?? { left: 0, top: 0 };
                (root as any).transform.x = (pad.left ?? 0) + 6;
                (root as any).transform.y = (pad.top ?? 0) + 6;
              }
            }

            // Keep appending subsequent items after the previous one when inserting at root next-to-selection.
            if (!ctx.parentId && ctx.afterId) {
              ctx.afterId = root.id;
            }

            created.push(root.id);
          }

          rebuildZ(s);

          d.selectedObjectIds = created;
          d.selectedObjectId = created.length ? created[created.length - 1] : undefined;
          d.selectionAnchorId = created.length ? created[0] : undefined;
        }),
      );
      return;
    }

    const scr = getSelectedScreen(state);
    if (!scr) return;

    setState(
      produce(state, (d) => {
        const cloned = cloneScreenForPaste(scr);
        d.project.screens.push(cloned);
        d.selectedScreenId = cloned.id;
        d.selectedObjectId = undefined;
        d.selectedObjectIds = [];
        d.selectionAnchorId = undefined;
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
        d.selectedObjectIds = [];
        d.selectionAnchorId = undefined;
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
          d.selectedObjectIds = [];
          d.selectionAnchorId = undefined;
        }
      }),
    );
  },

  addObject(type: AnyObj["type"]) {
    const screen = getSelectedScreen(state);
    const id = "obj_" + nanoid(6);
    const z = nextZ(screen);

    let obj: AnyObj;

    if (type === "Label") {
      obj = {
        id,
        type,
        name: `Label ${screen.objects.filter((o) => o.type === "Label").length + 1}`,
        z,
        gauge: makeDefaultGauge(),
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
        gauge: makeDefaultGauge(),
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        settings: {
          animation: { type: "None" },
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
        gauge: makeDefaultGauge(),
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
    } else if (type === "Frame") {
      obj = {
        id,
        type,
        name: `Frame ${screen.objects.filter((o) => (o as any).type === "Frame").length + 1}`,
        z,
        gauge: makeDefaultGauge(),
        transform: { x: 0, y: 0, rotation: 0, width: 420, height: 260 },
        settings: {
          layout: "None",
          padding: { left: 12, top: 12, right: 12, bottom: 12 },
          gapX: 12,
          gapY: 12,
          gridCols: 2,
          gridRows: 2,
        },
        children: [],
      } as any;
    } else {
      obj = {
        id,
        type,
        name: `Bar ${screen.objects.filter((o) => o.type === "Bar").length + 1}`,
        z,
        gauge: makeDefaultGauge(),
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

        // If currently selected object is a Frame — auto-nest the new object inside it.
        const parent = s.objects.find((o) => o.id === d.selectedObjectId);
        if (isFrame(parent) && obj.id !== parent.id) {
          (parent as any).children = Array.isArray((parent as any).children) ? (parent as any).children : [];
          (parent as any).children.push(obj.id);
          (obj as any).parentId = parent.id;

          // Place near top-left of frame content for a nice default.
          const pad = (parent as any).settings?.padding ?? { left: 0, top: 0 };
          (obj as any).transform.x = pad.left ?? 0;
          (obj as any).transform.y = pad.top ?? 0;
        }

        d.selectedObjectId = id;
        d.selectedObjectIds = [id];
        d.selectionAnchorId = id;
      }),
    );
  },

  deleteSelectedObjects() {
    const ids = state.selectedObjectIds?.length ? state.selectedObjectIds : state.selectedObjectId ? [state.selectedObjectId] : [];
    if (!ids.length) return;

    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        // cascade delete (frames delete all descendants)
        const allIds: string[] = [];
        for (const id of ids) allIds.push(...collectDescendants(s as any, id));
        const uniq = Array.from(new Set(allIds));

        // unlink from frames
        removeFromAllFrames(s as any, uniq);

        s.objects = s.objects.filter((o) => !uniq.includes(o.id));
        d.selectedObjectId = undefined;
        d.selectedObjectIds = [];
        d.selectionAnchorId = undefined;
      }),
    );
  },

  deleteObject(objectId: string) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const ids = collectDescendants(s as any, objectId);
        removeFromAllFrames(s as any, ids);
        s.objects = s.objects.filter((o) => !ids.includes(o.id));

        if (ids.includes(d.selectedObjectId as any)) d.selectedObjectId = undefined;
        d.selectedObjectIds = (d.selectedObjectIds ?? []).filter((id) => !ids.includes(id));
        if (ids.includes(d.selectionAnchorId as any)) d.selectionAnchorId = d.selectedObjectIds[0];
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




  /**
   * Move multiple objects at once (multi-selection drag & drop).
   * Keeps relative order based on current screen.z traversal.
   * - "inside" appends to the end of target frame (or root fallback)
   * - "before"/"after" inserts as a block next to target within the same parent
   */
  moveObjects(objectIds: string[], targetId: string | null, where: "before" | "after" | "inside") {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        ensureParentLinks(s);

        const byId = new Map((s.objects ?? []).map((o) => [o.id, o] as const));
        const ids = Array.from(new Set(objectIds)).filter((id) => byId.has(id));
        if (!ids.length) return;

        // Dropping onto one of the dragged items is a no-op
        if (targetId && ids.includes(targetId)) return;

        const orderIndex = new Map<string, number>();
        (s.z ?? []).forEach((id, i) => orderIndex.set(id, i));
        ids.sort((a, b) => (orderIndex.get(a) ?? 1e9) - (orderIndex.get(b) ?? 1e9));

        // For before/after we apply in reverse to preserve block order
        const applyIds = where === "inside" ? ids : [...ids].reverse();

        for (const objectId of applyIds) {
          const obj = byId.get(objectId) as any;
          if (!obj) continue;

          // disallow dropping into itself / descendants
          const descendants = new Set(collectDescendants(s, objectId));
          if (targetId && descendants.has(targetId)) continue;

          const oldParent = (obj as any).parentId ?? null;
          removeFromParent(s, objectId, oldParent);

          if (where === "inside") {
            const target = targetId ? (byId.get(targetId) as any) : undefined;

            const frameTarget =
              target && isFrame(target)
                ? target
                : target
                  ? (byId.get(((target as any).parentId as string) ?? "") as any)
                  : undefined;

            if (!frameTarget || !isFrame(frameTarget)) {
              (obj as any).parentId = null;
              // append at root end
              // moveObjectIndexed handles z; but we keep simple and rebuildZ later
            } else {
              (obj as any).parentId = (frameTarget as any).id;
              // append to the end (Figma-like)
              insertIntoParent(s, objectId, (frameTarget as any).id, null);
            }
            continue;
          }

          // before/after
          const target = targetId ? (byId.get(targetId) as any) : undefined;
          const targetParent = target ? (((target as any).parentId as string | null) ?? null) : null;

          if (!target) {
            (obj as any).parentId = null;
            continue;
          }

          (obj as any).parentId = targetParent;

          if (targetParent) {
            const p = byId.get(targetParent) as any;
            if (p && isFrame(p)) {
              const kids = Array.isArray(p.children) ? (p.children as string[]) : [];
              const cleaned = kids.filter((id) => id !== objectId);
              const ti = cleaned.indexOf(target.id);
              const at = ti < 0 ? cleaned.length : where === "before" ? ti : ti + 1;
              cleaned.splice(at, 0, objectId);
              p.children = cleaned;
              continue;
            }
          }

          // root ordering by z
          const top = getTopLevelIds(s).filter((id) => id !== objectId);
          const ti = top.indexOf(target.id);
          const at = ti < 0 ? top.length : where === "before" ? ti : ti + 1;
          top.splice(at, 0, objectId);

          for (let i = 0; i < top.length; i++) {
            const ro: any = byId.get(top[i]);
            if (ro) ro.z = i;
          }
        }

        rebuildZ(s);
      }),
    );
  },

  /**
   * Move object into a parent frame (or root when parentId is null) at a specific child index.
   * Used by Canvas drag-reorder (Figma-like).
   */
  moveObjectIndexed(objectId: string, parentId: string | null, index: number) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        ensureParentLinks(s);

        const byId = new Map((s.objects ?? []).map((o) => [o.id, o] as const));
        const obj: any = byId.get(objectId);
        if (!obj) return;

        // Prevent self-drop / descendant cycles
        if (parentId) {
          if (parentId === objectId) return;
          const descendants = new Set(collectDescendants(s, objectId));
          if (descendants.has(parentId)) return;
        }

        const oldParent = (obj as any).parentId as string | null | undefined;
        if (oldParent) {
          const op: any = byId.get(oldParent);
          if (op && isFrame(op)) {
            op.children = (op.children ?? []).filter((cid: string) => cid !== objectId);
          }
        }

        if (parentId) {
          const p: any = byId.get(parentId);
          if (!p || !isFrame(p)) return;
          (obj as any).parentId = parentId;
          const arr: string[] = Array.isArray(p.children) ? [...p.children] : [];
          const clamped = Math.max(0, Math.min(index, arr.length));
          // remove if already present
          const cleaned = arr.filter((cid) => cid !== objectId);
          cleaned.splice(clamped, 0, objectId);
          p.children = cleaned;
        } else {
          (obj as any).parentId = null;

          // Reorder among root objects via z
          const roots = (s.objects ?? []).filter((o: any) => !o.parentId).sort((a, b) => a.z - b.z);
          const ids = roots.map((o) => o.id).filter((id) => id !== objectId);
          const clamped = Math.max(0, Math.min(index, ids.length));
          ids.splice(clamped, 0, objectId);

          for (let i = 0; i < ids.length; i++) {
            const ro: any = byId.get(ids[i]);
            if (ro) ro.z = i;
          }
        }

        rebuildZ(s);
      }),
    );
  },
  reorderObject(objectId: string, toIndex: number) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const arr = [...(s.objects ?? [])].sort((a, b) => a.z - b.z);
        const from = arr.findIndex((o) => o.id === objectId);
        if (from < 0) return;
        const clamped = Math.max(0, Math.min(toIndex, arr.length - 1));
        if (from === clamped) return;
        const [moved] = arr.splice(from, 1);
        arr.splice(clamped, 0, moved);
        for (let i = 0; i < arr.length; i++) arr[i].z = i;
        s.objects = arr;
      }),
    );
  },

  /**
   * Figma-like move/reorder:
   * where = "before" | "after" | "inside"
   * - "inside" nests into target Frame (at end)
   * - "before"/"after" inserts next to target within the same parent (or at root)
   */
  moveObject(objectId: string, targetId: string | null, where: "before" | "after" | "inside") {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        ensureParentLinks(s);

        const byId = new Map((s.objects ?? []).map((o) => [o.id, o] as const));
        const obj = byId.get(objectId);
        if (!obj) return;

        // disallow dropping into itself / descendants
        const descendants = new Set(collectDescendants(s, objectId));
        if (targetId && descendants.has(targetId)) return;

        const oldParent = (obj as any).parentId ?? null;

        // Remove from old parent list
        removeFromParent(s, objectId, oldParent);

        if (where === "inside") {
          const target = targetId ? byId.get(targetId) : undefined;

          // If user drops "inside" a non-frame row (e.g. onto a child),
          // interpret it as nesting into the closest frame (the target itself if frame,
          // otherwise its parent if that is a frame).
          const frameTarget =
            target && isFrame(target)
              ? target
              : target
                ? byId.get(((target as any).parentId as string) ?? "")
                : undefined;

          if (!frameTarget || !isFrame(frameTarget)) {
            // fallback to root
            (obj as any).parentId = null;
          } else {
            (obj as any).parentId = (frameTarget as any).id;
            // append to the end (Figma-like)
            insertIntoParent(s, objectId, (frameTarget as any).id, null);
          }
          rebuildZ(s);
          return;
        }

        // before/after
        const target = targetId ? byId.get(targetId) : undefined;
        const targetParent = target ? ((target as any).parentId ?? null) : null;

        // if target missing -> move to root end
        if (!target) {
          (obj as any).parentId = null;
          rebuildZ(s);
          return;
        }

        // insert among siblings
        (obj as any).parentId = targetParent;

        if (targetParent) {
          // sibling list is parent.children
          const p = byId.get(targetParent);
          if (p && isFrame(p)) {
            const kids = Array.isArray((p as any).children) ? ((p as any).children as string[]) : [];
            const cleaned = kids.filter((id) => id !== objectId);
            const ti = cleaned.indexOf(target.id);
            const at = ti < 0 ? cleaned.length : where === "before" ? ti : ti + 1;
            cleaned.splice(at, 0, objectId);
            (p as any).children = cleaned;
            rebuildZ(s);
            return;
          }
        }

        // root level ordering: adjust z values by constructing desired top-level order
        const top = getTopLevelIds(s).filter((id) => id !== objectId);
        const ti = top.indexOf(target.id);
        const at = ti < 0 ? top.length : where === "before" ? ti : ti + 1;
        top.splice(at, 0, objectId);

        // encode top-level order into z, then rebuildZ for full traversal stability
        // First, set z for top-level in the desired order (keep relative for others until rebuild).
        for (let i = 0; i < top.length; i++) {
          const o = byId.get(top[i]);
          if (o) o.z = i;
        }
        (obj as any).parentId = null;
        rebuildZ(s);
      }),
    );
  },

  toggleObjectVisible(objectId: string) {
    setState(
      produce(state, (d) => {
        const s = getSelectedScreenDraft(d);
        const o: any = (s.objects as any[]).find((x: any) => x.id === objectId);
        if (!o) return;
        const cur = o.visible !== false;
        o.visible = !cur;
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
        const obj: any = (s.objects as any[]).find((o: any) => o.id === objectId);
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
          const o: any = (s.objects as any[]).find((x: any) => x.id === pick.objectId);
          if (!o) return;
          if (pick.field === "imageAssetId" && o.type === "Image") o.settings.imageAssetId = assetId;
          if (pick.field === "fontAssetId" && o.type === "Label") o.settings.fontAssetId = assetId;
        }

        d.assetsPanel = { isOpen: false, tab: "Images" };
      }),
    );
  },
};
function makeDefaultGauge(prev?: any): any {
  const g = prev || {};
  const gaugeType = typeof g.gaugeType === "string" ? g.gaugeType : "None";
  const dataType =
    typeof g.dataType === "string"
      ? g.dataType
      : gaugeType && gaugeType !== "None"
        ? "OBD_CAN"
        : "None";
  const rangeMin = typeof g.rangeMin === "number" ? g.rangeMin : undefined;
  const rangeMax = typeof g.rangeMax === "number" ? g.rangeMax : undefined;
  const updateRateMs = typeof g.updateRateMs === "number" && isFinite(g.updateRateMs) ? g.updateRateMs : 100;
  const smoothingFactor =
    typeof g.smoothingFactor === "number" && isFinite(g.smoothingFactor) ? g.smoothingFactor : 0;

    const curve = Array.isArray(g.curve)
    ? g.curve
        .map((p: any) => {
          const input = typeof p?.input === "number" ? p.input : Number(p?.input);
          const output = typeof p?.output === "number" ? p.output : Number(p?.output);
          if (!isFinite(input) || !isFinite(output)) return null;
          return { input, output };
        })
        .filter(Boolean)
    : undefined;

  return { dataType, gaugeType: gaugeType || "None", rangeMin, rangeMax, curve, updateRateMs, smoothingFactor };
}

