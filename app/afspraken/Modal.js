"use client";

import { useCallback, useEffect, useRef } from "react";
import Icon from "./Icons";

/**
 * A plain, well-behaved dialog: closes on Escape and on a click outside, moves
 * focus in on open and back to whatever opened it on close, and keeps Tab
 * inside while it is up.
 */
export default function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;

    const panel = panelRef.current;
    const focusable = panel?.querySelector(
      'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    (focusable || panel)?.focus({ preventScroll: true });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = [...panel.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )].filter((el) => el.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      const target = returnFocusRef.current;
      if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const onBackdrop = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div className="ma-backdrop" onMouseDown={onBackdrop}>
      <div
        className={`ma-modal${wide ? " ma-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="ma-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ma-icon-btn" onClick={onClose} aria-label="Sluiten">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="ma-modal-body">{children}</div>
      </div>
    </div>
  );
}
