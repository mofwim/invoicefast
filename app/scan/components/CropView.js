'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { detectDocument, defaultQuad, orderCorners } from '@/lib/scan/detect';
import { IconButton } from './ui';

const LOUPE_ZOOM = 2.6;
const LOUPE_SIZE = 116;

/**
 * Corner adjustment screen. Corners are kept in source-image pixels; only the
 * rendering converts to on-screen coordinates, so the crop stays accurate no
 * matter how the stage is sized.
 *
 * @param {{imageData:ImageData, quad:Array, onConfirm:(quad)=>void, onCancel:()=>void,
 *          title?:string}} props
 */
export default function CropView({ imageData, quad: initialQuad, onConfirm, onCancel, title }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sourceRef = useRef(null);
  const loupeRef = useRef(null);
  const dragRef = useRef(-1);

  const [quad, setQuad] = useState(() => initialQuad || defaultQuad(imageData.width, imageData.height));
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [activeCorner, setActiveCorner] = useState(-1);

  const sw = imageData.width;
  const sh = imageData.height;

  // Full-resolution copy we can sample for both the preview and the loupe.
  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d').putImageData(imageData, 0, 0);
    sourceRef.current = c;
    setQuad(initialQuad || defaultQuad(sw, sh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData]);

  /* ------------------------------------------------------------ layout */

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      const pad = 26;
      const availW = Math.max(40, rect.width - pad * 2);
      const availH = Math.max(40, rect.height - pad * 2);
      const scale = Math.min(availW / sw, availH / sh);
      setBox({ w: Math.round(sw * scale), h: Math.round(sh * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sw, sh]);

  /* ------------------------------------------------------------- paint */

  useEffect(() => {
    const canvas = canvasRef.current;
    const src = sourceRef.current;
    if (!canvas || !src || !box.w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.w * dpr);
    canvas.height = Math.round(box.h * dpr);
    canvas.style.width = `${box.w}px`;
    canvas.style.height = `${box.h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, box.w, box.h);
  }, [box]);

  const toDisplay = useCallback((p) => ({ x: (p.x / sw) * box.w, y: (p.y / sh) * box.h }), [box, sw, sh]);

  /* ------------------------------------------------------------ loupe */

  const paintLoupe = useCallback(
    (corner) => {
      const canvas = loupeRef.current;
      const src = sourceRef.current;
      if (!canvas || !src || !corner) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== LOUPE_SIZE * dpr) {
        canvas.width = LOUPE_SIZE * dpr;
        canvas.height = LOUPE_SIZE * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      // Zoom relative to the on-screen scale so the loupe always magnifies.
      const displayScale = box.w / sw;
      const span = LOUPE_SIZE / (displayScale * LOUPE_ZOOM);
      ctx.drawImage(
        src,
        corner.x - span / 2,
        corner.y - span / 2,
        span,
        span,
        0,
        0,
        LOUPE_SIZE,
        LOUPE_SIZE
      );
    },
    [box.w, sw]
  );

  useEffect(() => {
    if (activeCorner >= 0) paintLoupe(quad[activeCorner]);
  }, [activeCorner, quad, paintLoupe]);

  /* ----------------------------------------------------------- dragging */

  const pointFromEvent = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * sw;
      const y = ((e.clientY - rect.top) / rect.height) * sh;
      return {
        x: Math.max(0, Math.min(sw, x)),
        y: Math.max(0, Math.min(sh, y)),
      };
    },
    [sw, sh]
  );

  const onPointerDown = useCallback(
    (e) => {
      const p = pointFromEvent(e);
      if (!p) return;
      // Generous hit radius — fingers are not precise.
      const hit = (sw / Math.max(1, box.w)) * 34;
      let best = -1;
      let bestDist = hit;
      quad.forEach((c, i) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      if (best < 0) return;
      dragRef.current = best;
      setActiveCorner(best);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    },
    [pointFromEvent, quad, box.w, sw]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (dragRef.current < 0) return;
      const p = pointFromEvent(e);
      if (!p) return;
      setQuad((prev) => prev.map((c, i) => (i === dragRef.current ? p : c)));
      e.preventDefault();
    },
    [pointFromEvent]
  );

  const endDrag = useCallback(() => {
    dragRef.current = -1;
    setActiveCorner(-1);
  }, []);

  /* ---------------------------------------------------------- actions */

  const autoDetect = useCallback(() => {
    const { corners } = detectDocument(imageData);
    setQuad(corners);
  }, [imageData]);

  const fullPage = useCallback(() => {
    setQuad(defaultQuad(sw, sh, 0));
  }, [sw, sh]);

  const confirm = useCallback(() => {
    onConfirm(orderCorners(quad));
  }, [onConfirm, quad]);

  const displayQuad = useMemo(() => quad.map(toDisplay), [quad, toDisplay]);
  const polygon = displayQuad.map((p) => `${p.x},${p.y}`).join(' ');

  // Park the loupe away from the finger: opposite side of whichever half the
  // active corner sits in.
  const loupePos = useMemo(() => {
    if (activeCorner < 0) return null;
    const p = displayQuad[activeCorner];
    return {
      left: p.x > box.w / 2 ? 12 : undefined,
      right: p.x > box.w / 2 ? undefined : 12,
      top: 12,
    };
  }, [activeCorner, displayQuad, box.w]);

  return (
    <>
      <div className="sf-bar">
        <IconButton name="close" label="إلغاء" onClick={onCancel} />
        <div>
          <div className="sf-title">{title || 'ضبط الحواف'}</div>
          <div className="sf-subtitle">اسحب النقاط لتطابق حواف الورقة</div>
        </div>
        <div className="sf-spacer" />
        <IconButton name="check" label="تأكيد" onClick={confirm} />
      </div>

      <div className="sf-stage" ref={stageRef}>
        <div className="sf-cropwrap" style={{ width: box.w, height: box.h }}>
          <canvas ref={canvasRef} />
          <svg
            className="sf-crop-svg"
            viewBox={`0 0 ${box.w || 1} ${box.h || 1}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ pointerEvents: 'auto', touchAction: 'none' }}
          >
            <defs>
              <mask id="sf-crop-mask">
                <rect x="0" y="0" width={box.w} height={box.h} fill="#fff" />
                <polygon points={polygon} fill="#000" />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width={box.w}
              height={box.h}
              fill="rgba(5,7,10,.62)"
              mask="url(#sf-crop-mask)"
            />
            <polygon points={polygon} fill="none" stroke="#3b82f6" strokeWidth="2" />
            {displayQuad.map((p, i) => (
              <g key={i}>
                <circle className="sf-handle" cx={p.x} cy={p.y} r={activeCorner === i ? 17 : 13} />
                <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
              </g>
            ))}
          </svg>

          {loupePos ? (
            <div className="sf-loupe" style={loupePos}>
              <canvas ref={loupeRef} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="sf-toolbar">
        <div className="sf-chips">
          <button type="button" className="sf-chip" onClick={autoDetect}>
            كشف تلقائي
          </button>
          <button type="button" className="sf-chip" onClick={fullPage}>
            الصورة كاملة
          </button>
        </div>
        <div className="sf-actions">
          <button type="button" className="sf-btn" onClick={onCancel}>
            إلغاء
          </button>
          <button type="button" className="sf-btn sf-btn--primary" onClick={confirm}>
            متابعة
          </button>
        </div>
      </div>
    </>
  );
}
