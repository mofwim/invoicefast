/**
 * The chrome around every tool, in each language.
 *
 * Only strings that are shared live here. A tool's own words — its name, what
 * it promises, the labels on its controls — sit with the tool, because that is
 * where they have to stay in step with what the tool actually does.
 */

import { DEFAULT_LOCALE } from "./locales";

const DICTIONARIES = {
  nl: {
    "market.title": "Tools",
    "market.tagline":
      "Kleine hulpmiddelen die hun werk in je eigen browser doen. Geen account, geen upload, geen wachtrij — je bestand blijft op je apparaat.",
    "market.search": "Zoeken in tools",
    "market.searchPlaceholder": "Zoeken",
    "market.noResults": "Niets gevonden voor",
    "market.clear": "Wissen",
    "market.local": "Draait op je eigen apparaat",
    "market.all": "Alle tools",
    "market.back": "Alle tools",
    "market.related": "Ook handig",

    "privacy.tool":
      "Dit gebeurt allemaal in je browser. Je bestand wordt niet geüpload, nergens bewaard en door niemand gelezen — sluit je het tabblad, dan is het weg.",
    "privacy.market":
      "Alles hier draait in de browser zelf. Er gaat geen bestand naar een server, er is geen account nodig en er wordt niets bewaard buiten je eigen apparaat.",

    "category.afbeelding": "Afbeeldingen",
    "category.pdf": "PDF",
    "category.bestanden": "Bestanden",
    "category.tekst": "Tekst en code",
    "category.agenda": "Agenda",
    "category.zakelijk": "Zakelijk",

    "common.download": "Opslaan",
    "common.downloadAll": "Alles opslaan",
    "common.copy": "Kopiëren",
    "common.copied": "Gekopieerd",
    "common.busy": "Bezig…",
    "common.language": "Taal",
  },

  en: {
    "market.title": "Tools",
    "market.tagline":
      "Small utilities that do their work in your own browser. No account, no upload, no queue — your file stays on your device.",
    "market.search": "Search tools",
    "market.searchPlaceholder": "Search",
    "market.noResults": "Nothing found for",
    "market.clear": "Clear",
    "market.local": "Runs on your own device",
    "market.all": "All tools",
    "market.back": "All tools",
    "market.related": "Also useful",

    "privacy.tool":
      "All of this happens in your browser. Your file is not uploaded, not stored anywhere and not read by anyone — close the tab and it is gone.",
    "privacy.market":
      "Everything here runs in the browser itself. No file goes to a server, no account is needed, and nothing is kept outside your own device.",

    "category.afbeelding": "Images",
    "category.pdf": "PDF",
    "category.bestanden": "Files",
    "category.tekst": "Text and code",
    "category.agenda": "Calendar",
    "category.zakelijk": "Business",

    "common.download": "Save",
    "common.downloadAll": "Save all",
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.busy": "Working…",
    "common.language": "Language",
  },
};

/**
 * A translator for one language.
 *
 * A missing key falls back to the default language and then to the key itself,
 * so a gap shows up as an obvious string rather than as an empty page.
 */
export function translator(locale) {
  const primary = DICTIONARIES[locale] || {};
  const fallback = DICTIONARIES[DEFAULT_LOCALE] || {};
  return (key, values) => {
    let text = primary[key] ?? fallback[key] ?? key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export const __dictionaries = DICTIONARIES;
