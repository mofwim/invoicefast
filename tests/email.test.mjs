import test from "node:test";
import assert from "node:assert/strict";

import {
  appointmentsFromEmail,
  appointmentsFromText,
  decodeEncodedWords,
  htmlToText,
  parseAddressList,
  parseEml,
} from "../lib/afspraken/email.js";

const NOW = new Date(2026, 6, 27, 9, 0).getTime(); // 27 July 2026
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0).getTime();

const b64 = (text) => Buffer.from(text, "utf8").toString("base64");

const PLAIN_MAIL = [
  "From: Praktijk Noord <balie@praktijknoord.nl>",
  "To: Youssef Bakker <youssef@example.nl>",
  "Subject: Bevestiging van uw afspraak",
  "Date: Mon, 27 Jul 2026 10:12:00 +0200",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="BOUND"',
  "",
  "--BOUND",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Beste heer Bakker,",
  "",
  "Uw afspraak is op dinsdag 4 augustus 2026 om 9:15 uur.",
  "Locatie: Hoofdstraat 12, 3511 AA Utrecht",
  "",
  "Met vriendelijke groet,",
  "Praktijk Noord",
  "",
  "--BOUND",
  "Content-Type: application/pdf; name=\"verwijsbrief.pdf\"",
  'Content-Disposition: attachment; filename="verwijsbrief.pdf"',
  "Content-Transfer-Encoding: base64",
  "",
  b64("%PDF-1.4 dit is een verwijsbrief"),
  "",
  "--BOUND--",
].join("\n");

// --------------------------------------------------------------- headers

test("decodes encoded words in both encodings", () => {
  assert.equal(decodeEncodedWords(`=?UTF-8?B?${b64("Afspraak bevestigd")}?=`), "Afspraak bevestigd");
  assert.equal(decodeEncodedWords("=?UTF-8?Q?Caf=C3=A9_bezoek?="), "Café bezoek");
  assert.equal(decodeEncodedWords("Gewone tekst"), "Gewone tekst");
});

test("joins encoded words that were split across folded lines", () => {
  const joined = decodeEncodedWords(
    `=?UTF-8?B?${b64("Bevestiging ")}?= =?UTF-8?B?${b64("van uw afspraak")}?=`
  );
  assert.equal(joined, "Bevestiging van uw afspraak");
});

test("parses address lists with names, quotes and commas", () => {
  const list = parseAddressList('"Jansen, R." <r@example.nl>, info@example.nl');
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "Jansen, R.");
  assert.equal(list[0].email, "r@example.nl");
  assert.equal(list[1].email, "info@example.nl");
});

test("turns HTML into readable text", () => {
  const text = htmlToText(
    "<style>p{color:red}</style><p>Uw afspraak is op <b>4&nbsp;augustus</b></p><br><ul><li>Neem uw pas mee</li></ul>"
  );
  assert.match(text, /Uw afspraak is op 4 augustus/);
  assert.match(text, /Neem uw pas mee/);
  assert.doesNotMatch(text, /color:red/);
});

// ------------------------------------------------------------------ MIME

test("reads headers, body and attachment from a multipart message", () => {
  const mail = parseEml(PLAIN_MAIL);
  assert.equal(mail.subject, "Bevestiging van uw afspraak");
  assert.equal(mail.from.email, "balie@praktijknoord.nl");
  assert.equal(mail.from.name, "Praktijk Noord");
  assert.equal(mail.to[0].email, "youssef@example.nl");
  assert.match(mail.text, /Uw afspraak is op dinsdag 4 augustus 2026/);
  assert.equal(mail.attachments.length, 1);
  assert.equal(mail.attachments[0].name, "verwijsbrief.pdf");
  assert.equal(Buffer.from(mail.attachments[0].bytes).toString("utf8"), "%PDF-1.4 dit is een verwijsbrief");
});

test("decodes a quoted-printable body with accents", () => {
  const raw = [
    "Subject: Test",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "Tot ziens in het caf=C3=A9 om 10:00 op 4 augustus 2026.",
  ].join("\n");
  assert.match(parseEml(raw).text, /café/);
});

test("decodes a base64 body", () => {
  const raw = [
    "Subject: Test",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64("Afspraak op 4 augustus 2026 om 09:15 uur."),
  ].join("\n");
  assert.match(parseEml(raw).text, /09:15/);
});

