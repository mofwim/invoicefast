import { notFound } from "next/navigation";
import { LOCALES, LOCALE_META, dirFor, isLocale } from "../../lib/i18n/locales";
import { STORAGE_KEY } from "../../lib/afspraken/store";
import { themeBootScript } from "../../lib/afspraken/theme";
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
 * whose whole point is that it exists in more than one.
 *
 * `dir` rides along with it. Arabic runs right to left, and a page that says
 * so once here is a page whose whole layout mirrors — provided the stylesheet
 * asks for inline-start rather than left, which it does.
 */
export default function LocaleLayout({ children, params }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <html lang={LOCALE_META[params.locale].htmlLang} dir={dirFor(params.locale)}>
      <head>
        {/* Light or dark, settled before the first pixel. This lives in the
            layout rather than in each page because the hub had been quietly
            missing it since it was written — it always rendered light, however
            the device was set, and nothing caught it because none of the
            checks looked at colour. A page cannot forget what it does not
            have to remember. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
