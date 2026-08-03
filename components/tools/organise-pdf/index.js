"use client";

import { useCallback, useState } from "react";
import { Actions, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, rotateAndDrop, save } from "../../../lib/tools/pdf";

export default function OrganisePdf({ locale = "nl" }) {
  const t = toolStrings("organise-pdf", locale);
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [rotate, setRotate] = useState({});
  const [drop, setDrop] = useState(new Set());
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setResult(null);
      setRotate({});
      setDrop(new Set());
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

  const turn = (index, by) =>
    setRotate((previous) => ({ ...previous, [index]: ((previous[index] || 0) + by + 360) % 360 }));

  const toggleDrop = (index) =>
    setDrop((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const run = useCallback(async () => {
    if (!file || !info) return;
    if (drop.size >= info.pages) {
      setError(t("allDropped"));
      return;
    }
    setBusy(t("building"));
    setError("");
    try {
      const doc = await rotateAndDrop(file, { rotate, drop: [...drop] });
      setResult(await save(doc, { name: file.name.replace(/\.pdf$/i, "") + "-geordend.pdf" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }, [file, info, rotate, drop, t]);

  const keep = info ? info.pages - drop.size : 0;

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="shuffle" title={t("dropPdf")} hint={t("pdfHint")} />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {info && (
        <Panel title={`${file.name} · ${t("pageCount", { n: info.pages })}`}>
          <Note kind={keep ? "ok" : "warn"}>{t("summary", { keep, total: info.pages })}</Note>

          <ul className="tp-pages">
            {Array.from({ length: info.pages }, (_, index) => {
              const dropped = drop.has(index);
              const angle = rotate[index] || 0;
              return (
                <li key={index} data-dropped={dropped || undefined}>
                  {/* A page stands in for itself: number and orientation are
                      all that has to be right, and rendering one would mean
                      shipping a whole PDF renderer. */}
                  <span
                    className="tp-page-tile"
                    data-portrait={info.portrait ? "" : undefined}
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    {index + 1}
                  </span>
                  <span className="tp-page-tools">
                    <button type="button" onClick={() => turn(index, -90)} aria-label={t("rotateLeft")} disabled={dropped}>
                      ⟲
                    </button>
                    <button type="button" onClick={() => turn(index, 90)} aria-label={t("rotateRight")} disabled={dropped}>
                      ⟳
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDrop(index)}
                      aria-label={dropped ? t("restore") : t("remove")}
                      data-danger={!dropped || undefined}
                    >
                      {dropped ? "↺" : "✕"}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>

          <Actions>
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(busy) || !keep}>
              {t("apply")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel>
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
