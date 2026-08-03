"use client";

import { useMemo, useState } from "react";
import { Actions, CopyButton, Field, Note, Panel, Segmented, Slider } from "../ui";
import { decodeUrl, encodeUrl, slugify } from "../../../lib/tools/text";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

export default function SlugUrl({ locale = "nl" }) {
  const t = toolStrings("slug-url", locale);
  const [tab, setTab] = useState("slug");

  const [title, setTitle] = useState("");
  const [separator, setSeparator] = useState("-");
  const [lower, setLower] = useState(true);
  const [max, setMax] = useState(0);

  const [urlText, setUrlText] = useState("");
  const [urlMode, setUrlMode] = useState("encode");
  const [component, setComponent] = useState(true);

  const slug = useMemo(
    () => slugify(title, { separator, lower, max }),
    [title, separator, lower, max]
  );

  const url = useMemo(() => {
    if (!urlText) return { value: "", error: "" };
    try {
      return {
        value: urlMode === "encode" ? encodeUrl(urlText, { component }) : decodeUrl(urlText),
        error: "",
      };
    } catch (err) {
      return { value: "", error: describeError(t, err) };
    }
  }, [urlText, urlMode, component, t]);

  return (
    <>
      <div className="tp-tabs">
        <Segmented
          label={t("slugTab")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "slug", label: t("slugTab") },
            { value: "url", label: t("urlTab") },
          ]}
        />
      </div>

      {tab === "slug" ? (
        <>
          <Panel>
            <Field label={t("titleLabel")}>
              {(id) => (
                <input
                  id={id}
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              )}
            </Field>

            <Field label={t("separator")}>
              <Segmented
                label={t("separator")}
                value={separator}
                onChange={setSeparator}
                options={[
                  { value: "-", label: "-" },
                  { value: "_", label: "_" },
                ]}
              />
            </Field>

            <Field label={t("lower")}>
              <input
                type="checkbox"
                className="tp-switch"
                checked={lower}
                onChange={(event) => setLower(event.target.checked)}
              />
            </Field>

            <Field label={t("maxLength")} hint={t("maxHint")}>
              <Slider value={max} onChange={setMax} min={0} max={120} step={5} />
            </Field>
          </Panel>

          {slug && (
            <Panel title={t("slugResult")}>
              <pre className="tp-out tp-mono tp-break">{slug}</pre>
              <p className="tp-hint">
                {slug.length} {t("length").toLowerCase()}
              </p>
              <Actions>
                <CopyButton text={slug} label={t("copy")} copiedLabel={t("copied")} />
              </Actions>
            </Panel>
          )}
        </>
      ) : (
        <>
          <Panel>
            <Field label={t("direction")}>
              <Segmented
                label={t("direction")}
                value={urlMode}
                onChange={setUrlMode}
                options={[
                  { value: "encode", label: t("encode") },
                  { value: "decode", label: t("decode") },
                ]}
              />
            </Field>

            <textarea
              className="tp-text tp-mono"
              rows={5}
              spellCheck={false}
              value={urlText}
              onChange={(event) => setUrlText(event.target.value)}
              placeholder={t("urlPlaceholder")}
              aria-label={t("urlPlaceholder")}
            />

            {urlMode === "encode" && (
              <Field label={t("componentMode")} hint={t("modeHint")}>
                <Segmented
                  label={t("componentMode")}
                  value={component}
                  onChange={setComponent}
                  options={[
                    { value: true, label: t("componentMode") },
                    { value: false, label: t("fullMode") },
                  ]}
                />
              </Field>
            )}
          </Panel>

          {url.error && <Note kind="error">{url.error}</Note>}

          {url.value && (
            <Panel title={t("result")}>
              <pre className="tp-out tp-mono tp-break">{url.value}</pre>
              <Actions>
                <CopyButton text={url.value} label={t("copy")} copiedLabel={t("copied")} />
              </Actions>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
