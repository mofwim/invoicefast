/**
 * The market.
 *
 * One entry per tool, carrying its own words in every language it speaks. The
 * hub, the routing, the page titles and the search all read from here, so a
 * tool is described once and never drifts out of step with itself.
 *
 * Adding a tool: an entry below, plus a component in `components/tools/`.
 * Adding a language: another key under `i18n`. No route file either way.
 *
 * Every tool shares one promise — the work happens in the browser. `local`
 * records it per tool so the hub can state it as a fact rather than a slogan.
 */

import { DEFAULT_LOCALE, LOCALES } from "../i18n/locales";

/** Order here is the order the hub shows them in. */
export const CATEGORY_ORDER = ["afbeelding", "pdf", "bestanden", "tekst", "agenda", "zakelijk"];

export const TOOLS = [
  // ---------------------------------------------------------------- images
  {
    id: "compress-image",
    category: "afbeelding",
    icon: "image",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-comprimeren",
        name: "Afbeelding comprimeren",
        tagline: "Kleiner maken zonder dat je het ziet",
        description:
          "Maak een foto lichter zodat hij door een uploadlimiet past of een pagina sneller laadt. Je kiest een maximum en de kwaliteit zakt precies zo ver als nodig is.",
        intro:
          "Maak een foto lichter zodat hij door een uploadlimiet past of een pagina sneller laadt. Kies een maximum en de kwaliteit zakt precies zo ver als nodig is — niet verder.",
        keywords: ["foto verkleinen", "afbeelding comprimeren", "jpg kleiner maken", "bestandsgrootte verkleinen"],
      },
      en: {
        slug: "compress-image",
        name: "Compress image",
        tagline: "Smaller, without it showing",
        description:
          "Make a photo lighter so it fits an upload limit or loads faster on a page. You set a ceiling and quality drops only as far as it must.",
        intro:
          "Make a photo lighter so it fits an upload limit or loads faster on a page. Set a ceiling and quality drops exactly as far as it must — no further.",
        keywords: ["compress image", "reduce image size", "make jpg smaller", "shrink photo"],
      },
    },
  },
  {
    id: "convert-image",
    category: "afbeelding",
    icon: "shuffle",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-omzetten",
        name: "Afbeelding omzetten",
        tagline: "Tussen JPG, PNG en WebP",
        description:
          "Zet een afbeelding om naar een ander formaat. WebP voor het web, JPG voor waar alles het doet, PNG als je de transparantie nodig hebt.",
        intro:
          "WebP voor het web, JPG voor waar alles het doet, PNG als je de transparantie nodig hebt. Meerdere bestanden tegelijk mag.",
        keywords: ["png naar jpg", "webp maken", "afbeelding converteren", "heic omzetten"],
      },
      en: {
        slug: "convert-image",
        name: "Convert image",
        tagline: "Between JPG, PNG and WebP",
        description:
          "Change an image to another format. WebP for the web, JPG for where everything works, PNG when you need the transparency.",
        intro:
          "WebP for the web, JPG for where everything works, PNG when you need the transparency. Several files at once is fine.",
        keywords: ["png to jpg", "convert to webp", "image converter", "change image format"],
      },
    },
  },
  {
    id: "resize-image",
    category: "afbeelding",
    icon: "crop",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-formaat",
        name: "Formaat voor social media",
        tagline: "De juiste maat voor elk platform",
        description:
          "Schaal en snijd een afbeelding op de maat die Instagram, LinkedIn, YouTube of een Open Graph-kaart verwacht — zonder de maten op te hoeven zoeken.",
        intro:
          "Kies waar het heen gaat en de maat klopt: Instagram, LinkedIn, YouTube, een Open Graph-kaart. Geen maten opzoeken, geen uitgerekte foto's.",
        keywords: ["instagram formaat", "afbeelding bijsnijden", "social media maten", "thumbnail maken"],
      },
      en: {
        slug: "resize-image",
        name: "Resize for social media",
        tagline: "The right size for every platform",
        description:
          "Scale and crop an image to the size Instagram, LinkedIn, YouTube or an Open Graph card expects — without looking the numbers up.",
        intro:
          "Pick where it is going and the size is right: Instagram, LinkedIn, YouTube, an Open Graph card. No looking up dimensions, no stretched photos.",
        keywords: ["instagram size", "crop image", "social media dimensions", "make thumbnail"],
      },
    },
  },
  {
    id: "make-favicon",
    category: "afbeelding",
    icon: "sparkle",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "favicon-maken",
        name: "Favicon maken",
        tagline: "Eén afbeelding, alle maten",
        description:
          "Maak van een logo een complete set favicons plus het .ico-bestand, met de regels die je in je HTML plakt.",
        intro:
          "Eén logo erin, alle maten eruit — inclusief het .ico-bestand en de regels die je in je HTML plakt.",
        keywords: ["favicon maken", "ico bestand", "apple touch icon", "site icoon"],
      },
      en: {
        slug: "favicon-generator",
        name: "Favicon generator",
        tagline: "One image, every size",
        description:
          "Turn a logo into a complete set of favicons plus the .ico file, with the lines to paste into your HTML.",
        intro:
          "One logo in, every size out — including the .ico file and the lines to paste into your HTML.",
        keywords: ["favicon generator", "ico file", "apple touch icon", "site icon"],
      },
    },
  },
  {
    id: "watermark-image",
    category: "afbeelding",
    icon: "pencil",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "watermerk",
        name: "Watermerk toevoegen",
        tagline: "Je naam over je foto",
        description:
          "Zet tekst over een afbeelding voordat je hem deelt. Plaats, grootte en doorzichtigheid kies je zelf.",
        intro:
          "Zet je naam over een foto voordat je hem deelt. De grootte schaalt mee met de afbeelding, dus het staat er net zo op een telefoonkiekje als op een camerabestand.",
        keywords: ["watermerk toevoegen", "copyright op foto", "tekst op afbeelding", "foto beschermen"],
      },
      en: {
        slug: "add-watermark",
        name: "Add watermark",
        tagline: "Your name across your photo",
        description:
          "Put text over an image before you share it. Position, size and transparency are yours to pick.",
        intro:
          "Put your name across a photo before you share it. The size scales with the picture, so it sits the same on a phone snap as on a camera file.",
        keywords: ["add watermark", "copyright photo", "text on image", "protect photo"],
      },
    },
  },

  // ------------------------------------------------------------------- pdf
  {
    id: "merge-pdf",
    category: "pdf",
    icon: "file",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-samenvoegen",
        name: "PDF samenvoegen",
        tagline: "Meerdere bestanden, één document",
        description:
          "Zet losse PDF's achter elkaar in één bestand. Sleep ze in de volgorde die je wilt; de tekst blijft tekst en de kwaliteit blijft zoals hij was.",
        intro:
          "Zet losse PDF's achter elkaar in één document. Je bepaalt de volgorde, en er wordt niets opnieuw getekend — de tekst blijft tekst en de scherpte blijft.",
        keywords: ["pdf samenvoegen", "pdf's combineren", "pdf bestanden samenvoegen", "meerdere pdf naar één"],
      },
      en: {
        slug: "merge-pdf",
        name: "Merge PDF",
        tagline: "Several files, one document",
        description:
          "Put separate PDFs one after another in a single file. Drag them into the order you want; text stays text and nothing is re-rendered.",
        intro:
          "Put separate PDFs one after another into a single document. You set the order, and nothing is redrawn — text stays text and the sharpness stays with it.",
        keywords: ["merge pdf", "combine pdf", "join pdf files", "pdf merger"],
      },
    },
  },
  {
    id: "split-pdf",
    category: "pdf",
    icon: "crop",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-splitsen",
        name: "PDF splitsen",
        tagline: "Haal er de pagina's uit die je nodig hebt",
        description:
          "Pak een paar pagina's uit een PDF, of hak een lang document in stukken van gelijke grootte. Je typt de pagina's zoals in een printvenster: 1-3, 7, 12-.",
        intro:
          "Pak er de pagina's uit die je nodig hebt, of hak een lang document in stukken. Pagina's typ je zoals in een printvenster: 1-3, 7, 12-.",
        keywords: ["pdf splitsen", "pagina uit pdf halen", "pdf opdelen", "pdf pagina's scheiden"],
      },
      en: {
        slug: "split-pdf",
        name: "Split PDF",
        tagline: "Take out the pages you need",
        description:
          "Pull a few pages out of a PDF, or chop a long document into equal parts. Type pages the way a print dialog expects: 1-3, 7, 12-.",
        intro:
          "Pull out the pages you need, or chop a long document into parts. Type pages the way a print dialog expects: 1-3, 7, 12-.",
        keywords: ["split pdf", "extract pdf pages", "separate pdf", "pdf splitter"],
      },
    },
  },
  {
    id: "organise-pdf",
    category: "pdf",
    icon: "shuffle",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-pagina-s-ordenen",
        name: "PDF-pagina's ordenen",
        tagline: "Draaien en weggooien",
        description:
          "Zet scheve pagina's rechtop en gooi de lege of dubbele eruit. Je ziet elke pagina als een tegel en werkt erop.",
        intro:
          "Zet scheve pagina's rechtop en gooi eruit wat je niet wilt. Elke pagina staat als een tegel voor je; wat je aanwijst verandert meteen.",
        keywords: ["pdf pagina draaien", "pdf pagina verwijderen", "pdf roteren", "pdf pagina's ordenen"],
      },
      en: {
        slug: "rotate-delete-pdf-pages",
        name: "Rotate and delete PDF pages",
        tagline: "Turn them upright, throw the rest out",
        description:
          "Set sideways pages straight and drop the blank or duplicate ones. Every page sits in front of you as a tile.",
        intro:
          "Set sideways pages upright and throw out what you do not want. Every page sits in front of you as a tile; what you touch changes at once.",
        keywords: ["rotate pdf pages", "delete pdf pages", "reorganise pdf", "remove page from pdf"],
      },
    },
  },
  {
    id: "images-to-pdf",
    category: "pdf",
    icon: "image",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "afbeeldingen-naar-pdf",
        name: "Afbeeldingen naar PDF",
        tagline: "Foto's als één document",
        description:
          "Maak van losse foto's of scans één PDF om te mailen of te archiveren — één afbeelding per pagina, netjes gecentreerd.",
        intro:
          "Maak van losse foto's of scans één PDF om te versturen of te bewaren. Eén afbeelding per pagina, netjes gecentreerd op A4 of precies op maat.",
        keywords: ["jpg naar pdf", "foto naar pdf", "afbeeldingen naar pdf", "scan naar pdf"],
      },
      en: {
        slug: "images-to-pdf",
        name: "Images to PDF",
        tagline: "Photos as one document",
        description:
          "Turn loose photos or scans into a single PDF to e-mail or file away — one image per page, neatly centred.",
        intro:
          "Turn loose photos or scans into one PDF to send or keep. One image per page, centred on A4 or cut exactly to size.",
        keywords: ["jpg to pdf", "photo to pdf", "images to pdf", "scan to pdf"],
      },
    },
  },
  {
    id: "stamp-pdf",
    category: "pdf",
    icon: "pencil",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-watermerk",
        name: "Watermerk op PDF",
        tagline: "Kopie, concept, of paginanummers",
        description:
          "Zet een woord schuin over elke pagina — KOPIE, CONCEPT, je eigen naam — en nummer de pagina's terwijl je toch bezig bent.",
        intro:
          "Zet een woord schuin over elke pagina — KOPIE, CONCEPT, je eigen naam — en nummer meteen de pagina's als je dat wilt.",
        keywords: ["watermerk pdf", "pdf paginanummers", "concept stempel pdf", "kopie op pdf"],
      },
      en: {
        slug: "watermark-pdf",
        name: "Watermark a PDF",
        tagline: "Copy, draft, or page numbers",
        description:
          "Put a word diagonally across every page — COPY, DRAFT, your own name — and number the pages while you are there.",
        intro:
          "Put a word diagonally across every page — COPY, DRAFT, your own name — and number the pages at the same time if you want.",
        keywords: ["watermark pdf", "pdf page numbers", "draft stamp pdf", "add text to pdf"],
      },
    },
  },

  // ----------------------------------------------------------------- files
  {
    id: "unpack-email",
    category: "bestanden",
    icon: "mail",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "email-uitpakken",
        name: "E-mail uitpakken",
        tagline: "Open een .eml en haal de bijlagen eruit",
        description:
          "Sleep een opgeslagen e-mail hierheen en zie wat erin zit: afzender, tekst, en elke bijlage om los op te slaan. Handig voor een mailtje dat je uit een archief hebt en niet meer kunt openen.",
        intro:
          "Sleep een opgeslagen e-mail hierheen en zie wat erin zit: de tekst, een eventuele uitnodiging, en elke bijlage om los op te slaan.",
        keywords: ["eml openen", "bijlage uit e-mail", "eml bestand lezen", "outlook bericht openen"],
      },
      en: {
        slug: "open-eml-file",
        name: "Open an .eml file",
        tagline: "Read a saved e-mail and pull out its attachments",
        description:
          "Drop a saved e-mail here and see what is inside: sender, text, and every attachment to save on its own. For the mail out of an archive that nothing will open.",
        intro:
          "Drop a saved e-mail here and see what is inside: the text, any invitation it carries, and every attachment to save on its own.",
        keywords: ["open eml file", "extract email attachment", "eml viewer", "read outlook message"],
      },
    },
  },

  // -------------------------------------------------------------- calendar
  {
    id: "convert-calendar",
    category: "agenda",
    icon: "calendar",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "agenda-omzetten",
        name: "Agenda omzetten",
        tagline: "ICS naar een tabel, en terug",
        description:
          "Zet een agendabestand om naar CSV om het in Excel te bekijken, of maak van een tabel een agendabestand dat je in Google, Outlook of Apple Agenda importeert.",
        intro:
          "Een agendabestand naar een tabel om in Excel te bekijken, of een tabel naar een agendabestand om te importeren in Google, Outlook of Apple Agenda.",
        keywords: ["ics naar csv", "csv naar ics", "agenda importeren", "afspraken in excel"],
      },
      en: {
        slug: "ics-to-csv",
        name: "ICS to CSV, and back",
        tagline: "A calendar in a spreadsheet",
        description:
          "Turn a calendar file into CSV to read it in Excel, or turn a table into a calendar file you can import into Google, Outlook or Apple Calendar.",
        intro:
          "A calendar file into a table to read in Excel, or a table into a calendar file to import into Google, Outlook or Apple Calendar.",
        keywords: ["ics to csv", "csv to ics", "calendar to excel", "import calendar"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** A tool flattened into one language, or null when it does not speak it. */
export function localise(tool, locale) {
  const content = tool.i18n?.[locale];
  if (!content) return null;
  return {
    id: tool.id,
    category: tool.category,
    icon: tool.icon,
    tint: tool.tint,
    local: tool.local !== false,
    locale,
    href: `/${locale}/tools/${content.slug}`,
    ...content,
  };
}

export function toolsForLocale(locale) {
  return TOOLS.map((tool) => localise(tool, locale)).filter(Boolean);
}

export function findTool(locale, slug) {
  for (const tool of TOOLS) {
    if (tool.i18n?.[locale]?.slug === slug) return localise(tool, locale);
  }
  return null;
}

export function findToolById(id, locale) {
  const tool = TOOLS.find((entry) => entry.id === id);
  return tool ? localise(tool, locale) || localise(tool, DEFAULT_LOCALE) : null;
}

/** Every (locale, slug) pair, for pre-rendering the whole market. */
export function allToolRoutes() {
  const routes = [];
  for (const locale of LOCALES) {
    for (const tool of TOOLS) {
      const content = tool.i18n?.[locale];
      if (content) routes.push({ locale, slug: content.slug });
    }
  }
  return routes;
}

/** The same tool in the other languages, for hreflang. */
export function alternatesFor(id) {
  const tool = TOOLS.find((entry) => entry.id === id);
  if (!tool) return {};
  const out = {};
  for (const locale of LOCALES) {
    const content = tool.i18n?.[locale];
    if (content) out[locale] = `/${locale}/tools/${content.slug}`;
  }
  return out;
}

export function categoriesForLocale(locale) {
  const tools = toolsForLocale(locale);
  return CATEGORY_ORDER.map((id) => ({ id, tools: tools.filter((tool) => tool.category === id) })).filter(
    (group) => group.tools.length > 0
  );
}

/** Others in the same category — what to read next at the bottom of a page. */
export function relatedTools(tool, locale, limit = 3) {
  return toolsForLocale(locale)
    .filter((entry) => entry.category === tool.category && entry.id !== tool.id)
    .slice(0, limit);
}
