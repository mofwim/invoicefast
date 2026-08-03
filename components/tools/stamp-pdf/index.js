"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Slider, download, formatBytes, Icon } from "../ui";
import { usePagePreview } from "../usePreview";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, samplePage, save, stampDocument } from "../../../lib/tools/pdf";
import { describeError } from "../../../lib/tools/errors";

export default function StampPdf({ locale = "nl" }) {
  const t = toolStrings("stamp-pdf", locale);
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [text, setText] = useState(locale === "en" ? "COPY" : "KOPIE");
  const [size, setSize] = useState(56);
  const [opacity, setOpacity] = useState(22);
  const [angle, setAngle] = useState(45);
  const [colour, setColour] = useState("#d00000");
  const [numbers, setNumbers] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const options = useMemo(
    () => ({ text: text.trim(), size, opacity: opacity / 100, angle, colour, numbers }),
    [text, size, opacity, angle, colour, numbers]
  );

  // Built by the same call that builds the result, on one page.
  const preview = usePagePreview(
    file && info
      ? () =>
          samplePage(file, Math.min(page, info.pages - 1), (sample) =>
            stampDocument(sample, { ...options, firstNumber: page + 1, total: info.pages })
          )
      : null,
    [file, info, page, options]
  );

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setResult(null);
      setBusy(t("reading"));
      try {
        const described = await describe(picked);
        setFile(picked);
        setInfo(described);
      } catch (err) {
        setFile(null);
        setInfo(null);
        setError(describeError(t, err));
      } finally {
        setBusy("");
      }
    },
    [t]
  );

  const run = useCallback(async () => {
    if (!file) return;
    if (!text.trim() && !numbers) {
      setError(t("nothing"));
      return;
    }
    setBusy(t("building"));
    setError("");
    try {
      const doc = await stampDocument(file, options);
      setResult({
        ...(await save(doc, { name: file.name.replace(/\.pdf$/i, "") + "-gestempeld.pdf" })),
        pages: doc.getPageCount(),
      });
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy("");
    }
  }, [file, text, numbers, options, t]);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="pencil" title={t("dropPdf")} hint={t("pdfHint")} />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {info && (
        <Panel title={`${t("stamp")} · ${t("pageCount", { n: info.pages })}`}>
          <Field label={t("text")}>
            {(id) => (
              <input
                id={id}
                type="text"
                value={text}
                maxLength={40}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("textPlaceholder")}
              />
            )}
          </Field>
          <Field label={t("size")}>
            <Slider value={size} onChange={setSize} min={16} max={140} suffix=" pt" />
          </Field>
          <Field label={t("opacity")}>
            <Slider value={opacity} onChange={setOpacity} min={5} max={100} suffix="%" />
          </Field>
          <Field label={t("angle")}>
            <Slider value={angle} onChange={setAngle} min={0} max={90} suffix="°" />
          </Field>
          <Field label={t("colour")}>
            {(id) => <input id={id} type="color" value={colour} onChange={(event) => setColour(event.target.value)} />}
          </Field>
          <Field label={t("numbers")}>
            <input
              type="checkbox"
              className="tp-switch"
              checked={numbers}
              onChange={(event) => setNumbers(event.target.checked)}
            />
          </Field>

          {info.pages > 1 && (
            <Field label={t("previewPage")}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={info.pages}
                  value={page + 1}
                  onChange={(event) =>
                    setPage(Math.min(info.pages - 1, Math.max(0, Number(event.target.value) - 1)))
                  }
                />
              )}
            </Field>
          )}

          <div className={`tp-sheet tp-sheet-still${preview.busy ? " is-busy" : ""}`}>
            {preview.url ? (
              <img src={preview.url} alt={`${t("preview")} — ${t("page")} ${page + 1}`} />
            ) : (
              <span className="tp-sheet-waiting">{t("preview")}…</span>
            )}
          </div>

          <Actions>
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(busy)}>
              {t("apply")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel>
          <Note kind="ok">{t("done", { n: result.pages })}</Note>
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
