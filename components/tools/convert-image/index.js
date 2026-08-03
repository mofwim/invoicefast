"use client";

import { useCallback, useEffect, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, ResultFile, downloadAll, formatBytes, Icon } from "../ui";
import { EXTENSION, MIME, encode, loadImage, render, renameExtension, supportsType } from "../../../lib/tools/image";
import { toolStrings } from "../../../lib/i18n/tools";

export default function Converter({ locale = "nl" }) {
  const t = toolStrings("convert-image", locale);
  const [items, setItems] = useState([]);
  const [format, setFormat] = useState(MIME.webp);
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [webpOk, setWebpOk] = useState(true);

  useEffect(() => {
    const ok = supportsType(MIME.webp);
    setWebpOk(ok);
    if (!ok) setFormat(MIME.jpeg);
  }, []);

  useEffect(() => () => items.forEach((item) => item.url && URL.revokeObjectURL(item.url)), [items]);

  const take = useCallback(
    async (files) => {
      setError("");
      setBusy(true);
      const out = [];

      for (const file of files) {
        try {
          const image = await loadImage(file);
          // JPEG has no transparency; without a white base it comes out black.
          const canvas = render(image, {
            width: image.width,
            height: image.height,
            fit: "stretch",
            background: format === MIME.jpeg ? "#ffffff" : "",
          });
          const blob = await encode(canvas, format, quality / 100);
          out.push({
            name: renameExtension(file.name, EXTENSION[format] || "img"),
            was: file.size,
            blob,
            url: URL.createObjectURL(blob),
            width: image.width,
            height: image.height,
          });
        } catch (err) {
          setError(`${file.name}: ${err.message}`);
        }
      }

      setItems((previous) => {
        previous.forEach((item) => item.url && URL.revokeObjectURL(item.url));
        return out;
      });
      setBusy(false);
    },
    [format, quality]
  );

  return (
    <>
      <Panel title={t("target")}>
        <Field label={t("format")}>
          <Segmented
            label={t("format")}
            value={format}
            onChange={setFormat}
            options={[
              ...(webpOk ? [{ value: MIME.webp, label: "WebP" }] : []),
              { value: MIME.jpeg, label: "JPG" },
              { value: MIME.png, label: "PNG" },
            ]}
          />
        </Field>
        {format !== MIME.png && (
          <Field label={t("quality")}>
            <Slider value={quality} onChange={setQuality} min={40} max={100} suffix="%" />
          </Field>
        )}
        {!webpOk && (
          <Note kind="warn">{t("noWebp")}</Note>
        )}
      </Panel>

      <FileDrop
        onFiles={take}
        accept="image/*"
        multiple
        icon="shuffle"
        paste
        title={t("dropMany")}
        hint={t("dropManyHint")}
      />

      {busy && <Note kind="ok">{t("converting")}</Note>}
      {error && <Note kind="error">{error}</Note>}

      {items.length > 0 && (
        <Panel title={t("done", { n: items.length })}>
          <ul className="tp-rows">
            {items.map((item, i) => (
              <ResultFile
                key={`${item.name}-${i}`}
                name={item.name}
                blob={item.blob}
                previewUrl={item.url}
                meta={`${item.width}×${item.height} · ${formatBytes(item.was)} → ${formatBytes(item.blob.size)}`}
              />
            ))}
          </ul>
          {items.length > 1 && (
            <Actions>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => downloadAll(items.map((item) => ({ name: item.name, data: item.blob })))}
              >
                <Icon name="download" size={16} /> {t("saveAll")}
              </button>
            </Actions>
          )}
        </Panel>
      )}
    </>
  );
}
