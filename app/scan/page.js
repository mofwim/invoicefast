'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  createDoc,
  deleteDoc,
  deletePage,
  getPages,
  listDocs,
  putPage,
  renameDoc,
  reorderPages,
  touchDoc,
  uid,
} from '@/lib/scan/db';
import { detectDocument } from '@/lib/scan/detect';
import { imageDataToBlob, makeThumbData, renderPage, toImageData } from '@/lib/scan/pipeline';
import CameraView from './components/CameraView';
import CropView from './components/CropView';
import EditView from './components/EditView';
import ExportSheet from './components/ExportSheet';
import OcrSheet from './components/OcrSheet';
import { Busy, Icon, IconButton, Toast } from './components/ui';
import './scan.css';

/** Longest side kept for the untouched capture, so re-cropping stays lossless-ish. */
const ORIGINAL_MAX_SIDE = 2600;

const DEFAULT_EDIT = { filter: 'auto', rotation: 0, adjust: { brightness: 0, contrast: 0 }, ratio: 'auto' };

function docTitle(n) {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `مسح ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}${n ? ` (${n})` : ''}`;
}

function formatDate(ts) {
  try {
    return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(ts);
  } catch {
    return new Date(ts).toLocaleString();
  }
}

/** Keeps object URLs alive for a list of blobs and revokes them on change. */
function useBlobUrls(items, key) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    const made = {};
    for (const item of items) {
      const blob = item?.[key];
      if (blob) made[item.id] = URL.createObjectURL(blob);
    }
    setUrls(made);
    return () => Object.values(made).forEach((u) => URL.revokeObjectURL(u));
  }, [items, key]);
  return urls;
}

