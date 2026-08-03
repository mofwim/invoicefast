"use client";

import { useCallback, useEffect, useState } from "react";
import { Actions, CopyButton, Field, FileDrop, Note, Panel, Segmented, formatBytes } from "../ui";
import { ALGORITHMS, WEAK, hashFile, hashText, sameDigest } from "../../../lib/tools/hash";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

export default function Hash({ locale = "nl" }) {
  const t = toolStrings("hash", locale);
  const [source, setSource] = useState("text");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [digest, setDigest] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");

  // Text hashes as it is typed; a file is read once and re-hashed only when
  // the algorithm changes, because reading a gigabyte per keystroke is not a
  // thing anyone wants.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError("");
      if (source === "text") {
        if (!text) {
          setDigest("");
          return;
        }
        try {
          const value = await hashText(text, algorithm);
          if (!cancelled) setDigest(value);
        } catch (err) {
          if (!cancelled) setError(describeError(t, err));
        }
        return;
      }

      if (!file) {
        setDigest("");
        return;
      }
      setBusy(true);
      setProgress(0);
      try {
        const value = await hashFile(file, algorithm, (done) => !cancelled && setProgress(done));
        if (!cancelled) setDigest(value);
      } catch (err) {
        if (!cancelled) setError(describeError(t, err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [source, text, file, algorithm, t]);

  const take = useCallback(([picked]) => {
    setFile(picked);
    setDigest("");
  }, []);

  const comparison = expected.trim() ? sameDigest(digest, expected) : null;

  return (
    <>
      <Panel>
        <Field label={t("source")}>
          <Segmented
            label={t("source")}
            value={source}
            onChange={setSource}
            options={[
              { value: "text", label: t("text") },
              { value: "file", label: t("file") },
            ]}
          />
        </Field>

        <Field label={t("algorithm")}>
          <Segmented
            label={t("algorithm")}
            value={algorithm}
            onChange={setAlgorithm}
            options={ALGORITHMS.map((value) => ({ value, label: value }))}
          />
        </Field>

        {source === "text" ? (
          <textarea
            className="tp-text tp-mono"
            rows={5}
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
          />
        ) : (
          <>
            <FileDrop onFiles={take} icon="file" title={t("drop")} hint={t("dropHint")} />
            {file && (
              <dl className="tp-stat">
                <div>
                  <dt>{t("file")}</dt>
                  <dd className="tp-ellipsis">{file.name}</dd>
                </div>
                <div>
                  <dt>{t("size")}</dt>
                  <dd>{formatBytes(file.size)}</dd>
                </div>
              </dl>
            )}
          </>
        )}
      </Panel>

      {WEAK.has(algorithm) && <Note kind="warn">{t("weak", { algorithm })}</Note>}
      {error && <Note kind="error">{error}</Note>}
      {busy && <Note kind="ok">{t("reading", { pct: Math.round(progress * 100) })}</Note>}

      {digest && (
        <Panel title={t("digest")}>
          <pre className="tp-out tp-mono tp-break">{digest}</pre>
          <Actions>
            <CopyButton text={digest} label={t("copy")} copiedLabel={t("copied")} />
          </Actions>

          <Field label={t("compare")}>
            {(id) => (
              <input
                id={id}
                type="text"
                className="tp-mono"
                spellCheck={false}
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                placeholder={t("comparePlaceholder")}
              />
            )}
          </Field>

          {comparison === true && <Note kind="ok">{t("match")}</Note>}
          {comparison === false && <Note kind="error">{t("noMatch")}</Note>}
        </Panel>
      )}
    </>
  );
}
