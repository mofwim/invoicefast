"use client";

import { useCallback, useEffect, useState } from "react";
import { Actions, CopyButton, Field, Note, Panel, Segmented, Slider } from "../ui";
import { generatePassword, passwordAlphabet, passwordStrength } from "../../../lib/tools/text";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

export default function Password({ locale = "nl" }) {
  const t = toolStrings("password", locale);
  const [length, setLength] = useState(20);
  const [count, setCount] = useState(5);
  const [options, setOptions] = useState({
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    avoidAmbiguous: true,
  });
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const toggle = (key) => (event) =>
    setOptions((current) => ({ ...current, [key]: event.target.checked }));

  const make = useCallback(() => {
    try {
      setList(Array.from({ length: count }, () => generatePassword(length, options)));
      setError("");
    } catch (err) {
      setList([]);
      setError(describeError(t, err));
    }
  }, [count, length, options, t]);

  // The first set is there on arrival, and every change makes a fresh one:
  // a password generator with a stale password on screen invites copying it.
  useEffect(() => {
    make();
  }, [make]);

  const pool = (() => {
    try {
      return passwordAlphabet(options);
    } catch {
      return "";
    }
  })();
  const strength = list[0] ? passwordStrength(list[0], pool.length) : null;

  return (
    <>
      <Panel>
        <Field label={t("howLong")}>
          <Slider value={length} onChange={setLength} min={8} max={64} />
        </Field>

        <Field label={t("count")}>
          <Segmented
            label={t("count")}
            value={count}
            onChange={setCount}
            options={[1, 5, 10].map((value) => ({ value, label: String(value) }))}
          />
        </Field>

        <fieldset className="tp-set">
          <legend>{t("contains")}</legend>
          {[
            ["lower", "abc"],
            ["upper", "ABC"],
            ["digits", "123"],
            ["symbols", "!@#"],
          ].map(([key, sample]) => (
            <Field key={key} label={t(key)} hint={sample}>
              <input
                type="checkbox"
                className="tp-switch"
                checked={options[key]}
                onChange={toggle(key)}
              />
            </Field>
          ))}
        </fieldset>

        <Field label={t("avoidAmbiguous")} hint={t("avoidHint")}>
          <input
            type="checkbox"
            className="tp-switch"
            checked={options.avoidAmbiguous}
            onChange={toggle("avoidAmbiguous")}
          />
        </Field>

        <Actions>
          <button type="button" className="btn btn-primary" onClick={make}>
            {t("generate")}
          </button>
        </Actions>
      </Panel>

      {error && <Note kind="error">{error}</Note>}

      {list.length > 0 && (
        <Panel title={t("result")}>
          {strength && (
            <p className={`tp-strength tp-strength-${strength.level}`}>
              <span>{t("strength")}</span>
              <strong>{t(`level.${strength.level}`)}</strong>
              <small>{t("bits", { n: strength.bits })}</small>
            </p>
          )}

          <ul className="tp-passwords">
            {list.map((password, index) => (
              <li key={`${index}-${password}`}>
                <code>{password}</code>
                <CopyButton
                  text={password}
                  label={t("copy")}
                  copiedLabel={t("copied")}
                  className="btn btn-quiet btn-sm"
                />
              </li>
            ))}
          </ul>

          <Note kind="ok">{t("note")}</Note>
        </Panel>
      )}
    </>
  );
}
