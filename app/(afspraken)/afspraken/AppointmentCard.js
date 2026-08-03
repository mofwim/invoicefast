"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../../components/Icons";
import {
  formatDuration,
  formatFullDate,
  formatRelative,
  formatTime,
  formatTimeRange,
  initialsOf,
  mapsUrl,
  urgencyOf,
} from "../../../lib/afspraken/model";
import { attachmentUrl } from "../../../lib/afspraken/idb";
import { buildIcs } from "../../../lib/afspraken/ics";

const PARTSTAT = {
  ACCEPTED: "gaat",
  DECLINED: "gaat niet",
  TENTATIVE: "misschien",
  "NEEDS-ACTION": "nog niet gereageerd",
};

const ORIGIN_ICON = { "e-mail": "mail", uitnodiging: "mail", agenda: "calendar", manual: "pencil", tekst: "file", demo: "sparkle" };

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentRow({ attachment }) {
  const [state, setState] = useState("idle");

  const open = useCallback(
    async (event) => {
      if (attachment.url) return; // a plain link handles itself
      event.preventDefault();
      if (!attachment.stored) return;
      setState("busy");
      const url = await attachmentUrl(attachment.id);
      setState("idle");
      if (!url) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name || "bijlage";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
    [attachment]
  );

  const unavailable = !attachment.url && !attachment.stored;

  return (
    <a
      className="ap-file"
      href={attachment.url || "#"}
      onClick={open}
      target={attachment.url ? "_blank" : undefined}
      rel={attachment.url ? "noopener noreferrer" : undefined}
      aria-disabled={unavailable || undefined}
      title={unavailable ? "Dit bestand is niet meegekomen bij het importeren" : attachment.name}
    >
      <Icon name="file" size={15} />
      <span className="ap-file-name">{attachment.name}</span>
      <span className="ap-file-size">
        {state === "busy" ? "openen…" : unavailable ? "niet bewaard" : formatBytes(attachment.size)}
      </span>
    </a>
  );
}

function EditPanel({ appointment, onSave, onCancel }) {
  const [title, setTitle] = useState(appointment.title);
  const [location, setLocation] = useState(appointment.location || "");
  const [notes, setNotes] = useState(appointment.notes || "");

  return (
    <form
      className="ap-edit"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title: title.trim() || appointment.title, location: location.trim(), notes: notes.trim() });
      }}
    >
      <label>
        Titel
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
      </label>
      <label>
        Locatie
        <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
      </label>
      <label>
        Eigen notitie
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
      </label>
      <div className="ap-edit-actions">
        <button type="submit" className="btn btn-primary btn-sm">Opslaan</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>Annuleren</button>
      </div>
      <p className="ap-edit-hint">Je aanpassingen blijven staan, ook nadat de agenda opnieuw is opgehaald.</p>
    </form>
  );
}

const SWIPE_WIDTH = 92;
const SWIPE_TRIGGER = 46;
const SWIPE_OPEN_EVENT = "ma:swipe-open";

/**
 * Swipe a row to the left to reveal Delete, the way a Mail or Reminders row
 * behaves. It is an accelerator, never the only route: the expanded card keeps
 * its own button for pointers, keyboards and screen readers.
 */
function useSwipeToDelete(rowId) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef(null);

  const close = useCallback(() => setOffset(0), []);

  // Only one row may stand open at a time.
  useEffect(() => {
    const onOther = (event) => {
      if (event.detail !== rowId) close();
    };
    document.addEventListener(SWIPE_OPEN_EVENT, onOther);
    return () => document.removeEventListener(SWIPE_OPEN_EVENT, onOther);
  }, [rowId, close]);

  const onPointerDown = useCallback(
    (event) => {
      if (event.pointerType === "mouse") return; // dragging with a mouse is not a thing here
      gesture.current = { x: event.clientX, y: event.clientY, base: offset, decided: false };
    },
    [offset]
  );

  const onPointerMove = useCallback((event) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (!g.decided) {
      // Let a vertical scroll win; only claim clearly horizontal movement.
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      if (Math.abs(dx) < 10) return;
      g.decided = true;
      setDragging(true);
    }

    // Past the full width it gets progressively stiffer, as rubber banding does.
    let next = g.base + dx;
    if (next > 0) next = 0;
    if (next < -SWIPE_WIDTH) next = -SWIPE_WIDTH - (SWIPE_WIDTH + next) * -0.3;
    setOffset(Math.max(next, -SWIPE_WIDTH - 24));
  }, []);

  const onPointerUp = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g || !g.decided) return;

    setOffset((current) => {
      const open = current < -SWIPE_TRIGGER;
      if (open) document.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: rowId }));
      return open ? -SWIPE_WIDTH : 0;
    });
  }, [rowId]);

  // A swipe that ended in a gesture must not also register as a tap.
  const swallowClick = useCallback((event) => {
    if (offset !== 0) {
      event.preventDefault();
      event.stopPropagation();
      setOffset(0);
      return true;
    }
    return false;
  }, [offset]);

  return {
    offset,
    dragging,
    close,
    swallowClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}

