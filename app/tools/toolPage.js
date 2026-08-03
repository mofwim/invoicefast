import { toolBySlug } from "../../lib/tools/registry";

/**
 * A tool's page metadata, derived from its registry entry.
 *
 * The registry is the single description of a tool, so its name, tagline and
 * keywords reach the browser tab and the search engine without being typed a
 * second time and drifting out of step.
 */
export function toolMetadata(slug) {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`Onbekende tool: ${slug}`);

  return {
    title: `${tool.name} — ${tool.tagline}`,
    description: tool.description,
    keywords: tool.keywords.join(", "),
    icons: { icon: "/afspraken-icon.svg" },
    alternates: { canonical: tool.href },
    openGraph: {
      title: tool.name,
      description: tool.tagline,
      type: "website",
      url: tool.href,
    },
  };
}

export const toolViewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f2f7",
};
