import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIcs,
  expandRecurrence,
  findMeetingUrl,
  parseContentLine,
  parseDuration,
  parseIcs,
  parseRrule,
  unescapeText,
  unfold,
} from "../lib/afspraken/ics.js";
import { wallToInstant, normalizeZone } from "../lib/afspraken/tz.js";

const wrap = (body) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//", body, "END:VCALENDAR"].join("\r\n");

const event = (lines) => wrap(["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n"));

// ---------------------------------------------------------------- lexing

test("unfolds continuation lines", () => {
  assert.equal(unfold("SUMMARY:Lange\r\n  titel"), "SUMMARY:Lange titel");
  assert.equal(unfold("SUMMARY:Met\r\n\ttab"), "SUMMARY:Mettab");
});

test("parses parameters, including quoted values containing a colon", () => {
  const line = parseContentLine('ATTENDEE;CN="Jansen, R:B";PARTSTAT=ACCEPTED:mailto:r@example.nl');
  assert.equal(line.name, "ATTENDEE");
  assert.equal(line.params.CN, "Jansen, R:B");
  assert.equal(line.params.PARTSTAT, "ACCEPTED");
  assert.equal(line.value, "mailto:r@example.nl");
});

test("unescapes text values", () => {
  assert.equal(unescapeText("Regel 1\\nRegel 2\\, met komma\\; en punt"), "Regel 1\nRegel 2, met komma; en punt");
});

test("parses ISO 8601 durations", () => {
  assert.equal(parseDuration("PT1H30M"), 90 * 60000);
  assert.equal(parseDuration("P1D"), 86400000);
  assert.equal(parseDuration("-PT15M"), -15 * 60000);
  assert.equal(parseDuration("P2W"), 14 * 86400000);
  assert.equal(parseDuration("nonsense"), null);
});

// ------------------------------------------------------------- timezones

test("resolves a zoned wall time to the right instant across DST", () => {
  const summer = wallToInstant(Date.UTC(2026, 6, 15, 14, 0, 0), "Europe/Amsterdam");
  assert.equal(new Date(summer).toISOString(), "2026-07-15T12:00:00.000Z"); // CEST, +2

  const winter = wallToInstant(Date.UTC(2026, 0, 15, 14, 0, 0), "Europe/Amsterdam");
  assert.equal(new Date(winter).toISOString(), "2026-01-15T13:00:00.000Z"); // CET, +1
});

test("maps Windows and offset-style zone names", () => {
  assert.equal(normalizeZone("W. Europe Standard Time").zone, "Europe/Berlin");
  assert.equal(normalizeZone("/mozilla.org/20050126_1/Europe/Amsterdam").zone, "Europe/Amsterdam");
  assert.equal(normalizeZone("(UTC+05:30) Chennai").fixedOffsetMinutes, 330);
  assert.equal(normalizeZone("(UTC-08:00) Pacific").fixedOffsetMinutes, -480);
});

test("reads a zoned DTSTART from a real invitation", () => {
  const { events } = parseIcs(
    event([
      "UID:zoned@test",
      "SUMMARY:Overleg",
      "DTSTART;TZID=Europe/Amsterdam:20260715T140000",
      "DTEND;TZID=Europe/Amsterdam:20260715T153000",
    ])
  );
  assert.equal(events.length, 1);
  assert.equal(new Date(events[0].start).toISOString(), "2026-07-15T12:00:00.000Z");
  assert.equal(events[0].end - events[0].start, 90 * 60000);
});

test("treats an all-day event as local midnight", () => {
  const { events } = parseIcs(
    event(["UID:allday@test", "SUMMARY:Verjaardag", "DTSTART;VALUE=DATE:20260803", "DTEND;VALUE=DATE:20260804"])
  );
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].start, new Date(2026, 7, 3).getTime());
});

test("falls back to DURATION when DTEND is missing", () => {
  const { events } = parseIcs(
    event(["UID:dur@test", "SUMMARY:Kort", "DTSTART:20260803T090000Z", "DURATION:PT45M"])
  );
  assert.equal(events[0].end - events[0].start, 45 * 60000);
});

// ------------------------------------------------------------ recurrence

