"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { placeImage, save } from "../../../lib/tools/pdf";
import { openDocument, renderPage } from "../../../lib/tools/pdfjs";
import { describeError } from "../../../lib/tools/errors";

/**
 * A pad to sign on.
 *
 * Pointer events rather than mouse or touch events, so a finger, a stylus and
 * a trackpad all take the same path. The strokes are kept as points and redrawn
 * on every change, which is what makes undo a one-line operation.
 */
function SignaturePad({ onChange, labels, ink }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;

    for (const stroke of strokes.current) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke[0].x, stroke[0].y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = ink;
          ctx.fill();
        }
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, [ink]);

  useEffect(() => redraw(), [redraw]);

  const publish = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !strokes.current.length) {
      onChange(null);
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      onChange({ bytes: new Uint8Array(await blob.arrayBuffer()), type: "image/png", url: URL.createObjectURL(blob) });
    }, "image/png");
  }, [onChange]);

  const at = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="tp-pad"
        width={760}
        height={240}
        aria-label={labels.draw}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = [at(event)];
          strokes.current.push(drawing.current);
          redraw();
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          drawing.current.push(at(event));
          redraw();
        }}
        onPointerUp={() => {
          drawing.current = null;
          publish();
        }}
        onPointerLeave={() => {
          if (!drawing.current) return;
          drawing.current = null;
          publish();
        }}
      />
      <Actions>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => {
            strokes.current.pop();
            redraw();
            publish();
          }}
        >
          {labels.undo}
        </button>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => {
            strokes.current = [];
            redraw();
            onChange(null);
          }}
        >
          {labels.clear}
        </button>
      </Actions>
    </>
  );
}

export default function SignPdf({ locale = "nl" }) {
  const t = toolStrings("sign-pdf", locale);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState("");
  const [source, setSource] = useState("draw");
  const [ink, setInk] = useState("#1c1c1e");
  const [signature, setSignature] = useState(null);
  const [place, setPlace] = useState({ x: 0.68, y: 0.82, width: 0.24 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setResult(null);
      let reader = null;
      try {
        reader = await openDocument(picked);
        setFile(picked);
        setPages(reader.numPages);
        setPage(0);
      } catch (err) {
        setFile(null);
        setPages(0);
        setError(describeError(t, err));
      } finally {
        await reader?.destroy?.();
      }
    },
    [t]
  );

  // The page being signed, rendered large enough to point at accurately.
  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    let cancelled = false;
    let reader = null;

    (async () => {
      try {
        reader = await openDocument(file);
        const canvas = await renderPage(reader, page + 1, { scale: 1, maxSide: 900 });
        if (!cancelled) setPreview(canvas.toDataURL("image/jpeg", 0.82));
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        if (!cancelled) setPreview("");
      } finally {
        await reader?.destroy?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, page]);

  useEffect(() => () => signature?.url && URL.revokeObjectURL(signature.url), [signature]);

  const takeImage = useCallback(async ([picked]) => {
    const bytes = new Uint8Array(await picked.arrayBuffer());
    const type = picked.type === "image/png" ? "image/png" : "image/jpeg";
    setSignature({ bytes, type, url: URL.createObjectURL(picked) });
  }, []);

  const pointAt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPlace((current) => ({
      ...current,
      x: Math.min(0.98, Math.max(0.02, (event.clientX - rect.left) / rect.width)),
      y: Math.min(0.98, Math.max(0.02, (event.clientY - rect.top) / rect.height)),
    }));
    setResult(null);
  };

  const run = useCallback(async () => {
    if (!file || !signature) return;
    setBusy(true);
    setError("");
    try {
      const doc = await placeImage(file, signature, { ...place, page });
      setResult(await save(doc, { name: `${file.name.replace(/\.pdf$/i, "")}-ondertekend.pdf` }));
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy(false);
    }
  }, [file, signature, place, page, t]);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="pencil" title={t("dropPdf")} hint={t("pdfHint")} />

      {error && <Note kind="error">{error}</Note>}

      {file && (
        <>
          <Panel title={t("signature")}>
            <Field label={t("source")}>
              <Segmented
                label={t("source")}
                value={source}
                onChange={(value) => {
                  setSource(value);
                  setSignature(null);
                }}
                options={[
                  { value: "draw", label: t("draw") },
                  { value: "image", label: t("upload") },
                ]}
              />
            </Field>

            {source === "draw" ? (
              <>
                <Field label={t("ink")}>
                  {(id) => (
                    <input id={id} type="color" value={ink} onChange={(event) => setInk(event.target.value)} />
                  )}
                </Field>
                <SignaturePad
                  onChange={(value) => {
                    setSignature(value);
                    setResult(null);
                  }}
                  ink={ink}
                  labels={{ draw: t("draw"), undo: t("undo"), clear: t("clear") }}
                />
                <p className="tp-hint">{t("drawHint")}</p>
              </>
            ) : (
              <>
                <FileDrop onFiles={takeImage} accept="image/png,image/jpeg" icon="image" title={t("dropImage")} hint={t("imageHint")} />
                {signature && <img className="tp-sign-preview" src={signature.url} alt={t("signature")} />}
              </>
            )}
          </Panel>

          <Panel title={t("place")}>
            {pages > 1 && (
              <Field label={t("whichPage")}>
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    min={1}
                    max={pages}
                    value={page + 1}
                    onChange={(event) => {
                      setPage(Math.min(pages - 1, Math.max(0, Number(event.target.value) - 1)));
                      setResult(null);
                    }}
                  />
                )}
              </Field>
            )}

            <Field label={t("width")}>
              <Slider
                value={Math.round(place.width * 100)}
                onChange={(value) => {
                  setPlace((current) => ({ ...current, width: value / 100 }));
                  setResult(null);
                }}
                min={5}
                max={60}
                suffix="%"
              />
            </Field>

            <p className="tp-hint">{t("clickHint")}</p>

            {preview ? (
              <div className="tp-sheet" onClick={pointAt} role="presentation">
                <img src={preview} alt={`${t("page")} ${page + 1}`} />
                {signature && (
                  <img
                    className="tp-sheet-mark"
                    src={signature.url}
                    alt=""
                    style={{
                      left: `${place.x * 100}%`,
                      top: `${place.y * 100}%`,
                      width: `${place.width * 100}%`,
                    }}
                  />
                )}
              </div>
            ) : (
              <Note kind="warn">{t("noPreview")}</Note>
            )}

            <Actions>
              <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !signature}>
                {busy ? t("busy") : t("apply")}
              </button>
            </Actions>
            {!signature && <p className="tp-hint">{t("needSignature")}</p>}
          </Panel>
        </>
      )}

      {result && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("done")}</Note>
          <Actions>
            <button type="button" className="btn btn-primary" onClick={() => download(result.name, result.blob)}>
              <Icon name="download" size={16} /> {t("save")} ({formatBytes(result.blob.size)})
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
