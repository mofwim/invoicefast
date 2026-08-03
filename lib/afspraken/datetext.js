/**
 * Reading appointments out of ordinary prose (Dutch and English).
 *
 * Confirmation mails from a dentist, a garage or a municipality rarely carry a
 * calendar attachment — the appointment only exists as a sentence. This module
 * finds the date, the time, how long it lasts and where it happens, and reports
 * how sure it is so the interface can ask the reader to confirm the shaky ones.
 *
 * Real mail is messier than "4 augustus 2026 om 09:15". People write "aanstaande
 * donderdag", "half elf", "tussen 13:00 en 15:00". And the same mail is full of
 * dates that are *not* the appointment: an invoice date, a date of birth, the
 * footer saying when it was sent. Both sides of that get handled here.
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

const WEEKDAYS = {
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};

const MONTH_ALTERNATION = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const WEEKDAY_ALTERNATION = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join("|");

/** Numbers as people say them, for "half elf" and "kwart over negen". */
const SPOKEN_HOURS = {
  een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6,
  zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12,
};
const SPOKEN_MINUTES = { vijf: 5, tien: 10, kwart: 15, twintig: 20, vijfentwintig: 25 };

const HOUR_ALTERNATION = Object.keys(SPOKEN_HOURS).sort((a, b) => b.length - a.length).join("|");
const MINUTE_ALTERNATION = Object.keys(SPOKEN_MINUTES).sort((a, b) => b.length - a.length).join("|");

/** Words that mean "this really is an appointment", used to rank candidates. */
const INTENT_WORDS =
  /\b(afspraak|afspraken|afgesproken|uitnodiging|uitgenodigd|bevestiging|bevestigen|bevestigd|gereserveerd|reservering|boeking|geboekt|consult|controle|intake|spreekuur|behandeling|onderzoek|gesprek|vergadering|overleg|bijeenkomst|sessie|bezoek|zitting|keuring|verwacht|ingepland|gepland|bezorgd|bezorging|levering|ophalen|cursus|les|training|appointment|meeting|invitation|invited|confirmed|confirmation|booking|reserved|reservation|scheduled|session|consultation|interview|call|visit|delivery)\b/i;

const DATE_HINTS = /\b(datum|wanneer|op\s+datum|date|when|day)\b/i;
const TIME_HINTS = /\b(tijd|tijdstip|aanvang|start|begint|om|verwacht|time|at|starts)\b/i;

/**
 * Dates that belong to paperwork, not to an appointment. If one of these labels
 * sits just before a date, that date is not what the reader is looking for.
 */
const PAPERWORK_LABELS =
  /\b(factuur ?datum|factuurdatum|vervaldatum|betaaldatum|betaal ?datum|geboortedatum|geboren op|besteldatum|orderdatum|order ?datum|verzenddatum|verzonden op|aangemaakt op|opgesteld op|geldig tot|geldig t\/m|geldig van|ingangsdatum|einddatum contract|polisdatum|invoice date|due date|payment date|date of birth|born on|sent on|order date|issued on|valid until|expires on|expiry date|copyright)\b[^\n]{0,24}$/i;

/** A mail saying the appointment is off, rather than announcing one. */
const CANCEL_WORDS =
  /\b(geannuleerd|annulering|geannuleerde|afgezegd|afgelast|vervallen|komen te vervallen|gecanceld|cancelled|canceled|cancellation)\b/i;

/** A mail moving an appointment: the date *after* these words is the new one. */
const RESCHEDULE_WORDS =
  /\b(verzet naar|verplaatst naar|gewijzigd naar|nieuwe datum|nieuwe afspraak|moved to|rescheduled to|changed to)\b/i;

