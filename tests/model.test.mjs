import test from "node:test";
import assert from "node:assert/strict";

import {
  DAY,
  HOUR,
  MINUTE,
  bucketOf,
  dedupeAppointments,
  formatDayHeading,
  formatDuration,
  formatRelative,
  groupByDay,
  initialsOf,
  matchesQuery,
  normalizeAppointment,
  splitIntoBuckets,
  urgencyOf,
} from "../lib/afspraken/model.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime(); // Monday 3 August 2026, 09:00
const make = (over = {}) => ({
  title: "Afspraak",
  start: NOW + HOUR,
  end: NOW + 2 * HOUR,
  status: "CONFIRMED",
  ...over,
});

// ----------------------------------------------------------------- buckets

test("puts an appointment in the right bucket", () => {
  assert.equal(bucketOf(make({ start: NOW - 3 * HOUR, end: NOW - 2 * HOUR }), NOW), "voorbij");
  assert.equal(bucketOf(make({ start: NOW + 2 * HOUR, end: NOW + 3 * HOUR }), NOW), "binnenkort");
  assert.equal(bucketOf(make({ start: NOW + 20 * DAY, end: NOW + 20 * DAY + HOUR }), NOW), "later");
});

test("counts something already running as binnenkort, not voorbij", () => {
  assert.equal(bucketOf(make({ start: NOW - 10 * MINUTE, end: NOW + 20 * MINUTE }), NOW), "binnenkort");
});

test("respects the chosen length of binnenkort", () => {
  const inTenDays = make({ start: NOW + 10 * DAY, end: NOW + 10 * DAY + HOUR });
  assert.equal(bucketOf(inTenDays, NOW, 7), "later");
  assert.equal(bucketOf(inTenDays, NOW, 14), "binnenkort");
});

test("sorts the past backwards and the future forwards", () => {
  const buckets = splitIntoBuckets(
    [
      make({ title: "oud", start: NOW - 5 * DAY, end: NOW - 5 * DAY + HOUR }),
      make({ title: "recent", start: NOW - HOUR, end: NOW - 30 * MINUTE }),
      make({ title: "straks", start: NOW + HOUR, end: NOW + 2 * HOUR }),
      make({ title: "morgen", start: NOW + DAY, end: NOW + DAY + HOUR }),
    ],
    NOW
  );
  assert.deepEqual(buckets.voorbij.map((a) => a.title), ["recent", "oud"]);
  assert.deepEqual(buckets.binnenkort.map((a) => a.title), ["straks", "morgen"]);
});

// ---------------------------------------------------------------- urgency

test("assigns the urgency tier from the distance to now", () => {
  const tier = (over) => urgencyOf(make(over), NOW).tier;
  assert.equal(tier({ start: NOW - 10 * MINUTE, end: NOW + 20 * MINUTE }), "now");
  assert.equal(tier({ start: NOW + 30 * MINUTE, end: NOW + HOUR }), "imminent");
  assert.equal(tier({ start: NOW + 9 * HOUR, end: NOW + 10 * HOUR }), "today");
  assert.equal(tier({ start: NOW + DAY, end: NOW + DAY + HOUR }), "tomorrow");
  assert.equal(tier({ start: NOW + 4 * DAY, end: NOW + 4 * DAY + HOUR }), "week");
  assert.equal(tier({ start: NOW + 20 * DAY, end: NOW + 20 * DAY + HOUR }), "month");
  assert.equal(tier({ start: NOW + 90 * DAY, end: NOW + 90 * DAY + HOUR }), "far");
  assert.equal(tier({ start: NOW - 2 * DAY, end: NOW - 2 * DAY + HOUR }), "past");
});

test("marks a cancelled appointment as cancelled whenever it is", () => {
  const urgency = urgencyOf(make({ start: NOW + HOUR, status: "CANCELLED" }), NOW);
  assert.equal(urgency.tier, "cancelled");
});

test("heat cools off as an appointment moves further away", () => {
  const heat = (days) => urgencyOf(make({ start: NOW + days * DAY, end: NOW + days * DAY + HOUR }), NOW).heat;
  const series = [0.05, 1, 3, 7, 20, 45].map(heat);
  for (let i = 1; i < series.length; i++) {
    assert.ok(series[i] <= series[i - 1], `warmte moet dalen: ${series.join(" > ")}`);
  }
  assert.ok(series[0] > 0.8, "vandaag hoort heet te zijn");
  assert.equal(series[series.length - 1], 0, "over anderhalve maand hoort koud te zijn");
});

test("a past appointment fades further the longer ago it was", () => {
  const fade = (days) => urgencyOf(make({ start: NOW - days * DAY, end: NOW - days * DAY + HOUR }), NOW).fade;
  assert.ok(fade(1) < fade(20));
  assert.ok(fade(20) < fade(200));
  assert.ok(fade(200) <= 0.8, "nooit helemaal onleesbaar");
});

// --------------------------------------------------------------- language

