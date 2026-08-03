"use client";

import { useCallback, useRef, useState } from "react";
import Icon from "../../../app/afspraken/Icons";
import { bytesToBinaryString, htmlToText, parseEml } from "../../../lib/afspraken/email";
import { parseIcs } from "../../../lib/afspraken/ics";
import { toolStrings } from "../../../lib/i18n/tools";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function download(name, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const safeName = (value, fallback) =>
  (String(value || "").replace(/[^\p{L}\p{N}._ -]+/gu, "-").trim() || fallback).slice(0, 80);

export default function Unpacker({ locale = "nl" }) {
  const t = toolStrings("unpack-email", locale);
  const [mail, setMail] = useState(null);
  const [view, setView] = useState("text");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const open = useCallback(async (file) => {
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const raw = bytesToBinaryString(bytes);

      if (!/^[\w-]+:/m.test(raw.slice(0, 800))) {
        setMail(null);
        setError(t("notMail"));
        return;
      }

      const parsed = parseEml(raw);
      const invites = parsed.calendars
        .map((text) => ({ text, events: parseIcs(text, { now: Date.now() }).events }))
        .filter((entry) => entry.events.length);

      setMail({ ...parsed, invites, fileName: file.name });
      setView(parsed.text ? "text" : "html");
    } catch (err) {
      setMail(null);
      setError(t("unreadable", { message: err.message }));
    }
  }, [t]);

  const html = mail?.html || "";
  const text = mail?.text || (html ? htmlToText(html) : "");

  return (
    <>
      <div
        className={`tp-drop${dragging ? " is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileRef.current?.click();
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
          const file = event.dataTransfer.files?.[0];
          if (file) open(file);
        }}
      >
        <Icon name="mail" size={26} />
        <strong>{t("drop")}</strong>
        <small>{t("dropHint")}</small>
        <input
          ref={fileRef}
          type="file"
          accept=".eml,.msg,message/rfc822"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) open(file);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="tp-note tp-note-error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}

      {mail && (
        <>
          <div className="tp-panel" style={{ marginTop: 14 }}>
            <div className="tp-mail-head">
              <h3>{mail.subject || t("noSubject")}</h3>
              <span>
                {mail.from ? `${mail.from.name}${mail.from.email ? ` · ${mail.from.email}` : ""}` : t("unknownSender")}
                {mail.sentAt ? ` · ${new Date(mail.sentAt).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}` : ""}
              </span>
              {mail.to.length > 0 && (
                <span>{t("to")}: {mail.to.map((person) => person.email || person.name).join(", ")}</span>
              )}
            </div>

            {html && text && (
              <div className="tp-seg" role="group" aria-label={t("viewLabel")}>
                <button type="button" aria-pressed={view === "text"} onClick={() => setView("text")}>
                  {t("viewText")}
                </button>
                <button type="button" aria-pressed={view === "html"} onClick={() => setView("html")}>
                  {t("viewHtml")}
                </button>
              </div>
            )}

            {view === "html" && html ? (
              // Rendered in a sandboxed frame: the mail's own markup and any
              // script it carries can never touch this page.
              <iframe
                title={t("frameTitle")}
                sandbox=""
                srcDoc={html}
                style={{
                  width: "100%",
                  height: 420,
                  border: 0,
                  borderRadius: 12,
                  background: "#fff",
                }}
              />
            ) : (
              <pre className="tp-body">{text || t("noText")}</pre>
            )}

            <div className="tp-actions">
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => download(`${safeName(mail.subject, "e-mail")}.txt`, text, "text/plain;charset=utf-8")}
                disabled={!text}
              >
                <Icon name="download" size={15} /> {t("saveText")}
              </button>
            </div>
          </div>

          {mail.invites.length > 0 && (
            <div className="tp-panel">
              <h3>{t("invitePanel")}</h3>
              <ul className="tp-rows">
                {mail.invites.flatMap((invite, i) =>
                  invite.events.map((event, j) => (
                    <li key={`${i}-${j}`}>
                      <Icon name="calendar" size={18} />
                      <span className="tp-row-text">
                        <strong>{event.title}</strong>
                        <span>
                          {new Date(event.start).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => download(`${safeName(event.title, "afspraak")}.ics`, invite.text, "text/calendar;charset=utf-8")}
                      >
                        .ics
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="tp-actions">
                <a className="btn btn-quiet btn-sm" href="/afspraken">
                  <Icon name="clock" size={15} /> {t("openInApp")}
                </a>
              </div>
            </div>
          )}

          <div className="tp-panel">
            <h3>
              {t("attachments")}{mail.attachments.length > 0 ? ` (${mail.attachments.length})` : ""}
            </h3>
            {mail.attachments.length === 0 ? (
              <p className="tp-note tp-note-warn" style={{ margin: 0 }}>
                <Icon name="alert" size={16} />
                {t("noAttachments")}
              </p>
            ) : (
              <>
                <ul className="tp-rows">
                  {mail.attachments.map((attachment, i) => (
                    <li key={`${attachment.name}-${i}`}>
                      <Icon name="file" size={18} />
                      <span className="tp-row-text">
                        <strong>{attachment.name}</strong>
                        <span>
                          {attachment.mime} · {formatBytes(attachment.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() =>
                          download(attachment.name || `bijlage-${i + 1}`, attachment.bytes, attachment.mime)
                        }
                      >
                        <Icon name="download" size={15} /> {t("save")}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="tp-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      mail.attachments.forEach((attachment, i) =>
                        setTimeout(
                          () => download(attachment.name || `bijlage-${i + 1}`, attachment.bytes, attachment.mime),
                          i * 250
                        )
                      )
                    }
                  >
                    <Icon name="download" size={16} /> {t("saveAll")}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
