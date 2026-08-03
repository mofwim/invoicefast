import { LOCALES } from "../lib/i18n/locales";
import { allToolRoutes, alternatesFor, TOOLS } from "../lib/tools/registry";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://invoicefast.app";

/**
 * Every page, in every language, with its translations declared.
 *
 * A market lives or dies on being found, and the alternates are what stop the
 * Dutch and English versions of a tool from competing with each other.
 */
export default function sitemap() {
  const now = new Date();
  const absolute = (path) => `${BASE}${path}`;

  const entries = [
    { url: absolute("/"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absolute("/afspraken"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absolute("/afspraken/insluiten"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  for (const locale of LOCALES) {
    entries.push({
      url: absolute(`/${locale}/tools`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((code) => [code, absolute(`/${code}/tools`)])),
      },
    });
  }

  for (const { locale, slug } of allToolRoutes()) {
    const tool = TOOLS.find((entry) => entry.i18n?.[locale]?.slug === slug);
    const languages = Object.fromEntries(
      Object.entries(alternatesFor(tool.id)).map(([code, path]) => [code, absolute(path)])
    );
    entries.push({
      url: absolute(`/${locale}/tools/${slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages },
    });
  }

  return entries;
}
