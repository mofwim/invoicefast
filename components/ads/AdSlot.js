"use client";

/**
 * One advertisement, in a place chosen so it cannot get in the way.
 *
 * Four rules, all of them enforced here rather than left to whoever adds the
 * next slot:
 *
 * 1. **Nothing loads without consent.** The network script is not fetched, so
 *    a visitor who said no is never seen by it at all.
 * 2. **Nothing loads until it is nearly on screen.** A slot at the bottom of a
 *    tool page costs a visitor who never scrolls exactly nothing.
 * 3. **The space is reserved before anything arrives.** An advert that pushes
 *    the page down as it loads moves the button somebody was about to press.
 * 4. **Never while the tool is working.** Handing the main thread to an ad
 *    script in the middle of compressing a PDF makes the work feel broken,
 *    and the work is the reason anyone came.
 */

import { useEffect, useRef, useState } from "react";
import { CONSENT, allowsAds, readConsent, watchConsent } from "../../lib/ads/consent";
import { loadAdScript } from "../../lib/ads/loader";

const CLIENT = process.env.NEXT_PUBLIC_ADS_CLIENT || "";

export function AdSlot({ slot, format = "auto", minHeight = 280, label, busy = false }) {
  const holder = useRef(null);
  const filled = useRef(false);
  const [consent, setConsent] = useState(CONSENT.unknown);
  const [near, setNear] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    return watchConsent(setConsent);
  }, []);

  // "Nearly on screen" is a screen and a half away: far enough to be ready
  // before it is reached, near enough that most visitors never trigger it.
  useEffect(() => {
    const node = holder.current;
    if (!node || near) return undefined;

    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && setNear(true),
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // `consent` belongs here even though it is not read: the element this
    // watches does not exist until consent arrives, so without it the observer
    // is set up once against nothing and never runs again.
  }, [near, consent]);

  // …and not until the browser has nothing better to do. This is what keeps
  // rule 4 honest without every tool having to report whether it is working:
  // an idle callback cannot run while a PDF is being compressed, so the ad
  // script simply cannot take the thread away from the job.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!near || idle) return undefined;
    if (typeof window.requestIdleCallback !== "function") {
      const timer = setTimeout(() => setIdle(true), 400);
      return () => clearTimeout(timer);
    }
    // A short deadline: on a page that never goes idle the advert should still
    // arrive, just last.
    const handle = window.requestIdleCallback(() => setIdle(true), { timeout: 1200 });
    return () => window.cancelIdleCallback(handle);
  }, [near, idle]);

  const wanted = Boolean(CLIENT && slot) && allowsAds(consent) && near && idle && !busy;

  useEffect(() => {
    if (!wanted || filled.current) return;
    // Asking twice for the same slot is the classic double-render mistake and
    // the network answers it with an error, so this happens exactly once. The
    // script is fetched here rather than on consent: agreeing means "you may",
    // not "do it now", and somebody who never scrolls this far still costs
    // nothing and is seen by nobody.
    filled.current = true;
    loadAdScript(CLIENT).then(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* blocked, or offline: the reserved space just stays empty */
      }
    });
  }, [wanted]);

  if (!CLIENT || !slot) return null;
  if (!allowsAds(consent)) return null;

  return (
    <aside
      className="ad-slot"
      style={{ minHeight }}
      aria-label={label}
      ref={holder}
      // Stated on the wrapper as well as on the unit itself. The network's own
      // script rewrites what is inside; this stays put, so what was agreed to
      // remains checkable from outside the page.
      data-consent={consent}
    >
      {wanted && (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
          // Non-personalised when that is what was agreed to, and this is the
          // switch that actually enforces it — not the wording on the banner.
          data-npa={consent === CONSENT.plain ? "1" : "0"}
        />
      )}
      <span className="ad-mark">{label}</span>
    </aside>
  );
}

export default AdSlot;
