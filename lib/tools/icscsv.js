/**
 * Agenda ⇄ tabel.
 *
 * A calendar file is unreadable in a spreadsheet and a spreadsheet is
 * unimportable into a calendar, which is the whole reason this tool exists.
 * Both directions lean on the parsers already written for Mijn Afspraken: the
 * RFC 5545 reader and writer, and the lenient date reader that copes with the
 * many ways a person types a date into a cell.
 */

import { buildIcs, parseIcs } from "../afspraken/ics.js";
import { findDates, findTimes } from "../afspraken/datetext.js";

/** Columns, in the order Google Calendar's own CSV import expects them. */
export const COLUMNS = [
  "Subject",
  "Start Date",
  "Start Time",
  "End Date",
  "End Time",
  "All Day Event",
  "Description",
  "Location",
];

const pad = (n) => String(n).padStart(2, "0");
const DAY = 86400000;

const isoDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const isoTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ---------------------------------------------------------------------------
// Writing CSV
// ---------------------------------------------------------------------------

/** RFC 4180: quote when the value could otherwise break the row. */
function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows, { columns = COLUMNS, bom = true } = {}) {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(","));
  // Excel reads a UTF-8 file as the local codepage unless it sees a BOM.
  return (bom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
}

export function eventToRow(event) {
  const allDay = Boolean(event.allDay);
  // An all-day event ends at midnight of the following day; a person reading a
  // spreadsheet expects to see the last day it covers.
  const endMs = allDay ? Math.max(event.start, event.end - DAY) : event.end;

  return {
    Subject: event.title || "",
    "Start Date": isoDate(event.start),
    "Start Time": allDay ? "" : isoTime(event.start),
    "End Date": isoDate(endMs),
    "End Time": allDay ? "" : isoTime(endMs),
    "All Day Event": allDay ? "True" : "False",
    Description: event.description || "",
    Location: event.location || "",
  };
}

/**
 * @returns {{csv: string, rows: object[], count: number, errors: string[]}}
 */
export function icsToCsv(text, options = {}) {
  const { events, errors } = parseIcs(text, { now: options.now ?? Date.now(), ...options });
  const rows = events
    .slice()
    .sort((a, b) => a.start - b.start)
    .map(eventToRow);
  return { csv: rowsToCsv(rows), rows, count: rows.length, errors };
}

// ---------------------------------------------------------------------------
// Reading CSV
// ---------------------------------------------------------------------------

/** A full RFC 4180 reader: quotes, doubled quotes, and newlines inside cells. */
export function parseCsv(text) {
  const source = String(text || "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      /* handled by the \n that follows */
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  // A trailing newline leaves one empty row behind.
  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

/** Match a header cell to a known column, however it was capitalised or spaced. */
const HEADER_ALIASES = {
  subject: "Subject",
  title: "Subject",
  onderwerp: "Subject",
  titel: "Subject",
  naam: "Subject",
  startdate: "Start Date",
  begindatum: "Start Date",
  datum: "Start Date",
  date: "Start Date",
  starttime: "Start Time",
  begintijd: "Start Time",
  tijd: "Start Time",
  time: "Start Time",
  enddate: "End Date",
  einddatum: "End Date",
  endtime: "End Time",
  eindtijd: "End Time",
  alldayevent: "All Day Event",
  allday: "All Day Event",
  heledag: "All Day Event",
  description: "Description",
  omschrijving: "Description",
  beschrijving: "Description",
  notes: "Description",
  notitie: "Description",
  location: "Location",
  locatie: "Location",
  plaats: "Location",
  adres: "Location",
};

const normaliseHeader = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z]/g, "");

const TRUTHY = /^(true|waar|ja|yes|y|j|1|x)$/i;

/**
 * Read a date cell. Accepts what people actually type — ISO, day-first,
 * month-first, and written-out months in Dutch or English.
 */
function readDate(value, now) {
  const [found] = findDates(String(value || ""), now);
  return found ? { year: found.year, month: found.month, day: found.day } : null;
}

function readTime(value) {
  const [found] = findTimes(String(value || ""));
  return found ? { hour: found.hour, minute: found.minute } : null;
}

/**
 * Turn a table into calendar events.
 *
 * @returns {{events: object[], errors: string[], skipped: number}}
 */
export function csvToEvents(text, options = {}) {
  const { now = Date.now() } = options;
  const table = parseCsv(text);
  const errors = [];

  if (!table.length) return { events: [], errors: ["Dit bestand is leeg."], skipped: 0 };

  const header = table[0].map(normaliseHeader);
  const mapped = header.map((cell) => HEADER_ALIASES[cell] || null);
  if (!mapped.includes("Subject") || !mapped.includes("Start Date")) {
    return {
      events: [],
      errors: [
        "Geen kolomkoppen gevonden. De eerste rij moet in elk geval een titel- en een datumkolom hebben.",
      ],
      skipped: 0,
    };
  }

  const events = [];
  let skipped = 0;

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const get = (column) => {
      const index = mapped.indexOf(column);
      return index === -1 ? "" : (cells[index] || "").trim();
    };

    const title = get("Subject") || "Afspraak";
    const startDate = readDate(get("Start Date"), now);
    if (!startDate) {
      skipped++;
      errors.push(`Rij ${r + 1}: geen bruikbare datum (“${get("Start Date")}”) — overgeslagen.`);
      continue;
    }

    const startTime = readTime(get("Start Time"));
    const allDay = TRUTHY.test(get("All Day Event")) || !startTime;

    const start = new Date(
      startDate.year,
      startDate.month - 1,
      startDate.day,
      allDay ? 0 : startTime.hour,
      allDay ? 0 : startTime.minute,
      0,
      0
    ).getTime();

    const endDate = readDate(get("End Date"), now) || startDate;
    const endTime = readTime(get("End Time"));

    let end;
    if (allDay) {
      // Written as the last day it covers; a calendar wants the day after.
      end = new Date(endDate.year, endDate.month - 1, endDate.day).getTime() + DAY;
    } else {
      end = new Date(
        endDate.year,
        endDate.month - 1,
        endDate.day,
        endTime ? endTime.hour : startTime.hour,
        endTime ? endTime.minute : startTime.minute,
        0,
        0
      ).getTime();
    }
    if (!(end > start)) end = start + (allDay ? DAY : 30 * 60000);

    events.push({
      uid: `rij-${r}-${start}`,
      title,
      start,
      end,
      allDay,
      description: get("Description"),
      location: get("Location"),
      status: "CONFIRMED",
    });
  }

  return { events, errors, skipped };
}

/**
 * @returns {{ics: string, count: number, errors: string[], skipped: number}}
 */
export function csvToIcs(text, options = {}) {
  const { events, errors, skipped } = csvToEvents(text, options);
  return {
    ics: events.length ? buildIcs(events, { calendarName: "Omgezette agenda", now: options.now }) : "",
    count: events.length,
    errors,
    skipped,
  };
}
