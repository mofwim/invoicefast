"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icons";
import AppointmentCard from "./AppointmentCard";
import SourcesSheet from "./SourcesSheet";
import ImportReview from "./ImportReview";
import ManualForm from "./ManualForm";
import { useAfspraken } from "./useAfspraken";
import { BUCKETS, formatRelative, formatTimeRange, groupByDay, HOUR } from "../../lib/afspraken/model";
import "./afspraken.css";

const EMPTY_COPY = {
  voorbij: {
    title: "Nog niets geweest",
    body: "Zodra een afspraak voorbij is, verschijnt hij hier — met alles wat erbij hoorde.",
  },
  binnenkort: {
    title: "Niets op korte termijn",
    body: "Je hebt even lucht. Wat verder vooruit staat, vind je onder “Later”.",
  },
  later: {
    title: "Verder vooruit staat nog niets",
    body: "Alles wat je hebt, komt binnenkort al. Dat is ook iets waard.",
  },
};

/** The one appointment worth interrupting for: running now, or nearly. */
function useUpNext(buckets, now) {
  return useMemo(() => {
    const candidate = buckets.binnenkort.find(
      (appointment) => appointment.status !== "CANCELLED" && appointment.end > now
    );
    if (!candidate) return null;
    const running = candidate.start <= now;
    if (!running && candidate.start - now > 3 * HOUR) return null;
    return { appointment: candidate, running };
  }, [buckets, now]);
}

