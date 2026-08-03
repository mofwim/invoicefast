"use client";

/**
 * All of the app's state in one place.
 *
 * Everything downstream is derived: the timeline is rebuilt from the stored
 * sources, split into the three buckets against a clock that ticks, and
 * filtered by the search box. Imports never land directly — they go to
 * `pending` first so the reader can look at what was found and correct it,
 * which matters because appointments read out of prose are guesses.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addCalendarUrl,
  addManualAppointment,
  buildTimeline,
  deleteAppointment,
  emptyState,
  exportIcs,
  ingestEvents,
  listDeleted,
  loadState,
  readFile,
  readPastedText,
  removeSource,
  restoreAllDeleted,
  restoreAppointment,
  saveState,
  setOverride,
  syncAllSources,
  syncSource,
} from "../../lib/afspraken/store";
import {
  DEFAULT_SOON_DAYS,
  matchesQuery,
  splitIntoBuckets,
} from "../../lib/afspraken/model";
import { demoEvents } from "../../lib/afspraken/demo";
import {
  DEFAULT_THEME,
  applyTheme,
  isTheme,
  watchSystemTheme,
} from "../../lib/afspraken/theme";
import {
  askPermission,
  notificationPermission,
  scheduleReminders,
} from "../../lib/afspraken/reminders";

const TICK_MS = 30000;
const AUTO_SYNC_MS = 10 * 60000;
const REPLAN_MS = 5 * 60000;

export function useAfspraken({ initialTab = "binnenkort" } = {}) {
  const [state, setState] = useState(emptyState);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [pending, setPending] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const dirty = useRef(false);
  const lastAutoSync = useRef(0);

  // ---- load & persist ----------------------------------------------------
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setTab(loaded.settings?.tab || initialTab);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    const result = saveState(state);
    if (!result.ok) setMessage({ kind: "error", text: result.error });
  }, [state, ready]);

  const update = useCallback((updater) => {
    dirty.current = true;
    setState((current) => (typeof updater === "function" ? updater(current) : updater));
  }, []);

  // ---- the clock ---------------------------------------------------------
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, TICK_MS);
    // Coming back to a tab that was open for hours must not show stale times.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  // ---- derived -----------------------------------------------------------
  const timeline = useMemo(() => (ready ? buildTimeline(state) : []), [state, ready]);

  const soonDays = state.settings?.soonDays ?? DEFAULT_SOON_DAYS;

  const buckets = useMemo(
    () => splitIntoBuckets(timeline, now, soonDays),
    [timeline, now, soonDays]
  );

  const counts = useMemo(
    () => ({
      voorbij: buckets.voorbij.length,
      binnenkort: buckets.binnenkort.length,
      later: buckets.later.length,
    }),
    [buckets]
  );

  const visible = useMemo(
    () => buckets[tab].filter((appointment) => matchesQuery(appointment, query)),
    [buckets, tab, query]
  );

  const searchHits = useMemo(() => {
    if (!query.trim()) return null;
    return {
      voorbij: buckets.voorbij.filter((a) => matchesQuery(a, query)).length,
      binnenkort: buckets.binnenkort.filter((a) => matchesQuery(a, query)).length,
      later: buckets.later.filter((a) => matchesQuery(a, query)).length,
    };
  }, [buckets, query]);

  // ---- helpers -----------------------------------------------------------
  const notify = useCallback((kind, text) => setMessage({ kind, text }), []);

  useEffect(() => {
    if (!message) return undefined;
    // An offer to undo needs long enough to notice it and reach for it.
    const life = message.action ? 9000 : message.kind === "error" ? 8000 : 4000;
    const timer = setTimeout(() => setMessage(null), life);
    return () => clearTimeout(timer);
  }, [message]);

  const changeTab = useCallback(
    (next) => {
      setTab(next);
      update((current) => ({ ...current, settings: { ...current.settings, tab: next } }));
    },
    [update]
  );

  const updateSettings = useCallback(
    (patch) => update((current) => ({ ...current, settings: { ...current.settings, ...patch } })),
    [update]
  );

  // ---- importing ---------------------------------------------------------
  /** Hand parsed events to the review screen instead of storing them blind. */
  const stage = useCallback((kind, label, events, errors = []) => {
    if (!events.length) {
      notify(
        "error",
        errors[0] || "Geen afspraken gevonden. Controleer of er een datum in staat."
      );
      return false;
    }
    setPending({
      kind,
      label,
      errors,
      events: events.map((event, index) => ({ ...event, __key: `${index}`, __selected: true })),
    });
    return true;
  }, [notify]);

  const importFiles = useCallback(
    async (fileList) => {
      const files = [...fileList].filter(Boolean);
      if (!files.length) return;

      setBusy("Bestanden lezen…");
      try {
        const collected = [];
        const errors = [];
        let label = files.length === 1 ? files[0].name : `${files.length} bestanden`;
        let kind = "ics";

        for (const file of files) {
          try {
            const result = await readFile(file, { now: Date.now() });
            collected.push(...result.events);
            errors.push(...(result.errors || []));
            kind = result.kind;
            if (files.length === 1) label = result.label || label;
          } catch (err) {
            errors.push(`${file.name}: ${err.message}`);
          }
        }

        stage(kind, label, collected, errors);
      } finally {
        setBusy("");
      }
    },
    [stage]
  );

  const importText = useCallback(
    (text) => {
      if (!String(text || "").trim()) {
        notify("error", "Plak eerst een e-mail of agenda-tekst.");
        return;
      }
      const result = readPastedText(text, { now: Date.now() });
      stage(result.kind, result.label, result.events, result.errors);
    },
    [stage, notify]
  );

  const confirmImport = useCallback(
    async (edited) => {
      if (!pending) return;
      const events = (edited || pending.events).filter((event) => event.__selected !== false);
      if (!events.length) {
        setPending(null);
        return;
      }

      setBusy("Toevoegen…");
      try {
        const next = await ingestEvents(state, {
          kind: pending.kind === "ics" ? "ics" : pending.kind,
          label: pending.label,
          events: events.map(({ __key, __selected, ...event }) => event),
        });
        dirty.current = true;
        setState(next);
        setPending(null);
        notify("ok", `${events.length} ${events.length === 1 ? "afspraak" : "afspraken"} toegevoegd.`);
      } finally {
        setBusy("");
      }
    },
    [pending, state, notify]
  );

  const cancelImport = useCallback(() => setPending(null), []);

  const addUrl = useCallback(
    async (url) => {
      setBusy("Agenda ophalen…");
      try {
        const result = await addCalendarUrl(state, url);
        dirty.current = true;
        setState(result.state);
        notify("ok", `Agenda gekoppeld — ${result.added} afspraken.`);
        return true;
      } catch (err) {
        notify("error", err.message || "Kon deze agenda niet ophalen.");
        return false;
      } finally {
        setBusy("");
      }
    },
    [state, notify]
  );

  const syncAll = useCallback(
    async ({ silent = false } = {}) => {
      const linked = state.sources.filter((s) => s.kind === "url");
      if (!linked.length) {
        if (!silent) notify("ok", "Er zijn geen gekoppelde agenda's om te verversen.");
        return;
      }
      if (!silent) setBusy("Verversen…");
      try {
        const result = await syncAllSources(state);
        dirty.current = true;
        setState(result.state);
        if (!silent) {
          if (result.errors.length) notify("error", result.errors[0]);
          else notify("ok", "Alles is bijgewerkt.");
        }
      } finally {
        if (!silent) setBusy("");
      }
    },
    [state, notify]
  );

  const syncOne = useCallback(
    async (sourceId) => {
      setBusy("Verversen…");
      try {
        const result = await syncSource(state, sourceId);
        dirty.current = true;
        setState(result.state);
        if (result.error) notify("error", result.error);
      } finally {
        setBusy("");
      }
    },
    [state, notify]
  );

  const dropSource = useCallback(
    async (sourceId) => {
      const next = await removeSource(state, sourceId);
      dirty.current = true;
      setState(next);
      notify("ok", "Bron verwijderd.");
    },
    [state, notify]
  );

  const addManual = useCallback(
    (draft) => {
      update((current) => addManualAppointment(current, draft));
      notify("ok", "Afspraak toegevoegd.");
    },
    [update, notify]
  );

  const editAppointment = useCallback(
    (dedupeKey, patch) => update((current) => setOverride(current, dedupeKey, patch)),
    [update]
  );

  /**
   * Delete an appointment, with the way back attached to the confirmation.
   * A tool holding someone's appointments has no business losing one to a
   * mis-tap, so the undo is offered in the same breath.
   */
  const removeAppointment = useCallback(
    (appointment) => {
      const before = state;
      const { state: next, permanent } = deleteAppointment(state, appointment);
      dirty.current = true;
      setState(next);
      setMessage({
        kind: "ok",
        text: permanent ? "Afspraak verwijderd." : "Afspraak verwijderd — hij blijft weg na het verversen.",
        action: {
          label: "Ongedaan maken",
          run: () => {
            dirty.current = true;
            setState(before);
            setMessage({ kind: "ok", text: "Terug." });
          },
        },
      });
    },
    [state]
  );

  const undelete = useCallback(
    (dedupeKey) => {
      update((current) => restoreAppointment(current, dedupeKey));
      notify("ok", "Afspraak teruggezet.");
    },
    [update, notify]
  );

  const undeleteAll = useCallback(() => {
    update((current) => restoreAllDeleted(current));
    notify("ok", "Alles teruggezet.");
  }, [update, notify]);

  const deleted = useMemo(() => (ready ? listDeleted(state) : []), [state, ready]);

  const loadDemo = useCallback(async () => {
    setBusy("Voorbeeld laden…");
    try {
      const next = await ingestEvents(state, {
        kind: "demo",
        label: "Voorbeeldafspraken",
        events: demoEvents(Date.now()),
      });
      dirty.current = true;
      setState(next);
      notify("ok", "Voorbeeld geladen.");
    } finally {
      setBusy("");
    }
  }, [state, notify]);

  const download = useCallback(() => {
    const text = exportIcs(timeline);
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mijn-afspraken.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [timeline]);

  // ---- appearance --------------------------------------------------------
  const themePreference = state.settings?.theme || DEFAULT_THEME;

  // Apply the stored choice, and keep following the device while on automatic.
  useEffect(() => {
    if (!ready) return undefined;
    applyTheme(themePreference);
    if (themePreference !== "auto") return undefined;
    return watchSystemTheme(() => applyTheme("auto"));
  }, [ready, themePreference]);

  const setTheme = useCallback(
    (value) => {
      const next = isTheme(value) ? value : DEFAULT_THEME;
      applyTheme(next);
      updateSettings({ theme: next });
    },
    [updateSettings]
  );

  // ---- reminders ---------------------------------------------------------
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  const enableReminders = useCallback(
    async (minutes) => {
      if (!minutes) {
        updateSettings({ reminderMinutes: 0 });
        return true;
      }
      const result = await askPermission();
      setPermission(result);
      if (result !== "granted") {
        notify(
          "error",
          result === "denied"
            ? "Meldingen staan uit in je browser. Zet ze aan bij de site-instellingen."
            : "Meldingen zijn hier niet beschikbaar."
        );
        return false;
      }
      updateSettings({ reminderMinutes: minutes });
      return true;
    },
    [updateSettings, notify]
  );

  // Re-plan every few minutes so appointments drifting into the horizon get a
  // timer, and so a synced change is picked up without a reload.
  useEffect(() => {
    const minutes = state.settings?.reminderMinutes || 0;
    if (!ready || !minutes || permission !== "granted") return undefined;

    let cancel = scheduleReminders(timeline, minutes);
    const timer = setInterval(() => {
      cancel();
      cancel = scheduleReminders(timeline, minutes);
    }, REPLAN_MS);

    return () => {
      cancel();
      clearInterval(timer);
    };
  }, [ready, timeline, state.settings?.reminderMinutes, permission]);

  // ---- background refresh ------------------------------------------------
  useEffect(() => {
    if (!ready || !state.settings?.autoSync) return undefined;
    const linked = state.sources.filter((s) => s.kind === "url");
    if (!linked.length) return undefined;

    const maybeSync = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (Date.now() - lastAutoSync.current < AUTO_SYNC_MS) return;
      lastAutoSync.current = Date.now();
      syncAll({ silent: true });
    };

    maybeSync();
    const timer = setInterval(maybeSync, 60000);
    window.addEventListener("online", maybeSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", maybeSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.settings?.autoSync, state.sources.length]);

  return {
    ready,
    state,
    now,
    tab,
    setTab: changeTab,
    query,
    setQuery,
    buckets,
    counts,
    visible,
    searchHits,
    timeline,
    busy,
    message,
    notify,
    pending,
    settings: state.settings,
    updateSettings,
    permission,
    enableReminders,
    theme: themePreference,
    setTheme,
    importFiles,
    importText,
    confirmImport,
    cancelImport,
    addUrl,
    syncAll,
    syncOne,
    removeSource: dropSource,
    addManual,
    editAppointment,
    removeAppointment,
    deleted,
    undelete,
    undeleteAll,
    loadDemo,
    download,
  };
}
