import { notFound } from "next/navigation";
import { LOCALES, LOCALE_META, isLocale } from "../../lib/i18n/locales";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://invoicefast.app"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * The root of the translated half of the site.
 *
 * This owns its own `<html>` rather than nesting inside one. Next allows a
 * root layout per route group, and that is the only way `lang` can say what a
 * page is actually written in: a Dutch page announcing itself as English is
 * read aloud by a screen reader in an English voice, which makes it close to
 * unintelligible, and it tells a search engine the wrong thing about a site
 * whose whole point is that it exists in two languages.
 */
export default function LocaleLayout({ children, params }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <html lang={LOCALE_META[params.locale].htmlLang}>
      <body>{children}</body>
    </html>
  );
}