const wall = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const asDates = (list) => list.map((ms) => new Date(ms).toISOString().slice(0, 10));

test("expands a weekly rule on named days", () => {
  const rule = parseRrule("FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4");
  const out = expandRecurrence(wall(2026, 8, 3, 9), rule, {});
  assert.deepEqual(asDates(out), ["2026-08-03", "2026-08-05", "2026-08-10", "2026-08-12"]);
});

test("expands a monthly rule on an ordinal weekday", () => {
  const rule = parseRrule("FREQ=MONTHLY;BYDAY=2TU;COUNT=3");
  const out = expandRecurrence(wall(2026, 8, 11, 10), rule, {});
  assert.deepEqual(asDates(out), ["2026-08-11", "2026-09-08", "2026-10-13"]);
});

test("expands a monthly rule on the last day of the month", () => {
  const rule = parseRrule("FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3");
  const out = expandRecurrence(wall(2026, 1, 31, 12), rule, {});
  assert.deepEqual(asDates(out), ["2026-01-31", "2026-02-28", "2026-03-31"]);
});

test("honours INTERVAL and UNTIL", () => {
  const rule = parseRrule("FREQ=DAILY;INTERVAL=2");
  const out = expandRecurrence(wall(2026, 8, 3, 9), rule, { untilWall: wall(2026, 8, 8) });
  assert.deepEqual(asDates(out), ["2026-08-03", "2026-08-05", "2026-08-07"]);
});

test("keeps a recurring appointment at the same clock time across a DST switch", () => {
  const { events } = parseIcs(
    event([
      "UID:dst@test",
      "SUMMARY:Wekelijks",
      "DTSTART;TZID=Europe/Amsterdam:20261018T090000",
      "DTEND;TZID=Europe/Amsterdam:20261018T093000",
      "RRULE:FREQ=WEEKLY;COUNT=3",
    ])
  );
  // The Netherlands leaves summer time on 25 October 2026.
  assert.deepEqual(
    events.map((e) => new Date(e.start).toISOString()),
    ["2026-10-18T07:00:00.000Z", "2026-10-25T08:00:00.000Z", "2026-11-01T08:00:00.000Z"]
  );
});

test("drops occurrences listed in EXDATE", () => {
  const { events } = parseIcs(
    event([
      "UID:ex@test",
      "SUMMARY:Standup",
      "DTSTART:20260803T080000Z",
      "DTEND:20260803T081500Z",
      "RRULE:FREQ=DAILY;COUNT=4",
      "EXDATE:20260804T080000Z",
    ])
  );
  assert.deepEqual(
    events.map((e) => new Date(e.start).toISOString().slice(0, 10)),
    ["2026-08-03", "2026-08-05", "2026-08-06"]
  );
});

test("lets a RECURRENCE-ID entry replace one occurrence", () => {
  const ics = wrap(
    [
      "BEGIN:VEVENT",
      "UID:series@test",
      "SUMMARY:Wekelijks overleg",
      "DTSTART:20260803T080000Z",
      "DTEND:20260803T090000Z",
      "RRULE:FREQ=WEEKLY;COUNT=3",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:series@test",
      "RECURRENCE-ID:20260810T080000Z",
      "SUMMARY:Verplaatst overleg",
      "DTSTART:20260810T130000Z",
      "DTEND:20260810T140000Z",
      "END:VEVENT",
    ].join("\r\n")
  );

  const { events } = parseIcs(ics);
  const moved = events.find((e) => e.title === "Verplaatst overleg");
  assert.ok(moved, "de verplaatste afspraak moet bestaan");
  assert.equal(new Date(moved.start).toISOString(), "2026-08-10T13:00:00.000Z");
  assert.equal(events.filter((e) => e.title === "Wekelijks overleg").length, 2);
});

test("caps a runaway rule instead of hanging", () => {
  const rule = parseRrule("FREQ=DAILY");
  const out = expandRecurrence(wall(2000, 1, 1, 9), rule, {});
  assert.ok(out.length <= 750, `verwacht een begrensd aantal, kreeg ${out.length}`);
});

// --------------------------------------------------------------- content

