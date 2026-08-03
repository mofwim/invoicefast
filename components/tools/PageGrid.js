"use client";

/**
 * The pages of a document, as pages.
 *
 * Three tools need the same thing — see every page, pick some, move them,
 * turn them — and a numbered grey rectangle is not a page. This renders the
 * real thing with pdf.js, a few at a time so a two-hundred page document does
 * not lock the tab up before the first tile appears.
 *
 * Reordering works by dragging with a mouse and by two buttons for everyone
 * else, because drag-and-drop alone is unusable from a keyboard and awkward on
 * a phone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui";
import { openDocument, pageThumbnail } from "../../lib/tools/pdfjs";

/**
 * Thumbnails for one file, rendered in the background.
 *
 * @returns {{thumbs: string[], done: number, total: number}}
 */
export function usePageThumbnails(file, { maxSide = 190 } = {}) {
  const [state, setState] = useState({ thumbs: [], done: 0, total: 0 });

  useEffect(() => {
    if (!file) {
      setState({ thumbs: [], done: 0, total: 0 });
      return undefined;
    }

    let cancelled = false;
    let reader = null;

    (async () => {
      try {
        reader = await openDocument(file);
        if (cancelled) return;
        setState({ thumbs: new Array(reader.numPages).fill(""), done: 0, total: reader.numPages });

        for (let number = 1; number <= reader.numPages; number++) {
          const url = await pageThumbnail(reader, number, { maxSide });
          if (cancelled) return;
          setState((current) => {
            const thumbs = current.thumbs.slice();
            thumbs[number - 1] = url;
            return { ...current, thumbs, done: number };
          });
        }
      } catch {
        // A document pdf.js will not open still has to be usable through the
        // page numbers, so this fails quietly and the tiles stay blank.
        if (!cancelled) setState((current) => ({ ...current, done: current.total }));
      }
    })();

    return () => {
      cancelled = true;
      reader?.destroy?.();
    };
  }, [file, maxSide]);

  return state;
}

export function PageGrid({
  pages,
  thumbs,
  onMove,
  onRotate,
  onToggle,
  labels,
  selectable = false,
}) {
  const dragging = useRef(null);
  const [over, setOver] = useState(null);

  const move = useCallback(
    (from, to) => {
      if (from === to || to < 0 || to >= pages.length) return;
      onMove?.(from, to);
    },
    [onMove, pages.length]
  );

  return (
    <ol className="tp-grid">
      {pages.map((page, position) => (
        <li
          key={page.key}
          className={[
            "tp-grid-item",
            page.dropped ? "is-dropped" : "",
            page.selected ? "is-selected" : "",
            over === position ? "is-over" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          draggable={Boolean(onMove)}
          onDragStart={() => {
            dragging.current = position;
          }}
          onDragOver={(event) => {
            if (dragging.current === null) return;
            event.preventDefault();
            setOver(position);
          }}
          onDragLeave={() => setOver((current) => (current === position ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            if (dragging.current !== null) move(dragging.current, position);
            dragging.current = null;
            setOver(null);
          }}
          onDragEnd={() => {
            dragging.current = null;
            setOver(null);
          }}
        >
          <button
            type="button"
            className="tp-grid-sheet"
            aria-pressed={selectable ? Boolean(page.selected) : undefined}
            aria-label={`${labels.page} ${page.number}`}
            onClick={() => onToggle?.(page.index)}
            disabled={!onToggle}
            style={{ "--turn": `${page.rotate || 0}deg` }}
          >
            {thumbs[page.index] ? (
              <img src={thumbs[page.index]} alt="" loading="lazy" />
            ) : (
              <span className="tp-grid-blank">{page.number}</span>
            )}
            {selectable && (
              <span className="tp-grid-tick" aria-hidden="true">
                <Icon name="check" size={13} />
              </span>
            )}
          </button>

          <span className="tp-grid-no">{page.number}</span>

          <span className="tp-grid-tools">
            {onMove && (
              <>
                <button
                  type="button"
                  onClick={() => move(position, position - 1)}
                  disabled={position === 0}
                  title={labels.moveLeft}
                  aria-label={`${labels.moveLeft}: ${labels.page} ${page.number}`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(position, position + 1)}
                  disabled={position === pages.length - 1}
                  title={labels.moveRight}
                  aria-label={`${labels.moveRight}: ${labels.page} ${page.number}`}
                >
                  ›
                </button>
              </>
            )}
            {onRotate && (
              <>
                <button
                  type="button"
                  onClick={() => onRotate(page.index, -90)}
                  title={labels.rotateLeft}
                  aria-label={`${labels.rotateLeft}: ${labels.page} ${page.number}`}
                >
                  ⟲
                </button>
                <button
                  type="button"
                  onClick={() => onRotate(page.index, 90)}
                  title={labels.rotateRight}
                  aria-label={`${labels.rotateRight}: ${labels.page} ${page.number}`}
                >
                  ⟳
                </button>
              </>
            )}
            {onToggle && !selectable && (
              <button
                type="button"
                data-danger
                onClick={() => onToggle(page.index)}
                title={page.dropped ? labels.restore : labels.remove}
                aria-label={`${page.dropped ? labels.restore : labels.remove}: ${labels.page} ${page.number}`}
              >
                {page.dropped ? "↺" : "×"}
              </button>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
