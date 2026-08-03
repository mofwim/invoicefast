"use client";

import { useCallback, useEffect, useState } from "react";
import { Actions, FileDrop, Note, Panel, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { openDocument, pageImages } from "../../../lib/tools/pdfjs";
import { makeZip, uniqueNames } from "../../../lib/tools/zip";
import { describeError } from "../../../lib/tools/errors";

export default function ExtractImages({ locale = "nl" }) {
  const t = toolStrings("extract-images", locale);
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => () => images.forEach((image) => URL.revokeObjectURL(image.url)), [images]);

  const take = useCallback(
    async ([picked]) => {
      setError("");
      setImages([]);
      setFile(picked);

      let reader = null;
      try {
        reader = await openDocument(picked);
        const found = [];
        for (let number = 1; number <= reader.numPages; number++) {
          setProgress({ done: number - 1, total: reader.numPages });
          for (const image of await pageImages(reader, number)) {
            found.push({
              ...image,
              name: `${picked.name.replace(/\.pdf$/i, "")}-p${number}-${found.length + 1}.png`,
              url: URL.createObjectURL(image.blob),
            });
          }
        }
        setImages(found);
      } catch (err) {
        setFile(null);
        setError(describeError(t, err));
      } finally {
        await reader?.destroy?.();
        setProgress(null);
      }
    },
    [t]
  );

  const saveZip = useCallback(async () => {
    const names = uniqueNames(images.map((image) => image.name));
    const zip = await makeZip(images.map((image, at) => ({ name: names[at], data: image.blob })));
    download(`${file.name.replace(/\.pdf$/i, "")}-afbeeldingen.zip`, zip);
  }, [images, file]);

  const total = images.reduce((sum, image) => sum + image.blob.size, 0);

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="image" title={t("dropPdf")} hint={t("pdfHint")} />

      {progress && <Note kind="ok">{t("searching", { done: progress.done, total: progress.total })}</Note>}
      {error && <Note kind="error">{error}</Note>}
      {file && !progress && !images.length && !error && <Note kind="warn">{t("none")}</Note>}

      {images.length > 0 && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("found", { n: images.length, size: formatBytes(total) })}</Note>
          <p className="tp-hint">{t("sizeNote")}</p>

          <ul className="tp-shots">
            {images.map((image) => (
              <li key={image.name}>
                <img src={image.url} alt="" loading="lazy" />
                <span>
                  {image.width}×{image.height} · {formatBytes(image.blob.size)}
                </span>
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

          {images.length > 1 && (
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
