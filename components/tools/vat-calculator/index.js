"use client";

import { useMemo, useState } from "react";
import { Field, Note, Panel, Segmented } from "../ui";
import { VAT_RATES, calculateVat, formatMoney } from "../../../lib/tools/business";
import { toolStrings } from "../../../lib/i18n/tools";

const CURRENCY = { UK: "GBP" };

export default function VatCalculator({ locale = "nl" }) {
  const t = toolStrings("vat-calculator", locale);
  const [country, setCountry] = useState("NL");
  const [rate, setRate] = useState(21);
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState("excl");

  const rates = VAT_RATES[country].rates;
  const money = (value) =>
    formatMoney(value, locale === "en" ? "en-GB" : "nl-NL", CURRENCY[country] || "EUR");

  const result = useMemo(
    () => calculateVat(Number(String(amount).replace(",", ".")) || 0, rate, basis),
    [amount, rate, basis]
  );

  return (
    <>
      <Panel>
        <Field label={t("country")}>
          {(id) => (
            <select
              id={id}
              value={country}
              onChange={(event) => {
                const next = event.target.value;
                setCountry(next);
                // Keep the current rate if that country has it, else its first.
                setRate((current) =>
                  VAT_RATES[next].rates.includes(current) ? current : VAT_RATES[next].rates[0]
                );
              }}
            >
              {Object.entries(VAT_RATES).map(([code, entry]) => (
                <option key={code} value={code}>
                  {entry.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t("rate")}>
          <Segmented
            label={t("rate")}
            value={rate}
            onChange={setRate}
            options={rates.map((value) => ({ value, label: `${value}%` }))}
          />
        </Field>

        <Field label={t("amount")}>
          {(id) => (
            <input
              id={id}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="100,00"
            />
          )}
        </Field>

        <Field label={t("basis")}>
          <Segmented
            label={t("basis")}
            value={basis}
            onChange={setBasis}
            options={[
              { value: "excl", label: t("excl") },
              { value: "incl", label: t("incl") },
            ]}
          />
        </Field>
      </Panel>

      <Panel title={t("result")}>
        <dl className="tp-stat tp-stat-wide">
          <div>
            <dt>{t("net")}</dt>
            <dd className={basis === "excl" ? "" : "tp-big"}>{money(result.net)}</dd>
          </div>
          <div>
            <dt>{t("vat", { rate })}</dt>
            <dd>{money(result.vat)}</dd>
          </div>
          <div>
            <dt>{t("gross")}</dt>
            <dd className={basis === "incl" ? "" : "tp-big"}>{money(result.gross)}</dd>
          </div>
        </dl>
        <Note kind="ok">{rate === 0 ? t("zeroNote") : t("note")}</Note>
      </Panel>
    </>
  );
}