test("says how far away something is, in Dutch", () => {
  const say = (over) => formatRelative(make(over), NOW);
  assert.equal(say({ start: NOW - 5 * MINUTE, end: NOW + 2 * HOUR }), "nu bezig");
  assert.equal(say({ start: NOW - 5 * MINUTE, end: NOW + 20 * MINUTE }), "nog 20 min");
  assert.equal(say({ start: NOW + 30 * MINUTE, end: NOW + HOUR }), "over 30 minuten");
  assert.equal(say({ start: NOW + 60 * MINUTE, end: NOW + 2 * HOUR }), "over 1 uur");
  assert.equal(say({ start: NOW + 3 * HOUR, end: NOW + 4 * HOUR }), "over 3 uur");
  assert.equal(say({ start: NOW + 11 * HOUR, end: NOW + 12 * HOUR }), "over 11 uur");
  // Crossing midnight is "morgen", never "over 20 uur".
  assert.equal(say({ start: NOW + 20 * HOUR, end: NOW + 21 * HOUR }), "morgen");
  assert.equal(say({ start: NOW + DAY, end: NOW + DAY + HOUR }), "morgen");
  assert.equal(say({ start: NOW + 3 * DAY, end: NOW + 3 * DAY + HOUR }), "over 3 dagen");
  assert.equal(say({ start: NOW + 21 * DAY, end: NOW + 21 * DAY + HOUR }), "over 3 weken");
  assert.equal(say({ start: NOW - 3 * DAY, end: NOW - 3 * DAY + HOUR }), "3 dagen geleden");
});

test("names the day the way a person would", () => {
  assert.equal(formatDayHeading(NOW + 2 * HOUR, NOW), "Vandaag");
  assert.equal(formatDayHeading(NOW + DAY, NOW), "Morgen");
  assert.equal(formatDayHeading(NOW + 2 * DAY, NOW), "Overmorgen");
  assert.equal(formatDayHeading(NOW - DAY, NOW), "Gisteren");
  assert.match(formatDayHeading(NOW + 5 * DAY, NOW), /augustus/);
});

test("writes durations plainly", () => {
  assert.equal(formatDuration(30 * MINUTE), "30 min");
  assert.equal(formatDuration(HOUR), "1 uur");
  assert.equal(formatDuration(2 * HOUR), "2 uur");
  assert.equal(formatDuration(90 * MINUTE), "1 u 30 min");
  assert.equal(formatDuration(DAY), "1 dag");
});

test("builds initials from a name or an address", () => {
  assert.equal(initialsOf({ name: "Sanne de Groot" }), "SG");
  assert.equal(initialsOf({ name: "", email: "youssef.bakker@example.nl" }), "YN");
  assert.equal(initialsOf({ name: "Karin" }), "KA");
});

// ------------------------------------------------------- normalise & merge

test("normalising fills the gaps and refuses a dateless entry", () => {
  const appointment = normalizeAppointment({ title: "  ", start: NOW }, { sourceId: "s1", sourceKind: "ics" });
  assert.equal(appointment.title, "Afspraak");
  assert.equal(appointment.end, NOW + 30 * MINUTE);
  assert.equal(appointment.source.id, "s1");
  assert.equal(normalizeAppointment({ title: "x", start: "geen datum" }, {}), null);
});

test("the same meeting from two sources becomes one row", () => {
  const fromCalendar = normalizeAppointment(
    { uid: "abc@example", title: "Overleg", start: NOW + HOUR, end: NOW + 2 * HOUR, confidence: 1 },
    { sourceId: "cal", sourceKind: "url", sourceLabel: "Werkagenda" }
  );
  const fromMail = normalizeAppointment(
    {
      uid: "abc@example",
      title: "Overleg",
      start: NOW + HOUR,
      end: NOW + 2 * HOUR,
      confidence: 0.8,
      location: "Zaal 2",
      attachments: [{ name: "stukken.pdf", size: 10 }],
    },
    { sourceId: "mail", sourceKind: "email", sourceLabel: "E-mail" }
  );

  const merged = dedupeAppointments([fromCalendar, fromMail]);
  assert.equal(merged.length, 1);
  // The calendar copy wins, but keeps what only the mail knew.
  assert.equal(merged[0].source.kind, "url");
  assert.equal(merged[0].location, "Zaal 2");
  assert.equal(merged[0].attachments.length, 1);
  assert.deepEqual(merged[0].alsoFrom, ["E-mail"]);
});

test("appointments at different times stay separate", () => {
  const a = normalizeAppointment({ title: "Overleg", start: NOW + HOUR, end: NOW + 2 * HOUR }, {});
  const b = normalizeAppointment({ title: "Overleg", start: NOW + 3 * HOUR, end: NOW + 4 * HOUR }, {});
  assert.equal(dedupeAppointments([a, b]).length, 2);
});

// ---------------------------------------------------------- group & search

test("groups by day in order", () => {
  const groups = groupByDay(
    [
      make({ title: "a", start: NOW + HOUR }),
      make({ title: "b", start: NOW + 3 * HOUR }),
      make({ title: "c", start: NOW + DAY }),
    ],
    NOW
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "Vandaag");
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].label, "Morgen");
});

test("search looks at everything attached to an appointment", () => {
  const appointment = make({
    title: "Tandarts controle",
    location: "Hoofdstraat 12, Utrecht",
    people: [{ name: "Dr. Jansen", email: "jansen@praktijk.nl" }],
    attachments: [{ name: "verwijsbrief.pdf" }],
  });
  assert.ok(matchesQuery(appointment, "tandarts"));
  assert.ok(matchesQuery(appointment, "utrecht"));
  assert.ok(matchesQuery(appointment, "jansen"));
  assert.ok(matchesQuery(appointment, "verwijsbrief"));
  assert.ok(matchesQuery(appointment, "jansen tandarts"), "woorden mogen in elke volgorde");
  assert.ok(!matchesQuery(appointment, "fysio"));
  assert.ok(matchesQuery(appointment, "   "), "leeg zoeken toont alles");
});