export default function ScanApp() {
  const [view, setView] = useState('library');
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [pages, setPages] = useState([]);
  const [pending, setPending] = useState(null); // { source: ImageData, quad, pageId? , edit? }
  const [editIndex, setEditIndex] = useState(-1);
  const [sheet, setSheet] = useState(null); // 'export' | 'ocr' | 'rename'
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState('');
  const [booted, setBooted] = useState(false);
  const toastTimer = useRef(0);

  // Mirrors of the two pieces of state that async flows read after updating
  // them, where the render closure would still hold the previous value.
  const pagesRef = useRef(pages);
  const activeDocRef = useRef(activeDoc);
  const noCameraRef = useRef(false);
  const markNoCamera = useCallback(() => {
    noCameraRef.current = true;
  }, []);
  const applyPages = useCallback((next) => {
    pagesRef.current = next;
    setPages(next);
  }, []);
  const applyDoc = useCallback((doc) => {
    activeDocRef.current = doc;
    setActiveDoc(doc);
  }, []);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  /* ------------------------------------------------------------- boot */

  const refreshDocs = useCallback(async () => {
    try {
      setDocs(await listDocs());
    } catch {
      say('تعذّر فتح مخزن المستندات في هذا المتصفح');
    }
  }, [say]);

  useEffect(() => {
    refreshDocs().finally(() => setBooted(true));
  }, [refreshDocs]);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Entry points other than a plain visit: the launcher shortcut (?new=1) and
  // Android's share sheet, whose files the service worker parked in a cache.
  const entryHandled = useRef(false);
  useEffect(() => {
    if (!booted || entryHandled.current) return;
    entryHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('shared');
    const wantsNew = params.get('new');
    if (!shared && !wantsNew) return;
    window.history.replaceState({}, '', '/scan');

    (async () => {
      if (!shared) {
        startNewScan();
        return;
      }
      setBusy('جارٍ استقبال الصور المشاركة…');
      try {
        const cache = await caches.open('scanfast-share');
        const keys = await cache.keys();
        const files = [];
        for (const key of keys) {
          const res = await cache.match(key);
          if (!res) continue;
          const blob = await res.blob();
          const name = decodeURIComponent(res.headers.get('x-filename') || 'shared.jpg');
          files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }));
          await cache.delete(key);
        }
        if (!files.length) return;
        const doc = await createDoc(docTitle('مشاركة'));
        applyDoc(doc);
        applyPages([]);
        await handleImport(files, doc);
      } catch {
        say('تعذّر استقبال الصور المشاركة');
      } finally {
        setBusy(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  // Android's back button must step back through the app rather than leave it.
  // One "guard" history entry is kept alive whenever we are away from the root
  // screen: each back press consumes that guard and unwinds one level, and a
  // fresh guard is pushed if there is still somewhere to go back to.
  const viewRef = useRef(view);
  const sheetRef = useRef(sheet);
  const guardRef = useRef(false);
  viewRef.current = view;
  sheetRef.current = sheet;
  const atRoot = view === 'library' && !sheet;

  useEffect(() => {
    if (!atRoot && !guardRef.current) {
      guardRef.current = true;
      window.history.pushState({ sfGuard: true }, '');
    }
  }, [atRoot]);

  useEffect(() => {
    const onPop = () => {
      guardRef.current = false;
      if (sheetRef.current) {
        setSheet(null);
        return;
      }
      const v = viewRef.current;
      if (v === 'doc') setView('library');
      else if (v !== 'library') setView('doc');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* ------------------------------------------------------- doc loading */

  const openDoc = useCallback(
    async (doc) => {
      setBusy('جارٍ الفتح…');
      try {
        applyDoc(doc);
        applyPages(await getPages(doc.id));
        setView('doc');
      } catch {
        say('تعذّر فتح المستند');
      } finally {
        setBusy(null);
      }
    },
    [say, applyDoc, applyPages]
  );

  const startNewScan = useCallback(async () => {
    try {
      const doc = await createDoc(docTitle(''));
      applyDoc(doc);
      applyPages([]);
      setView('camera');
      return doc;
    } catch {
      say('تعذّر إنشاء مستند جديد');
      return null;
    }
  }, [say, applyDoc, applyPages]);

  const syncDoc = useCallback(
    async (docId, nextPages) => {
      const updated = await touchDoc(docId, nextPages[0]?.thumb ?? null);
      if (updated) applyDoc(updated);
      await refreshDocs();
    },
    [refreshDocs, applyDoc]
  );

  /* --------------------------------------------------------- capturing */

  const handleCapture = useCallback((frame) => {
    // Cap the stored original: 2600px is still ~300dpi on A4 and keeps a
    // 40-page document inside a sane storage budget.
    const source = makeThumbData(frame, ORIGINAL_MAX_SIDE);
    const { corners } = detectDocument(source);
    setPending({ source, quad: corners, mode: 'new' });
    setView('crop');
  }, []);

  const savePageFrom = useCallback(
    async (source, edit, existing, docOverride) => {
      const doc = docOverride || activeDocRef.current;
      const rendered = await renderPage(source, edit);
      const originalBlob =
        existing?.original || (await imageDataToBlob(source, { type: 'image/jpeg', quality: 0.92 }));

      const page = {
        id: existing?.id || uid(),
        docId: doc.id,
        // Bumped on every re-render of the page. The editor is keyed on it, so
        // returning from a re-crop remounts the editor against the new quad
        // instead of holding a draft that would undo the crop on save.
        rev: (existing?.rev ?? 0) + 1,
        index: existing?.index ?? pagesRef.current.length,
        blob: rendered.blob,
        thumb: rendered.thumb,
        original: originalBlob,
        edit,
        ocr: existing?.ocr || null,
        width: rendered.width,
        height: rendered.height,
        createdAt: existing?.createdAt || Date.now(),
      };
      await putPage(page);
      return page;
    },
    []
  );

  const confirmCrop = useCallback(
    async (quad) => {
      if (!pending) return;
      setBusy('جارٍ المعالجة…');
      try {
        const current = pagesRef.current;
        if (pending.mode === 'recrop') {
          const existing = current.find((p) => p.id === pending.pageId);
          const edit = { ...(pending.edit || DEFAULT_EDIT), quad };
          const page = await savePageFrom(pending.source, edit, existing);
          const next = current.map((p) => (p.id === page.id ? page : p));
          applyPages(next);
          await syncDoc(activeDocRef.current.id, next);
          setPending(null);
          setView('edit');
        } else {
          const page = await savePageFrom(pending.source, { ...DEFAULT_EDIT, quad });
          const next = [...current, page];
          applyPages(next);
          await syncDoc(activeDocRef.current.id, next);
          setPending(null);
          // Back to the viewfinder to keep scanning — unless there is no camera
          // (desktop, or permission denied), where that screen is a dead end.
          setView(noCameraRef.current ? 'doc' : 'camera');
        }
      } catch (err) {
        say(`تعذّرت معالجة الصفحة: ${err?.message || err}`);
        setPending(null);
        setView(pending.mode === 'recrop' ? 'edit' : 'camera');
      } finally {
        setBusy(null);
      }
    },
    [pending, savePageFrom, syncDoc, applyPages, say]
  );

  const handleImport = useCallback(
    async (files, docOverride) => {
      const doc = docOverride || activeDocRef.current;
      if (!files.length || !doc) return;
      // One file behaves like a capture (show the crop screen); a batch is
      // auto-cropped so importing 20 photos isn't 20 taps.
      if (files.length === 1) {
        setBusy('جارٍ فتح الصورة…');
        try {
          const source = await toImageData(files[0], ORIGINAL_MAX_SIDE);
          const { corners } = detectDocument(source);
          setPending({ source, quad: corners, mode: 'new' });
          setView('crop');
        } catch {
          say('تعذّر فتح هذه الصورة');
        } finally {
          setBusy(null);
        }
        return;
      }

      let next = pagesRef.current;
      for (let i = 0; i < files.length; i++) {
        setBusy(`جارٍ استيراد ${i + 1} من ${files.length}…`);
        try {
          const source = await toImageData(files[i], ORIGINAL_MAX_SIDE);
          const { corners } = detectDocument(source);
          const rendered = await renderPage(source, { ...DEFAULT_EDIT, quad: corners });
          const page = {
            id: uid(),
            docId: doc.id,
            index: next.length,
            blob: rendered.blob,
            thumb: rendered.thumb,
            original: await imageDataToBlob(source, { type: 'image/jpeg', quality: 0.92 }),
            edit: { ...DEFAULT_EDIT, quad: corners },
            ocr: null,
            width: rendered.width,
            height: rendered.height,
            createdAt: Date.now(),
          };
          await putPage(page);
          next = [...next, page];
          applyPages(next);
        } catch {
          say(`تعذّر استيراد الملف ${i + 1}`);
        }
      }
      await syncDoc(doc.id, next);
      setBusy(null);
      setView('doc');
    },
    [syncDoc, applyPages, say]
  );

  /* ----------------------------------------------------------- editing */

  const openEditor = useCallback((index) => {
    setEditIndex(index);
    setView('edit');
  }, []);

  const savePageEdit = useCallback(
    async (edit) => {
      const existing = pages[editIndex];
      if (!existing) return;
      setBusy('جارٍ الحفظ…');
      try {
        const source = await toImageData(existing.original, ORIGINAL_MAX_SIDE);
        const page = await savePageFrom(source, { ...edit, quad: edit.quad ?? existing.edit?.quad }, existing);
        const next = pagesRef.current.map((p) => (p.id === page.id ? page : p));
        applyPages(next);
        await syncDoc(activeDocRef.current.id, next);
        setView('doc');
      } catch (err) {
        say(`تعذّر الحفظ: ${err?.message || err}`);
      } finally {
        setBusy(null);
      }
    },
    [pages, editIndex, savePageFrom, syncDoc, applyPages, say]
  );

  const startRecrop = useCallback(
    async (draft) => {
      const existing = pages[editIndex];
      if (!existing) return;
      setBusy('جارٍ التحضير…');
      try {
        const source = await toImageData(existing.original, ORIGINAL_MAX_SIDE);
        setPending({
          source,
          quad: existing.edit?.quad || detectDocument(source).corners,
          mode: 'recrop',
          pageId: existing.id,
          edit: draft,
        });
        setView('crop');
      } catch {
        say('تعذّر فتح الصورة الأصلية');
      } finally {
        setBusy(null);
      }
    },
    [pages, editIndex, say]
  );

  const removePage = useCallback(
    async (index) => {
      const page = pages[index];
      if (!page) return;
      await deletePage(page.id);
      const next = await reorderPages(pagesRef.current.filter((p) => p.id !== page.id));
      applyPages(next);
      await syncDoc(activeDocRef.current.id, next);
      setView('doc');
      say('تم حذف الصفحة');
    },
    [pages, syncDoc, applyPages, say]
  );

  const movePage = useCallback(
    async (index, dir) => {
      const target = index + dir;
      const current = pagesRef.current;
      if (target < 0 || target >= current.length) return;
      const next = current.slice();
      [next[index], next[target]] = [next[target], next[index]];
      const renumbered = await reorderPages(next);
      applyPages(renumbered);
      await syncDoc(activeDocRef.current.id, renumbered);
    },
    [syncDoc, applyPages]
  );

  const saveOcr = useCallback(
    async (pageId, ocr) => {
      const existing = pagesRef.current.find((p) => p.id === pageId);
      if (!existing) return;
      const updated = { ...existing, ocr };
      await putPage(updated);
      applyPages(pagesRef.current.map((p) => (p.id === pageId ? updated : p)));
    },
    [applyPages]
  );

  const removeDoc = useCallback(
    async (doc) => {
      if (!window.confirm(`حذف «${doc.name}» نهائيًا؟`)) return;
      await deleteDoc(doc.id);
      await refreshDocs();
      if (activeDocRef.current?.id === doc.id) {
        applyDoc(null);
        applyPages([]);
        setView('library');
      }
      say('تم الحذف');
    },
    [refreshDocs, applyDoc, applyPages, say]
  );

  /* ------------------------------------------------------------- views */

  const thumbUrls = useBlobUrls(pages, 'thumb');
  const docThumbUrls = useBlobUrls(docs, 'thumb');
  const trayThumb = pages.length ? thumbUrls[pages[pages.length - 1].id] : null;
  const editingPage = pages[editIndex];

  const body = useMemo(() => {
    if (view === 'camera') {
      return (
        <CameraView
          onCapture={handleCapture}
          onImport={handleImport}
          onDone={() => setView('doc')}
          onClose={() => setView(pages.length ? 'doc' : 'library')}
          onUnavailable={markNoCamera}
          trayThumb={trayThumb}
          trayCount={pages.length}
          busy={!!busy}
        />
      );
    }

    if (view === 'crop' && pending) {
      return (
        <CropView
          imageData={pending.source}
          quad={pending.quad}
          title={pending.mode === 'recrop' ? 'إعادة القص' : 'ضبط الحواف'}
          onConfirm={confirmCrop}
          onCancel={() => {
            setPending(null);
            setView(pending.mode === 'recrop' ? 'edit' : 'camera');
          }}
        />
      );
    }

    if (view === 'edit' && editingPage) {
      return (
        <EditView
          key={`${editingPage.id}:${editingPage.rev ?? 0}`}
          originalBlob={editingPage.original}
          edit={editingPage.edit}
          onSave={savePageEdit}
          onCancel={() => setView('doc')}
          onRecrop={startRecrop}
          onDelete={() => removePage(editIndex)}
        />
      );
    }

    if (view === 'doc' && activeDoc) {
      return (
        <>
          <div className="sf-bar">
            <IconButton name="back" label="رجوع" onClick={() => setView('library')} />
            <div style={{ minWidth: 0 }}>
              <div className="sf-title" style={{ overflowWrap: 'anywhere' }}>
                {activeDoc.name}
              </div>
              <div className="sf-subtitle">{pages.length} صفحة</div>
            </div>
            <div className="sf-spacer" />
            <IconButton name="edit" label="إعادة تسمية" onClick={() => setSheet('rename')} />
            <IconButton name="text" label="استخراج النص" onClick={() => setSheet('ocr')} disabled={!pages.length} />
            <IconButton name="share" label="تصدير" onClick={() => setSheet('export')} disabled={!pages.length} />
          </div>

          <div className="sf-body">
            <div className="sf-pad">
              {pages.length === 0 ? (
                <div className="sf-empty">
                  <Icon name="file" size={38} />
                  <h2>لا توجد صفحات بعد</h2>
                  <p>اضغط «إضافة صفحة» لتصوير أول صفحة من المستند.</p>
                </div>
              ) : (
                <div className="sf-pagegrid">
                  {pages.map((p, i) => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="sf-page"
                        onClick={() => openEditor(i)}
                        aria-label={`تحرير الصفحة ${i + 1}`}
                      >
                        {thumbUrls[p.id] ? <img src={thumbUrls[p.id]} alt="" /> : null}
                        <span className="sf-page-num">{i + 1}</span>
                      </button>
                      {i > 0 ? (
                        <button
                          type="button"
                          className="sf-page-move sf-page-move--l"
                          onClick={() => movePage(i, -1)}
                          aria-label="تحريك لليسار"
                        >
                          <Icon name="chevronL" size={14} />
                        </button>
                      ) : null}
                      {i < pages.length - 1 ? (
                        <button
                          type="button"
                          className="sf-page-move sf-page-move--r"
                          onClick={() => movePage(i, 1)}
                          aria-label="تحريك لليمين"
                        >
                          <Icon name="chevronR" size={14} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <div className="sf-actions" style={{ marginTop: 18, padding: 0 }}>
                <button type="button" className="sf-btn sf-btn--primary" onClick={() => setView('camera')}>
                  <Icon name="plus" size={18} /> إضافة صفحة
                </button>
                <button
                  type="button"
                  className="sf-btn"
                  onClick={() => setSheet('export')}
                  disabled={!pages.length}
                >
                  <Icon name="download" size={18} /> تصدير PDF
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="sf-bar">
          <div>
            <div className="sf-title">ScanFast</div>
            <div className="sf-subtitle">ماسح مستندات — يعمل داخل جهازك</div>
          </div>
          <div className="sf-spacer" />
          <Link href="/" className="sf-iconbtn" aria-label="InvoiceFast" title="InvoiceFast">
            <Icon name="file" />
          </Link>
        </div>

        <div className="sf-body">
          <div className="sf-pad">
            {!booted ? (
              <div className="sf-empty">
                <div className="sf-spinner" />
              </div>
            ) : docs.length === 0 ? (
              <div className="sf-empty">
                <Icon name="camera" size={40} />
                <h2>ابدأ أول مسح</h2>
                <p>
                  صوّر أي ورقة وسيقوم التطبيق بقص الحواف وتصحيح الميلان وتحسين الإضاءة، ثم
                  يحوّلها إلى PDF. كل شيء يتم داخل جهازك بدون رفع أي ملف.
                </p>
              </div>
            ) : (
              <div className="sf-doclist">
                {docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <button type="button" className="sf-doc" onClick={() => openDoc(d)}>
                      {docThumbUrls[d.id] ? (
                        <img className="sf-doc-thumb" src={docThumbUrls[d.id]} alt="" />
                      ) : (
                        <span className="sf-doc-thumb" />
                      )}
                      <span className="sf-doc-main">
                        <span className="sf-doc-name">{d.name}</span>
                        <span className="sf-doc-meta">
                          {d.pageCount} صفحة · {formatDate(d.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <IconButton name="trash" label="حذف المستند" onClick={() => removeDoc(d)} danger />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="sf-btn sf-btn--primary sf-btn--wide"
              style={{ marginTop: 18 }}
              onClick={startNewScan}
            >
              <Icon name="camera" size={19} /> مسح جديد
            </button>
          </div>
        </div>
      </>
    );
  }, [
    view,
    pending,
    pages,
    docs,
    activeDoc,
    editingPage,
    editIndex,
    thumbUrls,
    docThumbUrls,
    trayThumb,
    booted,
    busy,
    handleCapture,
    handleImport,
    markNoCamera,
    confirmCrop,
    savePageEdit,
    startRecrop,
    removePage,
    movePage,
    openDoc,
    openEditor,
    removeDoc,
    startNewScan,
  ]);

  return (
    <div className="sf" dir="rtl">
      {body}

      {sheet === 'export' ? (
        <ExportSheet
          pages={pages}
          docName={activeDoc?.name}
          onClose={() => setSheet(null)}
          onToast={say}
        />
      ) : null}

      {sheet === 'ocr' ? (
        <OcrSheet
          pages={pages}
          currentIndex={Math.max(0, editIndex)}
          onSaveOcr={saveOcr}
          onClose={() => setSheet(null)}
          onToast={say}
        />
      ) : null}

      {sheet === 'rename' && activeDoc ? (
        <RenameSheet
          doc={activeDoc}
          onClose={() => setSheet(null)}
          onSave={async (name) => {
            const updated = await renameDoc(activeDoc.id, name);
            if (updated) setActiveDoc(updated);
            await refreshDocs();
            setSheet(null);
          }}
        />
      ) : null}

      {busy ? <Busy label={busy} /> : null}
      <Toast message={toast} />
    </div>
  );
}

function RenameSheet({ doc, onClose, onSave }) {
  const [name, setName] = useState(doc.name);
  return (
    <div
      className="sf-scrim"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sf-sheet">
        <div className="sf-grab" />
        <h3>اسم المستند</h3>
        <div className="sf-field">
          <input
            className="sf-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          />
        </div>
        <div className="sf-actions" style={{ padding: 0 }}>
          <button type="button" className="sf-btn" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="sf-btn sf-btn--primary"
            onClick={() => name.trim() && onSave(name.trim())}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
