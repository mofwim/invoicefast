"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import Icon from "./Icons";
import { SOURCE_KINDS } from "../../lib/afspraken/store";
import { formatFullDate, formatRelative } from "../../lib/afspraken/model";
import { REMINDER_CHOICES } from "../../lib/afspraken/reminders";

const HELP = [
  {
    name: "Google Agenda",
    steps:
      "Instellingen → kies je agenda → Agenda integreren → kopieer “Geheim adres in iCal-indeling”.",
  },
  {
    name: "Outlook / Microsoft 365",
    steps:
      "Agenda → Delen → Publiceren → kies “Alle details kunnen zien” → kopieer de ICS-link.",
  },
  {
    name: "Apple Agenda (iCloud)",
    steps:
      "Rechtsklik op de agenda → Deel agenda → zet “Openbare agenda” aan → kopieer de link (webcal://).",
  },
];

function relativeSync(ms) {
  if (!ms) return "nog niet opgehaald";
  return formatRelative({ start: ms, end: ms }, Date.now());
}

export default function SourcesSheet({
  open,
  onClose,
  state,
  settings,
  busy,
  onAddUrl,
  onImportFiles,
  onImportText,
  onSync,
  onSyncOne,
  onRemove,
  onSettings,
  onExport,
  onDemo,
  onReminders,
  permission,
  deleted = [],
  onUndelete,
  onUndeleteAll,
}) {
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState("");
  const fileRef = useRef(null);

  const linked = state.sources.filter((source) => source.kind === "url");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Afspraken ophalen"
      subtitle="Koppel een agenda, laat een e-mail los of plak een bevestiging."
    >
      <section className="ma-section">
        <h3><Icon name="link" size={15} /> Agenda koppelen</h3>
        <form
          className="ma-inline-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!url.trim()) return;
            const ok = await onAddUrl(url.trim());
            if (ok) setUrl("");
          }}
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://… of webcal://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="Agenda-link"
          />
          <button type="submit" className="btn btn-primary" disabled={!url.trim() || Boolean(busy)}>
            Koppelen
          </button>
        </form>
        <details className="ma-help">
          <summary>Waar vind ik die link?</summary>
          <ul>
            {HELP.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong>
                <span>{item.steps}</span>
              </li>
            ))}
          </ul>
          <p className="ma-fineprint">
            Een gekoppelde agenda wordt automatisch ververst zolang deze pagina open staat.
          </p>
        </details>
      </section>

      <section className="ma-section">
        <h3><Icon name="inbox" size={15} /> Bestand toevoegen</h3>
        <div
          className={`ma-drop${dragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files?.length) onImportFiles(event.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          <Icon name="download" size={20} />
          <span><strong>Sleep hierheen</strong> of klik om te kiezen</span>
          <span className="ma-fineprint">.ics agendabestanden en .eml e-mails, inclusief bijlagen</span>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".ics,.ical,.ifb,.eml,.msg,.txt,text/calendar,message/rfc822,text/plain"
            hidden
            onChange={(event) => {
              if (event.target.files?.length) onImportFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="ma-section">
        <h3><Icon name="mail" size={15} /> Tekst plakken</h3>
        <textarea
          className="ma-paste"
          rows={4}
          placeholder="Plak hier een e-mail met een afspraak, of de inhoud van een agendabestand…"
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!paste.trim() || Boolean(busy)}
          onClick={() => {
            onImportText(paste);
            setPaste("");
          }}
        >
          Afspraken zoeken
        </button>
      </section>

      <section className="ma-section">
        <div className="ma-section-head">
          <h3><Icon name="calendar" size={15} /> Bronnen ({state.sources.length})</h3>
          {linked.length > 0 && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={onSync} disabled={Boolean(busy)}>
              <Icon name="refresh" size={14} /> Alles verversen
            </button>
          )}
        </div>

        {state.sources.length === 0 ? (
          <p className="ma-empty-note">
            Nog geen bronnen.{" "}
            <button type="button" className="linkish" onClick={onDemo}>
              Laad een voorbeeld
            </button>{" "}
            om te zien hoe het werkt.
          </p>
        ) : (
          <ul className="ma-sources">
            {state.sources.map((source) => (
              <li key={source.id} className={source.lastError ? "has-error" : undefined}>
                <span className="ma-source-icon" aria-hidden="true">
                  {SOURCE_KINDS[source.kind]?.icon || "•"}
                </span>
                <span className="ma-source-text">
                  <strong>{source.label}</strong>
                  <span>
                    {source.count} afspraken · {SOURCE_KINDS[source.kind]?.label || source.kind}
                    {source.kind === "url" && ` · bijgewerkt ${relativeSync(source.lastSyncAt)}`}
                  </span>
                  {source.lastError && <span className="ma-source-error">{source.lastError}</span>}
                </span>
                <span className="ma-source-actions">
                  {source.kind === "url" && (
                    <button
                      type="button"
                      className="ma-icon-btn"
                      onClick={() => onSyncOne(source.id)}
                      aria-label={`${source.label} verversen`}
                      disabled={Boolean(busy)}
                    >
                      <Icon name="refresh" size={15} />
                    </button>
                  )}
                  {confirming === source.id ? (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        onRemove(source.id);
                        setConfirming("");
                      }}
                    >
                      Zeker weten?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ma-icon-btn"
                      onClick={() => setConfirming(source.id)}
                      aria-label={`${source.label} verwijderen`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleted.length > 0 && (
        <section className="ma-section">
          <div className="ma-section-head">
            <h3><Icon name="trash" size={15} /> Verwijderd ({deleted.length})</h3>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onUndeleteAll}>
              Alles terugzetten
            </button>
          </div>
          <p className="ma-fineprint ma-note-inline">
            Deze komen uit een gekoppelde bron. Ze blijven weg na het verversen, tot je ze terugzet.
          </p>
          <ul className="ma-deleted">
            {deleted.map((entry) => (
              <li key={entry.key}>
                <span className="ma-deleted-text">
                  <strong>{entry.title}</strong>
                  {entry.start > 0 && <span>{formatFullDate(entry.start)}</span>}
                </span>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onUndelete(entry.key)}>
                  Terugzetten
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ma-section">
        <h3><Icon name="settings" size={15} /> Instellingen</h3>
        <label className="ma-field">
          <span>“Binnenkort” loopt tot</span>
          <select
            value={settings.soonDays}
            onChange={(event) => onSettings({ soonDays: Number(event.target.value) })}
          >
            <option value={3}>over 3 dagen</option>
            <option value={7}>over een week</option>
            <option value={14}>over twee weken</option>
            <option value={30}>over een maand</option>
          </select>
        </label>
        <label className="ma-field">
          <span><Icon name="bell" size={14} /> Herinnering</span>
          <select
            value={settings.reminderMinutes || 0}
            onChange={(event) => onReminders(Number(event.target.value))}
            disabled={permission === "unsupported"}
          >
            {REMINDER_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </label>
        {Boolean(settings.reminderMinutes) && (
          <p className="ma-fineprint ma-note-inline">
            Je krijgt een melding zolang deze pagina of de app open staat — ook op de achtergrond.
            Volledig gesloten kan je browser geen melding geven.
          </p>
        )}
        {permission === "denied" && (
          <p className="ma-fineprint ma-note-warn">
            Meldingen zijn geblokkeerd voor deze site. Zet ze aan via het slotje in de adresbalk.
          </p>
        )}

        <label className="ma-check">
          <input
            type="checkbox"
            checked={Boolean(settings.autoSync)}
            onChange={(event) => onSettings({ autoSync: event.target.checked })}
          />
          <span>Gekoppelde agenda’s automatisch verversen</span>
        </label>
        <div className="ma-row-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onExport}>
            <Icon name="download" size={14} /> Alles exporteren (.ics)
          </button>
        </div>
        <p className="ma-fineprint">
          Alles blijft op dit apparaat — in je browser. Er gaat niets naar een server, behalve het
          ophalen van een agenda-link die je zelf toevoegt.
        </p>
      </section>
    </Modal>
  );
}
