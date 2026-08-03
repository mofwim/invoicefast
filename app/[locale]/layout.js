import { notFound } from "next/navigation";
import { LOCALES, LOCALE_META, isLocale } from "../../lib/i18n/locales";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Everything under a language lives here. The root layout owns <html>, so the
 * page's language is announced with a wrapper attribute instead — enough for a
 * screen reader and a translator to know which language they are reading.
 */
export default function LocaleLayout({ children, params }) {
  if (!isLocale(params.locale)) notFound();
  return <div lang={LOCALE_META[params.locale].htmlLang}>{children}</div>;
}
