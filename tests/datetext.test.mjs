import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAppointments,
  findDates,
  findDuration,
  findLocation,
  findPeople,
  findTimes,
} from "../lib/afspraken/datetext.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime(); // 3 August 2026
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0).getTime();
const best = (text, options) => extractAppointments(text, { now: NOW, ...options })[0];

// ------------------------------------------------------------------ dates

test("reads Dutch written-out dates", () => {
  const [found] = findDates("op dinsdag 4 augustus 2026", NOW);
  assert.deepEqual([found.year, found.month, found.day], [2026, 8, 4]);
});

test("reads abbreviated and ordinal forms", () => {
  assert.deepEqual(
    findDates("12 sept. 2026", NOW).map((d) => [d.year, d.month, d.day])[0],
    [2026, 9, 12]
  );
  assert.deepEqual(
    findDates("op de 3e oktober", NOW).map((d) => [d.month, d.day])[0],
    [10, 3]
  );
});

test("reads English dates in either order", () => {
  assert.deepEqual(
    findDates("Monday, August 3, 2026", NOW).map((d) => [d.year, d.month, d.day])[0],
    [2026, 8, 3]
  );
  assert.deepEqual(
    findDates("3 September 2026", NOW).map((d) => [d.year, d.month, d.day])[0],
    [2026, 9, 3]
  );
});

test("reads numeric dates day-first, as written in the Netherlands", () => {
  assert.deepEqual(findDates("04-08-2026", NOW).map((d) => [d.month, d.day])[0], [8, 4]);
  assert.deepEqual(findDates("4/8/2026", NOW).map((d) => [d.month, d.day])[0], [8, 4]);
  assert.deepEqual(findDates("2026-08-04", NOW).map((d) => [d.month, d.day])[0], [8, 4]);
});

test("flips to month-first when day-first is impossible", () => {
  assert.deepEqual(findDates("12/25/2026", NOW).map((d) => [d.month, d.day])[0], [12, 25]);
});

test("rejects dates that do not exist", () => {
  assert.equal(findDates("31-02-2026", NOW).length, 0);
});

test("guesses the year that lies just ahead", () => {
  const [found] = findDates("15 januari", NOW); // read in August 2026
  assert.equal(found.year, 2027);
  const [near] = findDates("20 augustus", NOW);
  assert.equal(near.year, 2026);
});

// ------------------------------------------------------------------ times

test("reads the ways a time gets written", () => {
  const read = (text) => {
    const [t] = findTimes(text);
    return t ? [t.hour, t.minute] : null;
  };
  assert.deepEqual(read("om 14:00"), [14, 0]);
  assert.deepEqual(read("om 14.30"), [14, 30]);
  assert.deepEqual(read("om 9u15"), [9, 15]);
  assert.deepEqual(read("om 8 uur"), [8, 0]);
  assert.deepEqual(read("at 2:15 PM"), [14, 15]);
  assert.deepEqual(read("at 9am"), [9, 0]);
  assert.deepEqual(read("at 12am"), [0, 0]);
});

test("does not mistake a bare number for a time", () => {
  assert.equal(findTimes("kamer 5 op de tweede verdieping").length, 0);
});

test("reads a written-out duration", () => {
  assert.equal(findDuration("de afspraak duurt 45 minuten"), 45 * 60000);
  assert.equal(findDuration("reken op 1,5 uur"), 90 * 60000);
  assert.equal(findDuration("geen tijd genoemd"), null);
});

// ------------------------------------------------------------ full reading

test("reads a Dutch confirmation mail", () => {
  const found = best(
    "Beste heer Bakker,\n\nUw afspraak is op dinsdag 4 augustus 2026 om 9:15 uur.\nLocatie: Hoofdstraat 12, 3511 AA Utrecht\n\nMet vriendelijke groet"
  );
  assert.equal(found.start, at(2026, 8, 4, 9, 15));
  assert.equal(found.location, "Hoofdstraat 12, 3511 AA Utrecht");
  assert.equal(found.allDay, false);
  assert.ok(found.confidence >= 0.75, `verwacht vertrouwen, kreeg ${found.confidence}`);
});

