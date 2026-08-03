"use client";

import { useCallback, useRef, useState } from "react";
import Icon from "../../../app/afspraken/Icons";
import { COLUMNS, csvToIcs, icsToCsv } from "../../../lib/tools/icscsv";
import { toolStrings } from "../../../lib/i18n/tools";

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const looksLikeIcs = (text) => /BEGIN:VCALENDAR|BEGIN:VEVENT/i.test(text.slice(0, 4000));

export default function Converter({ locale = "nl" }) {
  const t = toolStrings("convert-calendar", locale);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState("");
  const fileRef = useRef(null);

  /** The direction is obvious from the content, so it is not worth asking. */
  const convert = useCallback((text, sourceName) => {
    setError("");

    if (!text.trim()) {
      setResult(null);
      setError(t("empty"));
      return;
    }

    if (looksLikeIcs(text)) {
      const { csv, rows, count, errors } = icsToCsv(text);
      if (!count) {
        setResult(null);
        setError(errors[0] || t("noEvents"));
        return;
      }
      setResult({ kind: "csv", text: csv, rows, count, errors, sourceName });
      return;
    }

    const { ics, count, errors, skipped } = csvToIcs(text);
    if (!count) {
      setResult(null);
      setError(errors[0] || t("noRows"));
      return;
    }
    setResult({ kind: "ics", text: ics, count, errors, skipped, sourceName });
  }, [t]);

  const openFile = useCallback(
    async (file) => {
      const text = await file.text();
      convert(text, file.name);
    },
    [convert]
  );

  const baseName = (result?.sourceName || "agenda").replace(/\.[^.]+$/, "");

  return (
    <>
      <div
        className={`tp-drop${dragging ? " is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) openFile(file);
        }}
      >
        <Icon name="calendar" size={26} />
        <strong>{t("drop")}</strong>
        <small>{t("dropHint")}</small>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,.ical,.csv,.txt,text/calendar,text/csv"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) openFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="tp-panel" style={{ marginTop: 14 }}>
        <h3>{t("pastePanel")}</h3>
        <textarea
          className="tp-textarea"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          placeholder={`BEGIN:VCALENDAR…\n\nof\n\n${COLUMNS.slice(0, 5).join(",")}\nTandarts,2026-08-04,09:15,2026-08-04,09:45`}
          spellCheck={false}
        />
        <div className="tp-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!pasted.trim()}
            onClick={() => convert(pasted, "geplakt")}
          >
            {t("convert")}
          </button>
        </div>
      </div>

      {error && (
        <p className="tp-note tp-note-error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}

      {result && (
        <div className="tp-panel">
          <p className={`tp-note ${result.errors?.length ? "tp-note-warn" : "tp-note-ok"}`}>
            <Icon name={result.errors?.length ? "alert" : "check"} size={16} />
            <span>
              {result.kind === "csv"
                ? t("toTable", { n: result.count, word: t(result.count === 1 ? "appointment" : "appointments") })
                : t("toCalendar", { n: result.count, word: t(result.count === 1 ? "row" : "rows") })}
              {result.skipped > 0 && ` ${t("skipped", { n: result.skipped })}`}
            </span>
          </p>

          {result.errors?.length > 0 && (
            <details className="tp-note tp-note-warn" style={{ display: "block" }}>
              <summary>{t("messages", { n: result.errors.length })}</summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {result.errors.slice(0, 10).map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </details>
          )}

          {result.kind === "csv" ? (
            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 12).map((row, i) => (
                    <tr key={i}>
                      {COLUMNS.map((column) => (
                        <td key={column}>{row[column]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="tp-body" style={{ maxHeight: 260, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
              {result.text.slice(0, 2000)}
              {result.text.length > 2000 ? "\n…" : ""}
            </pre>
          )}

          {result.kind === "csv" && result.rows.length > 12 && (
            <p className="tp-sub" style={{ margin: "10px 0 0", fontSize: 13 }}>
              {t("firstRows", { n: result.rows.length })}
            </p>
          )}

          <div className="tp-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                result.kind === "csv"
                  ? download(`${baseName}.csv`, result.text, "text/csv;charset=utf-8")
                  : download(`${baseName}.ics`, result.text, "text/calendar;charset=utf-8")
              }
            >
              <Icon name="download" size={16} />
              {result.kind === "csv" ? "Download .csv" : "Download .ics"}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => navigator.clipboard?.writeText(result.text).catch(() => {})}
            >
              {"Kopiëren"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
