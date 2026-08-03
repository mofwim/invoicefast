"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { PageGrid, usePageThumbnails } from "../PageGrid";
import { toolStrings } from "../../../lib/i18n/tools";
import { describe, formatPageRange, mergeFiles, parsePageRange, save } from "../../../lib/tools/pdf";
import { openDocument, pageThumbnail } from "../../../lib/tools/pdfjs";
import { describeError } from "../../../lib/tools/errors";

export default function MergePdf({ locale = "nl" }) {
  const t = toolStrings("merge-pdf", locale);
  const [items, setItems] = useState([]);
  const [opened, setOpened] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const take = useCallback(
    async (files) => {
      setError("");
      setResult(null);
      setBusy(t("reading"));

      const added = [];
      for (const file of files) {
        try {
          const info = await describe(file);
          added.push({
            file,
            ...info,
            // Empty means "all of it". Only what the reader types narrows it,
            // so adding a file and pressing merge behaves as it always did.
            range: "",
            key: `${file.name}-${file.size}-${Date.now()}-${added.length}`,
          });
        } catch (err) {
          setError(describeError(t, err));
        }
      }
      setItems((previous) => [...previous, ...added]);
      setBusy("");

      // The cover of each file, fetched after the list is already on screen —
      // seeing which document is which beats reading four similar filenames.
      for (const item of added) {
        try {
          const reader = await openDocument(item.file);
          const cover = await pageThumbnail(reader, 1, { maxSide: 120 });
          await reader.destroy();
          setItems((previous) =>
            previous.map((entry) => (entry.key === item.key ? { ...entry, cover } : entry))
          );
        } catch {
          // No cover is a missing picture, not a failure worth reporting.
        }
      }
    },
    [t]
  );

  const move = (index, by) =>
    setItems((previous) => {
      const next = previous.slice();
      const target = index + by;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setRange = useCallback((key, range) => {
    setItems((previous) => previous.map((entry) => (entry.key === key ? { ...entry, range } : entry)));
    setResult(null);
  }, []);

  /** Which pages each file contributes, and how many that is in total. */
  const chosen = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        count: item.pages,
        pages: item.range.trim()
          ? parsePageRange(item.range, item.pages)
          : Array.from({ length: item.pages }, (_, i) => i),
      })),
    [items]
  );

  const totalPages = chosen.reduce((sum, item) => sum + item.pages.length, 0);
  const narrowed = chosen.some((item) => item.range.trim());
  const emptyPick = chosen.some((item) => item.range.trim() && item.pages.length === 0);

  const run = useCallback(async () => {
    if (items.length < 2) {
      setError(t("needTwo"));
      return;
    }
    if (!totalPages) {
      setError(t("nothingPicked"));
      return;
    }
    setBusy(t("building"));
    setError("");
    try {
      const { doc, pages } = await mergeFiles(
        chosen.map((item) => ({ file: item.file, pages: item.pages }))
      );
      const saved = await save(doc, { name: "samengevoegd.pdf" });
      setResult({ ...saved, pages, files: items.length });
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setBusy("");
    }
  }, [items, chosen, totalPages, t]);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="application/pdf,.pdf"
        multiple
        icon="file"
        title={t("dropPdfs")}
        hint={t("dropHint")}
      />

      {busy && <Note kind="ok">{busy}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {items.length > 0 && (
        <Panel title={`${t("order")} · ${t("pageCount", { n: totalPages })}`}>
          <ul className="tp-rows">
            {chosen.map((item, index) => (
              <li key={item.key} className="tp-row-tall">
                <span className="tp-row-main">
                  {item.cover ? (
                    <img className="tp-cover" src={item.cover} alt="" />
                  ) : (
                    <Icon name="file" size={18} />
                  )}
                  <span className="tp-row-text">
                    <strong>{item.file.name}</strong>
                    <span>
                      {item.range.trim()
                        ? t("takingSome", { n: item.pages.length, total: item.count })
                        : t("pageCount", { n: item.count })}{" "}
                      · {formatBytes(item.file.size)}
                    </span>
                  </span>
                  <span className="tp-row-actions">
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={t("up")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={t("down")}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => {
                        setItems((p) => p.filter((_, i) => i !== index));
                        setOpened(null);
                      }}
                      aria-label={t("remove")}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </span>
                </span>

                {/* Which pages to take from this one. The typed range is the
                    single truth; opening the pages below only rewrites it. */}
                <span className="tp-row-pages">
                  <label>
                    <span className="tp-row-pages-label">{t("takePages")}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.range}
                      onChange={(event) => setRange(item.key, event.target.value)}
                      placeholder={t("allOfIt")}
                      aria-label={`${t("takePages")} — ${item.file.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    aria-expanded={opened === item.key}
                    onClick={() => setOpened(opened === item.key ? null : item.key)}
                  >
                    {opened === item.key ? t("hidePages") : t("showPages")}
                  </button>
                  {item.range.trim() && (
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => setRange(item.key, "")}
                    >
                      {t("takeAll")}
                    </button>
                  )}
                </span>

                {opened === item.key && (
                  <FilePages
                    item={item}
                    label={t("page")}
                    onToggle={(page) => {
                      // Starts from whatever is currently taken — which, with
                      // an empty field, is every page. So the first click on a
                      // page reads as "not that one", which is what a person
                      // looking at a full document means by it.
                      const next = new Set(item.pages);
                      if (next.has(page)) next.delete(page);
                      else next.add(page);

                      const sorted = [...next].sort((a, b) => a - b);
                      // Back to everything is "all of it", not a range that
                      // happens to list all of it.
                      setRange(item.key, sorted.length === item.count ? "" : formatPageRange(sorted));
                    }}
                  />
                )}
              </li>
            ))}
          </ul>

          {emptyPick && <Note kind="warn">{t("emptyPick")}</Note>}
          {narrowed && !emptyPick && <Note kind="ok">{t("willTake", { n: totalPages })}</Note>}

          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={run}
              disabled={Boolean(busy) || items.length < 2 || !totalPages}
            >
              {t("merge")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel>
          <Note kind="ok">{t("done", { files: result.files, pages: result.pages })}</Note>
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

/**
 * One file's pages, drawn only while it is open.
 *
 * Rendering every page of every file up front would mean a hundred thumbnails
 * for four documents nobody has asked to look inside yet. The hook starts when
 * this mounts and stops when it unmounts, so the work follows the reader.
 */
function FilePages({ item, label, onToggle }) {
  const { thumbs } = usePageThumbnails(item.file, { maxSide: 150 });
  const picked = new Set(item.pages);

  // Laid out from the page count rather than from the thumbnails, so every
  // tile is there from the first frame and the grid does not grow under the
  // pointer as the pictures arrive.
  const pages = Array.from({ length: item.count }, (_, index) => ({
    key: index,
    index,
    number: index + 1,
    selected: picked.has(index),
  }));

  return <PageGrid pages={pages} thumbs={thumbs} onToggle={onToggle} selectable labels={{ page: label }} />;
}
