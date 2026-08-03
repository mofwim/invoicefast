/**
 * Reading appointments out of ordinary prose (Dutch and English).
 *
 * Confirmation mails from a dentist, a garage or a municipality rarely carry a
 * calendar attachment — the appointment only exists as a sentence. This module
 * finds the date, the time, how long it lasts and where it happens, and reports
 * how sure it is so the interface can ask the reader to confirm the shaky ones.
 */

const MONTHS = {
  januari: 1, jan: 1, january: 1,
  februari: 2, febr: 2, feb: 2, february: 2,
  maart: 3, mrt: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  augustus: 8, aug: 8, august: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10, october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const WEEKDAY_WORDS =
  "maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday";

const MONTH_ALTERNATION = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

/** Words that mean "this really is an appointment", used to rank candidates. */
const INTENT_WORDS =
  /\b(afspraak|afspraken|afgesproken|uitnodiging|uitgenodigd|bevestiging|bevestigen|gereserveerd|reservering|boeking|consult|controle|intake|spreekuur|behandeling|onderzoek|gesprek|vergadering|overleg|bijeenkomst|sessie|bezoek|zitting|keuring|ophalen|levering|appointment|meeting|invitation|invited|confirmed|confirmation|booking|reserved|reservation|scheduled|session|consultation|interview|call|visit)\b/i;

const DATE_HINTS = /\b(datum|wanneer|op\s+datum|date|when|day)\b/i;
const TIME_HINTS = /\b(tijd|tijdstip|aanvang|start|begint|om|time|at|starts)\b/i;

const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_PATTERNS = [
  // 2026-08-03
  {
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    read: (m) => ({ year: +m[1], month: +m[2], day: +m[3], explicitYear: true }),
  },
  // 3 augustus 2026 / 3e aug / 3rd August 2026
  {
    re: new RegExp(
      `\\b(?:(?:${WEEKDAY_WORDS})[a-z]*\\.?,?\\s+)?(\\d{1,2})(?:e|ste|de|th|st|nd|rd)?\\s+(${MONTH_ALTERNATION})\\.?(?:\\s+(\\d{4}))?\\b`,
      "gi"
    ),
    read: (m) => ({
      day: +m[1],
      month: MONTHS[m[2].toLowerCase()],
      year: m[3] ? +m[3] : null,
      explicitYear: Boolean(m[3]),
    }),
  },
  // August 3, 2026 / aug 3
  {
    re: new RegExp(
      `\\b(?:(?:${WEEKDAY_WORDS})[a-z]*\\.?,?\\s+)?(${MONTH_ALTERNATION})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
      "gi"
    ),
    read: (m) => ({
      day: +m[2],
      month: MONTHS[m[1].toLowerCase()],
      year: m[3] ? +m[3] : null,
      explicitYear: Boolean(m[3]),
    }),
  },
  // 03-08-2026 / 3/8/2026 / 3-8 — day first, the Dutch convention
  {
    re: /\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/g,
    read: (m) => readNumericDate(m[1], m[2], m[3]),
  },
  // 03.08.2026 — only with a year, so clock times are not misread as dates
  {
    re: /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g,
    read: (m) => readNumericDate(m[1], m[2], m[3]),
  },
];

function readNumericDate(a, b, c) {
  let day = +a;
  let month = +b;
  // 12/25 can only be month-first; otherwise assume day-first (NL/EU).
  if (day <= 12 && month > 12) {
    day = +b;
    month = +a;
  }
  if (month > 12 || day > 31 || day < 1 || month < 1) return null;
  let year = null;
  if (c) year = c.length === 2 ? 2000 + +c : +c;
  return { day, month, year, explicitYear: Boolean(c) };
}

/** Pick the year that puts an undated day nearest to the reference moment. */
function inferYear(day, month, referenceMs) {
  const ref = new Date(referenceMs);
  const candidates = [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1];
  let best = null;
  for (const year of candidates) {
    const ms = new Date(year, month - 1, day, 12).getTime();
    const delta = ms - referenceMs;
    // Strongly prefer the future: a confirmation mail is about what is coming.
    const score = delta >= -14 * DAY_MS ? Math.abs(delta) : Math.abs(delta) * 6;
    if (!best || score < best.score) best = { year, score };
  }
  return best.year;
}

function isRealDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function findDates(text, referenceMs = Date.now()) {
  const found = [];
  const taken = [];

  const overlaps = (start, end) => taken.some(([s, e]) => start < e && end > s);

  for (const pattern of DATE_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;

      const read = pattern.read(match);
      if (!read || !read.month || !read.day) continue;
      const year = read.year || inferYear(read.day, read.month, referenceMs);
      if (!isRealDate(year, read.month, read.day)) continue;

      taken.push([start, end]);
      found.push({
        year,
        month: read.month,
        day: read.day,
        explicitYear: read.explicitYear,
        index: start,
        end,
        text: match[0],
      });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

const TIME_PATTERNS = [
  { re: /\b(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/gi, h: 1, m: 2, ampm: 3 },
  { re: /\b(\d{1,2})\s*u(?:ur)?\s*(\d{2})\b/gi, h: 1, m: 2 },
  { re: /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/gi, h: 1, ampm: 2 },
  { re: /\b(\d{1,2})\s+uur\b/gi, h: 1 },
];

export function findTimes(text, blocked = []) {
  const found = [];
  const taken = blocked.slice();
  const overlaps = (start, end) => taken.some(([s, e]) => start < e && end > s);

  for (const pattern of TIME_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;

      let hour = Number(match[pattern.h]);
      const minute = pattern.m ? Number(match[pattern.m]) : 0;
      const meridiem = pattern.ampm ? (match[pattern.ampm] || "").toLowerCase().replace(/\./g, "") : "";

      if (!Number.isFinite(hour) || minute > 59) continue;
      if (meridiem === "pm" && hour < 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      if (hour > 23) continue;
      // A bare "5" only counts as a time when something marks it as one.
      if (!pattern.m && !meridiem && !/uur/i.test(match[0])) continue;

      taken.push([start, end]);
      found.push({ hour, minute, index: start, end, text: match[0], explicit: Boolean(pattern.m || meridiem) });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

const RANGE_JOINER = /^\s*(?:-|–|—|tot en met|tot|t\/m|until|till|to|through|en\s+eindigt\s+om)\s*$/i;

/** Duration written out in words: "(30 minuten)", "duurt 1,5 uur", "90 min". */
export function findDuration(text) {
  const hours = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:uur|uren|hours?|hrs?|h)\b/i);
  const minutes = text.match(/\b(\d{1,3})\s*(?:minuten|minuut|minutes?|mins?|min)\b/i);
  let ms = 0;
  if (hours) ms += Math.round(parseFloat(hours[1].replace(",", ".")) * 3600000);
  if (minutes) ms += Number(minutes[1]) * 60000;
  if (ms <= 0 || ms > 12 * 3600000) return null;
  return ms;
}

// ---------------------------------------------------------------------------
// Location and people
// ---------------------------------------------------------------------------

const LOCATION_LABELS =
  /^\s*(?:locatie|lokatie|plaats|plek|adres|waar|vestiging|praktijk|kamer|ruimte|zaal|afdeling|gebouw|location|where|address|venue|room|building|office)\s*[:\-–]\s*(.+)$/i;

const DUTCH_POSTCODE = /\b\d{4}\s?[A-Z]{2}\b/;

export function findLocation(text) {
  const lines = String(text || "").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(LOCATION_LABELS);
    if (match) {
      const value = match[1].trim().replace(/\s{2,}/g, " ");
      if (value && value.length < 200) return value;
    }
  }

  // No label — a line carrying a Dutch postcode is almost always the address.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 4 && line.length < 160 && DUTCH_POSTCODE.test(line)) {
      const previous = (lines[i - 1] || "").trim();
      const isStreet = /\d/.test(previous) && previous.length < 80 && !/^\W*$/.test(previous);
      return isStreet ? `${previous}, ${line}` : line;
    }
  }

  return "";
}

const PERSON_LABELS =
  /^\s*(?:met|bij|behandelaar|arts|dokter|contactpersoon|aanspreekpunt|adviseur|docent|with|who|host|organiser|organizer|contact)\s*[:\-–]\s*(.+)$/i;

export function findPeople(text) {
  const people = [];
  const seen = new Set();

  const push = (name, email) => {
    const key = (email || name || "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    people.push({ name: name || email.split("@")[0].replace(/[._]+/g, " "), email: email || "", role: "deelnemer" });
  };

  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(PERSON_LABELS);
    if (match) {
      const value = match[1].trim();
      if (value && value.length < 120) push(value.replace(/[.;,]$/, ""), "");
    }
  }

  // "met dr. Jansen" / "bij mevrouw De Vries" inside a sentence.
  const inline =
    /\b(?:met|bij|door|with|by)\s+((?:dr|drs|mr|mevr|mevrouw|meneer|dhr|ir|ing|prof|mrs|ms|miss)\.?\s+[A-Z][\p{L}'’-]+(?:\s+(?:van|de|der|den|van der|van den)?\s*[A-Z][\p{L}'’-]+)?)/gu;
  let match;
  while ((match = inline.exec(text))) push(match[1].trim(), "");

  const emails = String(text || "").match(/\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g) || [];
  for (const email of emails.slice(0, 6)) {
    if (/noreply|no-reply|donotreply|geenantwoord/i.test(email)) continue;
    push("", email.toLowerCase());
  }

  return people.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------

function scoreCandidate({ date, time, text, dateIndex }) {
  let score = 0.35;
  if (time) score += 0.25;
  if (date.explicitYear) score += 0.1;
  if (time && Math.abs(time.index - dateIndex) < 60) score += 0.12;

  // Look at the sentence around the date rather than the whole document.
  const context = text.slice(Math.max(0, dateIndex - 160), dateIndex + 200);
  if (INTENT_WORDS.test(context)) score += 0.14;
  if (DATE_HINTS.test(context)) score += 0.05;
  if (time && TIME_HINTS.test(context)) score += 0.05;

  return Math.min(0.95, Number(score.toFixed(2)));
}

/**
 * Extract appointment candidates from free text.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.now]        reference for inferring missing years
 * @param {string} [options.title]      fallback title (e.g. the mail subject)
 * @param {number} [options.max]        how many candidates to return
 * @returns {object[]} candidates sorted by confidence
 */
export function extractAppointments(text, options = {}) {
  const source = String(text || "");
  if (!source.trim()) return [];

  const { now = Date.now(), title = "", max = 6 } = options;

  const dates = findDates(source, now);
  if (!dates.length) return [];

  const times = findTimes(source, dates.map((d) => [d.index, d.end]));
  const fallbackDuration = findDuration(source);
  const location = findLocation(source);
  const people = findPeople(source);

  // "van 10:00 tot 11:30" is one appointment, not two moments. Pair those up
  // first, so that a range written *before* its date still starts at 10:00.
  const rangeStart = new Map();
  const rangeEnd = new Map();
  for (let i = 0; i < times.length - 1; i++) {
    const gap = source.slice(times[i].end, times[i + 1].index);
    if (gap.length > 14 || !RANGE_JOINER.test(gap)) continue;
    rangeEnd.set(times[i], times[i + 1]);
    rangeStart.set(times[i + 1], times[i]);
  }

  const candidates = [];

  for (const date of dates) {
    // The time belonging to a date is the closest one that is not miles away.
    let best = null;
    for (const time of times) {
      const distance =
        time.index >= date.end ? time.index - date.end : date.index - time.end;
      const limit = time.index >= date.end ? 90 : 45;
      if (distance > limit || distance < 0) continue;
      if (!best || distance < best.distance) best = { time, distance };
    }

    // Landing on the tail of a range means the appointment starts at its head.
    let time = best ? best.time : null;
    const closing = time ? rangeEnd.get(time) : null;
    if (time && rangeStart.has(time)) time = rangeStart.get(time);

    const at = (t) => new Date(date.year, date.month - 1, date.day, t.hour, t.minute, 0, 0).getTime();

    const start = time
      ? at(time)
      : new Date(date.year, date.month - 1, date.day, 0, 0, 0, 0).getTime();

    let end = null;
    const finish = closing || (time ? rangeEnd.get(time) : null);
    if (finish) {
      end = at(finish);
      if (end <= start) end += DAY_MS; // an evening that runs past midnight
    }
    if (!end) {
      const duration = fallbackDuration || (time ? 30 * 60000 : DAY_MS);
      end = start + duration;
    }

    candidates.push({
      title: cleanTitle(title) || guessTitle(source) || "Afspraak",
      start,
      end,
      allDay: !time,
      location,
      people,
      confidence: scoreCandidate({ date, time, text: source, dateIndex: date.index }),
      matchedText: source
        .slice(Math.max(0, date.index - 60), Math.max(date.end, time ? time.end : date.end) + 60)
        .replace(/\s+/g, " ")
        .trim(),
    });
  }

  // Two mentions of the same moment (subject and body) are one appointment.
  const unique = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.start}|${candidate.allDay}`;
    const existing = unique.get(key);
    if (!existing || candidate.confidence > existing.confidence) unique.set(key, candidate);
  }

  return [...unique.values()]
    .sort((a, b) => b.confidence - a.confidence || a.start - b.start)
    .slice(0, max);
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/^\s*(re|fw|fwd|antw|aw)\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function guessTitle(text) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 90 && !/^https?:/i.test(trimmed)) {
      return cleanTitle(trimmed);
    }
  }
  return "";
}

export const __testing = { inferYear, readNumericDate, MONTHS };
