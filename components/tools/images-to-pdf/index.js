"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { imagesToPdf, save } from "../../../lib/tools/pdf";

export default function ImagesToPdf({ locale = "nl" }) {
  const t = toolStrings("images-to-pdf", locale);
  const [items, setItems] = useState([]);
  const [pageSize, setPageSize] = useState("a4");
  const [margin, setMargin] = useState(36);
  const [background, setBackground] = useState("#ffffff");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const take = useCallback((files) => {
    setError("");
    setResult(null);
    setItems((previous) => [
      ...previous,
      ...files.map((file, i) => ({ file, key: `${file.name}-${file.size}-${previous.length + i}` })),
    ]);
  }, []);

  const move = (index, by) =>
    setItems((previous) => {
      const next = previous.slice();
      const target = index + by;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const run = useCallback(async () => {
    if (!items.length) return;
    setBusy(t("building"));
    setError("");
    try {
      const doc = await imagesToPdf(items.map((item) => item.file), { pageSize, margin, background });
      setResult({ ...(await save(doc, { name: "afbeeldingen.pdf" })), pages: doc.getPageCount() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }, [items, pageSize, margin, background, t]);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        multiple
        icon="image"
        paste
        title={t("dropImages")}
        hint={t("dropImagesHint")}
      />

      {error && <Note kind="error">{error}</Note>}
      {busy && <Note kind="ok">{busy}</Note>}

      {items.length > 0 && (
        <Panel title={t("layout")}>
          <Field label={t("layout")}>
            <Segmented
              label={t("layout")}
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "a4", label: t("a4") },
                { value: "fit", label: t("fitPage") },
              ]}
            />
          </Field>
          <Field label={t("margin")}>
            <Slider value={margin} onChange={setMargin} min={0} max={120} step={4} suffix=" pt" />
          </Field>
          <Field label={t("background")}>
            {(id) => (
              <input id={id} type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
            )}
          </Field>

          <ul className="tp-rows">
            {items.map((item, index) => (
              <li key={item.key}>
                <Icon name="image" size={18} />
                <span className="tp-row-text">
                  <strong>{item.file.name}</strong>
                  <span>{formatBytes(item.file.size)}</span>
                </span>
                <span className="tp-row-actions">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
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
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(busy)}>
              {t("make")}
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
