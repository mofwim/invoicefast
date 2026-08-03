import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "../../../lib/i18n/locales";
import PrivacyPage from "../../../components/tools/Privacy";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const dynamicParams = false;

const META = {
  nl: {
    title: "Privacy — Tools",
    description:
      "Wat er met je bestanden gebeurt (niets), wat er wordt bewaard (bijna niets) en wat een advertentie wel en niet ziet.",
  },
  en: {
    title: "Privacy — Tools",
    description:
      "What happens to your files (nothing), what is stored (almost nothing) and what an advertisement can and cannot see.",
  },
};

export function generateMetadata({ params }) {
  const words = META[params.locale] || META.nl;
  return {
    ...words,
    alternates: {
      canonical: `/${params.locale}/privacy`,
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `/${locale}/privacy`])),
    },
  };
}

export default function Page({ params }) {
  if (!isLocale(params.locale)) notFound();
  return <PrivacyPage locale={params.locale} />;
}
