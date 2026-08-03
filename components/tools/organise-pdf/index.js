"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { PageGrid, usePageThumbnails } from "../PageGrid";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, rebuildPages, save } from "../../../lib/tools/pdf";
import { describeError } from "../../../lib/tools/errors";

/** The starting plan: every page, in order, turned no further than it already is. */
const initialPlan = (count) =>
  Array.from({ length: count }, (_, index) => ({ index, rotate: 0, dropped: false }));

export default function OrganisePdf({ locale = "nl" }) {
  const t = toolStrings("organise-pdf", locale);
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [plan, setPlan] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const { thumbs, done, total } = usePageThumbnails(file);

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setResult(null);
      setPlan([]);
      setBusy(t("reading"));
      try {
        const described = await describe(picked);
        setFile(picked);
        setInfo(described);
        setPlan(initialPlan(described.pages));
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

  const move = useCallback((from, to) => {
    setPlan((current) => {
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setResult(null);
  }, []);

  const rotate = useCallback((index, by) => {
    setPlan((current) =>
      current.map((entry) =>
        entry.index === index ? { ...entry, rotate: (entry.rotate + by + 360) % 360 } : entry
      )
    );
    setResult(null);
  }, []);

  const toggle = useCallback((index) => {
    setPlan((current) =>
      current.map((entry) => (entry.index === index ? { ...entry, dropped: !entry.dropped } : entry))
    );
    setResult(null);
  }, []);

  const pages = useMemo(
    () =>
      plan.map((entry) => ({
        key: entry.index,
        index: entry.index,
        number: entry.index + 1,
        rotate: entry.rotate,
        dropped: entry.dropped,
      })),
    [plan]
  );

  const keep = plan.filter((entry) => !entry.dropped);
  const moved = plan.some((entry, position) => entry.index !== position);

  const run = useCallback(async () => {
    if (!file || !keep.length) return;
    setBusy(t("building"));
    setError("");
    try {
      const doc = await rebuildPages(
        file,
        keep.map((entry) => ({ index: entry.index, rotate: entry.rotate }))
      );
      setResult(await save(doc, { name: `${file.name.replace(/\.pdf$/i, "")}-geordend.pdf` }));
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy("");
    }
  }, [file, keep, t]);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="application/pdf,.pdf"
        icon="shuffle"
        title={t("dropPdf")}
        hint={t("pdfHint")}
      />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {info && (
        <Panel title={`${file.name} · ${t("pageCount", { n: info.pages })}`}>
          <Note kind={keep.length ? "ok" : "warn"}>
            {keep.length ? t("summary", { keep: keep.length, total: info.pages }) : t("allDropped")}
          </Note>
          <p className="tp-hint">
            {t("dragHint")}
            {done < total ? ` · ${t("rendering", { done, total })}` : ""}
          </p>

          <PageGrid
            pages={pages}
            thumbs={thumbs}
            onMove={move}
            onRotate={rotate}
            onToggle={toggle}
            labels={{
              page: t("page"),
              moveLeft: t("moveLeft"),
              moveRight: t("moveRight"),
              rotateLeft: t("rotateLeft"),
              rotateRight: t("rotateRight"),
              remove: t("remove"),
              restore: t("restore"),
            }}
          />

          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={run}
              disabled={Boolean(busy) || !keep.length}
            >
              {t("apply")}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setPlan(initialPlan(info.pages));
                setResult(null);
              }}
              disabled={!moved && plan.every((entry) => !entry.dropped && !entry.rotate)}
            >
              {t("reset")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel>
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
