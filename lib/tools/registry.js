/**
 * The market.
 *
 * One entry per tool. The hub page renders straight from this list, so adding
 * a tool means adding an entry here and a page under `app/tools/<slug>/` —
 * nothing else has to be touched.
 *
 * Every tool in this market shares one promise: the work happens in the
 * browser. No upload, no account, no queue. `local` records that explicitly so
 * the hub can say it per tool rather than as a slogan on the header.
 */

export const CATEGORIES = {
  bestanden: { label: "Bestanden", tint: "blue" },
  agenda: { label: "Agenda", tint: "teal" },
  zakelijk: { label: "Zakelijk", tint: "indigo" },
};

export const TOOLS = [
  {
    slug: "afspraken",
    href: "/afspraken",
    name: "Mijn Afspraken",
    tagline: "Al je afspraken op één plek",
    description:
      "Haalt afspraken uit je agenda én uit je e-mail, en zet ze in drie tabbladen: voorbij, binnenkort en later. Met tijd, plaats, met wie, en de papieren die erbij horen.",
    category: "agenda",
    icon: "clock",
    tint: "blue",
    local: true,
    keywords: ["agenda", "afspraken", "ics", "e-mail", "herinnering"],
  },
  {
    slug: "email-uitpakken",
    href: "/tools/email-uitpakken",
    name: "E-mail uitpakken",
    tagline: "Open een .eml en haal de bijlagen eruit",
    description:
      "Sleep een opgeslagen e-mail hierheen en zie wat erin zit: afzender, tekst, en elke bijlage om los op te slaan. Handig voor een mailtje dat je uit een archief hebt en niet meer kunt openen.",
    category: "bestanden",
    icon: "mail",
    tint: "indigo",
    local: true,
    keywords: ["eml", "e-mail", "bijlage", "openen", "msg", "outlook"],
  },
  {
    slug: "agenda-omzetten",
    href: "/tools/agenda-omzetten",
    name: "Agenda omzetten",
    tagline: "ICS naar een tabel, en terug",
    description:
      "Zet een agendabestand om naar CSV om het in Excel te bekijken, of maak van een tabel een agendabestand dat je in Google, Outlook of Apple Agenda importeert.",
    category: "agenda",
    icon: "calendar",
    tint: "teal",
    local: true,
    keywords: ["ics", "csv", "excel", "agenda", "converteren", "importeren"],
  },
  {
    slug: "invoicefast",
    href: "/",
    name: "InvoiceFast",
    tagline: "Een factuur in een minuut",
    description:
      "Vul het formulier, zie de factuur meteen, download de PDF. Geen account nodig. USD, EUR en GBP.",
    category: "zakelijk",
    icon: "file",
    tint: "purple",
    local: true,
    keywords: ["factuur", "invoice", "pdf", "zzp", "freelance"],
  },
];

export function toolBySlug(slug) {
  return TOOLS.find((tool) => tool.slug === slug) || null;
}

/** Tools grouped by category, in the order the categories are declared. */
export function toolsByCategory() {
  return Object.entries(CATEGORIES)
    .map(([id, meta]) => ({
      id,
      ...meta,
      tools: TOOLS.filter((tool) => tool.category === id),
    }))
    .filter((group) => group.tools.length > 0);
}
