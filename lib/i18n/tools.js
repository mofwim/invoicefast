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
    saveZip: { nl: "Alles opslaan als zip", en: "Save all as a zip" },
    busy: { nl: "Bezig…", en: "Working…" },
    result: { nl: "Resultaat", en: "Result" },
    preview: { nl: "Voorbeeld", en: "Preview" },
    was: { nl: "Was", en: "Before" },
    becomes: { nl: "Wordt", en: "After" },
    size: { nl: "Afmeting", en: "Dimensions" },
    colour: { nl: "Kleur", en: "Colour" },
    white: { nl: "Wit", en: "White" },
    black: { nl: "Zwart", en: "Black" },
    copy: { nl: "Kopiëren", en: "Copy" },
    copied: { nl: "Gekopieerd", en: "Copied" },
    clear: { nl: "Wissen", en: "Clear" },
    paste: { nl: "Plakken", en: "Paste" },
    example: { nl: "Voorbeeld", en: "Example" },
    text: { nl: "Tekst", en: "Text" },
    file: { nl: "Bestand", en: "File" },
    length: { nl: "Lengte", en: "Length" },
    direction: { nl: "Richting", en: "Direction" },
    encode: { nl: "Coderen", en: "Encode" },
    decode: { nl: "Decoderen", en: "Decode" },
    output: { nl: "Resultaat", en: "Result" },

    // What the engines raise, worded per language. The details in braces come
    // from the error itself, so a number never has to be repeated here.
    "err.notAnImage": {
      nl: "{name} is geen afbeelding die de browser kan openen.",
      en: "{name} is not an image this browser can open.",
    },
    "err.encodeFailed": {
      nl: "Kon deze afbeelding niet opslaan — probeer een ander formaat.",
      en: "Could not save this image — try another format.",
    },
    "err.pdfLocked": {
      nl: "{name} is beveiligd met een wachtwoord en kan niet worden geopend.",
      en: "{name} is password-protected and cannot be opened.",
    },
    "err.pdfUnreadable": {
      nl: "{name} kon niet worden gelezen — is het wel een PDF?",
      en: "{name} could not be read — is it really a PDF?",
    },
    "err.pdfNoPages": {
      nl: "Er zaten geen pagina's in deze bestanden.",
      en: "There were no pages in these files.",
    },
    "err.pdfAllDropped": {
      nl: "Zo blijft er geen enkele pagina over.",
      en: "That would leave no pages at all.",
    },
    "err.pdfBadImage": {
      nl: "{name} kan niet in een PDF — alleen JPG en PNG werken.",
      en: "{name} cannot go into a PDF — only JPG and PNG work.",
    },
    "err.pdfNoImages": { nl: "Geen afbeeldingen om om te zetten.", en: "No images to convert." },
    "err.badBase64": { nl: "Dit is geen geldige base64.", en: "This is not valid base64." },
    "err.badEscape": {
      nl: "Hier staat een % die niet bij een geldige code hoort.",
      en: "There is a % here that does not belong to a valid escape.",
    },
    "err.jsonEmpty": { nl: "Er is niets om op te maken.", en: "There is nothing to format." },
    "err.jsonInvalid": { nl: "Dit is geen geldige JSON.", en: "This is not valid JSON." },
    "err.jsonFault": {
      nl: "Regel {line}, teken {column}: hier hoort {expected} te staan.",
      en: "Line {line}, character {column}: {expected} was expected here.",
    },
    "err.noCharacterTypes": { nl: "Kies minstens één soort teken.", en: "Pick at least one kind of character." },
    "err.qrEmpty": { nl: "Er is niets om in een QR-code te zetten.", en: "There is nothing to put in a QR code." },
    "err.qrLevel": { nl: "Onbekend niveau: {level}", en: "Unknown level: {level}" },
    "err.qrTooLong": {
      nl: "Dit is te lang voor een QR-code op dit niveau — maximaal ongeveer {max} tekens.",
      en: "This is too long for a QR code at this level — about {max} characters at most.",
    },
    "err.unknownAlgorithm": { nl: "Onbekend algoritme: {algorithm}", en: "Unknown algorithm: {algorithm}" },
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
    reset: { nl: "Beginstand", en: "Start over" },
    moveLeft: { nl: "Naar voren", en: "Move earlier" },
    moveRight: { nl: "Naar achteren", en: "Move later" },
    rotateLeft: { nl: "Links draaien", en: "Turn left" },
    rotateRight: { nl: "Rechts draaien", en: "Turn right" },
    restore: { nl: "Terugzetten", en: "Restore" },
    rendering: { nl: "{done} van {total} getekend", en: "{done} of {total} drawn" },
    which: { nl: "Welke pagina's", en: "Which pages" },
    whichHint: { nl: "Bijvoorbeeld 1-3, 7, 12-", en: "For example 1-3, 7, 12-" },
    resolution: { nl: "Resolutie", en: "Resolution" },
    resolutionHint: {
      nl: "72 voor een scherm, 300 voor drukwerk",
      en: "72 for a screen, 300 for print",
    },
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
    clickHint: {
      nl: "Klik de pagina's aan die je nodig hebt — of typ ze hierboven.",
      en: "Click the pages you need — or type them above.",
    },
    selectAll: { nl: "Alles", en: "All" },
    selectNone: { nl: "Niets", en: "None" },
    how: { nl: "Hoe splitsen", en: "How to split" },
    modePick: { nl: "Pagina's kiezen", en: "Pick pages" },
    modeEvery: { nl: "In stukken", en: "Into parts" },
    every: { nl: "Pagina's per stuk", en: "Pages per part" },
    selected: { nl: "{n} van {total} geselecteerd", en: "{n} of {total} selected" },
    none: { nl: "Geen geldige pagina's opgegeven.", en: "No valid pages given." },
    split: { nl: "Splitsen", en: "Split" },
    partName: { nl: "deel", en: "part" },
  },

  "organise-pdf": {
    willDrop: { nl: "Wordt verwijderd", en: "Will be removed" },
    dragHint: {
      nl: "Sleep een pagina om hem te verplaatsen, of gebruik de pijltjes eronder.",
      en: "Drag a page to move it, or use the arrows underneath.",
    },
    summary: {
      nl: "{keep} van {total} pagina's blijven over.",
      en: "{keep} of {total} pages will remain.",
    },
    apply: { nl: "Toepassen", en: "Apply" },
    allDropped: { nl: "Zo blijft er geen enkele pagina over.", en: "That would leave no pages at all." },
  },

  "images-to-pdf": {
    noneUsable: {
      nl: "Hier kan geen pagina van gemaakt worden — alleen JPG en PNG werken, en het bestand mag niet leeg zijn.",
      en: "No page can be made from this — only JPG and PNG work, and the file cannot be empty.",
    },
    someRefused: {
      nl: "{n} bestand(en) overgeslagen ({names}) — alleen JPG en PNG kunnen een pagina worden.",
      en: "{n} file(s) skipped ({names}) — only JPG and PNG can become a page.",
    },
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
    previewPage: { nl: "Voorbeeld van pagina", en: "Preview page" },
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

  // -------------------------------------------------------- pdf-to-images
  "pdf-to-images": {
    allPages: { nl: "alle pagina's", en: "all pages" },
    run: { nl: "Omzetten", en: "Convert" },
    made: { nl: "{n} afbeeldingen gemaakt, samen {size}.", en: "Made {n} images, {size} together." },
    noPages: { nl: "Geen geldige pagina's opgegeven.", en: "No valid pages given." },
  },

  // ------------------------------------------------------- extract-images
  "extract-images": {
    searching: { nl: "Bezig met zoeken… pagina {done} van {total}", en: "Looking… page {done} of {total}" },
    found: { nl: "{n} afbeeldingen gevonden, samen {size}.", en: "Found {n} images, {size} together." },
    none: {
      nl: "In deze PDF zitten geen losse afbeeldingen — de pagina's zijn getekend, niet geplakt. Wil je de pagina's zelf als plaatje, gebruik dan PDF naar afbeelding.",
      en: "There are no separate images in this PDF — the pages are drawn, not pasted. If you want the pages themselves as pictures, use PDF to JPG.",
    },
    sizeNote: {
      nl: "Dit zijn de afbeeldingen op hun eigen resolutie, niet zoals ze op de pagina geschaald staan.",
      en: "These are the images at their own resolution, not as they are scaled on the page.",
    },
  },

  // ---------------------------------------------------------- pdf-to-text
  "pdf-to-text": {
    reading2: { nl: "Bezig met lezen… pagina {done} van {total}", en: "Reading… page {done} of {total}" },
    marks: { nl: "Paginanummers ertussen", en: "Page markers" },
    withMarks: { nl: "Met", en: "With" },
    withoutMarks: { nl: "Zonder", en: "Without" },
    saveTxt: { nl: "Opslaan als .txt", en: "Save as .txt" },
    scanned: {
      nl: "In deze PDF staat geen tekst — het is een scan of een afbeelding. Er valt hier niets uit te halen; daar is tekstherkenning voor nodig.",
      en: "There is no text in this PDF — it is a scan or a picture. Nothing can be pulled out of it here; that needs character recognition.",
    },
  },

  // --------------------------------------------------------- compress-pdf
  "compress-pdf": {
    how: { nl: "Hoe", en: "How" },
    "mode.clean": { nl: "Opschonen", en: "Tidy up" },
    "mode.images": { nl: "Afbeeldingen", en: "Images" },
    "mode.rasterise": { nl: "Alles", en: "Everything" },
    "explain.clean": {
      nl: "Het bestand wordt opnieuw opgeslagen: de structuur strak ingepakt, alles wat nergens meer voor gebruikt wordt eruit. Aan de pagina's verandert niets — geen enkele pixel.",
      en: "The file is re-saved: the structure packed tightly, anything no longer used dropped. Nothing about the pages changes — not one pixel.",
    },
    "explain.images": {
      nl: "Alleen de afbeeldingen in het document worden verkleind en opnieuw opgeslagen. De tekst en de lijnen worden niet aangeraakt: ze blijven tekst, dus doorzoekbaar en scherp op elk zoomniveau. Dit is bijna altijd wat je wilt.",
      en: "Only the pictures inside the document are scaled down and re-encoded. The text and the lines are not touched: they stay text, so still searchable and still sharp at any zoom. This is nearly always the one you want.",
    },
    "explain.rasterise": {
      nl: "Elke pagina wordt opnieuw getekend als één afbeelding. Alleen nodig als er iets in zit dat de vorige manier niet aankan — de tekst is daarna geen tekst meer: niet te selecteren, niet te doorzoeken, en wazig bij inzoomen.",
      en: "Every page is redrawn as a single picture. Only worth it when something in the file defeats the previous way — afterwards the text is not text: not selectable, not searchable, and blurred when zoomed.",
    },
    ceilingHint: {
      nl: "De bovengrens voor afbeeldingen. Een klein logo blijft klein; alleen wat te groot is gaat omlaag.",
      en: "The ceiling for pictures. A small logo stays small; only what is oversized comes down.",
    },
    screen: { nl: "Scherm", en: "Screen" },
    normal: { nl: "Normaal", en: "Normal" },
    print: { nl: "Drukwerk", en: "Print" },
    run: { nl: "Verkleinen", en: "Compress" },
    working: { nl: "Pagina {done} van {total}…", en: "Page {done} of {total}…" },
    scanning: { nl: "Afbeelding {done} van {total}…", en: "Picture {done} of {total}…" },
    smaller: { nl: "{pct}% kleiner — van {was} naar {now}.", en: "{pct}% smaller — from {was} to {now}." },
    "noGain.clean": {
      nl: "Deze PDF zat al strak in elkaar; opschonen levert hier niets op. Probeer de afbeeldingen.",
      en: "This PDF was already packed tightly; tidying it up gains nothing here. Try the images.",
    },
    "noGain.images": {
      nl: "Er valt op de afbeeldingen niets te winnen ({now}) — ze zijn al zuinig, of het document bestaat vooral uit tekst. Dan is er ook weinig te halen: tekst is al klein.",
      en: "There is nothing to win on the pictures ({now}) — they are already lean, or the document is mostly text. In that case there is little to get: text is small already.",
    },
    "noGain.rasterise": {
      nl: "Zo wordt hij niet kleiner ({now}). Bij een document dat vooral uit tekst bestaat kost opnieuw tekenen meer dan het oplevert.",
      en: "It does not get smaller this way ({now}). For a document that is mostly text, redrawing costs more than it saves.",
    },
    pages: { nl: "Pagina's", en: "Pages" },
    pictures: { nl: "Verkleind", en: "Rewritten" },
    leftAlone: {
      nl: "{n} afbeeldingen zijn met rust gelaten: doorzichtig, een ongebruikelijke codering, of ze werden er niet kleiner van. Met rust laten is beter dan ze bederven.",
      en: "{n} pictures were left alone: transparent, an unusual encoding, or they simply did not get smaller. Leaving them is better than spoiling them.",
    },
    noPictures: {
      nl: "In dit document zitten geen afbeeldingen — het is tekst, en die was al zo klein als hij worden kan.",
      en: "There are no pictures in this document — it is text, and that was already as small as it gets.",
    },
  },

  // --------------------------------------------------------- pdf-metadata
  "pdf-metadata": {
    title: { nl: "Titel", en: "Title" },
    author: { nl: "Auteur", en: "Author" },
    subject: { nl: "Onderwerp", en: "Subject" },
    keywords: { nl: "Trefwoorden", en: "Keywords" },
    keywordsHint: { nl: "Gescheiden door komma's", en: "Separated by commas" },
    creator: { nl: "Gemaakt met", en: "Created with" },
    producer: { nl: "Uitgevoerd door", en: "Produced by" },
    created: { nl: "Aangemaakt op", en: "Created on" },
    modified: { nl: "Gewijzigd op", en: "Modified on" },
    emptyField: { nl: "(leeg)", en: "(empty)" },
    apply: { nl: "Opslaan", en: "Apply" },
    stripAll: { nl: "Alles leegmaken", en: "Clear everything" },
    written: { nl: "De eigenschappen zijn aangepast.", en: "The properties have been written." },
    note: {
      nl: "Een leeg veld wordt echt verwijderd, niet als lege tekst opgeslagen. De datum van wijziging wordt bijgewerkt, want dat is precies wat er gebeurt.",
      en: "An empty field is really removed, not stored as empty text. The modification date is updated, because that is exactly what has happened.",
    },
  },

  // ------------------------------------------------------------- sign-pdf
  "sign-pdf": {
    signature: { nl: "Handtekening", en: "Signature" },
    source: { nl: "Hoe", en: "How" },
    draw: { nl: "Tekenen", en: "Draw" },
    upload: { nl: "Afbeelding", en: "Picture" },
    ink: { nl: "Kleur", en: "Ink" },
    undo: { nl: "Laatste weg", en: "Undo the last" },
    drawHint: {
      nl: "Met de muis, een pen of je vinger. Op een telefoon gaat dit het makkelijkst.",
      en: "With a mouse, a stylus or your finger. On a phone this is the easy one.",
    },
    dropImage: { nl: "Sleep een foto van je handtekening hierheen", en: "Drop a picture of your signature here" },
    imageHint: {
      nl: "PNG met transparante achtergrond staat het netst",
      en: "A PNG with a transparent background sits best",
    },
    place: { nl: "Waar komt hij", en: "Where it goes" },
    whichPage: { nl: "Pagina", en: "Page" },
    width: { nl: "Breedte", en: "Width" },
    clickHint: {
      nl: "Klik op de pagina waar het midden van je handtekening moet komen.",
      en: "Click the page where the middle of your signature should sit.",
    },
    noPreview: {
      nl: "Deze pagina kan niet worden getoond. Plaatsen kan nog wel, maar dan op de tast.",
      en: "This page cannot be shown. Placing still works, but without seeing it.",
    },
    needSignature: { nl: "Zet eerst een handtekening.", en: "Make a signature first." },
    apply: { nl: "Ondertekenen", en: "Sign" },
    done: { nl: "De handtekening staat erop.", en: "The signature is on it." },
  },

  // ----------------------------------------------------------- word-count
  "word-count": {
    placeholder: {
      nl: "Typ hier, of plak je tekst…",
      en: "Type here, or paste your text…",
    },
    words: { nl: "Woorden", en: "Words" },
    characters: { nl: "Tekens", en: "Characters" },
    withoutSpaces: { nl: "Zonder spaties", en: "Without spaces" },
    sentences: { nl: "Zinnen", en: "Sentences" },
    paragraphs: { nl: "Alinea's", en: "Paragraphs" },
    lines: { nl: "Regels", en: "Lines" },
    reading: { nl: "Leestijd", en: "Reading time" },
    seconds: { nl: "{n} sec", en: "{n} sec" },
    minutes: { nl: "{n} min", en: "{n} min" },
    longest: { nl: "Langste woord", en: "Longest word" },
    limits: { nl: "Past het?", en: "Does it fit?" },
    limitsHint: {
      nl: "De limieten waar tekst meestal tegenaan loopt",
      en: "The limits text usually runs into",
    },
    over: { nl: "{n} te veel", en: "{n} over" },
    left: { nl: "nog {n}", en: "{n} left" },
    metaDescription: { nl: "Meta-omschrijving", en: "Meta description" },
    tweet: { nl: "Bericht op X", en: "Post on X" },
    sms: { nl: "Sms", en: "SMS" },
    linkedin: { nl: "LinkedIn-bericht", en: "LinkedIn post" },
  },

  // ---------------------------------------------------------- json-format
  "json-format": {
    placeholder: { nl: 'Plak hier je JSON, bijvoorbeeld {"naam": "waarde"}', en: 'Paste your JSON here, for example {"name": "value"}' },
    indent: { nl: "Inspringen", en: "Indent" },
    flat: { nl: "Eén regel", en: "One line" },
    spaces: { nl: "{n} spaties", en: "{n} spaces" },
    sort: { nl: "Namen op alfabet", en: "Sort names A–Z" },
    format: { nl: "Opmaken", en: "Format" },
    valid: { nl: "Geldige JSON — {keys} namen, {depth} niveaus diep.", en: "Valid JSON — {keys} names, {depth} levels deep." },
    keys: { nl: "Namen", en: "Names" },
    depth: { nl: "Diepte", en: "Depth" },
    kind: { nl: "Soort", en: "Kind" },
    "expect.value": { nl: "een waarde", en: "a value" },
    "expect.name": { nl: "een naam tussen aanhalingstekens", en: "a quoted name" },
    "expect.colon": { nl: "een dubbele punt", en: "a colon" },
    "expect.commaOrBrace": { nl: "een komma of }", en: "a comma or }" },
    "expect.commaOrBracket": { nl: "een komma of ]", en: "a comma or ]" },
    "expect.closingQuote": { nl: "een sluitend aanhalingsteken", en: "a closing quote" },
    "expect.escape": { nl: "een geldige escape na de backslash", en: "a valid escape after the backslash" },
    "expect.hex": { nl: "vier hex-tekens na \\u", en: "four hex characters after \\u" },
    "expect.number": { nl: "een geldig getal", en: "a valid number" },
    "expect.end": { nl: "het einde van het document", en: "the end of the document" },
  },

  // --------------------------------------------------------------- base64
  base64: {
    placeholderEncode: { nl: "Typ of plak hier je tekst…", en: "Type or paste your text…" },
    placeholderDecode: { nl: "Plak hier je base64…", en: "Paste your base64 here…" },
    urlSafe: { nl: "URL-veilig", en: "URL-safe" },
    urlSafeHint: { nl: "- en _ in plaats van + en /, zonder opvulling", en: "- and _ instead of + and /, no padding" },
    output: { nl: "Resultaat", en: "Result" },
    filePanel: { nl: "Of een bestand", en: "Or a file" },
    fileHint: {
      nl: "Je krijgt de data-URI die je in CSS of HTML plakt — houd het klein, een groot bestand wordt een enorme regel",
      en: "You get the data URI to paste into CSS or HTML — keep it small, a big file becomes an enormous line",
    },
    dropFile: { nl: "Sleep een bestand hierheen", en: "Drop a file here" },
    dataUri: { nl: "Data-URI", en: "Data URI" },
    grew: { nl: "{size} — base64 is ongeveer een derde groter dan het origineel.", en: "{size} — base64 is about a third larger than the original." },
  },

  // ------------------------------------------------------------ text-diff
  "text-diff": {
    left: { nl: "Oude versie", en: "Old version" },
    right: { nl: "Nieuwe versie", en: "New version" },
    leftPlaceholder: { nl: "Plak hier de oude tekst…", en: "Paste the old text here…" },
    rightPlaceholder: { nl: "Plak hier de nieuwe tekst…", en: "Paste the new text here…" },
    compare: { nl: "Vergelijken", en: "Compare" },
    identical: { nl: "Deze twee teksten zijn precies gelijk.", en: "These two texts are exactly the same." },
    summary: { nl: "{added} regels erbij, {removed} eraf.", en: "{added} lines added, {removed} removed." },
    onlyChanges: { nl: "Alleen verschillen", en: "Only the differences" },
    added: { nl: "erbij", en: "added" },
    removed: { nl: "eraf", en: "removed" },
    unchanged: { nl: "{n} gelijke regels", en: "{n} unchanged lines" },
    empty: { nl: "Vul beide vakken om te kunnen vergelijken.", en: "Fill in both boxes to compare them." },
  },

  // ------------------------------------------------------------- slug-url
  "slug-url": {
    slugTab: { nl: "Slug", en: "Slug" },
    urlTab: { nl: "URL-codering", en: "URL encoding" },
    titleLabel: { nl: "Titel", en: "Title" },
    titlePlaceholder: { nl: "Bijvoorbeeld: Café déjà vu — 10 tips & trucs", en: "For example: Café déjà vu — 10 tips & tricks" },
    separator: { nl: "Scheidingsteken", en: "Separator" },
    lower: { nl: "Alles kleine letters", en: "All lower case" },
    maxLength: { nl: "Maximale lengte", en: "Maximum length" },
    maxHint: { nl: "0 laat hem zo lang als hij is", en: "0 leaves it as long as it is" },
    slugResult: { nl: "Slug", en: "Slug" },
    urlPlaceholder: { nl: "Typ of plak hier…", en: "Type or paste here…" },
    componentMode: { nl: "Deel van een URL", en: "Part of a URL" },
    fullMode: { nl: "Hele URL", en: "Whole URL" },
    modeHint: {
      nl: "Een heel adres houdt zijn : en / — een los stuk niet",
      en: "A whole address keeps its : and / — a single piece does not",
    },
  },

  // -------------------------------------------------------------- qr-code
  "qr-code": {
    kind: { nl: "Waarvoor", en: "What for" },
    kindText: { nl: "Tekst", en: "Text" },
    kindUrl: { nl: "Link", en: "Link" },
    kindWifi: { nl: "Wifi", en: "Wifi" },
    kindPhone: { nl: "Telefoon", en: "Phone" },
    kindEmail: { nl: "E-mail", en: "E-mail" },
    urlLabel: { nl: "Adres", en: "Address" },
    textLabel: { nl: "Tekst", en: "Text" },
    textPlaceholder: { nl: "Wat er in de code moet komen…", en: "What should go in the code…" },
    ssid: { nl: "Netwerknaam", en: "Network name" },
    password: { nl: "Wachtwoord", en: "Password" },
    security: { nl: "Beveiliging", en: "Security" },
    open: { nl: "Open netwerk", en: "Open network" },
    hidden: { nl: "Verborgen netwerk", en: "Hidden network" },
    phoneLabel: { nl: "Telefoonnummer", en: "Phone number" },
    emailLabel: { nl: "E-mailadres", en: "E-mail address" },
    subject: { nl: "Onderwerp", en: "Subject" },
    body: { nl: "Bericht", en: "Message" },
    look: { nl: "Uiterlijk", en: "Look" },
    dark: { nl: "Kleur van de code", en: "Colour of the code" },
    light: { nl: "Achtergrond", en: "Background" },
    level: { nl: "Foutcorrectie", en: "Error correction" },
    levelHint: {
      nl: "Hoger blijft leesbaar met een vlek erop, maar wordt drukker",
      en: "Higher survives a smudge, but gets busier",
    },
    scale: { nl: "Grootte", en: "Size" },
    made: { nl: "Versie {version}, {size}×{size} blokjes.", en: "Version {version}, {size}×{size} modules." },
    savePng: { nl: "PNG opslaan", en: "Save PNG" },
    saveSvg: { nl: "SVG opslaan", en: "Save SVG" },
    svgHint: { nl: "SVG blijft scherp op elk formaat — voor drukwerk is dat de juiste keuze.", en: "SVG stays sharp at any size — for print that is the one to take." },
    nothing: { nl: "Vul iets in om een code te maken.", en: "Type something to make a code." },
    alt: { nl: "De QR-code", en: "The QR code" },
  },

  // ------------------------------------------------------------- password
  password: {
    howLong: { nl: "Lengte", en: "Length" },
    contains: { nl: "Met daarin", en: "Made from" },
    lower: { nl: "Kleine letters", en: "Lower case" },
    upper: { nl: "Hoofdletters", en: "Upper case" },
    digits: { nl: "Cijfers", en: "Digits" },
    symbols: { nl: "Leestekens", en: "Symbols" },
    avoidAmbiguous: { nl: "Geen l, I, 0 en O", en: "No l, I, 0 or O" },
    avoidHint: {
      nl: "Die worden verwisseld als je een wachtwoord voorleest of overtypt",
      en: "Those get mixed up when a password is read aloud or typed over",
    },
    count: { nl: "Hoeveel", en: "How many" },
    generate: { nl: "Nieuwe maken", en: "Make new ones" },
    strength: { nl: "Sterkte", en: "Strength" },
    bits: { nl: "{n} bits", en: "{n} bits" },
    "level.weak": { nl: "zwak", en: "weak" },
    "level.fair": { nl: "redelijk", en: "fair" },
    "level.strong": { nl: "sterk", en: "strong" },
    "level.excellent": { nl: "uitstekend", en: "excellent" },
    note: {
      nl: "Deze zijn met de willekeurgenerator van je browser gemaakt en zijn nergens heen gestuurd.",
      en: "These were made with your browser's own random generator and were sent nowhere.",
    },
    copyOne: { nl: "Dit wachtwoord kopiëren", en: "Copy this password" },
  },

  // ----------------------------------------------------------------- hash
  hash: {
    source: { nl: "Waarvan", en: "Of what" },
    algorithm: { nl: "Algoritme", en: "Algorithm" },
    placeholder: { nl: "Typ of plak hier je tekst…", en: "Type or paste your text…" },
    drop: { nl: "Sleep een bestand hierheen", en: "Drop a file here" },
    dropHint: { nl: "of klik om er een te kiezen — hij blijft op je apparaat", en: "or click to pick one — it stays on your device" },
    reading: { nl: "Bezig met lezen… {pct}%", en: "Reading… {pct}%" },
    digest: { nl: "Checksum", en: "Checksum" },
    compare: { nl: "Vergelijken met", en: "Compare against" },
    comparePlaceholder: { nl: "Plak hier de opgegeven checksum…", en: "Paste the published checksum here…" },
    match: { nl: "Deze komen overeen — het bestand is ongewijzigd.", en: "These match — the file is unchanged." },
    noMatch: {
      nl: "Deze komen niet overeen. Het bestand is niet hetzelfde als waar deze checksum bij hoort.",
      en: "These do not match. The file is not the one this checksum belongs to.",
    },
    weak: {
      nl: "{algorithm} is gebroken: goed genoeg om een download te controleren, niet om iets mee te bewijzen.",
      en: "{algorithm} is broken: fine for checking a download, not for proving anything.",
    },
  },

  // ------------------------------------------------------- vat-calculator
  "vat-calculator": {
    country: { nl: "Land", en: "Country" },
    rate: { nl: "Tarief", en: "Rate" },
    amount: { nl: "Bedrag", en: "Amount" },
    basis: { nl: "Dit bedrag is", en: "This amount is" },
    excl: { nl: "Exclusief btw", en: "Excluding VAT" },
    incl: { nl: "Inclusief btw", en: "Including VAT" },
    net: { nl: "Exclusief btw", en: "Excluding VAT" },
    vat: { nl: "Btw {rate}%", en: "VAT {rate}%" },
    gross: { nl: "Inclusief btw", en: "Including VAT" },
    otherRate: { nl: "Ander tarief", en: "Other rate" },
    note: {
      nl: "Afgerond op hele centen, zoals op een factuur — de drie bedragen tellen dus ook echt op.",
      en: "Rounded to whole cents the way an invoice rounds, so the three amounts really do add up.",
    },
    zeroNote: {
      nl: "0% is het tarief voor export en verlegde btw. Er komt niets bij.",
      en: "0% is the rate for exports and reverse charge. Nothing is added.",
    },
  },

  // ----------------------------------------------------------- iban-check
  "iban-check": {
    label: { nl: "IBAN", en: "IBAN" },
    placeholder: { nl: "NL91 ABNA 0417 1643 00", en: "NL91 ABNA 0417 1643 00" },
    valid: { nl: "Dit IBAN klopt.", en: "This IBAN checks out." },
    bank: { nl: "Bank", en: "Bank" },
    country: { nl: "Land", en: "Country" },
    accountNumber: { nl: "Rekeningnummer", en: "Account number" },
    formatted: { nl: "Netjes geschreven", en: "Written out" },
    "reason.short": { nl: "Dit is te kort om een IBAN te zijn.", en: "This is too short to be an IBAN." },
    "reason.country": {
      nl: "Een IBAN begint met twee letters voor het land.",
      en: "An IBAN starts with two letters for the country.",
    },
    "reason.unknownCountry": {
      nl: "{country} is geen land met een IBAN dat hier bekend is.",
      en: "{country} is not a country with an IBAN known here.",
    },
    "reason.length": {
      nl: "Een {country}-IBAN heeft {expected} tekens; dit er zijn {actual}.",
      en: "A {country} IBAN has {expected} characters; this one has {actual}.",
    },
    "reason.shape": {
      nl: "Na de landcode horen twee cijfers te staan.",
      en: "Two digits belong after the country code.",
    },
    "reason.checksum": {
      nl: "De controle klopt niet — er staat een cijfer of letter verkeerd. Vraag het nummer nog eens na voordat je betaalt.",
      en: "The check fails — a digit or letter is wrong. Ask for the number again before you pay.",
    },
    checkNote: {
      nl: "Dit rekent de officiële 97-controle uit. Dat een nummer klopt, betekent niet dat het van de goede persoon is.",
      en: "This works out the official mod-97 check. A number being correct does not mean it belongs to the right person.",
    },
    examples: { nl: "Voorbeeld invullen", en: "Fill in an example" },
  },
};

/**
 * One translator per tool per language, made once and kept.
 *
 * The identity matters as much as the result. A component holds this in a
 * dependency array, so handing back a fresh closure on every render would make
 * every callback that mentions it fresh too — and an effect that depends on one
 * of those callbacks would then run on every render, for ever. Caching makes
 * the reference as stable as the strings behind it.
 */
const CACHE = new Map();

/**
 * The strings for one tool in one language, flattened and interpolatable.
 *
 * @returns {(key: string, values?: object) => string}
 */
export function toolStrings(id, locale) {
  const cached = CACHE.get(`${id}|${locale}`);
  if (cached) return cached;

  const own = STRINGS[id] || {};
  const shared = STRINGS._shared;
  // The PDF tools share a vocabulary of their own on top of the general one.
  const family = id.includes("pdf") ? STRINGS._pdf : {};

  const translate = (key, values) => {
    const entry = own[key] ?? family[key] ?? shared[key];
    let text = entry ? entry[locale] ?? entry[DEFAULT_LOCALE] ?? key : key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };

  CACHE.set(`${id}|${locale}`, translate);
  return translate;
}

export const __toolStrings = STRINGS;
