/**
 * Where everything is kept, and how it gets in.
 *
 * A "source" is one place appointments come from: a subscribed calendar link, a
 * dropped .ics or .eml file, pasted text, or something typed by hand. Each
 * source owns its own list, so re-syncing a calendar replaces exactly that
 * calendar and touches nothing else. Edits the reader makes are stored
 * separately as overrides and re-applied after every sync, which is what keeps
 * a renamed appointment renamed.
 *
 * Nothing leaves the device. The only network call is fetching a calendar link,
 * and that goes through a proxy purely because browsers refuse cross-origin
 * calendar downloads.
 */

import { parseIcs, buildIcs } from "./ics.js";
import { appointmentsFromEmail, appointmentsFromText, bytesToBinaryString } from "./email.js";
import {
  DEFAULT_SOON_DAYS,
  dedupeAppointments,
  hashId,
  normalizeAppointment,
} from "./model.js";
import { putAttachment, deleteAttachmentsForSource } from "./idb.js";

export const STORAGE_KEY = "mijn_afspraken_v1";
const MAX_EVENTS_PER_SOURCE = 900;
const MAX_DESCRIPTION = 4000;

export const SOURCE_KINDS = {
  url: { label: "Agenda-link", icon: "🔗" },
  ics: { label: "Agendabestand", icon: "📅" },
  email: { label: "E-mail", icon: "✉️" },
  text: { label: "Tekst", icon: "📝" },
  manual: { label: "Handmatig", icon: "✍️" },
  demo: { label: "Voorbeeld", icon: "✨" },
};

