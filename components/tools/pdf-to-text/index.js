"use client";

import { useCallback, useState } from "react";
import { Actions, CopyButton, Field, FileDrop, Note, Panel, Segmented, download } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { openDocument, pageText } from "../../../lib/tools/pdfjs";
import { describeError } from "../../../lib/tools/errors";

export default function PdfToText({ locale = "nl" }) {
  const [busy, setBusy] = useState(null);
  const t = toolStrings("pdf-to-text", locale);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [layout, setLayout] = useState("marked");
  const [error, setError] = useState("");

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setPages([]);
      setFile(picked);

      let reader = null;
      try {
        reader = await openDocument(picked);
        const found = [];
        for (let number = 1; number <= reader.numPages; number++) {
          setBusy({ done: number - 1, total: reader.numPages });
          found.push({ number, text: await pageText(reader, number) });
        }
        setPages(found);
      } catch (err) {
        setFile(null);
        setError(describeError(t, err));
      } finally {
        await reader?.destroy?.();
        setBusy(null);
      }
    },
    [t]
  );

  const full = pages
    .map((page) => (layout === "marked" ? `--- ${t("page")} ${page.number} ---\n${page.text}` : page.text))
    .join("\n\n");

  // A scan has pages but no text in them. Saying so beats handing back an
  // empty box, because the next question is always "what do I do instead".
  const empty = pages.length > 0 && pages.every((page) => !page.text);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="file" title={t("dropPdf")} hint={t("pdfHint")} />

      {busy && <Note kind="ok">{t("reading2", { done: busy.done, total: busy.total })}</Note>}
      {error && <Note kind="error">{error}</Note>}
      {empty && <Note kind="warn">{t("scanned")}</Note>}

      {pages.length > 0 && !empty && (
        <Panel title={`${file.name} · ${t("pageCount", { n: pages.length })}`}>
          <Field label={t("marks")}>
            <Segmented
              label={t("marks")}
              value={layout}
              onChange={setLayout}
              options={[
                { value: "marked", label: t("withMarks") },
                { value: "plain", label: t("withoutMarks") },
              ]}
            />
          </Field>

          <pre className="tp-out tp-clip-tall">{full}</pre>

          <Actions>
            <CopyButton text={full} label={t("copy")} copiedLabel={t("copied")} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                download(`${file.name.replace(/\.pdf$/i, "")}.txt`, full, "text/plain;charset=utf-8")
              }
            >
              {t("saveTxt")}
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
