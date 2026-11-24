const memory = new Map<string, Blob>();
const key = (scope: string, id: string) => `${scope}:${id}`;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(Error("Device audio storage unavailable."));
      return;
    }
    const r = indexedDB.open("assignment-hub-vocal-audio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("takes");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("Could not open device audio storage."));
    r.onblocked = () =>
      reject(Error("Close other studio tabs and retry audio storage."));
  });
}
export async function storeVocal(scope: string, id: string, blob: Blob) {
  memory.set(key(scope, id), blob);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("takes", "readwrite");
      tx.objectStore("takes").put(blob, key(scope, id));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          Error("Could not save audio. Download the take before leaving."),
        );
      tx.onabort = () =>
        reject(Error("Device audio storage is full. Download the take."));
    });
  } finally {
    db.close();
  }
}
export async function readVocal(
  scope: string,
  id: string,
): Promise<Blob | undefined> {
  const k = key(scope, id);
  if (memory.has(k)) return memory.get(k);
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("takes", "readonly"),
        r = tx.objectStore("takes").get(k);
      r.onsuccess = () =>
        resolve(r.result instanceof Blob ? r.result : undefined);
      r.onerror = () => reject(Error("Could not read saved voice audio."));
    });
  } finally {
    db.close();
  }
}
export async function removeVocal(scope: string, id: string) {
  memory.delete(key(scope, id));
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("takes", "readwrite");
      tx.objectStore("takes").delete(key(scope, id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(Error("Could not remove saved audio."));
    });
  } finally {
    db.close();
  }
}
