'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectDocument } from '@/lib/scan/detect';
import { Icon, IconButton } from './ui';

/** How still the quad must be (as a fraction of frame size) to auto-shoot. */
const STABLE_TOLERANCE = 0.02;
const STABLE_FRAMES = 5;
const DETECT_INTERVAL_MS = 160;
const DETECT_LONG_SIDE = 320;

/**
 * Live camera with real-time document edge detection, torch, auto-capture and
 * gallery import.
 *
 * @param {{onCapture:(ImageData)=>void, onImport:(File[])=>void, onDone:()=>void,
 *          onClose:()=>void, trayThumb?:string, trayCount?:number, busy?:boolean}} props
 */
export default function CameraView({
  onCapture,
  onImport,
  onDone,
  onClose,
  onUnavailable,
  trayThumb,
  trayCount = 0,
  busy = false,
}) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const workRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const quadRef = useRef(null);
  const stableRef = useRef(0);
  const busyRef = useRef(busy);
  const autoRef = useRef(false);
  const shootingRef = useRef(false);

  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchable, setTorchable] = useState(false);
  const [auto, setAuto] = useState(false);
  const [flash, setFlash] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  // Tell the shell there is no camera here, so later steps route to the
  // document instead of dumping the user back on a dead camera screen.
  useEffect(() => {
    if (error) onUnavailable?.(error);
  }, [error, onUnavailable]);
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  /* ---------------------------------------------------------- capture */

  const grabFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  }, []);

  const shoot = useCallback(() => {
    if (shootingRef.current || busyRef.current) return;
    const frame = grabFrame();
    if (!frame) return;
    shootingRef.current = true;
    stableRef.current = 0;
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    onCapture(frame);
    setTimeout(() => {
      shootingRef.current = false;
    }, 700);
  }, [grabFrame, onCapture]);

  /* ------------------------------------------------------ camera start */

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('unsupported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.();
        setTorchable(Boolean(caps && 'torch' in caps));
        setReady(true);
      } catch (err) {
        setError(err?.name === 'NotAllowedError' ? 'denied' : 'failed');
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------- torch */

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchable(false);
    }
  }, [torchOn]);

  /* ------------------------------------------------- detection + draw */

  useEffect(() => {
    if (!ready) return undefined;

    // Map video-space coordinates into the on-screen box, accounting for the
    // `object-fit: cover` crop the browser applies to the <video>.
    const coverTransform = (vw, vh, dw, dh) => {
      const scale = Math.max(dw / vw, dh / vh);
      return { scale, ox: (dw - vw * scale) / 2, oy: (dh - vh * scale) / 2 };
    };

    const draw = () => {
      const overlay = overlayRef.current;
      const video = videoRef.current;
      if (!overlay || !video) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = overlay.getBoundingClientRect();
      if (overlay.width !== Math.round(rect.width * dpr)) {
        overlay.width = Math.round(rect.width * dpr);
        overlay.height = Math.round(rect.height * dpr);
      }
      const ctx = overlay.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const quad = quadRef.current;
      if (!quad || !video.videoWidth) return;
      const { scale, ox, oy } = coverTransform(
        video.videoWidth,
        video.videoHeight,
        rect.width,
        rect.height
      );
      const pts = quad.map((p) => ({ x: p.x * scale + ox, y: p.y * scale + oy }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59,130,246,0.16)';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.fillStyle = '#fff';
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const detect = () => {
      const video = videoRef.current;
      if (!video?.videoWidth || busyRef.current || shootingRef.current) return;

      let work = workRef.current;
      if (!work) {
        work = document.createElement('canvas');
        workRef.current = work;
      }
      const s = DETECT_LONG_SIDE / Math.max(video.videoWidth, video.videoHeight);
      const w = Math.max(1, Math.round(video.videoWidth * s));
      const h = Math.max(1, Math.round(video.videoHeight * s));
      if (work.width !== w || work.height !== h) {
        work.width = w;
        work.height = h;
      }
      const ctx = work.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);

      const { corners, confident } = detectDocument(ctx.getImageData(0, 0, w, h));
      const inv = 1 / s;
      const scaled = corners.map((p) => ({ x: p.x * inv, y: p.y * inv }));

      if (!confident) {
        quadRef.current = null;
        stableRef.current = 0;
        setDetected(false);
        return;
      }

      const prev = quadRef.current;
      quadRef.current = scaled;
      setDetected(true);

      if (prev) {
        const tol = STABLE_TOLERANCE * Math.max(video.videoWidth, video.videoHeight);
        const moved = prev.some((p, i) => Math.hypot(p.x - scaled[i].x, p.y - scaled[i].y) > tol);
        stableRef.current = moved ? 0 : stableRef.current + 1;
      } else {
        stableRef.current = 0;
      }

      if (autoRef.current && stableRef.current >= STABLE_FRAMES) shoot();
    };

    const loop = (t) => {
      rafRef.current = requestAnimationFrame(loop);
      if (t - lastDetectRef.current >= DETECT_INTERVAL_MS) {
        lastDetectRef.current = t;
        try {
          detect();
        } catch {
          // A bad frame must not kill the preview loop.
        }
      }
      draw();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, shoot]);

  /* ----------------------------------------------------------- render */

  if (error) {
    return (
      <>
        <div className="sf-bar">
          <IconButton name="back" label="رجوع" onClick={onClose} />
          <div className="sf-title">الكاميرا</div>
        </div>
        <div className="sf-body">
          <div className="sf-empty">
            <Icon name="camera" size={40} />
            <h2>
              {error === 'denied'
                ? 'لم يُسمح بالوصول إلى الكاميرا'
                : error === 'unsupported'
                  ? 'المتصفح لا يدعم الكاميرا'
                  : 'تعذّر تشغيل الكاميرا'}
            </h2>
            <p>
              {error === 'denied'
                ? 'اسمح بالكاميرا من إعدادات الموقع في المتصفح، أو اختر صورًا جاهزة من معرض الصور.'
                : 'افتح الصفحة عبر HTTPS من متصفح حديث، أو استورد صورًا من المعرض.'}
            </p>
            <label className="sf-btn sf-btn--primary">
              <Icon name="gallery" size={18} />
              استيراد من المعرض
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  if (files.length) onImport(files);
                }}
              />
            </label>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sf-camera">
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={overlayRef} className="sf-overlay" />

        <div className="sf-bar sf-bar--floating">
          <IconButton name="close" label="إغلاق الكاميرا" onClick={onClose} />
          <div className="sf-spacer" />
          {torchable ? (
            <IconButton
              name="flash"
              label={torchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
              onClick={toggleTorch}
              active={torchOn}
            />
          ) : null}
          <IconButton
            name="auto"
            label={auto ? 'إيقاف الالتقاط التلقائي' : 'التقاط تلقائي'}
            onClick={() => setAuto((v) => !v)}
            active={auto}
          />
        </div>

        <div className={`sf-hint${detected ? ' sf-hint--ok' : ''}`}>
          {detected
            ? auto
              ? 'ثبّت الجهاز… سيتم التصوير تلقائيًا'
              : 'تم العثور على المستند — اضغط للتصوير'
            : 'وجّه الكاميرا نحو المستند'}
        </div>

        {flash ? (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.75 }} />
        ) : null}
      </div>

      <div className="sf-shutterbar">
        <div className="sf-side">
          <label className="sf-iconbtn" title="استيراد من المعرض">
            <Icon name="gallery" />
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (files.length) onImport(files);
              }}
            />
          </label>
          <span className="sf-side-label">معرض</span>
        </div>

        <button
          type="button"
          className="sf-shutter"
          onClick={shoot}
          disabled={!ready || busy}
          aria-label="التقاط صورة"
        />

        <div className="sf-side">
          {trayCount > 0 ? (
            <button type="button" className="sf-tray" onClick={onDone} aria-label={`إنهاء (${trayCount} صفحة)`}>
              {trayThumb ? <img src={trayThumb} alt="" /> : null}
              <span className="sf-tray-count">{trayCount}</span>
            </button>
          ) : (
            <div className="sf-tray" aria-hidden="true" />
          )}
          <span className="sf-side-label">{trayCount > 0 ? 'إنهاء' : '—'}</span>
        </div>
      </div>
    </>
  );
}
