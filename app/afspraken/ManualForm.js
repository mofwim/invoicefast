"use client";

import { useState } from "react";
import Modal from "./Modal";
import { fromInputs, toDateInput, toTimeInput } from "./ImportReview";

const roundToNextHalfHour = (ms) => {
  const d = new Date(ms + 10 * 60000);
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return d.getTime();
};

export default function ManualForm({ open, onClose, onSave }) {
  const start = roundToNextHalfHour(Date.now());

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateInput(start));
  const [from, setFrom] = useState(() => toTimeInput(start));
  const [to, setTo] = useState(() => toTimeInput(start + 30 * 60000));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [who, setWho] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setLocation("");
    setWho("");
    setNotes("");
    setAllDay(false);
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Geef de afspraak een naam.");
      return;
    }
    const startMs = fromInputs(date, allDay ? "00:00" : from);
    if (startMs == null) {
      setError("Kies een geldige datum.");
      return;
    }
    let endMs = fromInputs(date, allDay ? "00:00" : to);
    if (endMs == null || endMs <= startMs) endMs = startMs + (allDay ? 86400000 : 30 * 60000);

    onSave({
      title: title.trim(),
      start: startMs,
      end: endMs,
      allDay,
      location: location.trim(),
      notes: notes.trim(),
      description: "",
      people: who
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          email: /@/.test(name) ? name : "",
          role: "deelnemer",
        })),
      attachments: [],
      status: "CONFIRMED",
    });

    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Afspraak toevoegen" subtitle="Voor wat niet in een agenda of e-mail staat.">
      <form className="ma-form" onSubmit={submit}>
        <label className="ma-field ma-field-block">
          <span>Wat</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tandarts, ouderavond, keuring…"
            maxLength={160}
            autoFocus
          />
        </label>

        <div className="ma-field-row">
          <label className="ma-field ma-field-block">
            <span>Wanneer</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          {!allDay && (
            <>
              <label className="ma-field ma-field-block ma-field-narrow">
                <span>Van</span>
                <input type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label className="ma-field ma-field-block ma-field-narrow">
                <span>Tot</span>
                <input type="time" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
            </>
          )}
        </div>

        <label className="ma-check">
          <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
          <span>Hele dag</span>
        </label>

        <label className="ma-field ma-field-block">
          <span>Waar</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Adres of ruimte"
            maxLength={200}
          />
        </label>

        <label className="ma-field ma-field-block">
          <span>Met wie</span>
          <input
            value={who}
            onChange={(event) => setWho(event.target.value)}
            placeholder="Namen, gescheiden door komma’s"
            maxLength={240}
          />
        </label>

        <label className="ma-field ma-field-block">
          <span>Notitie</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Wat je niet wilt vergeten mee te nemen…"
            maxLength={1000}
          />
        </label>

        {error && <p className="ma-error">{error}</p>}

        <div className="ma-review-actions">
          <button type="submit" className="btn btn-primary">Toevoegen</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Annuleren</button>
        </div>
      </form>
    </Modal>
  );
}
