"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, CopyButton, Field, FileDrop, Note, Panel, Segmented, formatBytes } from "../ui";
import { decodeBase64, encodeBase64 } from "../../../lib/tools/text";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

export default function Base64({ locale = "nl" }) {
  const t = toolStrings("base64", locale);
  const [direction, setDirection] = useState("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");
  const [dataUri, setDataUri] = useState(null);

  // Both directions run on every keystroke, so the result is simply there.
  // Neither is expensive, and a button to press would be a button in the way.
  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      return {
        output: direction === "encode" ? encodeBase64(input, { urlSafe }) : decodeBase64(input),
        error: "",
      };
    } catch (err) {
      return { output: "", error: describeError(t, err) };
    }
  }, [input, direction, urlSafe, t]);

  const takeFile = useCallback(async ([file]) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    }
    const mime = file.type || "application/octet-stream";
    setDataUri({ name: file.name, size: file.size, uri: `data:${mime};base64,${btoa(binary)}` });
  }, []);

  return (
    <>
      <Panel>
        <Field label={t("direction")}>
          <Segmented
            label={t("direction")}
            value={direction}
            onChange={setDirection}
            options={[
              { value: "encode", label: t("encode") },
              { value: "decode", label: t("decode") },
            ]}
          />
        </Field>

        <textarea
          className="tp-text tp-mono"
          rows={6}
          spellCheck={false}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={direction === "encode" ? t("placeholderEncode") : t("placeholderDecode")}
          aria-label={direction === "encode" ? t("placeholderEncode") : t("placeholderDecode")}
        />

        {direction === "encode" && (
          <Field label={t("urlSafe")} hint={t("urlSafeHint")}>
            <input
              type="checkbox"
              className="tp-switch"
              checked={urlSafe}
              onChange={(event) => setUrlSafe(event.target.checked)}
            />
          </Field>
        )}

        <Actions>
          <button type="button" className="btn btn-quiet" onClick={() => setInput("")} disabled={!input}>
            {t("clear")}
          </button>
        </Actions>
      </Panel>

      {error && <Note kind="error">{error}</Note>}

      {output && (
        <Panel title={t("output")}>
          <pre className="tp-out tp-mono tp-break">{output}</pre>
          <Actions>
            <CopyButton text={output} label={t("copy")} copiedLabel={t("copied")} />
          </Actions>
        </Panel>
      )}

      <Panel title={t("filePanel")}>
        <p className="tp-hint">{t("fileHint")}</p>
        <FileDrop onFiles={takeFile} icon="file" title={t("dropFile")} hint={t("dropHint")} />
        {dataUri && (
          <>
            <dl className="tp-stat">
              <div>
                <dt>{t("file")}</dt>
                <dd className="tp-ellipsis">{dataUri.name}</dd>
              </div>
              <div>
                <dt>{t("dataUri")}</dt>
                <dd>{formatBytes(dataUri.uri.length)}</dd>
              </div>
            </dl>
            <pre className="tp-out tp-mono tp-break tp-clip">{dataUri.uri}</pre>
            <Note kind="ok">{t("grew", { size: formatBytes(dataUri.size) })}</Note>
            <Actions>
              <CopyButton text={dataUri.uri} label={t("copy")} copiedLabel={t("copied")} />
            </Actions>
          </>
        )}
      </Panel>
    </>
  );
}
