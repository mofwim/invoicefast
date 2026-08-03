"use client";

import { useCallback, useEffect, useState } from "react";
import { Actions, CopyButton, Field, FileDrop, Note, Panel, ResultFile, download, downloadAll, formatBytes, Icon } from "../ui";
import { FAVICON_SIZES, MIME, buildIco, encode, loadImage, render } from "../../../lib/tools/image";
import { toolStrings } from "../../../lib/i18n/tools";

/** The sizes that actually end up in an .ico; the rest ship as separate PNGs. */
const ICO_SIZES = [16, 32, 48];

const SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">`;

export default function Favicons({ locale = "nl" }) {
  const t = toolStrings("make-favicon", locale);
  const [set, setSet] = useState(null);
  const [background, setBackground] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState(null);

  useEffect(() => () => set?.files.forEach((file) => URL.revokeObjectURL(file.url)), [set]);

  const build = useCallback(
    async (image, name) => {
      setBusy(true);
      setError("");
      try {
        const files = [];
        for (const size of FAVICON_SIZES) {
          const canvas = render(image, { width: size, height: size, fit: "contain", background });
          const blob = await encode(canvas, MIME.png);
          files.push({ size, name: `favicon-${size}.png`, blob, url: URL.createObjectURL(blob) });
        }

        const ico = buildIco(
          await Promise.all(
            ICO_SIZES.map(async (size) => {
              const match = files.find((file) => file.size === size);
              return { size, bytes: new Uint8Array(await match.blob.arrayBuffer()) };
            })
          )
        );

        setSet((previous) => {
          previous?.files.forEach((file) => URL.revokeObjectURL(file.url));
          return { files, ico, name };
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [background]
  );

  const take = useCallback(
    async ([picked]) => {
      setError("");
      try {
        const image = await loadImage(picked);
        setSource({ image, name: picked.name });
        await build(image, picked.name);
      } catch (err) {
        setError(err.message);
      }
    },
    [build]
  );

  // A transparent icon can vanish on a dark tab strip, so the colour is a
  // real choice — and changing it rebuilds the whole set.
  useEffect(() => {
    if (source) build(source.image, source.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background]);

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="image/*"
        icon="sparkle"
        paste
        title={t("dropLogo")}
        hint={t("dropLogoHint")}
      />

      {error && <Note kind="error">{error}</Note>}
      {busy && <Note kind="ok">{t("making")}</Note>}

      {set && (
        <>
          <Panel title={t("backgroundPanel")}>
            <Field label={t("fill")} hint={t("fillHint")}>
              <span className="tp-check">
                <input
                  type="checkbox"
                  checked={Boolean(background)}
                  onChange={(event) => setBackground(event.target.checked ? "#ffffff" : "")}
                />
                {background && (
                  <input
                    type="color"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    aria-label={t("fillColour")}
                  />
                )}
              </span>
            </Field>
          </Panel>

          <Panel title={t("setTitle", { n: set.files.length })}>
            <ul className="tp-rows">
              <ResultFile
                name="favicon.ico"
                blob={set.ico}
                meta={`${t("icoMeta", { sizes: ICO_SIZES.join(", ") })} · ${formatBytes(set.ico.size)}`}
                onDownload={() => download("favicon.ico", set.ico)}
              />
              {set.files.map((file) => (
                <ResultFile
                  key={file.size}
                  name={file.name}
                  blob={file.blob}
                  previewUrl={file.url}
                  meta={`${file.size}×${file.size} · ${formatBytes(file.blob.size)}`}
                />
              ))}
            </ul>

            <Actions>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  downloadAll([
                    { name: "favicon.ico", data: set.ico },
                    ...set.files.map((file) => ({ name: file.name, data: file.blob })),
                  ])
                }
              >
                <Icon name="download" size={16} /> {t("saveAll")}
              </button>
            </Actions>
          </Panel>

          <Panel title={t("htmlPanel")}>
            <pre className="tp-out">{SNIPPET}</pre>
            <Actions>
              <CopyButton text={SNIPPET} label={t("copyLines")} className="btn btn-quiet btn-sm" />
            </Actions>
          </Panel>
        </>
      )}
    </>
  );
}