test("reads a time range, even when the date comes after it", () => {
  const found = best("De bijeenkomst is van 10:00 tot 11:30 op 5 september 2026.");
  assert.equal(found.start, at(2026, 9, 5, 10, 0));
  assert.equal(found.end, at(2026, 9, 5, 11, 30));
});

test("reads a range written after the date", () => {
  const found = best("Afspraak op 5 september 2026, 14:00 - 15:30 uur.");
  assert.equal(found.start, at(2026, 9, 5, 14, 0));
  assert.equal(found.end, at(2026, 9, 5, 15, 30));
});

test("reads an English invitation", () => {
  const found = best("Your appointment is confirmed for Monday, August 10, 2026 at 2:30 PM.");
  assert.equal(found.start, at(2026, 8, 10, 14, 30));
});

test("falls back to an all-day entry when no time is given", () => {
  const found = best("Noteer alvast 12 december 2026 in je agenda.");
  assert.equal(found.allDay, true);
  assert.equal(found.start, at(2026, 12, 12));
});

test("applies a stated duration", () => {
  const found = best("Intake op 4 augustus 2026 om 10:00. De afspraak duurt 45 minuten.");
  assert.equal(found.end - found.start, 45 * 60000);
});

test("is less sure about a date with no appointment language around it", () => {
  const vague = best("De factuur van 4 augustus 2026 is voldaan.");
  const clear = best("Uw afspraak is bevestigd op 4 augustus 2026 om 10:00 uur.");
  assert.ok(vague.confidence < clear.confidence);
  assert.ok(vague.confidence < 0.75, "een losse datum moet als onzeker gelden");
});

test("returns nothing when there is no date at all", () => {
  assert.deepEqual(extractAppointments("Bedankt voor uw bericht.", { now: NOW }), []);
});

test("collapses the same moment mentioned twice", () => {
  const found = extractAppointments(
    "Afspraak 4 augustus 2026 om 09:15\n\nUw afspraak op 4 augustus 2026 om 09:15 is bevestigd.",
    { now: NOW }
  );
  assert.equal(found.length, 1);
});

test("keeps two genuinely different appointments apart", () => {
  const found = extractAppointments(
    "Eerste afspraak op 4 augustus 2026 om 09:15.\nTweede afspraak op 11 augustus 2026 om 14:00.",
    { now: NOW }
  );
  assert.equal(found.length, 2);
});

// -------------------------------------------------------- where and who

test("finds a labelled location", () => {
  assert.equal(findLocation("Waar: Stadskantoor, zaal 3"), "Stadskantoor, zaal 3");
  assert.equal(findLocation("Adres – Kerkstraat 3, Utrecht"), "Kerkstraat 3, Utrecht");
  assert.equal(findLocation("Location: Room 2.14"), "Room 2.14");
});

test("falls back to the line holding a postcode", () => {
  assert.equal(
    findLocation("Praktijk Noord\nHoofdstraat 12\n3511 AA Utrecht\n\nTot ziens"),
    "Hoofdstraat 12, 3511 AA Utrecht"
  );
});

test("finds who the appointment is with", () => {
  const people = findPeople("U heeft een afspraak met dr. Jansen.\nBehandelaar: R. Hoekstra");
  const names = people.map((p) => p.name);
  assert.ok(names.some((n) => /Jansen/.test(n)), `verwacht Jansen in ${JSON.stringify(names)}`);
  assert.ok(names.some((n) => /Hoekstra/.test(n)), `verwacht Hoekstra in ${JSON.stringify(names)}`);
});

test("ignores no-reply addresses", () => {
  const people = findPeople("Vragen? Mail naar noreply@example.nl of balie@example.nl");
  assert.ok(!people.some((p) => /noreply/.test(p.email)));
  assert.ok(people.some((p) => p.email === "balie@example.nl"));
});