export default function AppointmentCard({ appointment, now, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const swipe = useSwipeToDelete(appointment.id);

  // Stepping away from the question is an answer: leave it armed and the next
  // stray tap deletes something.
  useEffect(() => {
    if (!confirmingDelete) return undefined;
    const timer = setTimeout(() => setConfirmingDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const urgency = urgencyOf(appointment, now);
  const cancelled = appointment.status === "CANCELLED";
  const uncertain = appointment.confidence < 0.75;
  const people = appointment.people || [];
  const attachments = appointment.attachments || [];
  const bring = appointment.bring || [];
  const conflicts = appointment.conflictsWith || [];

  const addToCalendar = useCallback(() => {
    const text = buildIcs([appointment], { calendarName: appointment.title });
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(appointment.title || "afspraak").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, [appointment]);

  return (
    <article
      className="ap"
      data-tier={urgency.tier}
      data-open={open || undefined}
      data-cancelled={cancelled || undefined}
      data-dragging={swipe.dragging || undefined}
      style={{ "--heat": urgency.heat, "--fade": urgency.fade }}
    >
      <div className="ap-swipe" aria-hidden={swipe.offset === 0}>
        <button
          type="button"
          tabIndex={swipe.offset === 0 ? -1 : 0}
          onClick={() => {
            swipe.close();
            onDelete(appointment);
          }}
        >
          <Icon name="trash" size={19} />
          Verwijder
        </button>
      </div>

      <div className="ap-slide" style={{ transform: `translateX(${swipe.offset}px)` }}>
      <button
        type="button"
        className="ap-head"
        onClick={(event) => {
          if (swipe.swallowClick(event)) return;
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        {...swipe.handlers}
      >
        <span className="ap-rail" aria-hidden="true" />

        <span className="ap-when">
          {appointment.allDay ? (
            <span className="ap-allday">Hele dag</span>
          ) : (
            <>
              <span className="ap-start">{formatTime(appointment.start)}</span>
              <span className="ap-end">{formatTime(appointment.end)}</span>
            </>
          )}
        </span>

        <span className="ap-body">
          <span className="ap-titlerow">
            <span className="ap-title">{appointment.title}</span>
            {appointment.isSeries && (
              <span className="ap-tag" title="Herhalende afspraak"><Icon name="repeat" size={12} /></span>
            )}
            {cancelled && <span className="ap-tag ap-tag-off">Geannuleerd</span>}
            {appointment.status === "TENTATIVE" && !cancelled && (
              <span className="ap-tag ap-tag-soft">Onder voorbehoud</span>
            )}
            {uncertain && (
              <span className="ap-tag ap-tag-warn" title="Automatisch uit tekst gelezen — controleer datum en tijd">
                <Icon name="alert" size={12} /> Controleer
              </span>
            )}
            {conflicts.length > 0 && !cancelled && (
              <span className="ap-tag ap-tag-clash" title={`Overlapt met: ${conflicts.join(", ")}`}>
                <Icon name="alert" size={12} /> Overlap
              </span>
            )}
          </span>

          <span className="ap-meta">
            {people.length > 0 && (
              <span className="ap-meta-item">
                <Icon name="users" size={13} />
                {people[0].name}
                {people.length > 1 && ` +${people.length - 1}`}
              </span>
            )}
            {appointment.location && (
              <span className="ap-meta-item ap-meta-place">
                <Icon name="pin" size={13} />
                <span className="ap-meta-text">{appointment.location}</span>
              </span>
            )}
            {appointment.meetingUrl && (
              <span className="ap-meta-item"><Icon name="video" size={13} />Online</span>
            )}
            {attachments.length > 0 && (
              <span className="ap-meta-item">
                <Icon name="clip" size={13} />
                {attachments.length}
              </span>
            )}
          </span>
        </span>

        <span className="ap-side">
          <span className="ap-rel">{formatRelative(appointment, now)}</span>
          <span className="ap-chev"><Icon name="chevron" size={15} strokeWidth={2.4} /></span>
        </span>
      </button>
      </div>

      {open && (
        <div className="ap-detail">
          <dl className="ap-facts">
            <div>
              <dt><Icon name="calendar" size={14} />Wanneer</dt>
              <dd>
                {formatFullDate(appointment.start)}
                <span className="ap-fact-sub">
                  {formatTimeRange(appointment)}
                  {!appointment.allDay && ` · ${formatDuration(appointment.end - appointment.start)}`}
                </span>
              </dd>
            </div>

            {appointment.location && (
              <div>
                <dt><Icon name="pin" size={14} />Waar</dt>
                <dd>
                  {appointment.location}
                  <a
                    className="ap-inline-link"
                    href={mapsUrl(appointment.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Route <Icon name="external" size={12} />
                  </a>
                </dd>
              </div>
            )}

            {(people.length > 0 || appointment.organizer) && (
              <div>
                <dt><Icon name="users" size={14} />Met wie</dt>
                <dd>
                  <ul className="ap-people">
                    {(people.length ? people : [appointment.organizer]).filter(Boolean).map((person, i) => (
                      <li key={`${person.email || person.name}-${i}`}>
                        <span className="ap-avatar" aria-hidden="true">{initialsOf(person)}</span>
                        <span className="ap-person">
                          <span className="ap-person-name">{person.name}</span>
                          <span className="ap-person-sub">
                            {[person.role, PARTSTAT[person.status]].filter(Boolean).join(" · ")}
                            {person.email && <span className="ap-person-mail">{person.email}</span>}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {bring.length > 0 && (
              <div>
                <dt><Icon name="check" size={14} />Meenemen</dt>
                <dd>
                  <ul className="ap-bring">
                    {bring.map((item, i) => (
                      <li key={`${item}-${i}`}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {conflicts.length > 0 && !cancelled && (
              <div>
                <dt><Icon name="alert" size={14} />Let op</dt>
                <dd className="ap-clash">
                  Overlapt met {conflicts.length === 1 ? "" : `${conflicts.length} afspraken: `}
                  <strong>{[...new Set(conflicts)].join(", ")}</strong>
                </dd>
              </div>
            )}

            {attachments.length > 0 && (
              <div>
                <dt><Icon name="clip" size={14} />Papieren</dt>
                <dd>
                  <div className="ap-files">
                    {attachments.map((attachment, i) => (
                      <AttachmentRow key={attachment.id || `${attachment.name}-${i}`} attachment={attachment} />
                    ))}
                  </div>
                </dd>
              </div>
            )}

            {(appointment.description || appointment.notes) && (
              <div>
                <dt><Icon name="file" size={14} />Details</dt>
                <dd>
                  {appointment.notes && <p className="ap-note">{appointment.notes}</p>}
                  {appointment.description && <p className="ap-desc">{appointment.description}</p>}
                </dd>
              </div>
            )}

            <div>
              <dt><Icon name={ORIGIN_ICON[appointment.origin] || "inbox"} size={14} />Bron</dt>
              <dd>
                {appointment.source?.label || appointment.origin || "Onbekend"}
                {appointment.alsoFrom?.length > 0 && (
                  <span className="ap-fact-sub">ook gevonden in: {appointment.alsoFrom.join(", ")}</span>
                )}
                {appointment.emailSubject && appointment.emailSubject !== appointment.source?.label && (
                  <span className="ap-fact-sub">“{appointment.emailSubject}”</span>
                )}
                {uncertain && appointment.matchedText && (
                  <span className="ap-quote">…{appointment.matchedText}…</span>
                )}
              </dd>
            </div>
          </dl>

          {editing ? (
            <EditPanel
              appointment={appointment}
              onCancel={() => setEditing(false)}
              onSave={(patch) => {
                onEdit(appointment.dedupeKey, patch);
                setEditing(false);
              }}
            />
          ) : (
            <div className="ap-actions">
              {appointment.meetingUrl && (
                <a className="btn btn-primary btn-sm" href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="video" size={14} /> Deelnemen
                </a>
              )}
              {appointment.phone && (
                <a className="btn btn-quiet btn-sm" href={`tel:${appointment.phone.replace(/[^\d+]/g, "")}`}>
                  <Icon name="phone" size={14} /> Bellen
                </a>
              )}
              <button type="button" className="btn btn-quiet btn-sm" onClick={addToCalendar}>
                <Icon name="download" size={14} /> Naar agenda
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={14} /> Aanpassen
              </button>
              {confirmingDelete ? (
                <span className="ap-confirm">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setConfirmingDelete(false);
                      onDelete(appointment);
                    }}
                    autoFocus
                  >
                    <Icon name="trash" size={14} /> Verwijderen
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Nee, laat staan
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm ap-remove"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Icon name="trash" size={14} /> Verwijderen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
