/**
 * Deleting an appointment.
 *
 * What a delete can mean depends on where the appointment came from, and the
 * difference has to hold: a manual entry really goes, a synced one has to stay
 * gone across the next sync without being lost for good.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  addManualAppointment,
  buildTimeline,
  deleteAppointment,
  emptyState,
  ingestEvents,
  listDeleted,
  restoreAllDeleted,
  restoreAppointment,
} from "../lib/afspraken/store.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime();
const HOUR = 3600000;

const event = (over = {}) => ({
  id: `e-${over.title || "x"}`,
  uid: `${over.title || "x"}@test`,
  title: "Afspraak",
  start: NOW + HOUR,
  end: NOW + 2 * HOUR,
  confidence: 1,
  ...over,
});

async function withCalendar(...events) {
  return ingestEvents(emptyState(), {
    kind: "url",
    label: "Werkagenda",
    url: "https://example.nl/agenda.ics",
    events,
  });
}

test("a manual appointment is really gone", () => {
  let state = addManualAppointment(emptyState(), {
    title: "Zelf getypt",
    start: NOW + HOUR,
    end: NOW + 2 * HOUR,
  });
  const [appointment] = buildTimeline(state);
  assert.ok(appointment);

  const result = deleteAppointment(state, appointment);
  assert.equal(result.permanent, true);
  assert.deepEqual(buildTimeline(result.state), []);
  assert.deepEqual(listDeleted(result.state), [], "niets om terug te zetten: hij bestaat niet meer");

  const source = result.state.sources.find((s) => s.kind === "manual");
  assert.equal(source.count, 0, "de teller van de bron moet meelopen");
});

test("a synced appointment is remembered as deleted, not thrown away", async () => {
  const state = await withCalendar(event({ title: "Overleg" }), event({ title: "Fysio", id: "e-2", uid: "2@test" }));
  const timeline = buildTimeline(state);
  assert.equal(timeline.length, 2);

  const result = deleteAppointment(state, timeline.find((a) => a.title === "Overleg"));
  assert.equal(result.permanent, false);

  const after = buildTimeline(result.state);
  assert.deepEqual(after.map((a) => a.title), ["Fysio"]);

  const deleted = listDeleted(result.state);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].title, "Overleg");
  assert.equal(deleted[0].start, NOW + HOUR, "de lijst moet tonen wat er weg is");
});

test("a deleted appointment stays gone when the calendar comes back", async () => {
  const state = await withCalendar(event({ title: "Overleg" }));
  const { state: afterDelete } = deleteAppointment(state, buildTimeline(state)[0]);

  // Same source id, freshly fetched events — exactly what a re-sync writes.
  const sourceId = afterDelete.sources[0].id;
  const resynced = {
    ...afterDelete,
    items: { ...afterDelete.items, [sourceId]: [event({ title: "Overleg" })] },
  };

  assert.deepEqual(buildTimeline(resynced), [], "een re-sync mag hem niet terugbrengen");
});

test("terugzetten brings it back", async () => {
  const state = await withCalendar(event({ title: "Overleg" }));
  const { state: afterDelete } = deleteAppointment(state, buildTimeline(state)[0]);
  const [entry] = listDeleted(afterDelete);

  const restored = restoreAppointment(afterDelete, entry.key);
  assert.deepEqual(buildTimeline(restored).map((a) => a.title), ["Overleg"]);
  assert.deepEqual(listDeleted(restored), []);
  assert.deepEqual(restored.overrides, {}, "geen restanten in de overrides");
});

test("an edit survives a delete and a restore", async () => {
  const state = await withCalendar(event({ title: "Overleg" }));
  const timeline = buildTimeline(state);

  // Rename it first, then delete and put it back.
  const { setOverride } = await import("../lib/afspraken/store.js");
  const renamed = setOverride(state, timeline[0].dedupeKey, { title: "Mijn eigen naam" });
  const { state: afterDelete } = deleteAppointment(renamed, buildTimeline(renamed)[0]);
  const restored = restoreAppointment(afterDelete, listDeleted(afterDelete)[0].key);

  assert.deepEqual(buildTimeline(restored).map((a) => a.title), ["Mijn eigen naam"]);
});

test("alles terugzetten empties the list", async () => {
  let state = await withCalendar(
    event({ title: "Een" }),
    event({ title: "Twee", id: "e-2", uid: "2@test" }),
    event({ title: "Drie", id: "e-3", uid: "3@test" })
  );
  for (const appointment of buildTimeline(state)) {
    state = deleteAppointment(state, appointment).state;
  }
  assert.equal(listDeleted(state).length, 3);
  assert.deepEqual(buildTimeline(state), []);

  const restored = restoreAllDeleted(state);
  assert.equal(listDeleted(restored).length, 0);
  assert.equal(buildTimeline(restored).length, 3);
});

test("deleting one occurrence leaves the rest of a series alone", async () => {
  const state = await withCalendar(
    event({ title: "Wekelijks", id: "w|1", uid: "w@test", start: NOW + HOUR, end: NOW + 2 * HOUR }),
    event({ title: "Wekelijks", id: "w|2", uid: "w@test", start: NOW + 7 * 24 * HOUR, end: NOW + 7 * 24 * HOUR + HOUR })
  );
  const timeline = buildTimeline(state);
  assert.equal(timeline.length, 2, "twee losse momenten van dezelfde serie");

  const { state: after } = deleteAppointment(state, timeline[0]);
  const left = buildTimeline(after);
  assert.equal(left.length, 1);
  assert.equal(left[0].start, NOW + 7 * 24 * HOUR);
});
