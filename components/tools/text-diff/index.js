"use client";

import { useMemo, useState } from "react";
import { Actions, Field, Note, Panel } from "../ui";
import { diffLines } from "../../../lib/tools/text";
import { toolStrings } from "../../../lib/i18n/tools";

export default function TextDiff({ locale = "nl" }) {
  const t = toolStrings("text-diff", locale);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [onlyChanges, setOnlyChanges] = useState(false);

  const diff = useMemo(() => {
    if (!left.trim() && !right.trim()) return null;
    return diffLines(left, right);
  }, [left, right]);

  // Unchanged runs are folded into one line, so a small change in a long file
  // does not have to be hunted for.
  const rows = useMemo(() => {
    if (!diff) return [];
    if (!onlyChanges) return diff.rows.map((row) => ({ ...row, kind: row.kind }));

    const out = [];
    let skipped = 0;
    for (const row of diff.rows) {
      if (row.kind === "same") {
        skipped++;
        continue;
      }
      if (skipped) {
        out.push({ kind: "fold", count: skipped });
        skipped = 0;
      }
      out.push(row);
    }
    if (skipped) out.push({ kind: "fold", count: skipped });
    return out;
  }, [diff, onlyChanges]);

  return (
    <>
      <div className="tp-pair">
        <Panel title={t("left")}>
          <textarea
            className="tp-text tp-mono"
            rows={9}
            spellCheck={false}
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder={t("leftPlaceholder")}
            aria-label={t("left")}
          />
        </Panel>
        <Panel title={t("right")}>
          <textarea
            className="tp-text tp-mono"
            rows={9}
            spellCheck={false}
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder={t("rightPlaceholder")}
            aria-label={t("right")}
          />
        </Panel>
      </div>

      {!diff && <Note kind="warn">{t("empty")}</Note>}

      {diff && (
        <Panel title={t("result")}>
          {diff.identical ? (
            <Note kind="ok">{t("identical")}</Note>
          ) : (
            <>
              <Note kind="warn">{t("summary", { added: diff.added, removed: diff.removed })}</Note>
              <Field label={t("onlyChanges")}>
                <input
                  type="checkbox"
                  className="tp-switch"
                  checked={onlyChanges}
                  onChange={(event) => setOnlyChanges(event.target.checked)}
                />
              </Field>
            </>
          )}

          <ol className="tp-diff">
            {rows.map((row, index) =>
              row.kind === "fold" ? (
                <li key={`fold-${index}`} className="tp-diff-fold">
                  {t("unchanged", { n: row.count })}
                </li>
              ) : (
                <li key={`${row.kind}-${index}`} className={`tp-diff-${row.kind}`}>
                  <span className="tp-diff-no">{row.left ?? ""}</span>
                  <span className="tp-diff-no">{row.right ?? ""}</span>
                  <span className="tp-diff-sign" aria-label={row.kind === "added" ? t("added") : t("removed")}>
                    {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""}
                  </span>
                  <span className="tp-diff-text">{row.text || " "}</span>
                </li>
              )
            )}
          </ol>

          <Actions>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setLeft("");
                setRight("");
              }}
              disabled={!left && !right}
            >
              {t("clear")}
            </button>
          </Actions>
        </Panel>
      )}
    </>
  );
}
