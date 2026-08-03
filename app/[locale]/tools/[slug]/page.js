import { notFound } from "next/navigation";
import ToolShell from "../../../../components/tools/ToolShell";
import { loadTool } from "../../../../components/tools/implementations";
import { isLocale } from "../../../../lib/i18n/locales";
import { allToolRoutes, alternatesFor, findTool } from "../../../../lib/tools/registry";

/**
 * Every tool, in every language it speaks, from one file.
 *
 * The registry holds the words and the slug; `implementations` holds the code.
 * Adding a tool touches neither this file nor the routing — which is the whole
 * reason for having a market rather than a folder of pages.
 */
export function generateStaticParams() {
  return allToolRoutes();
}

export const dynamicParams = false;

export function generateMetadata({ params }) {
  const tool = isLocale(params.locale) ? findTool(params.locale, params.slug) : null;
  if (!tool) return {};

  return {
    title: `${tool.name} — ${tool.tagline}`,
    description: tool.description,
    keywords: (tool.keywords || []).join(", "),
    icons: { icon: "/afspraken-icon.svg" },
    alternates: {
      canonical: tool.href,
      languages: alternatesFor(tool.id),
    },
    openGraph: {
      title: tool.name,
      description: tool.tagline,
      type: "website",
      url: tool.href,
    },
  };
}

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f2f7" };

export default function ToolPage({ params }) {
  if (!isLocale(params.locale)) notFound();

  const tool = findTool(params.locale, params.slug);
  if (!tool) notFound();

  const Body = loadTool(tool.id);
  if (!Body) notFound();

  return (
    <ToolShell tool={tool} locale={params.locale}>
      <Body locale={params.locale} />
    </ToolShell>
  );
}
