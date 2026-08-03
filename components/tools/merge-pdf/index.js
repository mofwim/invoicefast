"use client";

import { useCallback, useState } from "react";
import { Actions, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, mergeFiles, save } from "../../../lib/tools/pdf";

export default function MergePdf({ locale = "nl" }) {
  const t = toolStrings("merge-pdf", locale);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const take = useCallback(
    async (files) => {
      setError("");
      setResult(null);
      setBusy(t("reading"));

      const added = [];
      for (const file of files) {
        try {
          const info = await describe(file);
          added.push({ file, ...info, key: `${file.name}-${file.size}-${added.length}` });
        } catch (err) {
          setError(err.message);
        }
      }
      setItems((previous) => [...previous, ...added]);
      setBusy("");
    },
    [t]
  );

  const move = (index, by) =>
    setItems((previous) => {
      const next = previous.slice();
      const target = index + by;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const run = useCallback(async () => {
    if (items.length < 2) {
      setError(t("needTwo"));
      return;
    }
    setBusy(t("building"));
    setError("");
    try {
      const { doc, pages } = await mergeFiles(items.map((item) => item.file));
      const saved = await save(doc, { name: "samengevoegd.pdf" });
      setResult({ ...saved, pages, files: items.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }, [items, t]);

  const totalPages = items.reduce((sum, item) => sum + item.pages, 0);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="application/pdf,.pdf"
        multiple
        icon="file"
        title={t("dropPdfs")}
        hint={t("dropHint")}
      />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {items.length > 0 && (
        <Panel title={`${t("order")} · ${t("pageCount", { n: totalPages })}`}>
          <ul className="tp-rows">
            {items.map((item, index) => (
              <li key={item.key}>
                <Icon name="file" size={18} />
                <span className="tp-row-text">
                  <strong>{item.file.name}</strong>
                  <span>
                    {t("pageCount", { n: item.pages })} · {formatBytes(item.file.size)}
                  </span>
                </span>
                <span className="tp-row-actions">
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t("up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={t("down")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                    aria-label={t("remove")}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <Actions>
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(busy) || items.length < 2}>
              {t("merge")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel>
          <Note kind="ok">{t("done", { files: result.files, pages: result.pages })}</Note>
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
