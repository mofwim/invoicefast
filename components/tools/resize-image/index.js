"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, download, formatBytes, Icon } from "../ui";
import { MIME, SOCIAL_PRESETS, encode, loadImage, render, renameExtension } from "../../../lib/tools/image";
import { toolStrings } from "../../../lib/i18n/tools";

export default function Resizer({ locale = "nl" }) {
  const t = toolStrings("resize-image", locale);
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [preset, setPreset] = useState("1080x1080");
  const [fit, setFit] = useState("cover");
  const [background, setBackground] = useState("#ffffff");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [width, height] = preset.split("x").map(Number);

  useEffect(() => () => result?.url && URL.revokeObjectURL(result.url), [result]);

  const take = useCallback(async ([picked]) => {
    setError("");
    try {
      const loaded = await loadImage(picked);
      setFile(picked);
      setImage(loaded);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Re-render whenever a choice changes: the preview is the product here.
  useEffect(() => {
    if (!image) return;
    let cancelled = false;

    (async () => {
      const canvas = render(image, {
        width,
        height,
        fit,
        background: fit === "cover" ? "" : background,
      });
      const blob = await encode(canvas, MIME.jpeg, 0.9);
      if (cancelled) return;
      setResult((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [image, width, height, fit, background]);

  const label = useMemo(() => {
    for (const group of SOCIAL_PRESETS) {
      const hit = group.items.find((item) => `${item.width}x${item.height}` === preset);
      if (hit) return `${group.group} · ${hit.label}`;
    }
    return preset;
  }, [preset]);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="image/*"
        icon="crop"
        paste
        title={t("dropImage")}
        hint={t("dropHint")}
      />

      {error && <Note kind="error">{error}</Note>}

      {image && (
        <>
          <Panel title={t("sizePanel")}>
            <Field label={t("platform")}>
              {(id) => (
                <select id={id} value={preset} onChange={(event) => setPreset(event.target.value)}>
                  {SOCIAL_PRESETS.map((group) => (
                    <optgroup label={group.group} key={group.group}>
                      {group.items.map((item) => (
                        <option key={`${item.width}x${item.height}-${item.label}`} value={`${item.width}x${item.height}`}>
                          {item.label} — {item.width}×{item.height}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </Field>

            <Field label={t("fit")} hint={fit === "cover" ? t("fitCoverHint") : t("fitContainHint")}>
              <Segmented
                label={t("fit")}
                value={fit}
                onChange={setFit}
                options={[
                  { value: "cover", label: t("fitCover") },
                  { value: "contain", label: t("fitContain") },
                ]}
              />
            </Field>

            {fit === "contain" && (
              <Field label={t("borderColour")}>
                {(id) => (
                  <input
                    id={id}
                    type="color"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                  />
                )}
              </Field>
            )}
          </Panel>

          {result && (
            <Panel title={label}>
              <img className="tp-preview" src={result.url} alt={t("preview")} />
              <dl className="tp-stat" style={{ marginTop: 14 }}>
                <div>
                  <dt>{t("original")}</dt>
                  <dd>{image.width}×{image.height}</dd>
                </div>
                <div>
                  <dt>{t("becomes")}</dt>
                  <dd className="tp-win">{width}×{height}</dd>
                </div>
                <div>
                  <dt>{t("fileSize")}</dt>
                  <dd>{formatBytes(result.blob.size)}</dd>
                </div>
              </dl>
              <Actions>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => download(renameExtension(file.name, "jpg").replace(/\.jpg$/, `-${width}x${height}.jpg`), result.blob)}
                >
                  <Icon name="download" size={16} /> {t("save")}
                </button>
              </Actions>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
