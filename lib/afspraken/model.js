/**
 * The appointment model: one shape for everything, wherever it came from.
 *
 * Also home to the two ideas the interface is built on — the three buckets
 * (voorbij / binnenkort / later) and the urgency scale, which turns "how far
 * away is this" into the colour and weight of a card. The further an
 * appointment drifts from now, the cooler and quieter it becomes; something
 * starting in twenty minutes should feel different from something in March.
 */

import { findBring, findPhone } from "./datetext.js";

export const MINUTE = 60000;
export const HOUR = 3600000;
export const DAY = 86400000;

export const BUCKETS = [
  { id: "voorbij", label: "Voorbij", hint: "Wat geweest is" },
  { id: "binnenkort", label: "Binnenkort", hint: "Nu en de komende dagen" },
  { id: "later", label: "Later", hint: "Verder vooruit" },
];

export const DEFAULT_SOON_DAYS = 7;

// ---------------------------------------------------------------------------
// Identity and normalisation
// ---------------------------------------------------------------------------

/** Small, stable, dependency-free hash (FNV-1a) for deterministic ids. */
export function hashId(value) {
  let hash = 0x811c9dc5;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const normaliseTitle = (title) =>
  String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Bring anything — an ICS event, an e-mail draft, a hand-typed entry — into the
 * canonical shape the rest of the app relies on.
 */
export function normalizeAppointment(raw, context = {}) {
  const { sourceId = "", sourceKind = "manual", sourceLabel = "" } = context;

  const start = Number(raw.start);
  if (!Number.isFinite(start)) return null;

  const allDay = Boolean(raw.allDay);
  let end = Number(raw.end);
  if (!Number.isFinite(end) || end < start) end = start + (allDay ? DAY : 30 * MINUTE);

  const title = String(raw.title || raw.summary || "").trim() || "Afspraak";
  const uid = String(raw.uid || "").trim();

  // Same meeting from two sources (a mail invite and the synced calendar) must
  // collapse to one row, so the key leans on UID when there is one.
  const dedupeKey = uid
    ? `uid:${uid}|${Math.round(start / MINUTE)}`
    : `t:${normaliseTitle(title)}|${Math.round(start / MINUTE)}`;

  return {
    id: raw.id ? `${sourceId}:${hashId(raw.id)}` : `${sourceId}:${hashId(dedupeKey)}`,
    dedupeKey,
    uid,
    seriesUid: raw.seriesUid || "",
    isSeries: Boolean(raw.isSeries),
    title,
    start,
    end,
    allDay,
    tzid: raw.tzid || null,
    location: String(raw.location || "").trim(),
    meetingUrl: String(raw.meetingUrl || "").trim(),
    url: String(raw.url || "").trim(),
    description: String(raw.description || "").trim(),
    notes: String(raw.notes || "").trim(),
    organizer: raw.organizer || null,
    people: Array.isArray(raw.people) ? raw.people.filter(Boolean) : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    // What to bring and who to call are usually buried in the description,
    // whether that came from a mail or from a calendar invitation.
    bring: Array.isArray(raw.bring) && raw.bring.length ? raw.bring : findBring(raw.description || ""),
    phone: raw.phone || findPhone(raw.description || ""),
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    status: String(raw.status || "CONFIRMED").toUpperCase(),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 1,
    matchedText: raw.matchedText || "",
    emailSubject: raw.emailSubject || "",
    origin: raw.origin || sourceKind,
    source: { id: sourceId, kind: sourceKind, label: sourceLabel || raw.sourceLabel || "" },
  };
}

/**
 * Collapse duplicates, preferring the richest copy.
 *
 * A calendar entry beats a guess from prose; between equals, the one carrying
 * more detail (a location, attendees, attachments) wins.
 */
export function dedupeAppointments(list) {
  const best = new Map();

  const weigh = (a) =>
    (a.confidence || 0) * 100 +
    (a.location ? 6 : 0) +
    (a.meetingUrl ? 4 : 0) +
    (a.people?.length ? 5 : 0) +
    (a.attachments?.length ? 5 : 0) +
    (a.description ? 3 : 0) +
    (a.uid ? 4 : 0);

  for (const appointment of list) {
    if (!appointment) continue;
    const existing = best.get(appointment.dedupeKey);
    if (!existing) {
      best.set(appointment.dedupeKey, appointment);
      continue;
    }
    const winner = weigh(appointment) > weigh(existing) ? appointment : existing;
    const loser = winner === appointment ? existing : appointment;
    // Keep anything the winner happens to be missing.
    best.set(appointment.dedupeKey, {
      ...winner,
      location: winner.location || loser.location,
      meetingUrl: winner.meetingUrl || loser.meetingUrl,
      description: winner.description || loser.description,
      people: winner.people?.length ? winner.people : loser.people,
      attachments: [...(winner.attachments || []), ...(loser.attachments || [])].filter(
        (a, i, arr) => arr.findIndex((b) => b.name === a.name && b.size === a.size) === i
      ),
      alsoFrom: [...new Set([...(winner.alsoFrom || []), loser.source?.label].filter(Boolean))],
    });
  }

  return [...best.values()];
}

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

/**
 * Flag appointments that overlap in time.
 *
 * Someone with a full week needs to see a double booking before they walk into
 * it. Cancelled and all-day entries do not count — an all-day birthday is not a
 * clash with a dentist visit.
 */
export function markConflicts(list) {
  const relevant = list
    .filter((a) => !a.allDay && a.status !== "CANCELLED")
    .sort((a, b) => a.start - b.start);

  const clashes = new Map();
  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i];
      const b = relevant[j];
      if (b.start >= a.end) break; // sorted: nothing further can overlap either
      if (a.dedupeKey === b.dedupeKey) continue;
      if (!clashes.has(a.id)) clashes.set(a.id, []);
      if (!clashes.has(b.id)) clashes.set(b.id, []);
      clashes.get(a.id).push(b.title);
      clashes.get(b.id).push(a.title);
    }
  }

  if (!clashes.size) return list;
  return list.map((a) => (clashes.has(a.id) ? { ...a, conflictsWith: clashes.get(a.id) } : a));
}

