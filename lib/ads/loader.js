/**
 * Fetch the ad network's script — once, and not a moment before it is needed.
 *
 * This deliberately does not live in the consent banner. Consent means "you
 * may", not "do it now": somebody who agrees and then reads a tool without
 * ever scrolling to the bottom should still cost nothing and be seen by
 * nobody. So the request is made by the slot that is about to fill, and only
 * when that slot is nearly on screen and the browser has nothing better to do.
 */

let started = null;

export function loadAdScript(client) {
  if (typeof window === "undefined" || !client) return Promise.resolve(false);
  if (started) return started;

  started = new Promise((resolve) => {
    const existing = document.querySelector('script[data-ads="1"]');
    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.ads = "1";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => resolve(true);
    // A blocker, or no connection. The reserved space stays empty, which is
    // the right outcome and not a thing to complain to anybody about.
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return started;
}
