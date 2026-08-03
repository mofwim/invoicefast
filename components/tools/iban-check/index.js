"use client";

import { useMemo, useState } from "react";
import { Actions, CopyButton, Field, Note, Panel } from "../ui";
import { IBAN_LENGTHS, formatIban, validateIban } from "../../../lib/tools/business";
import { toolStrings } from "../../../lib/i18n/tools";

const EXAMPLE = "NL91 ABNA 0417 1643 00";

export default function IbanCheck({ locale = "nl" }) {
  const t = toolStrings("iban-check", locale);
  const [value, setValue] = useState("");

  const check = useMemo(() => (value.trim() ? validateIban(value) : null), [value]);
  const countryName = check?.country
    ? new Intl.DisplayNames([locale], { type: "region" }).of(check.country) || check.country
    : "";

  return (
    <>
      <Panel>
        <Field label={t("label")}>
          {(id) => (
            <input
              id={id}
              type="text"
              className="tp-mono"
              spellCheck={false}
              autoComplete="off"
              value={value}
              // Grouped in fours while typing, the way a bank prints it — the
              // engine strips the spaces again before it checks anything.
              onChange={(event) => setValue(formatIban(event.target.value))}
              placeholder={t("placeholder")}
            />
          )}
        </Field>
        <Actions>
          <button type="button" className="btn btn-quiet" onClick={() => setValue(EXAMPLE)}>
            {t("examples")}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setValue("")} disabled={!value}>
            {t("clear")}
          </button>
        </Actions>
      </Panel>

      {check && !check.valid && (
        <Note kind="error">
          {t(`reason.${check.reason}`, {
            country: check.country || "",
            expected: IBAN_LENGTHS[check.country] || "",
            actual: check.iban?.length || 0,
          })}
        </Note>
      )}

      {check?.valid && (
        <Panel title={t("result")}>
          <Note kind="ok">{t("valid")}</Note>
          <dl className="tp-stat tp-stat-wide">
            <div>
              <dt>{t("formatted")}</dt>
              <dd className="tp-mono">{check.formatted}</dd>
            </div>
            <div>
              <dt>{t("country")}</dt>
              <dd>{countryName}</dd>
            </div>
            {check.bank && (
              <div>
                <dt>{t("bank")}</dt>
                <dd>{check.bank}</dd>
              </div>
            )}
            {check.account && (
              <div>
                <dt>{t("accountNumber")}</dt>
                <dd className="tp-mono">{check.account}</dd>
              </div>
            )}
          </dl>
          <Actions>
            <CopyButton text={check.formatted} label={t("copy")} copiedLabel={t("copied")} />
          </Actions>
        </Panel>
      )}

      <p className="tp-hint">{t("checkNote")}</p>
    </>
  );
}
