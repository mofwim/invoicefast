"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { rasterise, restructure } from "../../../lib/tools/pdf";
import { compressImages } from "../../../lib/tools/pdfcompress";
import { describeError } from "../../../lib/tools/errors";

/**
 * Three rungs of a ladder, from "nothing changes" to "everything does".
 * The middle one is the default because it is the one that is nearly always
 * right: the pictures come down, the text is not touched at all.
 */
const WAYS = ["clean", "images", "rasterise"];

export default function CompressPdf({ locale = "nl" }) {
  const t = toolStrings("compress-pdf", locale);
  const [file, setFile] = useState(null);
  const [how, setHow] = useState("images");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(72);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const take = useCallback(([picked]) => {
    setError("");
    setResult(null);
    setFile(picked);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setError("");
    setResult(null);
    setProgress({ done: 0, total: 0 });

    try {
      const track = (done, total) => setProgress({ done, total });
      const made =
        how === "clean"
          ? await restructure(file)
          : how === "images"
            ? await compressImages(file, { dpi, quality: quality / 100, onProgress: track })
            : await rasterise(file, { dpi, quality: quality / 100, onProgress: track });

      setResult({
        ...made,
        name: `${file.name.replace(/\.pdf$/i, "")}-kleiner.pdf`,
        saved: 1 - made.blob.size / file.size,
      });
    } catch (err) {
      setError(describeError(t, err));
    } finally {
      setProgress(null);
    }
  }, [file, how, dpi, quality, t]);

  const won = result && result.saved > 0.02;

  return (
    <>
      <FileDrop onFiles={take} accept="application/pdf,.pdf" icon="file" title={t("dropPdf")} hint={t("pdfHint")} />

      {error && <Note kind="error">{error}</Note>}

      {file && (
        <Panel title={`${file.name} · ${formatBytes(file.size)}`}>
          <Field label={t("how")}>
            <Segmented
              label={t("how")}
              value={how}
              onChange={setHow}
              options={WAYS.map((value) => ({ value, label: t(`mode.${value}`) }))}
            />
          </Field>

          <Note kind={how === "rasterise" ? "warn" : "ok"}>{t(`explain.${how}`)}</Note>

          {how !== "clean" && (
            <>
              <Field label={t("resolution")} hint={t(how === "images" ? "ceilingHint" : "resolutionHint")}>
                <Segmented
                  label={t("resolution")}
                  value={dpi}
                  onChange={setDpi}
                  options={[
                    { value: 96, label: t("screen") },
                    { value: 150, label: t("normal") },
                    { value: 200, label: t("print") },
                  ]}
                />
              </Field>
              <Field label={t("quality")}>
                <Slider value={quality} onChange={setQuality} min={40} max={95} suffix="%" />
              </Field>
            </>
          )}

          <Actions>
            <button type="button" className="btn btn-primary" onClick={run} disabled={Boolean(progress)}>
              {progress
                ? progress.total
                  ? t(how === "images" ? "scanning" : "working", { done: progress.done, total: progress.total })
                  : t("busy")
                : t("run")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel title={t("result")}>
          {won ? (
            <Note kind="ok">
              {t("smaller", {
                pct: Math.round(result.saved * 100),
                was: formatBytes(file.size),
                now: formatBytes(result.blob.size),
              })}
            </Note>
          ) : (
            <Note kind="warn">{t(`noGain.${how}`, { now: formatBytes(result.blob.size) })}</Note>
          )}

          <dl className="tp-stat tp-stat-wide">
            <div>
              <dt>{t("was")}</dt>
              <dd>{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt>{t("becomes")}</dt>
              <dd className={won ? "tp-win" : ""}>{formatBytes(result.blob.size)}</dd>
            </div>
            <div>
              <dt>{t("pages")}</dt>
              <dd>{result.pages}</dd>
            </div>
            {how === "images" && (
              <div>
                <dt>{t("pictures")}</dt>
                <dd>
                  {result.changed} / {result.images}
                </dd>
              </div>
            )}
          </dl>

          {/* What was left alone, and why — a skipped image is a decision, not
              a silence. */}
          {how === "images" && result.skipped > 0 && (
            <p className="tp-hint">{t("leftAlone", { n: result.skipped })}</p>
          )}
          {how === "images" && result.images === 0 && <p className="tp-hint">{t("noPictures")}</p>}

          <Actions>
            <button type="button" className="btn btn-primary" onClick={() => download(result.name, result.blob)}>
              <Icon name="download" size={16} /> {t("save")}
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
