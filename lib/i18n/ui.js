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
    "privacy.link": "Privacy",
    "privacy.title": "Privacy",

    "privacy.tool":
      "Dit gebeurt allemaal in je browser. Je bestand wordt niet geüpload, nergens bewaard en door niemand gelezen — sluit je het tabblad, dan is het weg.",
    "privacy.market":
      "Alles hier draait in de browser zelf. Er gaat geen bestand naar een server, er is geen account nodig en er wordt niets bewaard buiten je eigen apparaat.",

    "category.afbeelding": "Afbeeldingen",
    "category.pdf": "PDF",
    "category.tekst": "Tekst en code",
    "category.genereren": "Genereren",
    "category.bestanden": "Bestanden",
    "category.agenda": "Agenda",
    "category.zakelijk": "Zakelijk",

    "common.download": "Opslaan",
    "common.copy": "Kopiëren",
    "common.copied": "Gekopieerd",
    "common.busy": "Bezig…",
    "common.language": "Taal",
  },

  ar: {
    "market.title": "أدوات",
    "market.tagline":
      "أدوات صغيرة تؤدّي عملها داخل متصفّحك أنت. بلا حساب، بلا رفع، بلا انتظار — ملفك يبقى على جهازك.",
    "market.search": "ابحث في الأدوات",
    "market.searchPlaceholder": "بحث",
    "market.noResults": "لا نتائج لـ",
    "market.clear": "مسح",
    "market.local": "يعمل على جهازك أنت",
    "market.all": "كل الأدوات",
    "market.back": "كل الأدوات",
    "market.related": "مفيد أيضاً",
    "privacy.link": "الخصوصية",
    "privacy.title": "الخصوصية",

    "privacy.tool":
      "كل هذا يجري داخل متصفّحك. ملفك لا يُرفع ولا يُحفظ في أي مكان ولا يقرأه أحد — أغلق التبويب ويختفي.",
    "privacy.market":
      "كل ما هنا يعمل داخل المتصفّح نفسه. لا يذهب أي ملف إلى خادم، ولا يلزم حساب، ولا يُحفظ شيء خارج جهازك.",

    "category.afbeelding": "الصور",
    "category.pdf": "PDF",
    "category.tekst": "نصوص وبرمجة",
    "category.genereren": "توليد",
    "category.bestanden": "ملفات",
    "category.agenda": "التقويم",
    "category.zakelijk": "أعمال",

    "common.download": "حفظ",
    "common.copy": "نسخ",
    "common.copied": "تم النسخ",
    "common.busy": "جارٍ العمل…",
    "common.language": "اللغة",
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
    "privacy.link": "Privacy",
    "privacy.title": "Privacy",

    "privacy.tool":
      "All of this happens in your browser. Your file is not uploaded, not stored anywhere and not read by anyone — close the tab and it is gone.",
    "privacy.market":
      "Everything here runs in the browser itself. No file goes to a server, no account is needed, and nothing is kept outside your own device.",

    "category.afbeelding": "Images",
    "category.pdf": "PDF",
    "category.tekst": "Text and code",
    "category.genereren": "Generators",
    "category.bestanden": "Files",
    "category.agenda": "Calendar",
    "category.zakelijk": "Business",

    "common.download": "Save",
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.busy": "Working…",
    "common.language": "Language",
  },
};

const CACHE = new Map();

/**
 * A translator for one language, made once and kept.
 *
 * A missing key falls back to the default language and then to the key itself,
 * so a gap shows up as an obvious string rather than as an empty page. The
 * function is cached because callers put it in dependency arrays, where a new
 * reference every render is a re-render every render.
 */
export function translator(locale) {
  const cached = CACHE.get(locale);
  if (cached) return cached;

  const primary = DICTIONARIES[locale] || {};
  const fallback = DICTIONARIES[DEFAULT_LOCALE] || {};
  const translate = (key, values) => {
    let text = primary[key] ?? fallback[key] ?? key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };

  CACHE.set(locale, translate);
  return translate;
}

export const __dictionaries = DICTIONARIES;
