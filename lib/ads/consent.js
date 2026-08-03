/**
 * Whether this visitor has agreed to see advertising, and of what kind.
 *
 * The whole site is built on one promise — your file stays on your device —
 * and advertising is the one thing that could quietly break it. So the rule
 * here is absolute and mechanical rather than a matter of good intentions:
 * **nothing from an ad network is loaded until somebody has chosen.** No
 * script, no pixel, no request. A visitor who never answers is a visitor no
 * network ever hears about.
 *
 * The audience is Dutch, Belgian and German, so this is not a nicety. Under
 * the ePrivacy rules a cookie that is not strictly necessary needs consent
 * before it is set, and an ad cookie is never strictly necessary — not even
 * the non-personalised kind, which still stores something to cap how often an
 * advertisement is repeated.
 *
 * Two answers count as consent, and the difference is real:
 *
 *   "personalised"  — the network may use what it knows to choose the advert
 *   "plain"         — it may not; it still sets a cookie to avoid repeating
 *                     itself, which is why this is a choice and not a default
 *
 * Everything else, including closing the question, means no advertising at
 * all. That is a legitimate answer and it is remembered.
 */

export const CONSENT_KEY = "tools_ads_consent";

/** The four states, and what each one licenses. */
export const CONSENT = {
  unknown: "unknown", // never asked, or asked and not answered
  personalised: "personalised",
  plain: "plain",
  refused: "refused",
};

/** Does this answer allow an ad network to be contacted at all? */
export const allowsAds = (choice) =>
  choice === CONSENT.personalised || choice === CONSENT.plain;

export function readConsent() {
  if (typeof window === "undefined") return CONSENT.unknown;
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return Object.values(CONSENT).includes(stored) ? stored : CONSENT.unknown;
  } catch {
    // A browser that refuses storage is a browser that has not consented.
    return CONSENT.unknown;
  }
}

export function writeConsent(choice) {
  if (!Object.values(CONSENT).includes(choice)) return CONSENT.unknown;
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Nothing to do: without storage the question simply gets asked again.
  }
  window.dispatchEvent(new CustomEvent("tools:consent", { detail: choice }));
  return choice;
}

export function forgetConsent() {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* nothing to forget */
  }
  window.dispatchEvent(new CustomEvent("tools:consent", { detail: CONSENT.unknown }));
}

/**
 * Watch for the answer changing, including in another tab.
 *
 * Somebody who withdraws consent on one tab should not keep seeing
 * advertising on the other one they left open.
 */
export function watchConsent(onChange) {
  if (typeof window === "undefined") return () => {};

  const here = (event) => onChange(event.detail);
  const elsewhere = (event) => {
    if (event.key === CONSENT_KEY) onChange(readConsent());
  };

  window.addEventListener("tools:consent", here);
  window.addEventListener("storage", elsewhere);
  return () => {
    window.removeEventListener("tools:consent", here);
    window.removeEventListener("storage", elsewhere);
  };
}

/**
 * Is advertising configured at all?
 *
 * With no publisher id there is no advertising, no question, and no banner —
 * the site behaves exactly as if none of this existed. Turning it on is one
 * environment variable, which also means a fork or a local copy is quiet by
 * default rather than quietly making money for somebody else.
 */
export function adsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_ADS_CLIENT);
}
