"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Actions,
  Field,
  FileDrop,
  Note,
  Panel,
  Segmented,
  Slider,
  download,
  formatBytes,
  Icon,
} from "../ui";
import { MIME, compressToBudget, loadImage, renameExtension, supportsType } from "../../../lib/tools/image";

const BUDGETS = [
  { value: 0, label: "Vrij" },
  { value: 250 * 1024, label: "250 kB" },
  { value: 1024 * 1024, label: "1 MB" },
  { value: 2 * 1024 * 1024, label: "2 MB" },
  { value: 5 * 1024 * 1024, label: "5 MB" },
];

export default function Compressor() {
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [budget, setBudget] = useState(1024 * 1024);
  const [quality, setQuality] = useState(82);
  const [maxWidth, setMaxWidth] = useState(2400);
  const [format, setFormat] = useState(MIME.jpeg);
  const [webpOk, setWebpOk] = useState(true);

  useEffect(() => setWebpOk(supportsType(MIME.webp)), []);

  // Object URLs are handed to <img>; release them when they go out of use.
  useEffect(() => () => result?.url && URL.revokeObjectURL(result.url), [result]);

  const take = useCallback(async ([picked]) => {
    setError("");
    setResult(null);
    try {
      const loaded = await loadImage(picked);
      setFile(picked);
      setImage(loaded);
    } catch (err) {
      setFile(null);
      setImage(null);
      setError(err.message);
    }
  }, []);

  const run = useCallback(async () => {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const { blob, quality: used, width, height, passes } = await compressToBudget(image, {
        mime: format,
        maxBytes: budget,
        startQuality: quality / 100,
        maxWidth: maxWidth || 0,
      });
      setResult((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url);
        return {
          blob,
          url: URL.createObjectURL(blob),
          used: Math.round(used * 100),
          width,
          height,
          passes,
          missed: budget > 0 && blob.size > budget,
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [image, format, budget, quality, maxWidth]);

  const saved = result && file ? 1 - result.blob.size / file.size : 0;
  const extension = format === MIME.png ? "png" : format === MIME.webp ? "webp" : "jpg";

  return (
    <>
      <FileDrop
        onFiles={take}
        accept="image/*"
        icon="image"
        paste
        title="Sleep een afbeelding hierheen"
        hint="of klik om er een te kiezen — plakken mag ook"
      />

      {error && <Note kind="error">{error}</Note>}

      {image && (
        <>
          <Panel title="Instellingen">
            <Field label="Maximale grootte" hint="De kwaliteit zakt net zo ver als nodig is">
              <Segmented
                label="Maximale grootte"
                value={budget}
                onChange={setBudget}
                options={BUDGETS}
              />
            </Field>

            <Field label="Startkwaliteit">
              <Slider value={quality} onChange={setQuality} min={30} max={95} suffix="%" />
            </Field>

            <Field label="Breedte maximaal" hint="0 laat de afmeting met rust">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  max={10000}
                  step={100}
                  value={maxWidth}
                  onChange={(event) => setMaxWidth(Number(event.target.value))}
                />
              )}
            </Field>

            <Field label="Formaat">
              <Segmented
                label="Formaat"
                value={format}
                onChange={setFormat}
                options={[
                  { value: MIME.jpeg, label: "JPG" },
                  ...(webpOk ? [{ value: MIME.webp, label: "WebP" }] : []),
                  { value: MIME.png, label: "PNG" },
                ]}
              />
            </Field>

            <Actions>
              <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
                {busy ? "Bezig…" : "Comprimeren"}
              </button>
            </Actions>
          </Panel>

          {result && (
            <Panel>
              {result.missed ? (
                <Note kind="warn">
                  Zo klein krijgt hij hem niet zonder de foto onherkenbaar te maken. Zet de breedte
                  lager of kies een ruimere limiet.
                </Note>
              ) : (
                <Note kind="ok">
                  {saved > 0.02
                    ? `${Math.round(saved * 100)}% kleiner — van ${formatBytes(file.size)} naar ${formatBytes(result.blob.size)}.`
                    : `Deze afbeelding was al zuinig: ${formatBytes(result.blob.size)}.`}
                </Note>
              )}

              <dl className="tp-stat">
                <div>
                  <dt>Was</dt>
                  <dd>{formatBytes(file.size)}</dd>
                </div>
                <div>
                  <dt>Wordt</dt>
                  <dd className={saved > 0.02 ? "tp-win" : ""}>{formatBytes(result.blob.size)}</dd>
                </div>
                <div>
                  <dt>Afmeting</dt>
                  <dd>
                    {result.width}×{result.height}
                  </dd>
                </div>
                <div>
                  <dt>Kwaliteit</dt>
                  <dd>{result.used}%</dd>
                </div>
              </dl>

              <img className="tp-preview" src={result.url} alt="Resultaat" />

              <Actions>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => download(renameExtension(file.name, extension), result.blob)}
                >
                  <Icon name="download" size={16} /> Opslaan
                </button>
              </Actions>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
