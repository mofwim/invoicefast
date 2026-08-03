"use client";

import { useCallback, useMemo, useState } from "react";
import { Actions, CopyButton, Field, Note, Panel, Segmented } from "../ui";
import {
  fixArabic,
  hasArabic,
  isAlreadyShaped,
  restoreArabic,
} from "../../../lib/tools/arabic";
import { toolStrings } from "../../../lib/i18n/tools";

/**
 * The apps people are actually pasting into, and what each one needs.
 *
 * The two switches are not a matter of taste: whether to join the letters and
 * whether to flip the order depend on which half of the job the target app
 * already does, and almost nobody knows that about their own editor. So the
 * question asked is "where are you pasting this?", which they can answer.
 */
const APPS = [
  { id: "capcut", name: "CapCut", shape: true, reverse: true },
  { id: "photoshop", name: "Photoshop", shape: true, reverse: true },
  { id: "aftereffects", name: "After Effects", shape: true, reverse: true },
  { id: "premiere", name: "Premiere Pro", shape: true, reverse: true },
  { id: "resolve", name: "DaVinci Resolve", shape: true, reverse: true },
  { id: "blender", name: "Blender", shape: true, reverse: true },
  { id: "engine", name: "Unity / Godot", shape: true, reverse: false },
  { id: "other", name: null, shape: true, reverse: true },
];

const SAMPLE = "اشترك في القناة الآن\nفيديو جديد كل يوم على Instagram\nالحلقة رقم 12 — لا تفوّتها!";

export default function ArabicText({ locale = "nl" }) {
  const t = toolStrings("arabic-text", locale);

  const [source, setSource] = useState("");
  const [app, setApp] = useState("capcut");
  const [shape, setShape] = useState(true);
  const [reverse, setReverse] = useState(true);
  const [tashkeel, setTashkeel] = useState(true);
  const [normalise, setNormalise] = useState(false);
  const [digits, setDigits] = useState("keep");

  const chooseApp = useCallback((id) => {
    const entry = APPS.find((a) => a.id === id);
    setApp(id);
    setShape(entry.shape);
    setReverse(entry.reverse);
  }, []);

  const output = useMemo(
    () => fixArabic(source, { shape, reverse, tashkeel, normalize: normalise, digits }),
    [source, shape, reverse, tashkeel, normalise, digits]
  );

  // What the "before" box shows. If the pasted text had already been through
  // the tool, show what it originally said — otherwise the comparison is
  // between two broken things and explains nothing.
  const before = useMemo(
    () => (isAlreadyShaped(source) ? restoreArabic(source) : source),
    [source]
  );

  const state = useMemo(() => {
    if (!source.trim()) return null;
    if (isAlreadyShaped(source)) return "processed";
    return hasArabic(source) ? "clean" : "none";
  }, [source]);

  return (
    <>
      <Panel title={t("where")}>
        <div className="ar-apps" role="group" aria-label={t("where")}>
          {APPS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="ar-app"
              aria-pressed={app === entry.id}
              onClick={() => chooseApp(entry.id)}
            >
              {entry.name || t("otherApp")}
            </button>
          ))}
        </div>
        <p className="tp-hint">{t(`note.${app}`)}</p>
      </Panel>

      <div className="tp-pair">
        <Panel title={t("yourText")}>
          <textarea
            className="tp-text"
            dir="rtl"
            lang="ar"
            rows={7}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("yourText")}
          />
          <Actions>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSource(SAMPLE)}>
              {t("example")}
            </button>
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => setSource("")}
              disabled={!source}
            >
              {t("clear")}
            </button>
          </Actions>
          {state && (
            <Note kind={state === "clean" ? "ok" : "warn"}>
              {t(`state.${state}`)}
              {state === "processed" && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setSource(restoreArabic(source))}
                  >
                    {t("restore")}
                  </button>
                </>
              )}
            </Note>
          )}
        </Panel>

        <Panel title={t("fixed")}>
          {/* dir and the override together are what make the claim below true:
              presentation forms still carry an Arabic bidi class, so a plain
              ltr box would let the browser quietly re-reverse them and show
              something the editor never receives. */}
          <textarea
            className="tp-text ar-out"
            dir="ltr"
            readOnly
            rows={7}
            value={output}
            aria-label={t("fixed")}
          />
          <p className="tp-hint">{t("outHint")}</p>
          <Actions>
            <CopyButton text={output} label={t("copy")} copiedLabel={t("copied")} />
          </Actions>
        </Panel>
      </div>

      <Panel title={t("difference")}>
        <div className="tp-pair">
          <div>
            <span className="tp-badge tp-badge-over">{t("nowShows")}</span>
            <div className="ar-demo">{before}</div>
          </div>
          <div>
            <span className="tp-badge">{t("thenShows")}</span>
            <div className="ar-demo">{output}</div>
          </div>
        </div>
        <p className="tp-hint">{t("demoHint")}</p>
      </Panel>

      <Panel title={t("tune")}>
        <Field label={t("join")} hint={t("joinHint")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={shape}
            onChange={(event) => setShape(event.target.checked)}
          />
        </Field>
        <Field label={t("flip")} hint={t("flipHint")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={reverse}
            onChange={(event) => setReverse(event.target.checked)}
          />
        </Field>
        <Field label={t("tashkeel")} hint={t("tashkeelHint")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={tashkeel}
            onChange={(event) => setTashkeel(event.target.checked)}
          />
        </Field>
        <Field label={t("normalise")} hint={t("normaliseHint")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={normalise}
            onChange={(event) => setNormalise(event.target.checked)}
          />
        </Field>
        <Field label={t("digits")}>
          <Segmented
            label={t("digits")}
            value={digits}
            onChange={setDigits}
            options={[
              { value: "keep", label: t("digitsKeep") },
              { value: "latin", label: "123" },
              { value: "arabic", label: "١٢٣" },
            ]}
          />
        </Field>
      </Panel>

      <Note kind="warn">{t("displayOnly")}</Note>
    </>
  );
}