test("reads people, location and attachments", () => {
  const { events } = parseIcs(
    event([
      "UID:rich@test",
      "SUMMARY:Intakegesprek",
      "DTSTART:20260803T090000Z",
      "DTEND:20260803T093000Z",
      "LOCATION:Hoofdstraat 12\\, Utrecht",
      "DESCRIPTION:Neem je verwijsbrief mee.\\nKom 5 minuten eerder.",
      "ORGANIZER;CN=Praktijk Noord:mailto:balie@praktijknoord.nl",
      "ATTENDEE;CN=Dr. Jansen;PARTSTAT=ACCEPTED:mailto:jansen@praktijknoord.nl",
      "ATTENDEE;CN=Fatima Haddad;ROLE=OPT-PARTICIPANT:mailto:f@example.nl",
      "ATTACH;FMTTYPE=application/pdf;FILENAME=verwijsbrief.pdf:https://example.nl/brief.pdf",
      "STATUS:CONFIRMED",
    ])
  );

  const appointment = events[0];
  assert.equal(appointment.location, "Hoofdstraat 12, Utrecht");
  assert.equal(appointment.description, "Neem je verwijsbrief mee.\nKom 5 minuten eerder.");
  assert.equal(appointment.organizer.name, "Praktijk Noord");
  assert.equal(appointment.people.length, 2);
  assert.equal(appointment.people[0].status, "ACCEPTED");
  assert.equal(appointment.people[1].role, "optioneel");
  assert.equal(appointment.attachments[0].name, "verwijsbrief.pdf");
});

test("finds the join link wherever it is hidden", () => {
  assert.equal(
    findMeetingUrl("Bel in via https://meet.google.com/abc-defg-hij en groet iedereen."),
    "https://meet.google.com/abc-defg-hij"
  );
  assert.equal(findMeetingUrl("Zie https://example.nl/pagina"), "");
});

test("survives a file that never closes its component", () => {
  const { events, errors } = parseIcs(
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x@test\r\nSUMMARY:Half\r\nDTSTART:20260803T090000Z\r\n"
  );
  assert.equal(events.length, 1);
  assert.ok(errors.length > 0);
});

test("reports a file that is not a calendar at all", () => {
  const { events, errors } = parseIcs("dit is gewoon tekst");
  assert.equal(events.length, 0);
  assert.ok(errors.length > 0);
});

// --------------------------------------------------------------- writing

test("writes a calendar that parses back to the same appointment", () => {
  const original = {
    uid: "roundtrip@test",
    title: "Tandarts, controle; jaarlijks",
    start: Date.UTC(2026, 7, 3, 9, 0),
    end: Date.UTC(2026, 7, 3, 9, 30),
    location: "Hoofdstraat 12, Utrecht",
    description: "Regel 1\nRegel 2",
    people: [{ name: "Dr. Jansen", email: "jansen@example.nl" }],
  };

  const { events } = parseIcs(buildIcs([original]));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, original.title);
  assert.equal(events[0].location, original.location);
  assert.equal(events[0].description, original.description);
  assert.equal(events[0].start, original.start);
  assert.equal(events[0].people[0].email, "jansen@example.nl");
});

test("an all-day event keeps its date when written back", () => {
  // Read as local midnight, so it must be written from the local clock too —
  // taking the UTC date moves it a day earlier east of Greenwich.
  const source = event([
    "UID:allday-roundtrip@test",
    "SUMMARY:Verjaardag",
    "DTSTART;VALUE=DATE:20260810",
    "DTEND;VALUE=DATE:20260811",
  ]);

  const [before] = parseIcs(source).events;
  const written = buildIcs([before]);
  assert.match(written, /DTSTART;VALUE=DATE:20260810/);
  assert.match(written, /DTEND;VALUE=DATE:20260811/);

  const [after] = parseIcs(written).events;
  assert.equal(after.start, before.start);
  assert.equal(after.allDay, true);
});

test("folds long lines at 75 octets", () => {
  const ics = buildIcs([
    { uid: "long@test", title: "x".repeat(300), start: Date.UTC(2026, 7, 3, 9), end: Date.UTC(2026, 7, 3, 10) },
  ]);
  for (const line of ics.split("\r\n")) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, `regel te lang: ${line.length}`);
  }
  assert.equal(parseIcs(ics).events[0].title, "x".repeat(300));
});
