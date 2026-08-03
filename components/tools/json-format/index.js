"use client";

import { useCallback, useState } from "react";
import { Actions, CopyButton, Field, Note, Panel, Segmented, download } from "../ui";
import { formatJson } from "../../../lib/tools/text";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

export default function JsonFormat({ locale = "nl" }) {
  const t = toolStrings("json-format", locale);
  const [source, setSource] = useState("");
  const [indent, setIndent] = useState(2);
  const [sort, setSort] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = useCallback(() => {
    setError("");
    try {
      setResult(formatJson(source, { indent, sort }));
    } catch (err) {
      setResult(null);
      // The engine names what it wanted in its own vocabulary; the page turns
      // that into this language before the sentence is built around it.
      const details = err.details?.expected
        ? { ...err.details, expected: t(`expect.${err.details.expected}`) }
        : err.details;
      setError(describeError(t, { ...err, code: err.code, details }));
    }
  }, [source, indent, sort, t]);

  return (
    <>
      <Panel>
        <textarea
          className="tp-text tp-mono"
          rows={9}
          spellCheck={false}
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setError("");
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
        />

        <Field label={t("indent")}>
          <Segmented
            label={t("indent")}
            value={indent}
            onChange={setIndent}
            options={[
              { value: 0, label: t("flat") },
              { value: 2, label: t("spaces", { n: 2 }) },
              { value: 4, label: t("spaces", { n: 4 }) },
            ]}
          />
        </Field>

        <Field label={t("sort")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={sort}
            onChange={(event) => setSort(event.target.checked)}
          />
        </Field>

        <Actions>
          <button type="button" className="btn btn-primary" onClick={run} disabled={!source.trim()}>
            {t("format")}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setSource("");
              setResult(null);
              setError("");
            }}
            disabled={!source}
          >
            {t("clear")}
          </button>
        </Actions>
      </Panel>

      {error && <Note kind="error">{error}</Note>}

      {result && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("valid", { keys: result.stats.keys, depth: result.stats.depth })}</Note>
          <pre className="tp-out tp-mono">{result.text}</pre>
          <Actions>
            <CopyButton text={result.text} label={t("copy")} copiedLabel={t("copied")} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => download("opgemaakt.json", result.text, "application/json")}
            >
              {t("save")}
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