export function bucketOf(appointment, now = Date.now(), soonDays = DEFAULT_SOON_DAYS) {
  if (appointment.end <= now) return "voorbij";
  if (appointment.start <= now) return "binnenkort"; // running right now
  return appointment.start - now <= soonDays * DAY ? "binnenkort" : "later";
}

export function splitIntoBuckets(list, now = Date.now(), soonDays = DEFAULT_SOON_DAYS) {
  const buckets = { voorbij: [], binnenkort: [], later: [] };
  for (const appointment of list) buckets[bucketOf(appointment, now, soonDays)].push(appointment);
  // Past reads best newest-first; the future reads best soonest-first.
  buckets.voorbij.sort((a, b) => b.start - a.start);
  buckets.binnenkort.sort((a, b) => a.start - b.start);
  buckets.later.sort((a, b) => a.start - b.start);
  return buckets;
}

// ---------------------------------------------------------------------------
// Urgency — what colours a card
// ---------------------------------------------------------------------------

export const URGENCY_TIERS = {
  cancelled: { label: "Geannuleerd", order: 0 },
  now: { label: "Nu bezig", order: 1 },
  imminent: { label: "Zo meteen", order: 2 },
  today: { label: "Vandaag", order: 3 },
  tomorrow: { label: "Morgen", order: 4 },
  week: { label: "Deze week", order: 5 },
  month: { label: "Deze maand", order: 6 },
  far: { label: "Later", order: 7 },
  past: { label: "Geweest", order: 8 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Where an appointment sits on the urgency scale.
 *
 * `tier` picks the hue, `heat` (0–1) sets how strongly that hue is applied, and
 * `fade` (0–1) drains a past appointment as it recedes. Together they let the
 * background of every card answer "how soon?" before a word is read.
 */
export function urgencyOf(appointment, now = Date.now()) {
  const { start, end, status } = appointment;

  if (status === "CANCELLED") {
    return { tier: "cancelled", heat: 0, fade: 0.45, msUntil: start - now };
  }

  if (end <= now) {
    const age = now - end;
    return {
      tier: "past",
      heat: 0,
      fade: clamp(0.18 + (age / (60 * DAY)) * 0.62, 0.18, 0.8),
      msUntil: start - now,
    };
  }

  if (start <= now) return { tier: "now", heat: 1, fade: 0, msUntil: 0 };

  const msUntil = start - now;
  // A gentle curve: today burns bright, next week is warm, next month is calm.
  const heat = clamp(1 - Math.pow(clamp(msUntil / (30 * DAY), 0, 1), 0.35), 0, 1);

  let tier;
  if (msUntil <= 2 * HOUR) tier = "imminent";
  else if (isSameDay(start, now)) tier = "today";
  else if (isSameDay(start, now + DAY)) tier = "tomorrow";
  else if (msUntil <= 7 * DAY) tier = "week";
  else if (msUntil <= 31 * DAY) tier = "month";
  else tier = "far";

  return { tier, heat: Number(heat.toFixed(3)), fade: 0, msUntil };
}

export function isSameDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

// ---------------------------------------------------------------------------
// Dutch formatting
// ---------------------------------------------------------------------------

const NL = "nl-NL";
const pad = (n) => String(n).padStart(2, "0");

export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatTime(ms) {
  return new Date(ms).toLocaleTimeString(NL, { hour: "2-digit", minute: "2-digit" });
}

export function formatTimeRange(appointment) {
  if (appointment.allDay) return "Hele dag";
  const start = formatTime(appointment.start);
  const end = formatTime(appointment.end);
  return start === end ? start : `${start} – ${end}`;
}

export function formatDuration(ms) {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return days === 1 ? "1 dag" : `${days} dagen`;
  }
  if (!rest) return hours === 1 ? "1 uur" : `${hours} uur`;
  return `${hours} u ${rest} min`;
}

export function formatDayHeading(ms, now = Date.now()) {
  const day = startOfDay(ms);
  const today = startOfDay(now);
  const diffDays = Math.round((day - today) / DAY);

  if (diffDays === 0) return "Vandaag";
  if (diffDays === 1) return "Morgen";
  if (diffDays === 2) return "Overmorgen";
  if (diffDays === -1) return "Gisteren";
  if (diffDays === -2) return "Eergisteren";

  const sameYear = new Date(ms).getFullYear() === new Date(now).getFullYear();
  return new Date(ms).toLocaleDateString(NL, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatFullDate(ms) {
  return new Date(ms).toLocaleDateString(NL, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "over 20 minuten", "nu bezig", "3 dagen geleden". */
export function formatRelative(appointment, now = Date.now()) {
  const { start, end } = appointment;

  if (start <= now && end > now) {
    const left = end - now;
    return left < HOUR ? `nog ${Math.max(1, Math.round(left / MINUTE))} min` : "nu bezig";
  }

  const ahead = start > now;
  const delta = Math.abs(ahead ? start - now : now - end);

  const say = (value, [one, many]) => {
    const word = value === 1 ? one : many;
    return ahead ? `over ${value} ${word}` : `${value} ${word} geleden`;
  };

  if (delta < MINUTE) return ahead ? "zo meteen" : "net afgelopen";
  if (delta < HOUR) return say(Math.round(delta / MINUTE), ["minuut", "minuten"]);

  // Beyond half a day people count sleeps, not 24-hour blocks: an appointment
  // on Thursday morning is "over 3 dagen" on Monday evening, not "over 4", and
  // one tomorrow morning is "morgen", never "over 24 uur".
  const days = Math.abs(Math.round((startOfDay(ahead ? start : end) - startOfDay(now)) / DAY));
  if (delta < 12 * HOUR || days === 0) return say(Math.round(delta / HOUR), ["uur", "uur"]);
  if (days === 1) return ahead ? "morgen" : "gisteren";
  if (days < 14) return say(days, ["dag", "dagen"]);
  if (days < 60) return say(Math.round(days / 7), ["week", "weken"]);
  return say(Math.round(days / 30), ["maand", "maanden"]);
}

// ---------------------------------------------------------------------------
// Grouping and search
// ---------------------------------------------------------------------------

export function groupByDay(list, now = Date.now()) {
  const groups = new Map();
  for (const appointment of list) {
    const key = dayKey(appointment.start);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        dayMs: startOfDay(appointment.start),
        label: formatDayHeading(appointment.start, now),
        items: [],
      });
    }
    groups.get(key).items.push(appointment);
  }
  return [...groups.values()];
}

export function matchesQuery(appointment, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    appointment.title,
    appointment.location,
    appointment.description,
    appointment.notes,
    appointment.emailSubject,
    appointment.organizer?.name,
    appointment.organizer?.email,
    appointment.source?.label,
    ...(appointment.people || []).flatMap((p) => [p.name, p.email]),
    ...(appointment.attachments || []).map((a) => a.name),
    ...(appointment.categories || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Every word has to appear somewhere, in any order.
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** A maps link that works on every platform. */
export function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function initialsOf(person) {
  const name = String(person?.name || person?.email || "?").trim();
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
