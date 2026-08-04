"use client";

import { useMemo, useState } from "react";
import { Actions, Panel } from "../ui";
import { countText } from "../../../lib/tools/text";
import { toolStrings } from "../../../lib/i18n/tools";

/**
 * The limits a piece of text is usually written against.
 *
 * A counter that only counts is half a tool — the question behind "how many
 * characters is this" is nearly always "does it still fit".
 */
const LIMITS = [
  { key: "tweet", max: 280 },
  { key: "metaDescription", max: 155 },
  { key: "sms", max: 160 },
  { key: "linkedin", max: 3000 },
];

export default function WordCount({ locale = "nl" }) {
  const t = toolStrings("word-count", locale);
  const [text, setText] = useState("");

  const stats = useMemo(() => countText(text), [text]);
  const reading =
    stats.readingSeconds < 60
      ? t("seconds", { n: stats.readingSeconds })
      : t("minutes", { n: Math.round(stats.readingSeconds / 60) });

  return (
    <>
      <Panel>
        <textarea
          className="tp-text"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
        />
        <Actions>
          <button type="button" className="btn btn-quiet" onClick={() => setText("")} disabled={!text}>
            {t("clear")}
          </button>
        </Actions>
      </Panel>

      <Panel>
        <dl className="tp-stat tp-stat-wide">
          <div>
            <dt>{t("words")}</dt>
            <dd className="tp-big">{stats.words.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("characters")}</dt>
            <dd className="tp-big">{stats.characters.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("withoutSpaces")}</dt>
            <dd>{stats.withoutSpaces.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("sentences")}</dt>
            <dd>{stats.sentences.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("paragraphs")}</dt>
            <dd>{stats.paragraphs.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("lines")}</dt>
            <dd>{stats.lines.toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{t("reading")}</dt>
            <dd>{reading}</dd>
          </div>
          <div>
            <dt>{t("longest")}</dt>
            <dd className="tp-ellipsis">{stats.longestWord || "—"}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title={t("limits")}>
        <p className="tp-hint">{t("limitsHint")}</p>
        <ul className="tp-limits">
          {LIMITS.map(({ key, max }) => {
            const left = max - stats.characters;
            const over = left < 0;
            return (
              <li key={key} className={over ? "is-over" : ""}>
                <span className="tp-row-text">
                  <strong>{t(key)}</strong>
                  <span>
                    {stats.characters} / {max}
                  </span>
                </span>
                <span className={`tp-chip${over ? " tp-chip-over" : ""}`}>
                  {over ? t("over", { n: -left }) : t("left", { n: left })}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
