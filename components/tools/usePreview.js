"use client";

/**
 * A live look at what a setting will actually do.
 *
 * The preview is produced by the same engine as the result — one page put
 * through the real operation and then rendered — rather than by drawing an
 * approximation on top of a picture. An approximation would be faster, and it
 * would eventually be wrong about something, which is the one thing a preview
 * must never be.
 *
 * Work is debounced and the newest request always wins: dragging a slider
 * makes a run of settings, and only the last one is worth looking at.
 */

import { useEffect, useRef, useState } from "react";
import { openDocument, renderPage } from "../../lib/tools/pdfjs";

export function usePagePreview(build, deps, { delay = 320, maxSide = 700 } = {}) {
  const [state, setState] = useState({ url: "", busy: false, error: "" });
  const latest = useRef(0);
  const previous = useRef("");

  useEffect(() => {
    if (!build) {
      setState({ url: "", busy: false, error: "" });
      return undefined;
    }

    const round = ++latest.current;
    let cancelled = false;
    setState((current) => ({ ...current, busy: true }));

    const timer = setTimeout(async () => {
      let reader = null;
      try {
        const bytes = await build();
        if (cancelled || round !== latest.current) return;

        reader = await openDocument(bytes, { name: "preview.pdf" });
        const canvas = await renderPage(reader, 1, { scale: 1, maxSide });
        const url = canvas.toDataURL("image/jpeg", 0.85);
        canvas.width = 0;
        canvas.height = 0;

        if (cancelled || round !== latest.current) return;
        previous.current = url;
        setState({ url, busy: false, error: "" });
      } catch (err) {
        if (cancelled || round !== latest.current) return;
        // Keep the last good picture rather than blanking the panel: a setting
        // that momentarily makes no sense should not wipe the page away.
        setState({ url: previous.current, busy: false, error: err?.code || "preview" });
      } finally {
        await reader?.destroy?.();
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