export default function AfsprakenApp({ variant = "full", initialTab = "binnenkort", seedIcsUrl = "" }) {
  const app = useAfspraken({ initialTab });
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const searchRef = useRef(null);
  const dragDepth = useRef(0);
  const seeded = useRef(false);

  // Once the large title has scrolled away, the bar takes over its job.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 44);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compact = variant === "embed";
  const hasSources = app.state.sources.length > 0;
  const groups = useMemo(() => groupByDay(app.visible, app.now), [app.visible, app.now]);
  const upNext = useUpNext(app.buckets, app.now);

  // Once something has been found to review, the sheet has done its job — step
  // out of the way rather than stacking two dialogs on top of each other.
  useEffect(() => {
    if (app.pending) setSourcesOpen(false);
  }, [app.pending]);

  // An embed can be handed a calendar link by the page hosting it, which makes
  // the widget useful on a first visit even before anything is stored locally.
  useEffect(() => {
    if (!app.ready || !seedIcsUrl || seeded.current) return;
    if (app.state.sources.some((source) => source.url === seedIcsUrl)) {
      seeded.current = true;
      return;
    }
    seeded.current = true;
    app.addUrl(seedIcsUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, seedIcsUrl]);

  // Dropping a file anywhere on the page imports it.
  useEffect(() => {
    const onDragEnter = (event) => {
      if (![...(event.dataTransfer?.types || [])].includes("Files")) return;
      dragDepth.current += 1;
      setDropping(true);
    };
    const onDragOver = (event) => event.preventDefault();
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDropping(false);
    };
    const onDrop = (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      if (event.dataTransfer?.files?.length) app.importFiles(event.dataTransfer.files);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [app]);

  // "/" jumps to search, 1–3 switch tabs — for people who live in this list.
  useEffect(() => {
    const onKeyDown = (event) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/" && !inField) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (!inField && ["1", "2", "3"].includes(event.key)) {
        app.setTab(BUCKETS[Number(event.key) - 1].id);
      } else if (event.key === "Escape" && document.activeElement === searchRef.current) {
        app.setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [app]);

  const jumpToUpNext = useCallback(() => {
    app.setTab("binnenkort");
    app.setQuery("");
  }, [app]);

  if (!app.ready) {
    return (
      <div className={`ma ${compact ? "ma-compact" : ""}`}>
        <div className="ma-skeleton" aria-busy="true" aria-live="polite">
          <span className="sr-only">Afspraken laden…</span>
          {[0, 1, 2].map((i) => (
            <div className="ma-skeleton-row" key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`ma${compact ? " ma-compact" : ""}`}>
      <header className="ma-navbar" data-condensed={condensed || undefined}>
        <div className="ma-navbar-inner">
          <span className="ma-navbar-title">Mijn Afspraken</span>
          <div className="ma-navbar-actions">
            <button type="button" className="ma-icon-btn" onClick={() => setManualOpen(true)} aria-label="Afspraak toevoegen" title="Afspraak toevoegen">
              <Icon name="plus" size={22} strokeWidth={2} />
            </button>
            <button type="button" className="ma-icon-btn" onClick={() => setSourcesOpen(true)} aria-label="Afspraken ophalen" title="Afspraken ophalen">
              <Icon name="inbox" size={21} />
            </button>
          </div>
        </div>
      </header>

      {!compact && (
        <h1 className="ma-largetitle">
          Mijn Afspraken
          <span>alles wat je te wachten staat, op één plek</span>
        </h1>
      )}

      <div className="ma-search">
        <Icon name="search" size={16} />
        <input
          ref={searchRef}
          type="search"
          value={app.query}
          onChange={(event) => app.setQuery(event.target.value)}
          placeholder="Zoeken"
          aria-label="Zoeken in afspraken"
        />
        {app.query && (
          <button type="button" className="ma-icon-btn ma-search-clear" onClick={() => app.setQuery("")} aria-label="Zoekopdracht wissen">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {upNext && !app.query && (
        <button type="button" className={`ma-upnext${upNext.running ? " is-live" : ""}`} onClick={jumpToUpNext}>
          <span className="ma-upnext-dot" aria-hidden="true" />
          <span className="ma-upnext-label">{upNext.running ? "Nu bezig" : "Straks"}</span>
          <span className="ma-upnext-title">{upNext.appointment.title}</span>
          <span className="ma-upnext-time">
            {formatRelative(upNext.appointment, app.now)} · {formatTimeRange(upNext.appointment)}
          </span>
        </button>
      )}

      <nav
        className="ma-tabs"
        role="tablist"
        aria-label="Periode"
        style={{ "--seg": BUCKETS.findIndex((b) => b.id === app.tab) }}
      >
        <span className="ma-seg-pill" aria-hidden="true" />
        {BUCKETS.map((bucket) => {
          const active = app.tab === bucket.id;
          const count = app.searchHits ? app.searchHits[bucket.id] : app.counts[bucket.id];
          return (
            <button
              key={bucket.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ma-tab${active ? " is-active" : ""}`}
              onClick={() => app.setTab(bucket.id)}
              data-bucket={bucket.id}
            >
              <span className="ma-tab-label">{bucket.label}</span>
              <span className="ma-tab-count">{count}</span>
            </button>
          );
        })}
      </nav>

      <main className="ma-list" role="tabpanel" aria-label={BUCKETS.find((b) => b.id === app.tab)?.label}>
        {groups.length === 0 ? (
          !hasSources ? (
            <div className="ma-onboard">
              <h2>Alle afspraken bij elkaar</h2>
              <p>
                Uit je agenda, uit je e-mail, of gewoon getypt. Drie tabbladen: wat geweest is, wat
                eraan komt, en wat later speelt. Alles blijft op dit apparaat.
              </p>
              <div className="ma-onboard-actions">
                <button type="button" className="btn btn-primary" onClick={() => setSourcesOpen(true)}>
                  <Icon name="link" size={15} /> Agenda koppelen
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setManualOpen(true)}>
                  <Icon name="plus" size={15} /> Zelf toevoegen
                </button>
                <button type="button" className="btn btn-quiet" onClick={app.loadDemo}>
                  <Icon name="sparkle" size={15} /> Voorbeeld bekijken
                </button>
              </div>
              <ul className="ma-onboard-list">
                <li><Icon name="calendar" size={15} /> Google, Outlook en Apple Agenda via een ICS-link</li>
                <li><Icon name="mail" size={15} /> Sleep een e-mail (.eml) hierheen — bijlagen komen mee</li>
                <li><Icon name="clip" size={15} /> Tijd, plaats, met wie, en de papieren die erbij horen</li>
              </ul>
            </div>
          ) : app.query ? (
            <div className="ma-empty">
              <h2>Niets gevonden</h2>
              <p>
                Geen afspraak in “{BUCKETS.find((b) => b.id === app.tab)?.label.toLowerCase()}” die
                past bij <strong>{app.query}</strong>.
              </p>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => app.setQuery("")}>
                Zoekopdracht wissen
              </button>
            </div>
          ) : (
            <div className="ma-empty">
              <h2>{EMPTY_COPY[app.tab].title}</h2>
              <p>{EMPTY_COPY[app.tab].body}</p>
            </div>
          )
        ) : (
          groups.map((group) => (
            <section className="ma-day" key={group.key}>
              <h2 className="ma-day-head">
                <span>{group.label}</span>
                <span className="ma-day-count">{group.items.length}</span>
              </h2>
              <div className="ma-day-items">
                {group.items.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    now={app.now}
                    onEdit={app.editAppointment}
                    onDelete={app.removeAppointment}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {!compact && (
        <footer className="ma-foot">
          <p>
            <strong>Mijn Afspraken</strong> — je agenda en je e-mail komen hier samen. Alles staat in
            je browser, op dit apparaat.
          </p>
          <p className="ma-foot-links">
            <button type="button" className="linkish" onClick={() => setSourcesOpen(true)}>Bronnen beheren</button>
            <span aria-hidden="true">·</span>
            <button type="button" className="linkish" onClick={app.download}>Exporteren</button>
            <span aria-hidden="true">·</span>
            <a href="/afspraken/insluiten">Op je eigen site</a>
            <span aria-hidden="true">·</span>
            <a href="/">InvoiceFast</a>
          </p>
        </footer>
      )}

      {app.busy && (
        <div className="ma-busy" role="status" aria-live="polite">
          <span className="ma-spinner" aria-hidden="true" />
          {app.busy}
        </div>
      )}

      {app.message && (
        <div className={`ma-toast ma-toast-${app.message.kind}`} role="status" aria-live="polite">
          <Icon name={app.message.kind === "error" ? "alert" : "check"} size={16} />
          <span>{app.message.text}</span>
          {app.message.action && (
            <button type="button" className="ma-toast-action" onClick={app.message.action.run}>
              {app.message.action.label}
            </button>
          )}
        </div>
      )}

      {dropping && (
        <div className="ma-dropzone" aria-hidden="true">
          <div>
            <Icon name="download" size={28} />
            <strong>Laat los om te importeren</strong>
            <span>.ics agendabestanden en .eml e-mails</span>
          </div>
        </div>
      )}

      <SourcesSheet
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        state={app.state}
        settings={app.settings}
        busy={app.busy}
        onAddUrl={app.addUrl}
        onImportFiles={app.importFiles}
        onImportText={app.importText}
        onSync={app.syncAll}
        onSyncOne={app.syncOne}
        onRemove={app.removeSource}
        onSettings={app.updateSettings}
        onReminders={app.enableReminders}
        onTheme={app.setTheme}
        permission={app.permission}
        deleted={app.deleted}
        onUndelete={app.undelete}
        onUndeleteAll={app.undeleteAll}
        onExport={app.download}
        onDemo={() => {
          app.loadDemo();
          setSourcesOpen(false);
        }}
      />

      <ImportReview
        pending={app.pending}
        busy={app.busy}
        onConfirm={app.confirmImport}
        onCancel={app.cancelImport}
      />

      <ManualForm open={manualOpen} onClose={() => setManualOpen(false)} onSave={app.addManual} />
    </div>
  );
}
