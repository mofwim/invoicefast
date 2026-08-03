import test from "node:test";
import assert from "node:assert/strict";

import { HORIZON_MS, countPlanned, REMINDER_CHOICES } from "../lib/afspraken/reminders.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime();
const MINUTE = 60000;
const HOUR = 3600000;

const make = (over = {}) => ({
  dedupeKey: "k",
  title: "Afspraak",
  start: NOW + 2 * HOUR,
  end: NOW + 3 * HOUR,
  status: "CONFIRMED",
  ...over,
});

test("plans a reminder for an appointment inside the horizon", () => {
  assert.equal(countPlanned([make()], 30, NOW), 1);
});

test("plans nothing when reminders are off", () => {
  assert.equal(countPlanned([make()], 0, NOW), 0);
});

test("skips an appointment whose reminder moment already passed", () => {
  // Starts in 10 minutes, but the reminder was due 20 minutes ago.
  assert.equal(countPlanned([make({ start: NOW + 10 * MINUTE })], 30, NOW), 0);
});

test("leaves far-off appointments to a later planning round", () => {
  const beyond = make({ start: NOW + HORIZON_MS + 2 * HOUR });
  assert.equal(countPlanned([beyond], 30, NOW), 0);
});

test("does not remind about cancelled or all-day entries", () => {
  assert.equal(countPlanned([make({ status: "CANCELLED" })], 30, NOW), 0);
  assert.equal(countPlanned([make({ allDay: true })], 30, NOW), 0);
});

test("a longer lead time reaches further ahead", () => {
  // A day before an appointment 29 hours out falls 5 hours from now: in range
  // for the day-before setting, still far out of reach for the 30-minute one.
  const dayAfterTomorrow = make({ start: NOW + 29 * HOUR });
  assert.equal(countPlanned([dayAfterTomorrow], 30, NOW), 0, "30 min: nog te ver weg");
  assert.equal(countPlanned([dayAfterTomorrow], 1440, NOW), 1, "een dag vooraf: nu al te plannen");
});

test("a lead time whose moment has gone is not fired late", () => {
  // Opening the app this morning must not deliver yesterday's day-before nudge.
  assert.equal(countPlanned([make({ start: NOW + 22 * HOUR })], 1440, NOW), 0);
});

test("every offered choice is a whole number of minutes", () => {
  assert.ok(REMINDER_CHOICES.length >= 4);
  for (const choice of REMINDER_CHOICES) {
    assert.equal(typeof choice.value, "number");
    assert.ok(Number.isInteger(choice.value) && choice.value >= 0);
    assert.ok(choice.label.length > 1);
  }
});
