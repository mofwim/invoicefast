/**
 * The corpus.
 *
 * Real confirmation mail is not "4 augustus 2026 om 09:15". People write
 * "aanstaande donderdag", "half elf", "tussen 13:00 en 15:00" — and the same
 * mail is full of dates that are not the appointment at all. Every case here
 * came from a shape that actually turns up in an inbox; together they are the
 * definition of "the import works".
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAppointments,
  findBring,
  findPhone,
} from "../lib/afspraken/datetext.js";

const NOW = new Date(2026, 7, 3, 9, 0).getTime(); // Monday 3 August 2026, 09:00
const at = (month, day, hour = 0, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute, 0, 0).getTime();

const read = (text, options) => extractAppointments(text, { now: NOW, max: 6, ...options });
const first = (text, options) => read(text, options)[0] || null;

const shows = (ms) =>
  ms == null ? "—" : new Date(ms).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });

function expectStart(text, want, label = "") {
  const found = first(text);
  assert.ok(found, `niets gevonden${label ? ` (${label})` : ""}`);
  assert.equal(
    found.start,
    want,
    `${label || "start"}: kreeg ${shows(found.start)}, wilde ${shows(want)}`
  );
  return found;
}

// ---------------------------------------------------------------- the plain

test("leest een bevestiging met labels", () => {
  const found = expectStart(
    `Beste heer Bakker,

Hierbij bevestigen wij uw afspraak.

Datum: dinsdag 4 augustus 2026
Tijd: 09:15 uur
Locatie: Tandartspraktijk Vondelpark, Vondelstraat 84, 1054 GN Amsterdam
Behandelaar: mw. drs. M. Jansen

Neem uw verzekeringspas en identiteitsbewijs mee.
Afzeggen kan tot 24 uur van tevoren via 020-1234567.`,
    at(8, 4, 9, 15)
  );
  assert.match(found.location, /Vondelstraat 84/);
  assert.deepEqual(found.bring, ["verzekeringspas", "identiteitsbewijs"]);
  assert.equal(found.phone, "020-1234567");
  assert.equal(found.cancelled, false, "‘afzeggen kan’ is een instructie, geen annulering");
});

test("leest een ziekenhuisbrief met 10.40 uur", () => {
  const found = expectStart(
    `Geachte mevrouw De Vries,

U heeft een afspraak op woensdag 12 augustus 2026 om 10.40 uur bij de polikliniek Cardiologie.
U wordt verwacht bij balie 4, route 62.

Meenemen: uw ziekenhuispas, een geldig identiteitsbewijs en een actueel medicatieoverzicht.`,
    at(8, 12, 10, 40)
  );
  assert.deepEqual(found.bring, ["ziekenhuispas", "geldig identiteitsbewijs", "actueel medicatieoverzicht"]);
});

test("leest ‘u wordt verwacht om’", () => {
  expectStart(
    `Uitnodiging keuring

U wordt verwacht op vrijdag 14 augustus 2026 om 13:45 uur bij het CBR, Stationsplein 1, Utrecht.`,
    at(8, 14, 13, 45)
  );
});

test("leest een Engelse uitnodiging", () => {
  expectStart(
    `Hi Youssef,

Your interview is scheduled for Thursday, August 13, 2026 at 3:00 PM.
Location: WeWork Weesperstraat 61, Amsterdam
Please bring a copy of your ID.`,
    at(8, 13, 15, 0)
  );
});

test("leest de Amerikaanse notatie", () => {
  expectStart(`Your appointment is confirmed for 08/13/2026 at 2:00 PM.`, at(8, 13, 14, 0));
});

test("leest een datum met punten", () => {
  expectStart(`Uw afspraak: 05.08.2026 om 11:00 uur.`, at(8, 5, 11, 0));
});

// ------------------------------------------------------------- relative days

test("leest ‘morgen’", () => {
  expectStart(`Je afspraak bij de fysio is morgen om 16:00.`, at(8, 4, 16, 0));
});

test("leest ‘vanavond’", () => {
  expectStart(`Vergeet je niet: vanavond om 19:30 de ouderavond op school.`, at(8, 3, 19, 30));
});

test("leest ‘aanstaande donderdag’", () => {
  expectStart(
    `Uw APK-afspraak staat gepland voor aanstaande donderdag om 08:30.
Garage Van Dijk, Industrieweg 22, 3542 AD Utrecht`,
    at(8, 6, 8, 30)
  );
});

test("leest ‘volgende week woensdag’", () => {
  expectStart(`Het overleg is verplaatst naar volgende week woensdag om 14:00.`, at(8, 12, 14, 0));
});

test("leest een kale weekdag als er geen echte datum staat", () => {
  expectStart(`Je wordt donderdag om 08:30 verwacht bij de garage.`, at(8, 6, 8, 30));
});

test("negeert een kale weekdag zodra er wel een datum staat", () => {
  const found = read(`Afspraak op vrijdag 7 augustus 2026 om 10:00. Reageren kan tot maandag.`);
  assert.equal(found.length, 1);
  assert.equal(found[0].start, at(8, 7, 10, 0));
});

test("kiest het jaar dat vlak vooruit ligt", () => {
  expectStart(`Uw controle staat gepland op 5 januari om 09:00 uur.`, at(1, 5, 9, 0, 2027));
});

// ------------------------------------------------------------- spoken times

test("leest ‘half elf’ als 10:30", () => {
  expectStart(`Je afspraak bij Salon Nova is bevestigd voor vrijdag 7 augustus om half elf.`, at(8, 7, 10, 30));
});

test("leest ‘kwart over negen’ en ‘kwart voor negen’", () => {
  expectStart(`De intake is op 11 augustus 2026 om kwart over negen.`, at(8, 11, 9, 15));
  expectStart(`Meld u om kwart voor negen op 5 augustus 2026 bij de balie.`, at(8, 5, 8, 45));
});

test("leest ‘tien over acht’", () => {
  expectStart(`De trein vertrekt op 7 augustus 2026 om tien over acht.`, at(8, 7, 8, 10));
});

test("schuift naar de middag of avond als het er staat", () => {
  expectStart(`De afspraak is op 6 augustus 2026 om half drie 's middags.`, at(8, 6, 14, 30));
  expectStart(`Ouderavond op 11 augustus 2026 om 7 uur 's avonds.`, at(8, 11, 19, 0));
});

// ------------------------------------------------------------------ ranges

test("leest ‘tussen 13:00 en 15:00’ als één blok", () => {
  const found = expectStart(
    `Uw pakket wordt bezorgd op maandag 10 augustus 2026 tussen 13:00 en 15:00.`,
    at(8, 10, 13, 0)
  );
  assert.equal(found.end, at(8, 10, 15, 0));
});

test("leest ‘van 9 uur tot 12 uur’", () => {
  const found = expectStart(`Workshop op 12 augustus 2026 van 9 uur tot 12 uur.`, at(8, 12, 9, 0));
  assert.equal(found.end, at(8, 12, 12, 0));
});

test("leest een Engelse ‘between … and …’", () => {
  const found = expectStart(`Delivery on August 12, 2026 between 2:00 PM and 4:00 PM.`, at(8, 12, 14, 0));
  assert.equal(found.end, at(8, 12, 16, 0));
});

test("koppelt twee losse tijden niet aan elkaar", () => {
  expectStart(`Balie open vanaf 08:00. Uw afspraak op 6 augustus 2026 is om 14:00 uur.`, at(8, 6, 14, 0));
});

// ------------------------------------------------------- afgelast en verzet

test("herkent een annulering", () => {
  const found = expectStart(
    `Onderwerp: Uw afspraak is geannuleerd

Uw afspraak van dinsdag 4 augustus 2026 om 09:15 is geannuleerd. Neem contact op voor een nieuwe afspraak.`,
    at(8, 4, 9, 15)
  );
  assert.equal(found.cancelled, true);
});

test("kiest bij een verzette afspraak de nieuwe datum", () => {
  const found = read(
    `Onderwerp: Uw afspraak is verzet

Uw afspraak van 4 augustus is verzet naar donderdag 6 augustus 2026 om 11:00.`
  );
  assert.equal(found.length, 1, "de oude datum hoort geen tweede afspraak te worden");
  assert.equal(found[0].start, at(8, 6, 11, 0));
});

// ------------------------------------------------- wat géén afspraak is

test("maakt geen afspraak van een factuur", () => {
  assert.deepEqual(
    read(`Factuur 2026-114

Factuurdatum: 27 juli 2026
Vervaldatum: 26 augustus 2026
Bedrag: EUR 240,00

Graag betalen binnen 30 dagen.`),
    []
  );
});

test("laat een geboortedatum niet winnen", () => {
  expectStart(
    `Patiënt: Y. Bakker, geboortedatum 14-03-1985

Afspraak: 12 augustus 2026 om 09:00 uur, polikliniek Interne Geneeskunde.`,
    at(8, 12, 9, 0)
  );
});

test("negeert de verzenddatum in de voettekst", () => {
  expectStart(
    `Uw afspraak is op 12 augustus 2026 om 09:00 uur.

Met vriendelijke groet,
Het team

Deze e-mail is automatisch verzonden op 27 juli 2026.`,
    at(8, 12, 9, 0)
  );
});

test("zwijgt bij een nieuwsbrief of een losse tijd", () => {
  assert.deepEqual(read(`Bekijk ons aanbod voor augustus 2026! Kortingen tot 40%.`), []);
  assert.deepEqual(read(`De vergadering begint om 14:00 uur.`), []);
});

// -------------------------------------------------------------- meerdere

test("leest alle data van een cursus", () => {
  const found = read(`Cursus Projectmanagement — de data:

- dinsdag 11 augustus 2026, 09:30 - 16:30
- dinsdag 18 augustus 2026, 09:30 - 16:30
- dinsdag 25 augustus 2026, 09:30 - 16:30`);
  assert.equal(found.length, 3);
  assert.deepEqual(
    found.map((f) => f.start).sort((a, b) => a - b),
    [at(8, 11, 9, 30), at(8, 18, 9, 30), at(8, 25, 9, 30)]
  );
});

test("houdt inchecken en uitchecken uit elkaar", () => {
  const found = read(`Reservering bevestigd.
Inchecken: 14 augustus 2026 vanaf 15:00
Uitchecken: 16 augustus 2026 voor 11:00`);
  assert.equal(found.length, 2);
});

// -------------------------------------------------------- losse onderdelen

test("plukt eruit wat je mee moet nemen", () => {
  assert.deepEqual(findBring("Neem uw verzekeringspas en identiteitsbewijs mee."), [
    "verzekeringspas",
    "identiteitsbewijs",
  ]);
  assert.deepEqual(findBring("Meenemen: ziekenhuispas, identiteitsbewijs en medicatieoverzicht"), [
    "ziekenhuispas",
    "identiteitsbewijs",
    "medicatieoverzicht",
  ]);
  assert.deepEqual(findBring("Er is niets bijzonders."), []);
});

test("vindt een telefoonnummer, maar geen ordernummer", () => {
  assert.equal(findPhone("Afzeggen kan via 020-1234567 of per mail."), "020-1234567");
  assert.equal(findPhone("Bel +31 6 12 34 56 78 voor vragen."), "+31 6 12 34 56 78");
  assert.equal(findPhone("Ordernummer 123456789012345678"), "");
  assert.equal(findPhone("Geen nummer hier."), "");
});
