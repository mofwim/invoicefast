"use client";

/**
 * The parts every tool is assembled from.
 *
 * A tool page should read as its own decisions and nothing else — which file
 * it takes, what it does to it, what comes out. Dropping files, panels, notes,
 * download buttons and copy buttons all behave identically everywhere, so they
 * live here once.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Icon from "../afspraken/Icons";

export { formatBytes } from "../../lib/tools/image";

/** Hand a blob or string to the browser as a download. */
export function download(name, data, mime = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Several downloads at once: browsers throttle them, so space them out. */
export function downloadAll(files) {
  files.forEach((file, i) =>
    setTimeout(() => download(file.name, file.data, file.mime), i * 220)
  );
}

export function safeFileName(value, fallback = "bestand") {
  const cleaned = String(value || "")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .trim();
  return (cleaned || fallback).slice(0, 80);
}

// ---------------------------------------------------------------------------

export function Panel({ title, children, ...rest }) {
  return (
    <section className="tp-panel" {...rest}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function Note({ kind = "ok", children }) {
  const icon = kind === "error" ? "alert" : kind === "warn" ? "alert" : "check";
  return (
    <p className={`tp-note tp-note-${kind}`} role={kind === "error" ? "alert" : undefined}>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </p>
  );
}

export function Actions({ children }) {
  return <div className="tp-actions">{children}</div>;
}

/**
 * The way a file gets in: dropped on it, or picked through it.
 * Also accepts a paste of an image straight from the clipboard.
 */
export function FileDrop({
  onFiles,
  accept,
  multiple = false,
  title = "Sleep een bestand hierheen",
  hint = "of klik om te kiezen",
  icon = "download",
  paste = false,
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const take = useCallback(
    (list) => {
      const files = [...(list || [])].filter(Boolean);
      if (files.length) onFiles(multiple ? files : [files[0]]);
    },
    [onFiles, multiple]
  );

  useEffect(() => {
    if (!paste) return undefined;
    const onPaste = (event) => {
      const files = [...(event.clipboardData?.files || [])];
      if (files.length) take(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [paste, take]);

  return (
    <div
      className={`tp-drop${dragging ? " is-dragging" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        take(event.dataTransfer.files);
      }}
    >
      <Icon name={icon} size={26} />
      <strong>{title}</strong>
      <small>{hint}</small>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** A labelled control row, so every tool's settings line up the same way. */
export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <label className="tp-field" htmlFor={id}>
      <span className="tp-field-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {typeof children === "function" ? children(id) : children}
    </label>
  );
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, suffix = "" }) {
  return (
    <span className="tp-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {value}
        {suffix}
      </output>
    </span>
  );
}

/** A segmented picker — the same control the appointment tabs use. */
export function Segmented({ value, onChange, options, label }) {
  return (
    <span className="tp-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

export function CopyButton({ text, label = "Kopiëren", className = "btn btn-quiet" }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <button
      type="button"
      className={className}
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          // Clipboard permission refused — the text is on screen to select.
        }
      }}
    >
      <Icon name={done ? "check" : "file"} size={15} />
      {done ? "Gekopieerd" : label}
    </button>
  );
}

/** A file that came out of a tool: preview, size, and a way to keep it. */
export function ResultFile({ name, blob, previewUrl, meta, onDownload }) {
  return (
    <li>
      {previewUrl ? (
        <img className="tp-thumb" src={previewUrl} alt="" />
      ) : (
        <Icon name="file" size={18} />
      )}
      <span className="tp-row-text">
        <strong>{name}</strong>
        <span>{meta}</span>
      </span>
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => (onDownload ? onDownload() : download(name, blob))}
      >
        <Icon name="download" size={15} /> Opslaan
      </button>
    </li>
  );
}

export { Icon };
