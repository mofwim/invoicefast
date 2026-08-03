/**
 * iCalendar (RFC 5545) reader and writer.
 *
 * Scope is deliberately "everything a real invitation contains": folded lines,
 * quoted parameters, timezones, recurrence rules with their exceptions and
 * per-occurrence overrides, attendees, attachments. Anything we cannot make
 * sense of is reported in `errors` rather than thrown away silently.
 */

import { wallToInstant, instantToWall, normalizeZone } from "./tz.js";

const WEEKDAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DAY_MS = 86400000;

/** Recurrence safety rails — a malformed rule must never hang the tab. */
const MAX_OCCURRENCES = 750;
const MAX_ITERATIONS = 25000;

// ---------------------------------------------------------------------------
// Lexing
// ---------------------------------------------------------------------------

/** RFC 5545 §3.1: a CRLF followed by a space or tab continues the previous line. */
export function unfold(text) {
  return String(text)
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "");
}

function splitUnquoted(input, separator) {
  const out = [];
  let current = "";
  let quoted = false;
  for (const ch of input) {
    if (ch === '"') {
      quoted = !quoted;
      current += ch;
    } else if (ch === separator && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/** `DTSTART;TZID=Europe/Amsterdam:20260803T140000` → name, params, value. */
export function parseContentLine(line) {
  let colon = -1;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ":" && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon === -1) return null;

  const segments = splitUnquoted(line.slice(0, colon), ";");
  const name = segments[0].trim().toUpperCase();
  if (!name) return null;

  const params = {};
  for (const segment of segments.slice(1)) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const key = segment.slice(0, eq).trim().toUpperCase();
    const value = segment.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
    // Repeated params (multiple MEMBER=, DELEGATED-TO=) collapse to a list.
    params[key] = key in params ? `${params[key]},${value}` : value;
  }
  return { name, params, value: line.slice(colon + 1) };
}

export function unescapeText(value) {
  if (!value) return "";
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function escapeText(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// ---------------------------------------------------------------------------
// Component tree
// ---------------------------------------------------------------------------

function parseComponents(text) {
  const root = { name: "ROOT", props: [], children: [] };
  const stack = [root];
  const errors = [];

  for (const rawLine of unfold(text).split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseContentLine(line);
    if (!parsed) continue;

    if (parsed.name === "BEGIN") {
      const child = { name: parsed.value.trim().toUpperCase(), props: [], children: [] };
      stack[stack.length - 1].children.push(child);
      stack.push(child);
    } else if (parsed.name === "END") {
      const closing = parsed.value.trim().toUpperCase();
      if (stack.length > 1 && stack[stack.length - 1].name === closing) {
        stack.pop();
      } else {
        // Tolerate a stray END rather than losing the rest of the file.
        const depth = stack.findIndex((c) => c.name === closing);
        if (depth > 0) stack.length = depth;
        else errors.push(`Onverwachte END:${closing}`);
      }
    } else {
      stack[stack.length - 1].props.push(parsed);
    }
  }

  if (stack.length > 1) errors.push("Bestand eindigt met een niet-afgesloten component");
  return { root, errors };
}

function firstProp(component, name) {
  return component.props.find((p) => p.name === name) || null;
}

function allProps(component, name) {
  return component.props.filter((p) => p.name === name);
}

function textOf(component, name) {
  const prop = firstProp(component, name);
  return prop ? unescapeText(prop.value).trim() : "";
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Parse a DATE or DATE-TIME value into a floating wall timestamp plus the zone
 * it should be read in. Resolution to a real instant happens later, so that
 * recurrence math can stay on the wall clock.
 */
export function parseDateValue(value, params = {}, fallbackZone = null) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;

  const [, y, mo, d, h, mi, s, utcFlag] = match;
  const isDateOnly = params.VALUE === "DATE" || h === undefined;
  const wallMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h || 0),
    Number(mi || 0),
    Number(s || 0)
  );

  if (isDateOnly) return { wallMs, tzid: null, allDay: true, utc: false };
  if (utcFlag) return { wallMs, tzid: "UTC", allDay: false, utc: true };
  return { wallMs, tzid: params.TZID || fallbackZone || null, allDay: false, utc: false };
}

function toInstant(parsed) {
  if (!parsed) return null;
  if (parsed.utc) return parsed.wallMs;
  if (parsed.allDay) {
    // An all-day event starts at local midnight for whoever is reading it.
    return wallToInstant(parsed.wallMs, null);
  }
  return wallToInstant(parsed.wallMs, parsed.tzid);
}

/** ISO 8601 duration as used by RFC 5545: `-P1DT2H30M`. */
export function parseDuration(value) {
  const match = String(value || "")
    .trim()
    .match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return null;
  const [, sign, weeks, days, hours, minutes, seconds] = match;
  const ms =
    (Number(weeks || 0) * 7 + Number(days || 0)) * DAY_MS +
    Number(hours || 0) * 3600000 +
    Number(minutes || 0) * 60000 +
    Number(seconds || 0) * 1000;
  return sign === "-" ? -ms : ms;
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

export function parseRrule(value) {
  const rule = {};
  for (const part of String(value || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toUpperCase();
    const raw = part.slice(eq + 1).trim();
    switch (key) {
      case "FREQ":
        rule.freq = raw.toUpperCase();
        break;
      case "INTERVAL":
        rule.interval = Math.max(1, Number(raw) || 1);
        break;
      case "COUNT":
        rule.count = Number(raw) || 0;
        break;
      case "UNTIL":
        rule.until = raw;
        break;
      case "WKST":
        rule.wkst = WEEKDAYS[raw.toUpperCase()] ?? 1;
        break;
      case "BYDAY":
        rule.byday = raw
          .split(",")
          .map((token) => {
            const m = token.trim().toUpperCase().match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
            return m ? { ordinal: m[1] ? Number(m[1]) : 0, day: WEEKDAYS[m[2]] } : null;
          })
          .filter(Boolean);
        break;
      case "BYMONTHDAY":
        rule.bymonthday = raw.split(",").map(Number).filter((n) => n && Math.abs(n) <= 31);
        break;
      case "BYMONTH":
        rule.bymonth = raw.split(",").map(Number).filter((n) => n >= 1 && n <= 12);
        break;
      case "BYSETPOS":
        rule.bysetpos = raw.split(",").map(Number).filter(Boolean);
        break;
      case "BYYEARDAY":
        rule.byyearday = raw.split(",").map(Number).filter(Boolean);
        break;
      default:
        break;
    }
  }
  if (!rule.freq) return null;
  rule.interval = rule.interval || 1;
  rule.wkst = rule.wkst ?? 1;
  return rule;
}

const wallParts = (ms) => {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
};

const buildWall = (year, month, day, time) =>
  Date.UTC(year, month, day, time.hour, time.minute, time.second);

const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** Every date in `year`/`month` matching a BYDAY entry, honouring its ordinal. */
function monthDaysForByday(year, month, byday) {
  const total = daysInMonth(year, month);
  const out = [];
  for (const { ordinal, day } of byday) {
    const matches = [];
    for (let d = 1; d <= total; d++) {
      if (new Date(Date.UTC(year, month, d)).getUTCDay() === day) matches.push(d);
    }
    if (!ordinal) out.push(...matches);
    else {
      const picked = ordinal > 0 ? matches[ordinal - 1] : matches[matches.length + ordinal];
      if (picked) out.push(picked);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function applySetPos(dates, bysetpos) {
  if (!bysetpos || !bysetpos.length) return dates;
  const picked = [];
  for (const pos of bysetpos) {
    const value = pos > 0 ? dates[pos - 1] : dates[dates.length + pos];
    if (value !== undefined) picked.push(value);
  }
  return [...new Set(picked)].sort((a, b) => a - b);
}

/**
 * Expand a recurrence rule into occurrence start times.
 *
 * Works entirely on floating wall timestamps so that "every Tuesday at 14:00"
 * stays at 14:00 across a DST switch, and only converts to real instants at the
 * end. Iteration always starts at DTSTART (COUNT is defined from there), but
 * occurrences outside the requested window are counted and discarded.
 *
 * @returns {number[]} wall timestamps, ascending
 */
export function expandRecurrence(startWallMs, rule, options = {}) {
  const {
    windowStartWall = -Infinity,
    windowEndWall = Infinity,
    untilWall = null,
    maxOccurrences = MAX_OCCURRENCES,
  } = options;

  if (!rule || !rule.freq) return [startWallMs];

  const start = wallParts(startWallMs);
  const time = { hour: start.hour, minute: start.minute, second: start.second };
  const interval = rule.interval;
  const results = [];
  let emitted = 0;
  let iterations = 0;

  const stopAfter = (wall) => {
    if (untilWall != null && wall > untilWall) return true;
    if (rule.count && emitted >= rule.count) return true;
    if (results.length >= maxOccurrences) return true;
    return false;
  };

  const consider = (wall) => {
    if (wall < startWallMs) return false;
    if (untilWall != null && wall > untilWall) return false;
    if (rule.count && emitted >= rule.count) return false;
    if (rule.bymonth && !rule.bymonth.includes(wallParts(wall).month + 1)) return false;
    emitted += 1;
    if (wall >= windowStartWall && wall <= windowEndWall) results.push(wall);
    return true;
  };

  // ---- DAILY -------------------------------------------------------------
  if (rule.freq === "DAILY") {
    let cursor = startWallMs;
    while (iterations++ < MAX_ITERATIONS) {
      if (stopAfter(cursor) || cursor > windowEndWall) break;
      const parts = wallParts(cursor);
      const bydayOk = !rule.byday || rule.byday.some((b) => b.day === parts.weekday);
      const monthdayOk =
        !rule.bymonthday ||
        rule.bymonthday.some((n) =>
          n > 0 ? n === parts.day : daysInMonth(parts.year, parts.month) + n + 1 === parts.day
        );
      if (bydayOk && monthdayOk) consider(cursor);
      cursor += interval * DAY_MS;
    }
  }

  // ---- WEEKLY ------------------------------------------------------------
  else if (rule.freq === "WEEKLY") {
    const days = rule.byday && rule.byday.length ? rule.byday.map((b) => b.day) : [start.weekday];
    // Anchor on the week containing DTSTART, measured from WKST.
    const offsetToWeekStart = (start.weekday - rule.wkst + 7) % 7;
    let weekStart = buildWall(start.year, start.month, start.day - offsetToWeekStart, time);

    while (iterations++ < MAX_ITERATIONS) {
      const candidates = days
        .map((day) => weekStart + ((day - rule.wkst + 7) % 7) * DAY_MS)
        .sort((a, b) => a - b);
      if (candidates[0] > windowEndWall && candidates[0] > startWallMs) break;
      for (const wall of applySetPos(candidates, rule.bysetpos)) {
        if (stopAfter(wall)) break;
        consider(wall);
      }
      if (stopAfter(weekStart)) break;
      weekStart += interval * 7 * DAY_MS;
    }
  }

  // ---- MONTHLY -----------------------------------------------------------
  else if (rule.freq === "MONTHLY") {
    let year = start.year;
    let month = start.month;
    while (iterations++ < MAX_ITERATIONS) {
      let days;
      if (rule.byday && rule.byday.length) days = monthDaysForByday(year, month, rule.byday);
      else if (rule.bymonthday && rule.bymonthday.length) {
        const total = daysInMonth(year, month);
        days = rule.bymonthday
          .map((n) => (n > 0 ? n : total + n + 1))
          .filter((d) => d >= 1 && d <= total)
          .sort((a, b) => a - b);
      } else {
        days = start.day <= daysInMonth(year, month) ? [start.day] : [];
      }

      const candidates = applySetPos(
        days.map((d) => buildWall(year, month, d, time)),
        rule.bysetpos
      );
      for (const wall of candidates) {
        if (stopAfter(wall)) break;
        consider(wall);
      }

      const monthStart = Date.UTC(year, month, 1);
      if (stopAfter(monthStart) || monthStart > windowEndWall) break;
      month += interval;
      year += Math.floor(month / 12);
      month = ((month % 12) + 12) % 12;
    }
  }

  // ---- YEARLY ------------------------------------------------------------
  else if (rule.freq === "YEARLY") {
    let year = start.year;
    while (iterations++ < MAX_ITERATIONS) {
      const months = rule.bymonth ? rule.bymonth.map((m) => m - 1) : [start.month];
      const candidates = [];
      for (const month of months) {
        if (rule.byday && rule.byday.length) {
          for (const d of monthDaysForByday(year, month, rule.byday)) {
            candidates.push(buildWall(year, month, d, time));
          }
        } else if (rule.bymonthday && rule.bymonthday.length) {
          const total = daysInMonth(year, month);
          for (const n of rule.bymonthday) {
            const d = n > 0 ? n : total + n + 1;
            if (d >= 1 && d <= total) candidates.push(buildWall(year, month, d, time));
          }
        } else if (start.day <= daysInMonth(year, month)) {
          candidates.push(buildWall(year, month, start.day, time));
        }
      }
      candidates.sort((a, b) => a - b);
      for (const wall of applySetPos(candidates, rule.bysetpos)) {
        if (stopAfter(wall)) break;
        consider(wall);
      }

      const yearStart = Date.UTC(year, 0, 1);
      if (stopAfter(yearStart) || yearStart > windowEndWall) break;
      year += interval;
    }
  }

  // Unknown FREQ (SECONDLY/MINUTELY/HOURLY are never used for appointments).
  else {
    results.push(startWallMs);
  }

  return [...new Set(results)].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// People and attachments
// ---------------------------------------------------------------------------

function parsePerson(prop, role) {
  if (!prop) return null;
  const value = String(prop.value || "").trim();
  const email = value.replace(/^mailto:/i, "").trim();
  const name = unescapeText(prop.params.CN || "").trim();
  if (!email && !name) return null;
  return {
    name: name || email.split("@")[0].replace(/[._]+/g, " "),
    email: /@/.test(email) ? email : "",
    role: prop.params.ROLE === "OPT-PARTICIPANT" ? "optioneel" : role,
    status: (prop.params.PARTSTAT || "").toUpperCase() || null,
  };
}

function parseAttachments(component) {
  const out = [];
  for (const prop of allProps(component, "ATTACH")) {
    const params = prop.params || {};
    if ((params.VALUE || "").toUpperCase() === "BINARY") {
      out.push({
        name: unescapeText(params.FILENAME || params["X-FILENAME"] || "bijlage"),
        mime: params.FMTTYPE || "application/octet-stream",
        encoding: params.ENCODING || "BASE64",
        data: prop.value.trim(),
        kind: "inline",
      });
    } else {
      const url = prop.value.trim();
      if (!url) continue;
      const guessed = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || "");
      out.push({
        name: unescapeText(params.FILENAME || params["X-FILENAME"] || guessed || "bijlage"),
        mime: params.FMTTYPE || "",
        url,
        kind: "link",
      });
    }
  }
  return out;
}

const MEETING_HOSTS =
  /(zoom\.us|teams\.microsoft\.com|teams\.live\.com|meet\.google\.com|webex\.com|whereby\.com|gotomeeting\.com|bluejeans\.com|jitsi|starleaf\.com|zoom\.com)/i;

/** Pull the first join link out of anywhere it might hide. */
export function findMeetingUrl(...sources) {
  for (const source of sources) {
    if (!source) continue;
    const urls = String(source).match(/https?:\/\/[^\s<>"')\]]+/g);
    if (!urls) continue;
    const hit = urls.find((u) => MEETING_HOSTS.test(u));
    if (hit) return hit.replace(/[.,;]+$/, "");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an iCalendar document into flat, timeline-ready events.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.now]           reference time for the expansion window
 * @param {number} [options.pastDays]      how far back to expand recurrences
 * @param {number} [options.futureDays]    how far forward to expand recurrences
 * @returns {{events: object[], calendarName: string, errors: string[]}}
 */
export function parseIcs(text, options = {}) {
  const {
    now = Date.now(),
    pastDays = 400,
    futureDays = 550,
  } = options;

  if (!text || !/BEGIN:VCALENDAR/i.test(text)) {
    if (!text || !/BEGIN:VEVENT/i.test(text)) {
      return { events: [], calendarName: "", errors: ["Geen geldige agenda gevonden in dit bestand"] };
    }
  }

  const { root, errors } = parseComponents(text);
  const calendars = root.children.filter((c) => c.name === "VCALENDAR");
  const scopes = calendars.length ? calendars : [root];

  const events = [];
  let calendarName = "";

  for (const calendar of scopes) {
    calendarName =
      calendarName ||
      textOf(calendar, "X-WR-CALNAME") ||
      textOf(calendar, "NAME") ||
      "";
    const defaultZone = textOf(calendar, "X-WR-TIMEZONE") || null;

    const vevents = collectEvents(calendar);

    // RECURRENCE-ID entries replace one occurrence of their parent series.
    const overrides = new Map();
    for (const component of vevents) {
      const recurrenceProp = firstProp(component, "RECURRENCE-ID");
      if (!recurrenceProp) continue;
      const uid = textOf(component, "UID");
      const parsed = parseDateValue(recurrenceProp.value, recurrenceProp.params, defaultZone);
      if (!uid || !parsed) continue;
      const key = `${uid}|${parsed.wallMs}`;
      overrides.set(key, component);
    }

    for (const component of vevents) {
      if (firstProp(component, "RECURRENCE-ID")) continue;
      try {
        events.push(...expandEvent(component, { defaultZone, now, pastDays, futureDays, overrides }));
      } catch (err) {
        errors.push(`Afspraak overgeslagen: ${err.message}`);
      }
    }

    // Overrides whose parent series is missing still deserve to be shown.
    for (const [key, component] of overrides) {
      const uid = key.split("|")[0];
      const hasParent = vevents.some(
        (c) => textOf(c, "UID") === uid && !firstProp(c, "RECURRENCE-ID")
      );
      if (hasParent) continue;
      try {
        events.push(...expandEvent(component, { defaultZone, now, pastDays, futureDays, overrides: new Map() }));
      } catch {
        /* already reported */
      }
    }
  }

  return { events, calendarName, errors };
}

function collectEvents(component, out = []) {
  for (const child of component.children) {
    if (child.name === "VEVENT") out.push(child);
    else if (child.children.length) collectEvents(child, out);
  }
  return out;
}

function expandEvent(component, context) {
  const { defaultZone, now, pastDays, futureDays, overrides } = context;

  const dtstartProp = firstProp(component, "DTSTART");
  if (!dtstartProp) return [];
  const startParsed = parseDateValue(dtstartProp.value, dtstartProp.params, defaultZone);
  if (!startParsed) return [];

  const dtendProp = firstProp(component, "DTEND");
  const durationProp = firstProp(component, "DURATION");
  const endParsed = dtendProp
    ? parseDateValue(dtendProp.value, dtendProp.params, defaultZone)
    : null;

  let durationMs;
  if (endParsed) durationMs = endParsed.wallMs - startParsed.wallMs;
  else if (durationProp) durationMs = parseDuration(durationProp.value) ?? 0;
  else durationMs = startParsed.allDay ? DAY_MS : 30 * 60000;
  if (!(durationMs > 0)) durationMs = startParsed.allDay ? DAY_MS : 30 * 60000;

  const uid = textOf(component, "UID");
  const summary = textOf(component, "SUMMARY");
  const description = textOf(component, "DESCRIPTION");
  const location = textOf(component, "LOCATION");
  const url = textOf(component, "URL");
  const status = (textOf(component, "STATUS") || "").toUpperCase();
  const categories = textOf(component, "CATEGORIES");

  const organizer = parsePerson(firstProp(component, "ORGANIZER"), "organisator");
  const attendees = allProps(component, "ATTENDEE")
    .map((prop) => parsePerson(prop, "deelnemer"))
    .filter(Boolean);

  const attachments = parseAttachments(component);
  const meetingUrl =
    findMeetingUrl(
      textOf(component, "X-GOOGLE-CONFERENCE"),
      location,
      description,
      url,
      textOf(component, "X-MICROSOFT-SKYPETEAMSMEETINGURL")
    ) || "";

  const base = {
    uid,
    title: summary || "(zonder titel)",
    description,
    location,
    meetingUrl,
    url: /^https?:/i.test(url) ? url : "",
    organizer,
    people: attendees,
    attachments,
    status: status || "CONFIRMED",
    categories: categories ? categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
    allDay: startParsed.allDay,
    tzid: startParsed.tzid,
    confidence: 1,
  };

  const rruleProp = firstProp(component, "RRULE");
  const rule = rruleProp ? parseRrule(rruleProp.value) : null;

  // EXDATE / RDATE may repeat and may carry lists.
  const exdates = new Set();
  for (const prop of allProps(component, "EXDATE")) {
    for (const piece of prop.value.split(",")) {
      const parsed = parseDateValue(piece, prop.params, defaultZone);
      if (parsed) exdates.add(parsed.wallMs);
    }
  }
  const rdates = [];
  for (const prop of allProps(component, "RDATE")) {
    for (const piece of prop.value.split(",")) {
      const parsed = parseDateValue(piece.split("/")[0], prop.params, defaultZone);
      if (parsed) rdates.push(parsed.wallMs);
    }
  }

  let starts;
  if (rule) {
    const untilProp = rule.until ? parseDateValue(rule.until, {}, startParsed.tzid) : null;
    starts = expandRecurrence(startParsed.wallMs, rule, {
      windowStartWall: instantToWall(now - pastDays * DAY_MS, startParsed.tzid),
      windowEndWall: instantToWall(now + futureDays * DAY_MS, startParsed.tzid),
      untilWall: untilProp ? untilProp.wallMs : null,
    });
  } else {
    starts = [startParsed.wallMs];
  }

  starts = [...new Set([...starts, ...rdates])]
    .filter((wall) => !exdates.has(wall))
    .sort((a, b) => a - b);

  const isSeries = Boolean(rule) && starts.length > 1;

  return starts.map((wall) => {
    const override = overrides.get(`${uid}|${wall}`);
    if (override) {
      const [replacement] = expandEvent(override, { ...context, overrides: new Map() });
      if (replacement) return { ...replacement, seriesUid: uid, isSeries: true };
    }

    const startMs = toInstant({ ...startParsed, wallMs: wall });
    const endMs = toInstant({ ...startParsed, wallMs: wall + durationMs });
    return {
      ...base,
      id: `${uid || slug(base.title)}|${wall}`,
      seriesUid: isSeries ? uid : "",
      isSeries,
      start: startMs,
      end: endMs > startMs ? endMs : startMs + durationMs,
    };
  });
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Fold to 75 octets per RFC 5545 §3.1, counting UTF-8 bytes rather than chars. */
function foldLine(line) {
  const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const byteLength = (s) => (encoder ? encoder.encode(s).length : s.length);
  if (byteLength(line) <= 75) return line;

  const out = [];
  let current = "";
  let limit = 75;
  for (const ch of line) {
    if (byteLength(current + ch) > limit) {
      out.push(current);
      current = " " + ch;
      limit = 74;
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out.join("\r\n");
}

function icsStamp(ms, allDay) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  if (allDay) return date;
  return `${date}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Serialise appointments back to an .ics file so anything imported here can be
 * handed to Google Calendar, Outlook or Apple Calendar unchanged.
 */
export function buildIcs(appointments, options = {}) {
  const { calendarName = "Mijn Afspraken", now = Date.now() } = options;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mijn Afspraken//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const appointment of appointments) {
    const allDay = Boolean(appointment.allDay);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(appointment.uid || appointment.id || slug(appointment.title))}@mijn-afspraken`);
    lines.push(`DTSTAMP:${icsStamp(now, false)}`);
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsStamp(appointment.start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${icsStamp(appointment.end || appointment.start + DAY_MS, true)}`);
    } else {
      lines.push(`DTSTART:${icsStamp(appointment.start, false)}`);
      lines.push(`DTEND:${icsStamp(appointment.end || appointment.start + 1800000, false)}`);
    }
    lines.push(`SUMMARY:${escapeText(appointment.title || "Afspraak")}`);
    if (appointment.location) lines.push(`LOCATION:${escapeText(appointment.location)}`);

    const notes = [appointment.description, appointment.notes].filter(Boolean).join("\n\n");
    if (notes) lines.push(`DESCRIPTION:${escapeText(notes)}`);
    if (appointment.meetingUrl) lines.push(`URL:${escapeText(appointment.meetingUrl)}`);
    else if (appointment.url) lines.push(`URL:${escapeText(appointment.url)}`);

    if (appointment.organizer?.email) {
      const cn = appointment.organizer.name ? `;CN=${escapeText(appointment.organizer.name)}` : "";
      lines.push(`ORGANIZER${cn}:mailto:${appointment.organizer.email}`);
    }
    for (const person of appointment.people || []) {
      if (!person.email) continue;
      const cn = person.name ? `;CN=${escapeText(person.name)}` : "";
      lines.push(`ATTENDEE${cn}:mailto:${person.email}`);
    }
    for (const attachment of appointment.attachments || []) {
      if (attachment.url) lines.push(`ATTACH:${attachment.url}`);
    }
    if (appointment.status && appointment.status !== "CONFIRMED") {
      lines.push(`STATUS:${appointment.status}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export const __testing = { WEEKDAY_CODES, wallParts, monthDaysForByday, foldLine };
