const DB = "nf_dash";
const STORE = "kv";
const KEY_SKIN = "currentSkin";
const KEY_PROJECT = "lastProject";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(key: string, value: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function get<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}
async function del(key: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const Idb = {
  async saveCurrentSkin(blob: Blob) {
    await put(KEY_SKIN, blob);
  },
  async loadCurrentSkin(): Promise<Blob | undefined> {
    return await get<Blob>(KEY_SKIN);
  },
  async clearCurrentSkin() {
    await del(KEY_SKIN);
  },

  async saveLastProject(json: any) {
    await put(KEY_PROJECT, json);
  },
  async loadLastProject<T>(): Promise<T | undefined> {
    return await get<T>(KEY_PROJECT);
  },
};
