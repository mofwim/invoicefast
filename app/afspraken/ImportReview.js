"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import Icon from "./Icons";
import { formatFullDate, formatTimeRange } from "../../lib/afspraken/model";

const pad = (n) => String(n).padStart(2, "0");

export function toDateInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInput(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromInputs(dateValue, timeValue) {
  const [y, m, d] = String(dateValue || "").split("-").map(Number);
  const [hh, mm] = String(timeValue || "00:00").split(":").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime();
}

/**
 * The gate between "we found something" and "it is in your list".
 *
 * Appointments lifted out of prose are informed guesses, so every one of them
 * is shown with what the text actually said and can be corrected before it is
 * kept. Exact calendar imports pass through the same screen, just without the
 * warnings.
 */
export default function ImportReview({ pending, busy, onConfirm, onCancel }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!pending) return;
    setRows(
      pending.events.map((event) => ({
        ...event,
        __date: toDateInput(event.start),
        __from: toTimeInput(event.start),
        __to: toTimeInput(event.end),
      }))
    );
  }, [pending]);

  const selectedCount = useMemo(() => rows.filter((row) => row.__selected).length, [rows]);
  const needsCheck = useMemo(() => rows.some((row) => (row.confidence ?? 1) < 0.75), [rows]);

  if (!pending) return null;

  const patch = (key, changes) =>
    setRows((current) => current.map((row) => (row.__key === key ? { ...row, ...changes } : row)));

  const retime = (row, changes) => {
    const next = { ...row, ...changes };
    const start = fromInputs(next.__date, next.allDay ? "00:00" : next.__from);
    if (start == null) return changes;
    let end = fromInputs(next.__date, next.allDay ? "00:00" : next.__to);
    if (end == null || end <= start) end = start + (next.allDay ? 86400000 : 30 * 60000);
    return { ...changes, start, end };
  };

  return (
    <Modal
      open
      wide
      onClose={onCancel}
      title="Gevonden afspraken"
      subtitle={`${pending.label} — controleer en pas aan waar nodig.`}
    >
      {needsCheck && (
        <p className="ma-callout">
          <Icon name="alert" size={15} />
          Een deel is uit gewone tekst gelezen. Controleer datum en tijd voordat je ze bewaart.
        </p>
      )}

      {pending.errors?.length > 0 && (
        <details className="ma-help">
          <summary>{pending.errors.length} melding(en) tijdens het inlezen</summary>
          <ul>
            {pending.errors.slice(0, 8).map((error, i) => (
              <li key={i}><span>{error}</span></li>
            ))}
          </ul>
        </details>
      )}

      <ul className="ma-review">
        {rows.map((row) => {
          const uncertain = (row.confidence ?? 1) < 0.75;
          return (
            <li key={row.__key} data-selected={row.__selected || undefined}>
              <label className="ma-review-pick">
                <input
                  type="checkbox"
                  checked={Boolean(row.__selected)}
                  onChange={(event) => patch(row.__key, { __selected: event.target.checked })}
                />
                <span className="sr-only">Deze afspraak toevoegen</span>
              </label>

              <div className="ma-review-body">
                <input
                  className="ma-review-title"
                  value={row.title}
                  onChange={(event) => patch(row.__key, { title: event.target.value })}
                  aria-label="Titel"
                />

                <div className="ma-review-times">
                  <input
                    type="date"
                    value={row.__date}
                    onChange={(event) =>
                      patch(row.__key, retime(row, { __date: event.target.value }))
                    }
                    aria-label="Datum"
                  />
                  {!row.allDay && (
                    <>
                      <input
                        type="time"
                        value={row.__from}
                        onChange={(event) =>
                          patch(row.__key, retime(row, { __from: event.target.value }))
                        }
                        aria-label="Van"
                      />
                      <span className="ma-dash">–</span>
                      <input
                        type="time"
                        value={row.__to}
                        onChange={(event) =>
                          patch(row.__key, retime(row, { __to: event.target.value }))
                        }
                        aria-label="Tot"
                      />
                    </>
                  )}
                  <label className="ma-check ma-check-inline">
                    <input
                      type="checkbox"
                      checked={Boolean(row.allDay)}
                      onChange={(event) =>
                        patch(row.__key, retime(row, { allDay: event.target.checked }))
                      }
                    />
                    <span>Hele dag</span>
                  </label>
                </div>

                <input
                  className="ma-review-place"
                  value={row.location || ""}
                  placeholder="Locatie (optioneel)"
                  onChange={(event) => patch(row.__key, { location: event.target.value })}
                  aria-label="Locatie"
                />

                <div className="ma-review-foot">
                  <span className={`ma-conf${uncertain ? " is-low" : ""}`}>
                    {uncertain ? (
                      <>
                        <Icon name="alert" size={12} /> onzeker
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={12} /> exact
                      </>
                    )}
                  </span>
                  <span className="ma-review-when">
                    {formatFullDate(row.start)} · {formatTimeRange(row)}
                  </span>
                  {row.attachments?.length > 0 && (
                    <span className="ma-review-files">
                      <Icon name="clip" size={12} /> {row.attachments.length}
                    </span>
                  )}
                </div>

                {uncertain && row.matchedText && (
                  <p className="ma-review-quote">…{row.matchedText}…</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="ma-review-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedCount || Boolean(busy)}
          onClick={() => onConfirm(rows.map(({ __date, __from, __to, ...row }) => row))}
        >
          {selectedCount
            ? `${selectedCount} ${selectedCount === 1 ? "afspraak" : "afspraken"} toevoegen`
            : "Niets geselecteerd"}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </Modal>
  );
}
