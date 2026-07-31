'use client';

import { useEffect, useRef, useState } from 'react';
import { OCR_LANGUAGES, recognize, terminateOcr } from '@/lib/scan/ocr';
import { Busy, Icon, Sheet } from './ui';

const LANG_KEY = 'scanfast:ocr-lang';

/**
 * Text recognition sheet. Runs on the current page or the whole document and
 * hands results back so they can be stored and reused for the searchable PDF.
 *
 * @param {{pages:Array, currentIndex:number, onSaveOcr:(pageId, ocr)=>Promise<void>,
 *          onClose:()=>void, onToast:(msg:string)=>void}} props
 */
export default function OcrSheet({ pages, currentIndex = 0, onSaveOcr, onClose, onToast }) {
  const [lang, setLang] = useState('eng');
  const [scope, setScope] = useState('page');
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved) setLang(saved);
    } catch {
      /* private mode */
    }
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const page = pages[currentIndex];
    if (page?.ocr?.text) setResult(page.ocr.text);
  }, [pages, currentIndex]);

  async function run() {
    const targets = scope === 'page' ? [pages[currentIndex]].filter(Boolean) : pages;
    if (!targets.length) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }

    cancelledRef.current = false;
    setBusy('جارٍ تحميل محرك التعرف…');
    setProgress(0);
    let collected = '';

    try {
      for (let i = 0; i < targets.length; i++) {
        if (cancelledRef.current) return;
        const page = targets[i];
        setBusy(
          targets.length > 1
            ? `استخراج النص… صفحة ${i + 1} من ${targets.length}`
            : 'استخراج النص…'
        );
        const ocr = await recognize(page.blob, {
          lang,
          onProgress: (p, stage) => {
            const within = stage === 'recognize' ? p : p * 0.35;
            setProgress((i + within) / targets.length);
          },
        });
        await onSaveOcr(page.id, ocr);
        collected += (collected ? '\n\n' : '') + ocr.text;
        setResult(collected);
      }
      onToast?.('تم استخراج النص');
    } catch (err) {
      onToast?.(`تعذّر استخراج النص: ${err?.message || err}`);
    } finally {
      setBusy(null);
      setProgress(0);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      onToast?.('تم نسخ النص');
    } catch {
      onToast?.('تعذّر النسخ — انسخه يدويًا');
    }
  }

  function close() {
    // Free the ~30 MB the engine holds; it reloads quickly if reopened.
    terminateOcr();
    onClose();
  }

  return (
    <Sheet
      title="استخراج النص (OCR)"
      note="يعمل داخل جهازك. أول تشغيل يحمّل ملفات اللغة من الإنترنت."
      onClose={busy ? undefined : close}
    >
      <div className="sf-field">
        <span>اللغة</span>
        <select className="sf-select" value={lang} onChange={(e) => setLang(e.target.value)}>
          {OCR_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.labelAr} — {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sf-field">
        <span>النطاق</span>
        <div className="sf-seg">
          <button type="button" aria-pressed={scope === 'page'} onClick={() => setScope('page')}>
            الصفحة الحالية
          </button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            كل الصفحات ({pages.length})
          </button>
        </div>
      </div>

      <button type="button" className="sf-btn sf-btn--primary sf-btn--wide" onClick={run} disabled={!!busy}>
        بدء الاستخراج
      </button>

      {result ? (
        <div className="sf-field">
          <span>النتيجة</span>
          <div className="sf-ocrtext" dir="auto">
            {result}
          </div>
          <button type="button" className="sf-btn sf-btn--sm" style={{ marginTop: 10 }} onClick={copy}>
            <Icon name="copy" size={16} /> نسخ النص
          </button>
        </div>
      ) : null}

      {busy ? <Busy label={busy} progress={progress} /> : null}
    </Sheet>
  );
}
