"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { readMetadata, save, writeMetadata } from "../../../lib/tools/pdf";
import { describeError } from "../../../lib/tools/errors";

const FIELDS = ["title", "author", "subject", "keywords", "creator", "producer"];

export default function PdfMetadata({ locale = "nl" }) {
  const t = toolStrings("pdf-metadata", locale);
  const [file, setFile] = useState(null);
  const [original, setOriginal] = useState(null);
  const [fields, setFields] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setResult(null);
      try {
        const read = await readMetadata(picked);
        setFile(picked);
        setOriginal(read);
        setFields(Object.fromEntries(FIELDS.map((key) => [key, read[key] || ""])));
      } catch (err) {
        setFile(null);
        setOriginal(null);
        setFields(null);
        setError(describeError(t, err));
      }
    },
    [t]
  );

  const run = useCallback(async () => {
    if (!file || !fields) return;
    setBusy(true);
    setError("");
    try {
      const doc = await writeMetadata(file, fields);
      setResult(await save(doc, { name: file.name }));
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy(false);
    }
  }, [file, fields, t]);

  const stripAll = () => {
    setFields(Object.fromEntries(FIELDS.map((key) => [key, ""])));
    setResult(null);
  };

  const formatDate = (date) =>
    date ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(date) : "—";

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="pencil" title={t("dropPdf")} hint={t("pdfHint")} />

      {error && <Note kind="error">{error}</Note>}

      {fields && (
        <>
          <Panel title={`${file.name} · ${t("pageCount", { n: original.pages })}`}>
            {FIELDS.map((key) => (
              <Field key={key} label={t(key)} hint={key === "keywords" ? t("keywordsHint") : undefined}>
                {(id) => (
                  <input
                    id={id}
                    type="text"
                    value={fields[key]}
                    onChange={(event) => {
                      setFields((current) => ({ ...current, [key]: event.target.value }));
                      setResult(null);
                    }}
                    placeholder={t("emptyField")}
                  />
                )}
              </Field>
            ))}

            <dl className="tp-stat tp-stat-wide">
              <div>
                <dt>{t("created")}</dt>
                <dd className="tp-plain">{formatDate(original.created)}</dd>
              </div>
              <div>
                <dt>{t("modified")}</dt>
                <dd className="tp-plain">{formatDate(original.modified)}</dd>
              </div>
            </dl>

            <Actions>
              <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
                {busy ? t("busy") : t("apply")}
              </button>
              <button type="button" className="btn btn-quiet" onClick={stripAll}>
                {t("stripAll")}
              </button>
            </Actions>
          </Panel>

          <p className="tp-hint">{t("note")}</p>
        </>
      )}

      {result && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("written")}</Note>
          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => download(result.name, result.blob)}
            >
              <Icon name="download" size={16} /> {t("save")} ({formatBytes(result.blob.size)})
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
