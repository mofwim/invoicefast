'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FILTERS } from '@/lib/scan/imaging';
import { renderPreview, toImageData } from '@/lib/scan/pipeline';
import { IconButton } from './ui';

const PREVIEW_DEBOUNCE_MS = 120;

const RATIOS = [
  { id: 'auto', label: 'تلقائي' },
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'Letter' },
  { id: 'legal', label: 'Legal' },
  { id: 'square', label: 'مربع' },
];

/**
 * Filter / rotate / brightness screen for a single page.
 *
 * Edits are a small plain object ({filter, rotation, adjust, ratio, quad}); the
 * page is always re-rendered from its original capture, so nothing degrades no
 * matter how many times the user changes their mind.
 */
export default function EditView({ originalBlob, edit, onSave, onCancel, onRecrop, onDelete }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const originalRef = useRef(null);
  const timerRef = useRef(0);
  const seqRef = useRef(0);

  const [draft, setDraft] = useState(() => ({
    filter: edit?.filter || 'auto',
    rotation: edit?.rotation || 0,
    adjust: { brightness: 0, contrast: 0, ...(edit?.adjust || {}) },
    ratio: edit?.ratio || 'auto',
    quad: edit?.quad || null,
  }));
  const [decoded, setDecoded] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  /* --------------------------------------------------------- decoding */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const img = await toImageData(originalBlob);
      if (cancelled) return;
      originalRef.current = img;
      setDecoded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [originalBlob]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width - 32, h: r.height - 32 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* -------------------------------------------------------- rendering */

  const paint = useCallback(
    (img) => {
      const canvas = canvasRef.current;
      if (!canvas || !img) return;
      const scale = Math.min(
        1,
        stageSize.w > 0 ? stageSize.w / img.width : 1,
        stageSize.h > 0 ? stageSize.h / img.height : 1
      );
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.width = `${Math.round(img.width * scale)}px`;
      canvas.style.height = `${Math.round(img.height * scale)}px`;
      canvas.getContext('2d').putImageData(img, 0, 0);
    },
    [stageSize]
  );

  useEffect(() => {
    if (!decoded) return undefined;
    const seq = ++seqRef.current;
    setRendering(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Yield first so the chip press feels instant, then do the heavy work.
      await new Promise((r) => requestAnimationFrame(r));
      if (seq !== seqRef.current) return;
      try {
        const img = await renderPreview(originalRef.current, draft);
        if (seq !== seqRef.current) return;
        paint(img);
      } finally {
        if (seq === seqRef.current) setRendering(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [draft, decoded, paint]);

  /* ---------------------------------------------------------- helpers */

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setAdjust = (patch) => setDraft((d) => ({ ...d, adjust: { ...d.adjust, ...patch } }));
  const rotate = (dir) => set({ rotation: (((draft.rotation + dir * 90) % 360) + 360) % 360 });

  return (
    <>
      <div className="sf-bar">
        <IconButton name="close" label="إلغاء" onClick={onCancel} />
        <div className="sf-title">تحرير الصفحة</div>
        <div className="sf-spacer" />
        <IconButton name="crop" label="إعادة القص" onClick={() => onRecrop(draft)} />
        <IconButton name="trash" label="حذف الصفحة" onClick={onDelete} danger />
        <IconButton name="check" label="حفظ" onClick={() => onSave(draft)} />
      </div>

      <div className="sf-stage" ref={stageRef}>
        <canvas ref={canvasRef} style={{ opacity: rendering ? 0.55 : 1, transition: 'opacity .15s' }} />
        {rendering ? (
          <div className="sf-spinner" style={{ position: 'absolute' }} aria-label="جارٍ المعالجة" />
        ) : null}
      </div>

      <div className="sf-toolbar">
        <div className="sf-chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`sf-chip${draft.filter === f.id ? ' sf-chip--on' : ''}`}
              onClick={() => set({ filter: f.id })}
            >
              {f.labelAr}
            </button>
          ))}
        </div>

        <div className="sf-chips" style={{ marginTop: 8 }}>
          <button
            type="button"
            className={`sf-chip${showAdjust ? ' sf-chip--on' : ''}`}
            onClick={() => setShowAdjust((v) => !v)}
          >
            إضاءة وتباين
          </button>
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`sf-chip${draft.ratio === r.id ? ' sf-chip--on' : ''}`}
              onClick={() => set({ ratio: r.id })}
            >
              {r.label}
            </button>
          ))}
        </div>

        {showAdjust ? (
          <>
            <div className="sf-slider">
              <label htmlFor="sf-bright">سطوع</label>
              <input
                id="sf-bright"
                type="range"
                min="-100"
                max="100"
                value={draft.adjust.brightness}
                onChange={(e) => setAdjust({ brightness: Number(e.target.value) })}
              />
              <output>{draft.adjust.brightness}</output>
            </div>
            <div className="sf-slider">
              <label htmlFor="sf-contrast">تباين</label>
              <input
                id="sf-contrast"
                type="range"
                min="-100"
                max="100"
                value={draft.adjust.contrast}
                onChange={(e) => setAdjust({ contrast: Number(e.target.value) })}
              />
              <output>{draft.adjust.contrast}</output>
            </div>
          </>
        ) : null}

        <div className="sf-actions">
          <button type="button" className="sf-btn" onClick={() => rotate(-1)}>
            ↺ يسار
          </button>
          <button type="button" className="sf-btn" onClick={() => rotate(1)}>
            ↻ يمين
          </button>
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => onSave(draft)}>
            حفظ
          </button>
        </div>
      </div>
    </>
  );
}
