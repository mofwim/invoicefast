/**
 * IndexedDB persistence for scanned documents.
 *
 * Blobs go in directly (IndexedDB stores them natively) so a 30-page scan does
 * not have to live in memory or get base64-inflated into localStorage. Nothing
 * leaves the device.
 */

const DB_NAME = 'scanfast';
const DB_VERSION = 1;
const DOCS = 'docs';
const PAGES = 'pages';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) {
        const s = db.createObjectStore(DOCS, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(PAGES)) {
        const s = db.createObjectStore(PAGES, { keyPath: 'id' });
        s.createIndex('docId', 'docId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        let result;
        try {
          result = fn(s);
        } catch (err) {
          reject(err);
          return;
        }
        t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const wrap = (req) => ({ __req: req });

export function uid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

/* ------------------------------------------------------------------ */
/* documents                                                            */
/* ------------------------------------------------------------------ */

export async function listDocs() {
  const docs = await tx(DOCS, 'readonly', (s) => wrap(s.getAll()));
  return (docs || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDoc(id) {
  return tx(DOCS, 'readonly', (s) => wrap(s.get(id)));
}

export async function putDoc(doc) {
  await tx(DOCS, 'readwrite', (s) => s.put(doc));
  return doc;
}

export async function createDoc(name) {
  const now = Date.now();
  const doc = { id: uid(), name, createdAt: now, updatedAt: now, pageCount: 0, thumb: null };
  await putDoc(doc);
  return doc;
}

export async function renameDoc(id, name) {
  const doc = await getDoc(id);
  if (!doc) return null;
  doc.name = name;
  doc.updatedAt = Date.now();
  await putDoc(doc);
  return doc;
}

export async function deleteDoc(id) {
  const pages = await getPages(id);
  await tx(PAGES, 'readwrite', (s) => {
    pages.forEach((p) => s.delete(p.id));
  });
  await tx(DOCS, 'readwrite', (s) => s.delete(id));
}

/* ------------------------------------------------------------------ */
/* pages                                                                */
/* ------------------------------------------------------------------ */

export async function getPages(docId) {
  const all = await tx(PAGES, 'readonly', (s) => wrap(s.index('docId').getAll(docId)));
  return (all || []).sort((a, b) => a.index - b.index);
}

export async function putPage(page) {
  await tx(PAGES, 'readwrite', (s) => s.put(page));
  return page;
}

export async function putPages(pages) {
  await tx(PAGES, 'readwrite', (s) => {
    pages.forEach((p) => s.put(p));
  });
  return pages;
}

export async function deletePage(id) {
  await tx(PAGES, 'readwrite', (s) => s.delete(id));
}

/**
 * Refresh a document's denormalised page count and cover thumbnail so the
 * library list can render without loading every page blob.
 */
export async function touchDoc(docId, thumbBlob) {
  const doc = await getDoc(docId);
  if (!doc) return null;
  const pages = await getPages(docId);
  doc.pageCount = pages.length;
  doc.updatedAt = Date.now();
  if (thumbBlob !== undefined) doc.thumb = thumbBlob;
  else if (pages[0]) doc.thumb = pages[0].thumb || doc.thumb;
  await putDoc(doc);
  return doc;
}

/** Rewrite the `index` field so page order matches array order. */
export async function reorderPages(pages) {
  const renumbered = pages.map((p, i) => ({ ...p, index: i }));
  await putPages(renumbered);
  return renumbered;
}

/** Rough storage usage, if the browser exposes it. */
export async function storageEstimate() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
