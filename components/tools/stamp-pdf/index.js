"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, save, stampDocument } from "../../../lib/tools/pdf";

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
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
        setError(err.message);
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
      const doc = await stampDocument(file, {
        text: text.trim(),
        size,
        opacity: opacity / 100,
        angle,
        colour,
        numbers,
      });
      setResult({
        ...(await save(doc, { name: file.name.replace(/\.pdf$/i, "") + "-gestempeld.pdf" })),
        pages: doc.getPageCount(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }, [file, text, size, opacity, angle, colour, numbers, t]);

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
            <span className="tp-check">
              <input type="checkbox" checked={numbers} onChange={(event) => setNumbers(event.target.checked)} />
            </span>
          </Field>

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
