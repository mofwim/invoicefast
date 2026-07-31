'use client';

import { useMemo, useState } from 'react';
import { downloadBlob, exportPdf, exportText, makeZip, safeFilename } from '@/lib/scan/export';
import { Busy, Sheet } from './ui';

const PAGE_SIZES = [
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'Letter' },
  { id: 'legal', label: 'Legal' },
  { id: 'fit', label: 'حسب الصورة' },
];

/**
 * Export sheet: PDF (optionally searchable), images as a zip, or plain text.
 * Uses the Web Share API when the device has it so "share to WhatsApp" works
 * the way it does in a native app.
 */
export default function ExportSheet({ pages, docName, onClose, onToast }) {
  const [format, setFormat] = useState('pdf');
  const [pageSize, setPageSize] = useState('a4');
  const [margin, setMargin] = useState(true);
  const [searchable, setSearchable] = useState(true);
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState(0);

  const hasOcr = useMemo(() => pages.some((p) => p.ocr?.words?.length), [pages]);
  const hasText = useMemo(() => pages.some((p) => p.ocr?.text), [pages]);

  // Shown and editable, because the safe name won't always match the document
  // title — a title written in Arabic can't survive as a filename.
  const [filename, setFilename] = useState(() => safeFilename(docName));
  const base = safeFilename(filename);
  const titleUnusable = /[^\x20-\x7E]/.test(docName || '');

  async function build() {
    if (format === 'pdf') {
      const blob = await exportPdf(pages, {
        pageSize,
        margin: margin ? 24 : 0,
        searchable: searchable && hasOcr,
        title: docName,
        onProgress: (done, total) => setProgress(done / total),
      });
      return { blob, name: `${base}.pdf` };
    }
    if (format === 'images') {
      const files = pages.map((p, i) => ({
        name: `${base}-${String(i + 1).padStart(2, '0')}.${p.blob.type === 'image/png' ? 'png' : 'jpg'}`,
        blob: p.blob,
      }));
      if (files.length === 1) return { blob: files[0].blob, name: files[0].name };
      const blob = await makeZip(files);
      return { blob, name: `${base}.zip` };
    }
    return { blob: exportText(pages), name: `${base}.txt` };
  }

  async function run(mode) {
    if (!pages.length) return;
    setProgress(0);
    setBusy(mode === 'share' ? 'جارٍ التحضير للمشاركة…' : 'جارٍ إنشاء الملف…');
    try {
      const { blob, name } = await build();
      if (mode === 'share') {
        const file = new File([blob], name, { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: docName });
          onToast?.('تمت المشاركة');
          onClose();
          return;
        }
        onToast?.('المشاركة غير مدعومة — تم التنزيل بدلًا منها');
      }
      downloadBlob(blob, name);
      onToast?.(`تم حفظ ${name}`);
      onClose();
    } catch (err) {
      if (err?.name === 'AbortError') {
        // User dismissed the share sheet — not an error.
      } else {
        onToast?.(`تعذّر التصدير: ${err?.message || err}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet title="تصدير" note={`${pages.length} صفحة`} onClose={busy ? undefined : onClose}>
      <div className="sf-field">
        <span>اسم الملف</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="sf-input"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            dir="ltr"
            spellCheck={false}
            aria-label="اسم الملف"
          />
          <span className="sf-note" style={{ flex: '0 0 auto' }}>
            .{format === 'pdf' ? 'pdf' : format === 'text' ? 'txt' : pages.length > 1 ? 'zip' : 'jpg'}
          </span>
        </div>
        {titleUnusable ? (
          <p className="sf-note" style={{ marginTop: 6 }}>
            أسماء الملفات بالعربية لا تصل سليمة إلى بعض المتصفحات وأنظمة الملفات، لذلك يُستخدم
            اسم لاتيني مؤرَّخ. يمكنك تغييره من هنا.
          </p>
        ) : null}
      </div>

      <div className="sf-field">
        <span>الصيغة</span>
        <div className="sf-seg">
          <button type="button" aria-pressed={format === 'pdf'} onClick={() => setFormat('pdf')}>
            PDF
          </button>
          <button type="button" aria-pressed={format === 'images'} onClick={() => setFormat('images')}>
            صور {pages.length > 1 ? '(ZIP)' : ''}
          </button>
          <button
            type="button"
            aria-pressed={format === 'text'}
            onClick={() => setFormat('text')}
            disabled={!hasText}
            title={hasText ? undefined : 'شغّل استخراج النص أولًا'}
          >
            نص
          </button>
        </div>
      </div>

      {format === 'pdf' ? (
        <>
          <div className="sf-field">
            <span>حجم الصفحة</span>
            <div className="sf-seg">
              {PAGE_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={pageSize === s.id}
                  onClick={() => setPageSize(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="sf-check">
            <input
              type="checkbox"
              checked={margin}
              onChange={(e) => setMargin(e.target.checked)}
              disabled={pageSize === 'fit'}
            />
            هامش حول الصفحة
          </label>

          <label className="sf-check">
            <input
              type="checkbox"
              checked={searchable && hasOcr}
              onChange={(e) => setSearchable(e.target.checked)}
              disabled={!hasOcr}
            />
            PDF قابل للبحث {hasOcr ? '' : '(يحتاج استخراج النص أولًا)'}
          </label>
        </>
      ) : null}

      {format === 'text' && !hasText ? (
        <p className="sf-note">لا يوجد نص مستخرج بعد. افتح «استخراج النص» من شريط المستند.</p>
      ) : null}

      <div className="sf-actions" style={{ padding: '18px 0 0' }}>
        <button type="button" className="sf-btn" onClick={() => run('share')} disabled={!!busy}>
          مشاركة
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          onClick={() => run('download')}
          disabled={!!busy}
        >
          تنزيل
        </button>
      </div>

      {busy ? <Busy label={busy} progress={format === 'pdf' ? progress : undefined} /> : null}
    </Sheet>
  );
}