export function emptyState() {
  return {
    version: 1,
    sources: [],
    items: {},
    overrides: {},
    settings: {
      soonDays: DEFAULT_SOON_DAYS,
      autoSync: true,
      showDeclined: false,
      tab: "binnenkort",
    },
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function loadState() {
  if (typeof localStorage === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      items: parsed.items && typeof parsed.items === "object" ? parsed.items : {},
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  if (typeof localStorage === "undefined") return { ok: true };
  const write = (payload) => localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  try {
    write(state);
    return { ok: true };
  } catch (err) {
    // Out of room: descriptions are the bulk of it and the least missed.
    try {
      const slim = {
        ...state,
        items: Object.fromEntries(
          Object.entries(state.items).map(([id, list]) => [
            id,
            list.map((item) => ({ ...item, description: (item.description || "").slice(0, 300) })),
          ])
        ),
      };
      write(slim);
      return { ok: true, trimmed: true };
    } catch {
      return { ok: false, error: "Opslag is vol. Verwijder een bron om ruimte te maken." };
    }
  }
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function makeSourceId(kind, seed) {
  return `${kind}-${hashId(`${seed}`)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Strip anything too big or not worth persisting before an event is stored. */
function slimEvent(event) {
  return {
    ...event,
    description: String(event.description || "").slice(0, MAX_DESCRIPTION),
    attachments: (event.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      mime: a.mime,
      size: a.size,
      url: a.url,
      kind: a.kind,
      stored: Boolean(a.stored),
    })),
  };
}

/**
 * Persist attachment bytes to IndexedDB and rewrite the references so the card
 * can offer a download later without keeping megabytes in localStorage.
 */
async function stashAttachments(events, sourceId) {
  for (const event of events) {
    const attachments = event.attachments || [];
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      if (!attachment.bytes) continue;
      const id = `${sourceId}:${hashId(`${event.id || event.title}:${attachment.name}:${i}`)}`;
      const ok = await putAttachment({
        id,
        sourceId,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size,
        bytes: attachment.bytes,
      });
      attachments[i] = {
        id,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size,
        kind: "file",
        stored: ok,
      };
    }
  }
  return events;
}

export async function ingestEvents(state, { kind, label, url, events }) {
  const sourceId = makeSourceId(kind, url || label || Date.now());
  const prepared = await stashAttachments(events, sourceId);
  const stored = prepared.slice(0, MAX_EVENTS_PER_SOURCE).map(slimEvent);

  const source = {
    id: sourceId,
    kind,
    label,
    url: url || "",
    addedAt: Date.now(),
    lastSyncAt: Date.now(),
    lastError: "",
    count: stored.length,
  };

  return {
    ...state,
    sources: [...state.sources, source],
    items: { ...state.items, [sourceId]: stored },
  };
}

export async function removeSource(state, sourceId) {
  await deleteAttachmentsForSource(sourceId);
  const items = { ...state.items };
  delete items[sourceId];
  return {
    ...state,
    sources: state.sources.filter((s) => s.id !== sourceId),
    items,
  };
}

// ---------------------------------------------------------------------------
// Importers
// ---------------------------------------------------------------------------

export function normalizeCalendarUrl(input) {
  let url = String(input || "").trim();
  if (!url) return "";
  if (/^webcal:\/\//i.test(url)) url = url.replace(/^webcal:\/\//i, "https://");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/**
 * Fetch a subscribed calendar. Browsers block cross-origin calendar downloads,
 * so this goes through our own read-only proxy.
 */
export async function fetchCalendar(url, { signal } = {}) {
  const target = normalizeCalendarUrl(url);
  const response = await fetch(`/api/ics?url=${encodeURIComponent(target)}`, {
    signal,
    headers: { accept: "text/calendar, text/plain" },
  });

  const body = await response.text();
  if (!response.ok) {
    let message = `Ophalen mislukt (${response.status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) message = parsed.error;
    } catch {
      /* body was not JSON */
    }
    throw new Error(message);
  }
  return body;
}

export async function addCalendarUrl(state, url, { label } = {}) {
  const target = normalizeCalendarUrl(url);
  const text = await fetchCalendar(target);
  const { events, calendarName, errors } = parseIcs(text, { now: Date.now() });
  if (!events.length && errors.length) throw new Error(errors[0]);

  const next = await ingestEvents(state, {
    kind: "url",
    label: label || calendarName || hostOf(target),
    url: target,
    events,
  });
  return { state: next, added: events.length, warnings: errors };
}

/** Re-fetch one subscribed calendar, keeping its id so overrides survive. */
export async function syncSource(state, sourceId) {
  const source = state.sources.find((s) => s.id === sourceId);
  if (!source || source.kind !== "url" || !source.url) return { state, added: 0 };

  try {
    const text = await fetchCalendar(source.url);
    const { events, calendarName } = parseIcs(text, { now: Date.now() });
    const stored = events.slice(0, MAX_EVENTS_PER_SOURCE).map(slimEvent);
    return {
      state: {
        ...state,
        sources: state.sources.map((s) =>
          s.id === sourceId
            ? {
                ...s,
                label: s.renamed ? s.label : calendarName || s.label,
                lastSyncAt: Date.now(),
                lastError: "",
                count: stored.length,
              }
            : s
        ),
        items: { ...state.items, [sourceId]: stored },
      },
      added: stored.length,
    };
  } catch (err) {
    return {
      state: {
        ...state,
        sources: state.sources.map((s) =>
          s.id === sourceId ? { ...s, lastSyncAt: Date.now(), lastError: err.message } : s
        ),
      },
      added: 0,
      error: err.message,
    };
  }
}

export async function syncAllSources(state) {
  let next = state;
  const errors = [];
  for (const source of state.sources.filter((s) => s.kind === "url")) {
    const result = await syncSource(next, source.id);
    next = result.state;
    if (result.error) errors.push(`${source.label}: ${result.error}`);
  }
  return { state: next, errors };
}

/**
 * Read a dropped file. `.ics` becomes calendar events; `.eml`/`.msg` goes
 * through the mail reader; anything else is treated as text.
 */
export async function readFile(file, { now = Date.now() } = {}) {
  const name = file.name || "bestand";
  const buffer = new Uint8Array(await file.arrayBuffer());
  const looksLikeIcs = /\.ics$/i.test(name) || /^BEGIN:VCALENDAR/i.test(bytesToBinaryString(buffer.subarray(0, 40)));

  if (looksLikeIcs) {
    const text = new TextDecoder("utf-8").decode(buffer);
    const { events, calendarName, errors } = parseIcs(text, { now });
    return { kind: "ics", label: calendarName || name, events, errors };
  }

  if (/\.(eml|msg|mbox)$/i.test(name) || /^(from|received|return-path|subject|date|message-id):/im.test(bytesToBinaryString(buffer.subarray(0, 400)))) {
    const events = appointmentsFromEmail(buffer, { now, sourceLabel: name });
    return { kind: "email", label: events[0]?.emailSubject || name, events, errors: [] };
  }

  const text = new TextDecoder("utf-8").decode(buffer);
  const events = appointmentsFromText(text, { now, sourceLabel: name });
  return { kind: "text", label: name, events, errors: [] };
}

export function readPastedText(text, { now = Date.now() } = {}) {
  const events = appointmentsFromText(text, { now });
  const label = /BEGIN:VCALENDAR/i.test(text) ? "Geplakte agenda" : "Geplakte tekst";
  return { kind: /BEGIN:VCALENDAR/i.test(text) ? "ics" : "text", label, events, errors: [] };
}

// ---------------------------------------------------------------------------
// Manual entries and edits
// ---------------------------------------------------------------------------

export function manualSourceOf(state) {
  return state.sources.find((s) => s.kind === "manual") || null;
}

export function addManualAppointment(state, draft) {
  let next = state;
  let source = manualSourceOf(state);

  if (!source) {
    source = {
      id: makeSourceId("manual", "eigen"),
      kind: "manual",
      label: "Eigen afspraken",
      url: "",
      addedAt: Date.now(),
      lastSyncAt: null,
      lastError: "",
      count: 0,
    };
    next = { ...next, sources: [...next.sources, source], items: { ...next.items, [source.id]: [] } };
  }

  const event = slimEvent({
    ...draft,
    id: `manual-${hashId(`${draft.title}${draft.start}${Math.random()}`)}`,
    uid: "",
    confidence: 1,
    origin: "manual",
  });

  const list = [...(next.items[source.id] || []), event];
  return {
    ...next,
    sources: next.sources.map((s) => (s.id === source.id ? { ...s, count: list.length } : s)),
    items: { ...next.items, [source.id]: list },
  };
}

export function setOverride(state, dedupeKey, patch) {
  const current = state.overrides[dedupeKey] || {};
  const merged = { ...current, ...patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === null || merged[key] === undefined || merged[key] === "") delete merged[key];
  }
  const overrides = { ...state.overrides };
  if (Object.keys(merged).length) overrides[dedupeKey] = merged;
  else delete overrides[dedupeKey];
  return { ...state, overrides };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/** Everything, normalised, deduped, with the reader's own edits applied. */
export function buildTimeline(state) {
  const all = [];

  for (const source of state.sources) {
    const list = state.items[source.id] || [];
    for (const raw of list) {
      const appointment = normalizeAppointment(raw, {
        sourceId: source.id,
        sourceKind: source.kind,
        sourceLabel: source.label,
      });
      if (appointment) all.push(appointment);
    }
  }

  const deduped = dedupeAppointments(all);

  return deduped
    .map((appointment) => {
      const override = state.overrides[appointment.dedupeKey];
      return override ? { ...appointment, ...override, edited: true } : appointment;
    })
    .filter((appointment) => !appointment.hidden)
    .sort((a, b) => a.start - b.start);
}

export function exportIcs(appointments) {
  return buildIcs(appointments, { calendarName: "Mijn Afspraken" });
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Agenda";
  }
}
