import test from "node:test";
import assert from "node:assert/strict";

import {
  COLUMNS,
  csvToEvents,
  csvToIcs,
  icsToCsv,
  parseCsv,
  rowsToCsv,
} from "../lib/tools/icscsv.js";
import { parseIcs } from "../lib/afspraken/ics.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime();
const at = (m, d, h = 0, mi = 0, y = 2026) => new Date(y, m - 1, d, h, mi, 0, 0).getTime();

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:a@test",
  "SUMMARY:Tandarts, controle",
  "DTSTART:20260804T071500Z",
  "DTEND:20260804T074500Z",
  "LOCATION:Hoofdstraat 12\\, Utrecht",
  "DESCRIPTION:Neem je pas mee",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:b@test",
  "SUMMARY:Verjaardag",
  "DTSTART;VALUE=DATE:20260810",
  "DTEND;VALUE=DATE:20260811",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

// ------------------------------------------------------------ writing CSV

test("turns a calendar into a table", () => {
  const { rows, count, csv } = icsToCsv(ICS, { now: NOW });
  assert.equal(count, 2);
  assert.equal(rows[0].Subject, "Tandarts, controle");
  assert.equal(rows[0]["Start Date"], "2026-08-04");
  assert.equal(rows[0]["All Day Event"], "False");
  assert.equal(rows[0].Location, "Hoofdstraat 12, Utrecht");
  assert.ok(csv.startsWith("﻿"), "Excel needs a BOM to read UTF-8");
  assert.match(csv, /\r\n/);
});

test("quotes a cell that would otherwise break the row", () => {
  const csv = rowsToCsv([{ Subject: 'Zeg "hallo", nu', Location: "regel1\nregel2" }], {
    columns: ["Subject", "Location"],
    bom: false,
  });
  assert.equal(csv.split("\r\n")[1], '"Zeg ""hallo"", nu","regel1\nregel2"');
});

test("an all-day event shows the last day it covers, not the day after", () => {
  const { rows } = icsToCsv(ICS, { now: NOW });
  const birthday = rows.find((row) => row.Subject === "Verjaardag");
  assert.equal(birthday["All Day Event"], "True");
  assert.equal(birthday["Start Date"], "2026-08-10");
  assert.equal(birthday["End Date"], "2026-08-10");
  assert.equal(birthday["Start Time"], "");
});

// ------------------------------------------------------------ reading CSV

test("reads quotes, doubled quotes and newlines inside a cell", () => {
  const rows = parseCsv('a,b\n"zeg ""hoi""","regel1\nregel2"\n');
  assert.deepEqual(rows[0], ["a", "b"]);
  assert.deepEqual(rows[1], ['zeg "hoi"', "regel1\nregel2"]);
  assert.equal(rows.length, 2, "een afsluitende nieuwe regel is geen extra rij");
});

test("turns a table into events", () => {
  const csv = [
    COLUMNS.join(","),
    "Tandarts,2026-08-04,09:15,2026-08-04,09:45,False,Neem je pas mee,Hoofdstraat 12",
  ].join("\n");

  const { events, skipped } = csvToEvents(csv, { now: NOW });
  assert.equal(skipped, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Tandarts");
  assert.equal(events[0].start, at(8, 4, 9, 15));
  assert.equal(events[0].end, at(8, 4, 9, 45));
  assert.equal(events[0].location, "Hoofdstraat 12");
});

test("accepts Dutch column names and the dates people actually type", () => {
  const csv = [
    "Titel,Datum,Tijd,Locatie",
    "Fysio,4 augustus 2026,half elf,Nachtegaalstraat 9",
    "Keuring,05-08-2026,14:00,Industrieweg 22",
  ].join("\n");

  const { events } = csvToEvents(csv, { now: NOW });
  assert.equal(events.length, 2);
  assert.equal(events[0].start, at(8, 4, 10, 30), "‘half elf’ is 10:30");
  assert.equal(events[1].start, at(8, 5, 14, 0));
});

test("marks a row without a time as an all-day event", () => {
  const csv = ["Subject,Start Date", "Verjaardag,2026-08-10"].join("\n");
  const { events } = csvToEvents(csv, { now: NOW });
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].start, at(8, 10));
  assert.equal(events[0].end, at(8, 11), "een dag lang, tot middernacht erna");
});

test("skips a broken row and says which one", () => {
  const csv = [
    "Subject,Start Date,Start Time",
    "Goed,2026-08-04,09:00",
    "Stuk,geen datum,09:00",
  ].join("\n");

  const { events, skipped, errors } = csvToEvents(csv, { now: NOW });
  assert.equal(events.length, 1);
  assert.equal(skipped, 1);
  assert.match(errors[0], /Rij 3/);
});

test("refuses a table without recognisable headers", () => {
  const { events, errors } = csvToEvents("appels,peren\n1,2", { now: NOW });
  assert.equal(events.length, 0);
  assert.match(errors[0], /kolomkoppen/i);
});

test("says so when the file is empty", () => {
  const { events, errors } = csvToEvents("", { now: NOW });
  assert.equal(events.length, 0);
  assert.ok(errors.length);
});

// ------------------------------------------------------------ round trips

test("a calendar survives the trip to a table and back", () => {
  // The table holds wall-clock times, so the property to hold is that the
  // moment comes back unchanged — whatever zone the reader happens to be in.
  const original = parseIcs(ICS, { now: NOW }).events;

  const { csv } = icsToCsv(ICS, { now: NOW });
  const { ics, count } = csvToIcs(csv, { now: NOW });
  assert.equal(count, 2);

  const returned = parseIcs(ics, { now: NOW }).events;
  const byTitle = (list, title) => list.find((event) => event.title === title);

  const before = byTitle(original, "Tandarts, controle");
  const after = byTitle(returned, "Tandarts, controle");
  assert.ok(after, "de komma in de titel mag niet verdwijnen");
  assert.equal(after.start, before.start);
  assert.equal(after.end, before.end);
  assert.equal(after.location, "Hoofdstraat 12, Utrecht");

  const birthdayBefore = byTitle(original, "Verjaardag");
  const birthdayAfter = byTitle(returned, "Verjaardag");
  assert.ok(birthdayAfter);
  assert.equal(birthdayAfter.allDay, true);
  assert.equal(birthdayAfter.start, birthdayBefore.start);
});

test("the produced calendar is a calendar", () => {
  const { ics } = csvToIcs(["Subject,Start Date,Start Time", "Test,2026-08-04,09:00"].join("\n"), {
    now: NOW,
  });
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  for (const line of ics.split("\r\n")) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, `regel te lang: ${line}`);
  }
});
