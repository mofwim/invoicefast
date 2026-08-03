/**
 * The words inside each tool.
 *
 * Translations sit next to each other, one key at a time, so a missing
 * language is visible at a glance instead of hiding in a second file. A tool
 * asks for its own bundle and gets a flat object in the language it was asked
 * for, falling back to Dutch rather than rendering an empty control.
 */

import { DEFAULT_LOCALE } from "./locales";

const STRINGS = {
  // ---------------------------------------------------------------- shared
  _shared: {
    dropImage: { nl: "Sleep een afbeelding hierheen", en: "Drop an image here" },
    dropHint: { nl: "of klik om er een te kiezen", en: "or click to pick one" },
    dropHintPaste: { nl: "of klik om te kiezen — plakken mag ook", en: "or click to pick one — pasting works too" },
    settings: { nl: "Instellingen", en: "Settings" },
    format: { nl: "Formaat", en: "Format" },
    quality: { nl: "Kwaliteit", en: "Quality" },
    save: { nl: "Opslaan", en: "Save" },
    saveAll: { nl: "Alles opslaan", en: "Save all" },
    busy: { nl: "Bezig…", en: "Working…" },
    result: { nl: "Resultaat", en: "Result" },
    preview: { nl: "Voorbeeld", en: "Preview" },
    was: { nl: "Was", en: "Before" },
    becomes: { nl: "Wordt", en: "After" },
    size: { nl: "Afmeting", en: "Dimensions" },
    colour: { nl: "Kleur", en: "Colour" },
    white: { nl: "Wit", en: "White" },
    black: { nl: "Zwart", en: "Black" },
  },

  // ------------------------------------------------------- compress-image
  "compress-image": {
    free: { nl: "Vrij", en: "No limit" },
    maxSize: { nl: "Maximale grootte", en: "Size ceiling" },
    maxSizeHint: {
      nl: "De kwaliteit zakt net zo ver als nodig is",
      en: "Quality drops only as far as it must",
    },
    startQuality: { nl: "Startkwaliteit", en: "Starting quality" },
    maxWidth: { nl: "Breedte maximaal", en: "Maximum width" },
    maxWidthHint: { nl: "0 laat de afmeting met rust", en: "0 leaves the dimensions alone" },
    run: { nl: "Comprimeren", en: "Compress" },
    missed: {
      nl: "Zo klein krijgt hij hem niet zonder de foto onherkenbaar te maken. Zet de breedte lager of kies een ruimere limiet.",
      en: "It cannot get that small without ruining the picture. Lower the width or pick a roomier ceiling.",
    },
    smaller: { nl: "{pct}% kleiner — van {was} naar {now}.", en: "{pct}% smaller — from {was} to {now}." },
    alreadySmall: {
      nl: "Deze afbeelding was al zuinig: {now}.",
      en: "This image was already lean: {now}.",
    },
  },

  // -------------------------------------------------------- convert-image
  "convert-image": {
    target: { nl: "Waar naartoe", en: "Convert to" },
    dropMany: { nl: "Sleep je afbeeldingen hierheen", en: "Drop your images here" },
    dropManyHint: {
      nl: "meerdere tegelijk mag — kies eerst hierboven het formaat",
      en: "several at once is fine — pick the format above first",
    },
    converting: { nl: "Bezig met omzetten…", en: "Converting…" },
    noWebp: {
      nl: "Deze browser maakt geen WebP. JPG en PNG werken wel.",
      en: "This browser cannot make WebP. JPG and PNG do work.",
    },
    done: { nl: "Klaar ({n})", en: "Done ({n})" },
  },

  // --------------------------------------------------------- resize-image
  "resize-image": {
    sizePanel: { nl: "Maat", en: "Size" },
    platform: { nl: "Platform en plek", en: "Platform and placement" },
    fit: { nl: "Passend maken", en: "Fitting" },
    fitCover: { nl: "Bijsnijden", en: "Crop" },
    fitContain: { nl: "Passend", en: "Fit inside" },
    fitCoverHint: { nl: "Vult het kader, randen eraf", en: "Fills the frame, edges trimmed" },
    fitContainHint: {
      nl: "Alles blijft zichtbaar, met een rand erbij",
      en: "Everything stays visible, with a border added",
    },
    borderColour: { nl: "Kleur van de rand", en: "Border colour" },
    original: { nl: "Origineel", en: "Original" },
    fileSize: { nl: "Grootte", en: "File size" },
  },

  // --------------------------------------------------------- make-favicon
  "make-favicon": {
    dropLogo: { nl: "Sleep je logo hierheen", en: "Drop your logo here" },
    dropLogoHint: {
      nl: "vierkant werkt het best — PNG of SVG met transparantie mag",
      en: "square works best — PNG or SVG with transparency is fine",
    },
    making: { nl: "Bezig met maken…", en: "Building the set…" },
    backgroundPanel: { nl: "Achtergrond", en: "Background" },
    fill: { nl: "Vulling", en: "Fill" },
    fillHint: { nl: "Leeg laten houdt de transparantie", en: "Leaving it off keeps the transparency" },
    fillColour: { nl: "Achtergrondkleur", en: "Background colour" },
    setTitle: { nl: "{n} maten + favicon.ico", en: "{n} sizes + favicon.ico" },
    icoMeta: { nl: "{sizes} px in één bestand", en: "{sizes} px in one file" },
    htmlPanel: { nl: "In je HTML", en: "In your HTML" },
    copyLines: { nl: "Regels kopiëren", en: "Copy the lines" },
  },

  // ------------------------------------------------------ watermark-image
  "watermark-image": {
    panel: { nl: "Watermerk", en: "Watermark" },
    text: { nl: "Tekst", en: "Text" },
    textPlaceholder: { nl: "© jouw naam", en: "© your name" },
    place: { nl: "Plek", en: "Position" },
    bottomRight: { nl: "Rechtsonder", en: "Bottom right" },
    bottomLeft: { nl: "Linksonder", en: "Bottom left" },
    topRight: { nl: "Rechtsboven", en: "Top right" },
    topLeft: { nl: "Linksboven", en: "Top left" },
    centre: { nl: "Midden", en: "Centre" },
    tile: { nl: "Over de hele foto", en: "Across the whole photo" },
    scale: { nl: "Grootte", en: "Size" },
    opacity: { nl: "Doorzichtigheid", en: "Transparency" },
    previewAlt: { nl: "Voorbeeld met watermerk", en: "Preview with watermark" },
  },

  // ------------------------------------------------------------ pdf shared
  _pdf: {
    dropPdf: { nl: "Sleep een PDF hierheen", en: "Drop a PDF here" },
    dropPdfs: { nl: "Sleep je PDF's hierheen", en: "Drop your PDFs here" },
    pdfHint: { nl: "of klik om te kiezen", en: "or click to pick one" },
    pages: { nl: "pagina's", en: "pages" },
    page: { nl: "pagina", en: "page" },
    pageCount: { nl: "{n} pagina's", en: "{n} pages" },
    remove: { nl: "Verwijderen", en: "Remove" },
    reading: { nl: "Bezig met lezen…", en: "Reading…" },
    building: { nl: "Bezig…", en: "Working…" },
  },

  "merge-pdf": {
    dropHint: {
      nl: "meerdere tegelijk mag — de volgorde bepaal je hieronder",
      en: "several at once is fine — you set the order below",
    },
    order: { nl: "Volgorde", en: "Order" },
    up: { nl: "Omhoog", en: "Move up" },
    down: { nl: "Omlaag", en: "Move down" },
    merge: { nl: "Samenvoegen", en: "Merge" },
    needTwo: { nl: "Kies minstens twee PDF's.", en: "Pick at least two PDFs." },
    done: {
      nl: "{files} bestanden samengevoegd tot {pages} pagina's.",
      en: "{files} files merged into {pages} pages.",
    },
  },

  "split-pdf": {
    how: { nl: "Hoe splitsen", en: "How to split" },
    modePick: { nl: "Pagina's kiezen", en: "Pick pages" },
    modeEvery: { nl: "In stukken", en: "Into parts" },
    which: { nl: "Welke pagina's", en: "Which pages" },
    whichHint: { nl: "Bijvoorbeeld 1-3, 7, 12-", en: "For example 1-3, 7, 12-" },
    every: { nl: "Pagina's per stuk", en: "Pages per part" },
    selected: { nl: "{n} van {total} geselecteerd", en: "{n} of {total} selected" },
    none: { nl: "Geen geldige pagina's opgegeven.", en: "No valid pages given." },
    split: { nl: "Splitsen", en: "Split" },
    partName: { nl: "deel", en: "part" },
  },

  "organise-pdf": {
    rotateLeft: { nl: "Links draaien", en: "Turn left" },
    rotateRight: { nl: "Rechts draaien", en: "Turn right" },
    restore: { nl: "Terugzetten", en: "Restore" },
    willDrop: { nl: "Wordt verwijderd", en: "Will be removed" },
    summary: {
      nl: "{keep} van {total} pagina's blijven over.",
      en: "{keep} of {total} pages will remain.",
    },
    apply: { nl: "Toepassen", en: "Apply" },
    allDropped: { nl: "Zo blijft er geen enkele pagina over.", en: "That would leave no pages at all." },
  },

  "images-to-pdf": {
    dropImages: { nl: "Sleep je afbeeldingen hierheen", en: "Drop your images here" },
    dropImagesHint: {
      nl: "JPG en PNG — de volgorde bepaal je hieronder",
      en: "JPG and PNG — you set the order below",
    },
    layout: { nl: "Bladzijde", en: "Page" },
    a4: { nl: "A4", en: "A4" },
    fitPage: { nl: "Op maat", en: "Cut to size" },
    margin: { nl: "Marge", en: "Margin" },
    background: { nl: "Achtergrond", en: "Background" },
    make: { nl: "PDF maken", en: "Make the PDF" },
    done: { nl: "PDF van {n} pagina's gemaakt.", en: "Made a PDF of {n} pages." },
  },

  "stamp-pdf": {
    stamp: { nl: "Stempel", en: "Stamp" },
    text: { nl: "Tekst", en: "Text" },
    textPlaceholder: { nl: "KOPIE", en: "COPY" },
    size: { nl: "Grootte", en: "Size" },
    opacity: { nl: "Doorzichtigheid", en: "Transparency" },
    angle: { nl: "Hoek", en: "Angle" },
    colour: { nl: "Kleur", en: "Colour" },
    numbers: { nl: "Paginanummers erbij", en: "Add page numbers" },
    apply: { nl: "Toepassen", en: "Apply" },
    nothing: {
      nl: "Vul een tekst in of zet de paginanummers aan.",
      en: "Type some text or switch the page numbers on.",
    },
    done: { nl: "Toegepast op {n} pagina's.", en: "Applied to {n} pages." },
  },

  // --------------------------------------------------------- unpack-email
  "unpack-email": {
    drop: { nl: "Sleep een .eml hierheen", en: "Drop a .eml here" },
    dropHint: { nl: "of klik om er een te kiezen", en: "or click to pick one" },
    notMail: {
      nl: "Dit lijkt geen opgeslagen e-mail. Verwacht een .eml-bestand.",
      en: "This does not look like a saved e-mail. A .eml file is expected.",
    },
    unreadable: { nl: "Kon dit bestand niet lezen: {message}", en: "Could not read this file: {message}" },
    noSubject: { nl: "(geen onderwerp)", en: "(no subject)" },
    unknownSender: { nl: "Onbekende afzender", en: "Unknown sender" },
    to: { nl: "Aan", en: "To" },
    viewText: { nl: "Tekst", en: "Text" },
    viewHtml: { nl: "Opmaak", en: "Formatted" },
    viewLabel: { nl: "Weergave van de tekst", en: "How to show the text" },
    frameTitle: { nl: "Inhoud van de e-mail", en: "Contents of the e-mail" },
    noText: { nl: "(deze e-mail heeft geen tekst)", en: "(this e-mail has no text)" },
    saveText: { nl: "Tekst opslaan", en: "Save the text" },
    invitePanel: { nl: "Uitnodiging in deze e-mail", en: "Invitation inside this e-mail" },
    openInApp: { nl: "Openen in Mijn Afspraken", en: "Open in Mijn Afspraken" },
    attachments: { nl: "Bijlagen", en: "Attachments" },
    noAttachments: { nl: "Deze e-mail heeft geen bijlagen.", en: "This e-mail has no attachments." },
  },

  // ------------------------------------------------------ convert-calendar
  "convert-calendar": {
    drop: { nl: "Sleep een .ics of .csv hierheen", en: "Drop an .ics or .csv here" },
    dropHint: { nl: "de richting wordt vanzelf herkend", en: "the direction is worked out for you" },
    pastePanel: { nl: "Of plak de inhoud", en: "Or paste the contents" },
    convert: { nl: "Omzetten", en: "Convert" },
    empty: { nl: "Dit bestand is leeg.", en: "This file is empty." },
    noEvents: {
      nl: "Geen afspraken gevonden in dit agendabestand.",
      en: "No appointments found in this calendar file.",
    },
    noRows: {
      nl: "Geen rijen met een bruikbare datum gevonden.",
      en: "No rows with a usable date were found.",
    },
    toTable: {
      nl: "{n} {word} omgezet naar een tabel.",
      en: "{n} {word} turned into a table.",
    },
    toCalendar: {
      nl: "{n} {word} omgezet naar een agendabestand.",
      en: "{n} {word} turned into a calendar file.",
    },
    appointment: { nl: "afspraak", en: "appointment" },
    appointments: { nl: "afspraken", en: "appointments" },
    row: { nl: "rij", en: "row" },
    rows: { nl: "rijen", en: "rows" },
    skipped: { nl: "{n} overgeslagen.", en: "{n} skipped." },
    messages: { nl: "{n} melding(en)", en: "{n} message(s)" },
    firstRows: {
      nl: "De eerste 12 van {n} rijen. Het bestand bevat ze allemaal.",
      en: "The first 12 of {n} rows. The file holds all of them.",
    },
  },
};

/**
 * The strings for one tool in one language, flattened and interpolatable.
 *
 * @returns {(key: string, values?: object) => string}
 */
export function toolStrings(id, locale) {
  const own = STRINGS[id] || {};
  const shared = STRINGS._shared;
  // The PDF tools share a vocabulary of their own on top of the general one.
  const family = id.includes("pdf") ? STRINGS._pdf : {};

  return (key, values) => {
    const entry = own[key] ?? family[key] ?? shared[key];
    let text = entry ? entry[locale] ?? entry[DEFAULT_LOCALE] ?? key : key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export const __toolStrings = STRINGS;