test("falls back to the HTML part when there is no plain text", () => {
  const raw = [
    "Subject: Test",
    "Content-Type: text/html; charset=utf-8",
    "",
    "<p>Afspraak op <b>4 augustus 2026</b> om 09:15</p>",
  ].join("\n");
  assert.match(parseEml(raw).text, /4 augustus 2026/);
});

// ---------------------------------------------------------- appointments

test("reads an appointment out of an ordinary confirmation mail", () => {
  const [found] = appointmentsFromEmail(PLAIN_MAIL, { now: NOW });
  assert.ok(found, "er moet een afspraak gevonden worden");
  assert.equal(found.start, at(2026, 8, 4, 9, 15));
  assert.equal(found.location, "Hoofdstraat 12, 3511 AA Utrecht");
  assert.equal(found.title, "Bevestiging van uw afspraak");
  assert.equal(found.origin, "e-mail");
  assert.equal(found.attachments.length, 1);
  assert.equal(found.organizer.email, "balie@praktijknoord.nl");
  assert.ok(found.confidence < 1, "uit tekst gelezen, dus niet zeker");
});

test("trusts the calendar part when the mail is a real invitation", () => {
  const invite = [
    "From: Sanne <sanne@example.nl>",
    "Subject: Uitnodiging: Projectoverleg",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="B"',
    "",
    "--B",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Zie de bijlage. Misschien op 1 januari 2027.",
    "",
    "--B",
    "Content-Type: text/calendar; charset=utf-8; method=REQUEST",
    "",
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:invite@example.nl",
    "SUMMARY:Projectoverleg",
    "DTSTART:20260804T130000Z",
    "DTEND:20260804T140000Z",
    "LOCATION:Zaal 2",
    "ATTENDEE;CN=Sanne:mailto:sanne@example.nl",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
    "--B--",
  ].join("\n");

  const found = appointmentsFromEmail(invite, { now: NOW });
  assert.equal(found.length, 1);
  assert.equal(found[0].title, "Projectoverleg");
  assert.equal(found[0].confidence, 1);
  assert.equal(found[0].origin, "uitnodiging");
  assert.equal(new Date(found[0].start).toISOString(), "2026-08-04T13:00:00.000Z");
  assert.equal(found[0].location, "Zaal 2");
});

test("keeps the attachments of an invitation mail with the appointment", () => {
  const invite = [
    "Subject: Uitnodiging",
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="B"',
    "",
    "--B",
    "Content-Type: text/calendar; charset=utf-8",
    "",
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:x@y",
    "SUMMARY:Overleg",
    "DTSTART:20260804T130000Z",
    "DTEND:20260804T140000Z",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
    "--B",
    'Content-Type: application/pdf; name="agenda.pdf"',
    'Content-Disposition: attachment; filename="agenda.pdf"',
    "Content-Transfer-Encoding: base64",
    "",
    b64("%PDF agenda"),
    "",
    "--B--",
  ].join("\n");

  const [found] = appointmentsFromEmail(invite, { now: NOW });
  assert.equal(found.attachments.length, 1);
  assert.equal(found.attachments[0].name, "agenda.pdf");
});

test("finds the join link in the body of a mail", () => {
  const raw = [
    "Subject: Online gesprek",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Op 4 augustus 2026 om 15:00 via https://meet.google.com/abc-defg-hij",
  ].join("\n");
  const [found] = appointmentsFromEmail(raw, { now: NOW });
  assert.equal(found.meetingUrl, "https://meet.google.com/abc-defg-hij");
});

test("reads an .ics pasted as plain text", () => {
  const found = appointmentsFromText(
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:p@t\r\nSUMMARY:Geplakt\r\nDTSTART:20260804T090000Z\r\nDTEND:20260804T093000Z\r\nEND:VEVENT\r\nEND:VCALENDAR",
    { now: NOW }
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].title, "Geplakt");
  assert.equal(found[0].confidence, 1);
});

test("reads a snippet of prose pasted in", () => {
  const [found] = appointmentsFromText("Keuring op 12 augustus 2026 om 08:30 bij Garage Van Dijk.", {
    now: NOW,
  });
  assert.equal(found.start, at(2026, 8, 12, 8, 30));
  assert.equal(found.origin, "tekst");
});

test("returns nothing rather than guessing at a mail without a date", () => {
  const raw = ["Subject: Nieuwsbrief", "Content-Type: text/plain", "", "Veel leesplezier."].join("\n");
  assert.deepEqual(appointmentsFromEmail(raw, { now: NOW }), []);
});
