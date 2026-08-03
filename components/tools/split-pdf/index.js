"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, download, formatBytes, Icon } from "../ui";
import { PageGrid, usePageThumbnails } from "../PageGrid";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, extractPages, formatPageRange, parsePageRange, save, splitEvery } from "../../../lib/tools/pdf";
import { makeZip, uniqueNames } from "../../../lib/tools/zip";
import { describeError } from "../../../lib/tools/errors";

export default function SplitPdf({ locale = "nl" }) {
  const t = toolStrings("split-pdf", locale);
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState("pick");
  const [range, setRange] = useState("1");
  const [every, setEvery] = useState(1);
  const [parts, setParts] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const { thumbs, done, total } = usePageThumbnails(file);

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setParts([]);
      setBusy(t("reading"));
      try {
        const described = await describe(picked);
        setFile(picked);
        setInfo(described);
        setRange("1");
      } catch (err) {
        setFile(null);
        setInfo(null);
        setError(describeError(t, err));
      } finally {
        setBusy("");
      }
    },
    [t]
  );

  // The typed range is the one truth; clicking a page rewrites it. Two states
  // that mean the same thing would only be two states to keep in step.
  const chosen = useMemo(() => (info ? parsePageRange(range, info.pages) : []), [range, info]);
  const chosenSet = useMemo(() => new Set(chosen), [chosen]);

  const toggle = useCallback(
    (index) => {
      const next = new Set(chosenSet);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      setRange(formatPageRange([...next].sort((a, b) => a - b)));
      setParts([]);
    },
    [chosenSet]
  );

  const pages = useMemo(
    () =>
      info
        ? Array.from({ length: info.pages }, (_, index) => ({
            key: index,
            index,
            number: index + 1,
            selected: chosenSet.has(index),
          }))
        : [],
    [info, chosenSet]
  );

  const run = useCallback(async () => {
    if (!file || !info) return;
    setError("");
    setBusy(t("building"));

    try {
      const base = file.name.replace(/\.pdf$/i, "");
      const groups =
        mode === "pick"
          ? chosen.length
            ? [chosen]
            : []
          : await splitEvery(file, Math.max(1, every));

      if (!groups.length) {
        setError(t("none"));
        return;
      }

      const made = [];
      for (let i = 0; i < groups.length; i++) {
        const doc = await extractPages(file, groups[i]);
        const label =
          mode === "pick" ? formatPageRange(groups[i]).replace(/[,\s]+/g, "_") : `${t("partName")}-${i + 1}`;
        made.push({ ...(await save(doc, { name: `${base}-${label}.pdf` })), pages: groups[i].length });
      }
      setParts(made);
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy("");
    }
  }, [file, info, mode, chosen, every, t]);

  const saveZip = useCallback(async () => {
    const names = uniqueNames(parts.map((part) => part.name));
    const zip = await makeZip(parts.map((part, at) => ({ name: names[at], data: part.blob })));
    download(`${file.name.replace(/\.pdf$/i, "")}.zip`, zip);
  }, [parts, file]);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="crop" title={t("dropPdf")} hint={t("pdfHint")} />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {info && (
        <Panel title={`${file.name} · ${t("pageCount", { n: info.pages })}`}>
          <Field label={t("how")}>
            <Segmented
              label={t("how")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "pick", label: t("modePick") },
                { value: "every", label: t("modeEvery") },
              ]}
            />
          </Field>

          {mode === "pick" ? (
            <>
              <Field label={t("which")} hint={t("whichHint")}>
                {(id) => (
                  <input
                    id={id}
                    type="text"
                    value={range}
                    onChange={(event) => {
                      setRange(event.target.value);
                      setParts([]);
                    }}
                    placeholder="1-3, 7, 12-"
                    inputMode="numeric"
                  />
                )}
              </Field>

              <p className="tp-hint">
                {t("clickHint")}
                {done < total ? ` · ${t("rendering", { done, total })}` : ""}
              </p>

              <PageGrid
                pages={pages}
                thumbs={thumbs}
                onToggle={toggle}
                selectable
                labels={{ page: t("page") }}
              />

              <Actions>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => setRange(`1-${info.pages}`)}
                >
                  {t("selectAll")}
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRange("")}>
                  {t("selectNone")}
                </button>
              </Actions>

              <Note kind={chosen.length ? "ok" : "warn"}>
                {chosen.length ? t("selected", { n: chosen.length, total: info.pages }) : t("none")}
              </Note>
            </>
          ) : (
            <Field label={t("every")}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={info.pages}
                  value={every}
                  onChange={(event) => setEvery(Number(event.target.value))}
                />
              )}
            </Field>
          )}

          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={run}
              disabled={Boolean(busy) || (mode === "pick" && !chosen.length)}
            >
              {t("split")}
            </button>
          </Actions>
        </Panel>
      )}

      {parts.length > 0 && (
        <Panel title={t("result")}>
          <ul className="tp-rows">
            {parts.map((part) => (
              <li key={part.name}>
                <Icon name="file" size={18} />
                <span className="tp-row-text">
                  <strong>{part.name}</strong>
                  <span>
                    {t("pageCount", { n: part.pages })} · {formatBytes(part.blob.size)}
                  </span>
                </span>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => download(part.name, part.blob)}>
                  <Icon name="download" size={15} /> {t("save")}
                </button>
              </li>
            ))}
          </ul>
          {parts.length > 1 && (
            <Actions>
              <button type="button" className="btn btn-primary" onClick={saveZip}>
                <Icon name="download" size={16} /> {t("saveZip")}
              </button>
            </Actions>
          )}
        </Panel>
      )}
    </>
  );
}
