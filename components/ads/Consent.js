"use client";

/**
 * The question, and the script that only ever runs after it is answered.
 *
 * The banner is deliberately not a dark pattern. Refusing is one click, in the
 * same place and the same size as agreeing — not hidden behind "manage
 * options", not greyed out, not a second dialogue. That is partly the law and
 * mostly the point: this is a site whose entire pitch is that it does not take
 * anything from you, and a consent box that tricks people would be the loudest
 * possible statement that the pitch is not true.
 *
 * Nothing here fetches anything. Consent is recorded and that is all; the
 * network's script is fetched by the slot that is about to fill, if one ever
 * is. A visitor who says no never makes a request to the network at all —
 * there is nothing to block, because nothing was asked for.
 */

import { useEffect, useState } from "react";
import { CONSENT, adsConfigured, readConsent, watchConsent, writeConsent } from "../../lib/ads/consent";
import Icon from "../Icons";
import { adWords } from "../../lib/ads/words";

export function ConsentGate({ locale = "nl" }) {
  const words = adWords(locale);
  const [choice, setChoice] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setChoice(readConsent());
    return watchConsent(setChoice);
  }, []);

  if (!adsConfigured()) return null;

  const answered = choice !== null && choice !== CONSENT.unknown;
  const decide = (value) => setChoice(writeConsent(value));

  return (
    <>
      {choice === CONSENT.unknown && (
        <div className="ad-ask" role="dialog" aria-modal="false" aria-labelledby="ad-ask-title">
          {/* Keeps the foot of the page reachable while the question is up. A
              panel fixed over the bottom of the viewport otherwise hides
              whatever is down there and quietly takes the clicks meant for
              it — which is most of why these things are so disliked. */}
          <style>{".tp, .ma-page { padding-bottom: 220px; }"}</style>
          <div className="ad-ask-inner">
            <h2 id="ad-ask-title">{words.title}</h2>
            <p>{words.body}</p>

            <button type="button" className="ad-ask-more" onClick={() => setOpen((was) => !was)} aria-expanded={open}>
              {words.detail}
              <Icon name="chevron" size={14} className={open ? "ad-ask-open" : ""} />
            </button>
            {open && <p className="ad-ask-detail">{words.detailBody}</p>}

            <div className="ad-ask-buttons">
              {/* Refusing sits first and looks the same as agreeing. */}
              <button type="button" className="btn btn-quiet" onClick={() => decide(CONSENT.refused)}>
                {words.refuse}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => decide(CONSENT.plain)}>
                {words.plain}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => decide(CONSENT.personalised)}>
                {words.personalised}
              </button>
            </div>
          </div>
        </div>
      )}

      {answered && <ConsentSwitch locale={locale} choice={choice} onChange={decide} />}
    </>
  );
}

/**
 * A way back.
 *
 * Consent that cannot be withdrawn as easily as it was given is not consent,
 * so this sits in the footer of every page rather than in a settings screen
 * nobody finds.
 */
function ConsentSwitch({ locale, choice, onChange }) {
  const words = adWords(locale);
  const [open, setOpen] = useState(false);

  const options = [
    [CONSENT.refused, words.refuse],
    [CONSENT.plain, words.plain],
    [CONSENT.personalised, words.personalised],
  ];

  return (
    <p className="ad-switch">
      <button type="button" onClick={() => setOpen((was) => !was)} aria-expanded={open}>
        {words.change}
      </button>
      {open && (
        <span className="ad-switch-options" role="group" aria-label={words.change}>
          {options.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={choice === value}
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </span>
      )}
    </p>
  );
}

export default ConsentGate;
