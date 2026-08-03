"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { openDocument, pageToBlob } from "../../../lib/tools/pdfjs";
import { parsePageRange } from "../../../lib/tools/pdf";
import { makeZip, uniqueNames } from "../../../lib/tools/zip";
import { describeError } from "../../../lib/tools/errors";

/** The resolutions worth offering, with what each one is for. */
const RESOLUTIONS = [72, 150, 300];

export default function PdfToImages({ locale = "nl" }) {
  const t = toolStrings("pdf-to-images", locale);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(0);
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(88);
  const [range, setRange] = useState("");
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setImages([]);
      setRange("");
      try {
        const reader = await openDocument(picked);
        setPages(reader.numPages);
        setFile(picked);
        await reader.destroy();
      } catch (err) {
        setFile(null);
        setPages(0);
        setError(describeError(t, err));
      }
    },
    [t]
  );

  const run = useCallback(async () => {
    if (!file) return;
    setError("");
    setImages([]);

    // Object URLs from an earlier run are released before the next one starts,
    // so a few passes over a long document do not quietly hold onto every page.
    images.forEach((image) => URL.revokeObjectURL(image.url));

    const wanted = range.trim() ? parsePageRange(range, pages) : Array.from({ length: pages }, (_, i) => i);
    if (!wanted.length) {
      setError(t("noPages"));
      return;
    }

    let reader = null;
    try {
      reader = await openDocument(file);
      const base = file.name.replace(/\.pdf$/i, "");
      const extension = format === "image/png" ? "png" : "jpg";
      const made = [];

      for (let at = 0; at < wanted.length; at++) {
        const number = wanted[at] + 1;
        setProgress({ done: at, total: wanted.length });
        const blob = await pageToBlob(reader, number, { dpi, mime: format, quality: quality / 100 });
        made.push({
          name: `${base}-${String(number).padStart(String(pages).length, "0")}.${extension}`,
          blob,
          url: URL.createObjectURL(blob),
          number,
        });
      }
      setImages(made);
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      await reader?.destroy?.();
      setProgress(null);
    }
  }, [file, pages, range, dpi, format, quality, images, t]);

  const saveZip = useCallback(async () => {
    const names = uniqueNames(images.map((image) => image.name));
    const zip = await makeZip(images.map((image, at) => ({ name: names[at], data: image.blob })));
    download(`${file.name.replace(/\.pdf$/i, "")}.zip`, zip);
  }, [images, file]);

  const totalSize = images.reduce((sum, image) => sum + image.blob.size, 0);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="image" title={t("dropPdf")} hint={t("pdfHint")} />

      {error && <Note kind="error">{error}</Note>}

      {file && (
        <Panel title={`${file.name} · ${t("pageCount", { n: pages })}`}>
          <Field label={t("resolution")} hint={t("resolutionHint")}>
            <Segmented
              label={t("resolution")}
              value={dpi}
              onChange={setDpi}
              options={RESOLUTIONS.map((value) => ({ value, label: `${value} dpi` }))}
            />
          </Field>

          <Field label={t("format")}>
            <Segmented
              label={t("format")}
              value={format}
              onChange={setFormat}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
              ]}
            />
          </Field>

          {format === "image/jpeg" && (
            <Field label={t("quality")}>
              <Slider value={quality} onChange={setQuality} min={50} max={100} suffix="%" />
            </Field>
          )}

          <Field label={t("which")} hint={t("whichHint")}>
            {(id) => (
              <input
                id={id}
                type="text"
                value={range}
                onChange={(event) => setRange(event.target.value)}
                placeholder={t("allPages")}
                inputMode="numeric"
              />
            )}
          </Field>

          <Actions>
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(progress)}>
              {progress ? t("rendering", { done: progress.done, total: progress.total }) : t("run")}
            </button>
          </Actions>
        </Panel>
      )}

      {images.length > 0 && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("made", { n: images.length, size: formatBytes(totalSize) })}</Note>

          <ul className="tp-shots">
            {images.map((image) => (
              <li key={image.name}>
                <img src={image.url} alt={`${t("page")} ${image.number}`} loading="lazy" />
                <span>{image.number}</span>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => download(image.name, image.blob)}
                >
                  <Icon name="download" size={14} /> {t("save")}
                </button>
              </li>
            ))}
          </ul>

          <Actions>
            <button type="button" className="btn btn-primary" onClick={saveZip}>
              <Icon name="download" size={16} /> {t("saveZip")} ({formatBytes(totalSize)})
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
