"use client";

import { useCallback, useState } from "react";
import { Actions, Field, FileDrop, Note, Panel, Segmented, Slider, download, formatBytes, Icon } from "../ui";
import { toolStrings } from "../../../lib/i18n/tools";
import { rasterise, restructure } from "../../../lib/tools/pdf";
import { describeError } from "../../../lib/tools/errors";

export default function CompressPdf({ locale = "nl" }) {
  const t = toolStrings("compress-pdf", locale);
  const [file, setFile] = useState(null);
  const [how, setHow] = useState("clean");
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
      const made =
        how === "clean"
          ? await restructure(file)
          : await rasterise(file, {
              dpi,
              quality: quality / 100,
              onProgress: (done, total) => setProgress({ done, total }),
            });

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
              options={[
                { value: "clean", label: t("modeClean") },
                { value: "rasterise", label: t("modeRaster") },
              ]}
            />
          </Field>

          <Note kind={how === "clean" ? "ok" : "warn"}>
            {how === "clean" ? t("cleanExplains") : t("rasterExplains")}
          </Note>

          {how === "rasterise" && (
            <>
              <Field label={t("resolution")} hint={t("resolutionHint")}>
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
                  ? t("working", { done: progress.done, total: progress.total })
                  : t("busy")
                : t("run")}
            </button>
          </Actions>
        </Panel>
      )}

      {result && (
        <Panel title={t("result")}>
          {result.saved > 0.03 ? (
            <Note kind="ok">
              {t("smaller", {
                pct: Math.round(result.saved * 100),
                was: formatBytes(file.size),
                now: formatBytes(result.blob.size),
              })}
            </Note>
          ) : (
            <Note kind="warn">
              {how === "clean" ? t("alreadyTight") : t("noGain", { now: formatBytes(result.blob.size) })}
            </Note>
          )}

          <dl className="tp-stat tp-stat-wide">
            <div>
              <dt>{t("was")}</dt>
              <dd>{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt>{t("becomes")}</dt>
              <dd className={result.saved > 0.03 ? "tp-win" : ""}>{formatBytes(result.blob.size)}</dd>
            </div>
            <div>
              <dt>{t("pages")}</dt>
              <dd>{result.pages}</dd>
            </div>
          </dl>

          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => download(result.name, result.blob)}
            >
              <Icon name="download" size={16} /> {t("save")}
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