const MINUTE_MS = 60000;
const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// Absolute dates
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
      `\\b(?:(?:${WEEKDAY_ALTERNATION})\\.?,?\\s+)?(\\d{1,2})(?:e|ste|de|th|st|nd|rd)?\\s+(${MONTH_ALTERNATION})\\.?(?:\\s+(\\d{4}))?\\b`,
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
      `\\b(?:(?:${WEEKDAY_ALTERNATION})\\.?,?\\s+)?(${MONTH_ALTERNATION})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
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

// ---------------------------------------------------------------------------
// Relative dates — "morgen", "aanstaande donderdag", "volgende week woensdag"
// ---------------------------------------------------------------------------

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const shiftDays = (ms, days) => {
  const d = new Date(startOfDay(ms));
  d.setDate(d.getDate() + days);
  return d.getTime();
};

/** The next occurrence of a weekday, always in the future. */
function nextWeekday(nowMs, targetDow, { nextWeek = false } = {}) {
  if (nextWeek) {
    // Move to the Monday of next week, then to the weekday inside it.
    const today = new Date(startOfDay(nowMs));
    const toMonday = (8 - today.getDay()) % 7 || 7;
    const monday = shiftDays(nowMs, toMonday);
    const offset = (targetDow - 1 + 7) % 7;
    return shiftDays(monday, offset);
  }
  const delta = (targetDow - new Date(nowMs).getDay() + 7) % 7;
  return shiftDays(nowMs, delta === 0 ? 7 : delta);
}

/** Time-of-day words that come attached to a relative day. */
const DAYPART_SUFFIX = "(?:ochtend|morgen|middag|avond|nacht)";

const RELATIVE_PATTERNS = [
  {
    re: new RegExp(`\\bvolgende week\\s+(${WEEKDAY_ALTERNATION})\\b`, "gi"),
    read: (m, now) => nextWeekday(now, WEEKDAYS[m[1].toLowerCase()], { nextWeek: true }),
  },
  {
    re: new RegExp(
      `\\b(?:aanstaande|a\\.?s\\.?|komende|volgende|next)\\s+(${WEEKDAY_ALTERNATION})\\b`,
      "gi"
    ),
    read: (m, now) => nextWeekday(now, WEEKDAYS[m[1].toLowerCase()]),
  },
  {
    re: new RegExp(`\\bover\\s+(\\d{1,2})\\s+(dagen|dag|weken|week|days?|weeks?)\\b`, "gi"),
    read: (m, now) => shiftDays(now, +m[1] * (/we(e)?k/i.test(m[2]) ? 7 : 1)),
  },
  {
    re: new RegExp(`\\bovermorgen${DAYPART_SUFFIX}?\\b`, "gi"),
    read: (m, now) => shiftDays(now, 2),
  },
  {
    re: new RegExp(`\\beergisteren\\b`, "gi"),
    read: (m, now) => shiftDays(now, -2),
  },
  {
    re: new RegExp(`\\bmorgen${DAYPART_SUFFIX}?\\b|\\btomorrow\\b`, "gi"),
    read: (m, now) => shiftDays(now, 1),
  },
  {
    re: new RegExp(`\\bgisteren${DAYPART_SUFFIX}?\\b|\\byesterday\\b`, "gi"),
    read: (m, now) => shiftDays(now, -1),
  },
  {
    re: new RegExp(`\\bvan(?:daag|ochtend|middag|avond|nacht)\\b|\\bvanmorgen\\b|\\btoday\\b|\\bton(?:ight|ite)\\b`, "gi"),
    read: (m, now) => startOfDay(now),
  },
  // A bare weekday ("op donderdag om 8:30") — only used when nothing else fits.
  {
    weak: true,
    re: new RegExp(`\\b(${WEEKDAY_ALTERNATION})\\b`, "gi"),
    read: (m, now) => nextWeekday(now, WEEKDAYS[m[1].toLowerCase()]),
  },
];

// ---------------------------------------------------------------------------
// Finding dates
// ---------------------------------------------------------------------------

/** Is this date labelled as paperwork rather than as an appointment? */
function isPaperwork(text, index) {
  return PAPERWORK_LABELS.test(text.slice(Math.max(0, index - 40), index));
}

export function findDates(text, referenceMs = Date.now()) {
  const source = String(text || "");
  const found = [];
  const taken = [];
  const overlaps = (start, end) => taken.some(([s, e]) => start < e && end > s);

  const push = (entry) => {
    taken.push([entry.index, entry.end]);
    found.push(entry);
  };

  for (const pattern of DATE_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;

      const read = pattern.read(match);
      if (!read || !read.month || !read.day) continue;
      const year = read.year || inferYear(read.day, read.month, referenceMs);
      if (!isRealDate(year, read.month, read.day)) continue;

      // A dated line from more than a year ago is history, not a plan.
      const ms = new Date(year, read.month - 1, read.day, 12).getTime();
      if (ms < referenceMs - 366 * DAY_MS) {
        taken.push([start, end]);
        continue;
      }

      if (isPaperwork(source, start)) {
        taken.push([start, end]);
        continue;
      }

      push({
        year,
        month: read.month,
        day: read.day,
        explicitYear: read.explicitYear,
        index: start,
        end,
        text: match[0],
        relative: false,
      });
    }
  }

  const hasAbsolute = found.length > 0;

  for (const pattern of RELATIVE_PATTERNS) {
    if (pattern.weak && hasAbsolute) continue;
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      if (isPaperwork(source, start)) {
        taken.push([start, end]);
        continue;
      }

      const ms = pattern.read(match, referenceMs);
      if (!Number.isFinite(ms)) continue;
      const d = new Date(ms);
      push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        explicitYear: false,
        index: start,
        end,
        text: match[0],
        relative: true,
        weak: Boolean(pattern.weak),
      });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

const EVENING_WORDS = /('s\s*avonds|savonds|vanavond|morgenavond|avond|diner|'s\s*nachts|tonight|pm\b)/i;
const AFTERNOON_WORDS = /('s\s*middags|vanmiddag|morgenmiddag|middag|namiddag|lunch)/i;
const MORNING_WORDS = /('s\s*ochtends|vanochtend|vanmorgen|ochtend|'s\s*morgens|morning)/i;

/**
 * A clock reading of 3 can mean 03:00 or 15:00. When the writer did not say,
 * the words around it usually do.
 */
function applyDaypart(hour, context) {
  if (hour === 0 || hour > 12) return hour;
  if (MORNING_WORDS.test(context)) return hour === 12 ? 0 : hour;
  if (EVENING_WORDS.test(context)) return hour < 12 ? hour + 12 : hour;
  if (AFTERNOON_WORDS.test(context) && hour <= 6) return hour + 12;
  return hour;
}

const SPOKEN_PATTERNS = [
  // "half elf" / "half 11" → 10:30 — the Dutch half is *before* the hour.
  {
    re: new RegExp(`\\bhalf\\s+(${HOUR_ALTERNATION}|\\d{1,2})\\b`, "gi"),
    read: (m) => {
      const hour = SPOKEN_HOURS[m[1].toLowerCase()] ?? +m[1];
      if (!(hour >= 1 && hour <= 12)) return null;
      return { hour: (hour + 11) % 12 || 12, minute: 30 };
    },
  },
  // "kwart over negen", "tien over half"-free forms: N over H
  {
    re: new RegExp(`\\b(${MINUTE_ALTERNATION}|\\d{1,2})\\s+over\\s+(${HOUR_ALTERNATION}|\\d{1,2})\\b`, "gi"),
    read: (m) => {
      const minute = SPOKEN_MINUTES[m[1].toLowerCase()] ?? +m[1];
      const hour = SPOKEN_HOURS[m[2].toLowerCase()] ?? +m[2];
      if (!(hour >= 1 && hour <= 12) || !(minute >= 1 && minute <= 29)) return null;
      return { hour, minute };
    },
  },
  // "kwart voor negen" → 08:45
  {
    re: new RegExp(`\\b(${MINUTE_ALTERNATION}|\\d{1,2})\\s+voor\\s+(${HOUR_ALTERNATION}|\\d{1,2})\\b`, "gi"),
    read: (m) => {
      const minute = SPOKEN_MINUTES[m[1].toLowerCase()] ?? +m[1];
      const hour = SPOKEN_HOURS[m[2].toLowerCase()] ?? +m[2];
      if (!(hour >= 1 && hour <= 12) || !(minute >= 1 && minute <= 29)) return null;
      return { hour: (hour + 11) % 12 || 12, minute: 60 - minute };
    },
  },
];

const TIME_PATTERNS = [
  { re: /\b(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/gi, h: 1, m: 2, ampm: 3 },
  { re: /\b(\d{1,2})\s*u(?:ur)?\s*(\d{2})\b/gi, h: 1, m: 2 },
  { re: /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/gi, h: 1, ampm: 2 },
  { re: /\b(\d{1,2})\s+uur\b/gi, h: 1 },
  { re: new RegExp(`\\b(${HOUR_ALTERNATION})\\s+uur\\b`, "gi"), spokenHour: 1 },
];

export function findTimes(text, blocked = []) {
  const source = String(text || "");
  const found = [];
  const taken = blocked.slice();
  const overlaps = (start, end) => taken.some(([s, e]) => start < e && end > s);

  const contextOf = (start, end) => source.slice(Math.max(0, start - 45), end + 45);

  // Spoken forms first: they span the digits a numeric pattern would grab.
  for (const pattern of SPOKEN_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      const read = pattern.read(match);
      if (!read) continue;

      taken.push([start, end]);
      found.push({
        hour: applyDaypart(read.hour, contextOf(start, end)),
        minute: read.minute,
        index: start,
        end,
        text: match[0],
        explicit: true,
      });
    }
  }

  for (const pattern of TIME_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;

      let hour;
      if (pattern.spokenHour) hour = SPOKEN_HOURS[match[pattern.spokenHour].toLowerCase()];
      else hour = Number(match[pattern.h]);

      const minute = pattern.m ? Number(match[pattern.m]) : 0;
      const meridiem = pattern.ampm ? (match[pattern.ampm] || "").toLowerCase().replace(/\./g, "") : "";

      if (!Number.isFinite(hour) || minute > 59) continue;
      if (meridiem === "pm" && hour < 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      // A bare "5" only counts as a time when something marks it as one.
      if (!pattern.m && !meridiem && !pattern.spokenHour && !/uur/i.test(match[0])) continue;
      if (!meridiem) hour = applyDaypart(hour, contextOf(start, end));
      if (hour > 23) continue;

      taken.push([start, end]);
      found.push({
        hour,
        minute,
        index: start,
        end,
        text: match[0],
        explicit: Boolean(pattern.m || meridiem),
      });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

const RANGE_JOINER = /^\s*(?:-|–|—|tot en met|tot|t\/m|until|till|to|through)\s*$/i;
/** "tussen 13:00 en 15:00" — only inside that construct does "en" join a range. */
const AND_JOINER = /^\s*(?:en|and)\s*$/i;
const BETWEEN_LEAD = /\b(tussen|between)\b[^.\n]{0,20}$/i;

/** Duration written out in words: "(30 minuten)", "duurt 1,5 uur", "90 min". */
export function findDuration(text) {
  const hours = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:uur|uren|hours?|hrs?|h)\b/i);
  const minutes = text.match(/\b(\d{1,3})\s*(?:minuten|minuut|minutes?|mins?|min)\b/i);
  let ms = 0;
  if (hours) ms += Math.round(parseFloat(hours[1].replace(",", ".")) * 3600000);
  if (minutes) ms += Number(minutes[1]) * MINUTE_MS;
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
// What to bring, and who to call
// ---------------------------------------------------------------------------

const BRING_LABEL =
  /(?:^|\n)\s*(?:meenemen|mee te nemen|neem mee|wat neem je mee|benodigdheden|graag meenemen|bring|please bring|what to bring)\s*[:\-–]?\s*(.+)/i;
const BRING_SENTENCE =
  /\b(?:neem|neemt u|graag)\s+((?:uw|je|jouw|een|de|het)\s[^.\n]{3,120}?)\s+mee\b/i;

/**
 * "Neem uw verzekeringspas mee" is the part people actually forget. Pull it out
 * so it can sit on the card instead of being buried in the mail body.
 */
export function findBring(text) {
  const source = String(text || "");
  const raw =
    source.match(BRING_LABEL)?.[1] ||
    source.match(BRING_SENTENCE)?.[1] ||
    "";
  if (!raw) return [];

  return raw
    .replace(/\.$/, "")
    .split(/\s*(?:,|;|\ben\b|\bof\b|\band\b|\bor\b|•|•)\s*/i)
    .map((item) => item.trim().replace(/^(?:uw|je|jouw|een|de|het|your|a|an|the)\s+/i, "").trim())
    .filter((item) => item.length > 2 && item.length < 80)
    .slice(0, 6);
}

/** A phone number in the mail is how the appointment gets moved. */
export function findPhone(text) {
  const match = String(text || "").match(
    /(?:\btel(?:efoon)?\.?\s*(?:nr\.?|nummer)?\s*[:\-]?\s*)?(\+?\d[\d\s().-]{7,16}\d)/i
  );
  if (!match) return "";
  const digits = match[1].replace(/[^\d+]/g, "");
  // Long enough to be a phone number, short enough not to be an IBAN or order id.
  if (digits.replace(/\D/g, "").length < 9 || digits.replace(/\D/g, "").length > 15) return "";
  return match[1].trim();
}

// ---------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------

function scoreCandidate({ date, time, text, dateIndex }) {
  let score = 0.35;
  if (time) score += 0.25;
  if (date.explicitYear) score += 0.1;
  if (date.relative) score -= date.weak ? 0.14 : 0.04;
  if (time && Math.abs(time.index - dateIndex) < 60) score += 0.12;

  // Look at the sentence around the date rather than the whole document.
  const context = text.slice(Math.max(0, dateIndex - 160), dateIndex + 200);
  if (INTENT_WORDS.test(context)) score += 0.14;
  if (DATE_HINTS.test(context)) score += 0.05;
  if (time && TIME_HINTS.test(context)) score += 0.05;

  return Math.max(0.2, Math.min(0.95, Number(score.toFixed(2))));
}

/**
 * Extract appointment candidates from free text.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.now]        reference for relative and undated days
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
  const bring = findBring(source);
  const phone = findPhone(source);

  const cancelled = CANCEL_WORDS.test(source);
  const rescheduleAt = source.search(RESCHEDULE_WORDS);

  // "van 10:00 tot 11:30" is one appointment, not two moments. Pair those up
  // first, so that a range written *before* its date still starts at 10:00.
  const rangeStart = new Map();
  const rangeEnd = new Map();
  for (let i = 0; i < times.length - 1; i++) {
    const gap = source.slice(times[i].end, times[i + 1].index);
    if (gap.length > 14) continue;
    const joined =
      RANGE_JOINER.test(gap) ||
      (AND_JOINER.test(gap) && BETWEEN_LEAD.test(source.slice(Math.max(0, times[i].index - 30), times[i].index)));
    if (!joined) continue;
    rangeEnd.set(times[i], times[i + 1]);
    rangeStart.set(times[i + 1], times[i]);
  }

  const candidates = [];

  for (const date of dates) {
    // The time belonging to a date is the closest one that is not miles away.
    let best = null;
    for (const time of times) {
      const distance = time.index >= date.end ? time.index - date.end : date.index - time.end;
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
      const duration = fallbackDuration || (time ? 30 * MINUTE_MS : DAY_MS);
      end = start + duration;
    }

    let confidence = scoreCandidate({ date, time, text: source, dateIndex: date.index });
    // In a mail that moves an appointment, the new date is the one that counts.
    if (rescheduleAt >= 0) confidence += date.index > rescheduleAt ? 0.15 : -0.25;

    candidates.push({
      title: cleanTitle(title) || guessTitle(source) || "Afspraak",
      start,
      end,
      allDay: !time,
      location,
      people,
      bring,
      phone,
      cancelled,
      confidence: Math.max(0.2, Math.min(0.95, Number(confidence.toFixed(2)))),
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

  const ranked = [...unique.values()].sort(
    (a, b) => b.confidence - a.confidence || a.start - b.start
  );

  // A mail that moves an appointment describes exactly one; the old date is
  // only there for reference, so do not offer it as a second appointment.
  return (rescheduleAt >= 0 ? ranked.slice(0, 1) : ranked).slice(0, max);
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

export const __testing = { inferYear, readNumericDate, nextWeekday, applyDaypart, MONTHS };
