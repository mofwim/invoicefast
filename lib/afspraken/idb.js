/**
 * Attachment storage.
 *
 * The appointments themselves live in localStorage — small, synchronous, easy.
 * The files that come with them (a referral letter, a ticket, a floor plan) do
 * not fit there, so their bytes go into IndexedDB and the appointment keeps
 * only a reference. Everything stays on the device; nothing is uploaded.
 */

const DB_NAME = "mijn-afspraken";
const DB_VERSION = 1;
const STORE = "bijlagen";

let dbPromise = null;

function supported() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  if (!supported()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("sourceId", "sourceId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    // Private-browsing modes can refuse outright; the app must still work.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function run(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        let tx;
        try {
          tx = db.transaction(STORE, mode);
        } catch {
          return resolve(null);
        }
        const store = tx.objectStore(STORE);
        let result = null;
        try {
          result = work(store);
        } catch {
          return resolve(null);
        }
        tx.oncomplete = () => resolve(result && result.__request ? result.__request.result : result);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
      })
  );
}

const wrap = (request) => ({ __request: request });

export async function putAttachment({ id, sourceId, name, mime, size, bytes }) {
  if (!bytes || !id) return false;
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mime || "application/octet-stream" });
  const stored = await run("readwrite", (store) =>
    wrap(store.put({ id, sourceId: sourceId || "", name, mime, size: size ?? blob.size, blob }))
  );
  return stored !== null;
}

export async function getAttachment(id) {
  if (!id) return null;
  return run("readonly", (store) => wrap(store.get(id)));
}

/** Object URL for an attachment, ready to hand to a download link. */
export async function attachmentUrl(id) {
  const record = await getAttachment(id);
  if (!record || !record.blob) return null;
  try {
    return URL.createObjectURL(record.blob);
  } catch {
    return null;
  }
}

export async function deleteAttachmentsForSource(sourceId) {
  return run("readwrite", (store) => {
    const index = store.index("sourceId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(sourceId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    return true;
  });
}

export async function clearAttachments() {
  return run("readwrite", (store) => wrap(store.clear()));
}

export async function attachmentStats() {
  const records = await run("readonly", (store) => wrap(store.getAll()));
  if (!records) return { count: 0, bytes: 0 };
  return {
    count: records.length,
    bytes: records.reduce((sum, r) => sum + (r.size || r.blob?.size || 0), 0),
  };
}

export const attachmentsSupported = supported;
