import { notFound } from "next/navigation";
import Market from "../../../components/tools/Market";
import { LOCALES, isLocale } from "../../../lib/i18n/locales";
import { translator } from "../../../lib/i18n/ui";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateMetadata({ params }) {
  if (!isLocale(params.locale)) return {};
  const t = translator(params.locale);

  return {
    title: `${t("market.title")} — ${t("market.tagline").split(".")[0]}`,
    description: t("market.tagline"),
    icons: { icon: "/afspraken-icon.svg" },
    alternates: {
      canonical: `/${params.locale}/tools`,
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `/${locale}/tools`])),
    },
    openGraph: { title: t("market.title"), description: t("market.tagline"), type: "website" },
  };
}

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f2f7" };

export default function MarketPage({ params }) {
  if (!isLocale(params.locale)) notFound();
  return <Market locale={params.locale} />;
}
