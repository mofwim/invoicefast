"use client";

import { useEffect, useRef } from "react";
import AfsprakenApp from "../../afspraken/AfsprakenApp";
import { applyTheme, watchSystemTheme } from "../../../lib/afspraken/theme";

/**
 * The widget as it runs inside someone else's page.
 *
 * The only thing it needs beyond the normal app is to keep its host informed of
 * how tall it has become, so the iframe can grow and shrink with the list
 * instead of showing an inner scrollbar.
 */
export default function EmbedFrame({ tab = "binnenkort", icsUrl = "", theme = "" }) {
  const rootRef = useRef(null);

  // A pinned appearance has to survive the app's own preference following the
  // device, so re-apply it whenever the device flips.
  useEffect(() => {
    if (!theme) return undefined;
    applyTheme(theme);
    return watchSystemTheme(() => applyTheme(theme));
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = "nl";
    if (window.parent === window) return undefined;

    const node = rootRef.current;
    if (!node) return undefined;

    let last = 0;
    const report = () => {
      const height = Math.ceil(node.getBoundingClientRect().height) + 8;
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: "mijn-afspraken:height", height }, "*");
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    const timer = setInterval(report, 2000);

    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="ma-page ma-embed-page" ref={rootRef}>
      <AfsprakenApp variant="embed" initialTab={tab} seedIcsUrl={icsUrl} />
    </div>
  );
}
