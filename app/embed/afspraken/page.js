import EmbedFrame from "./EmbedFrame";

export const metadata = {
  title: "Mijn Afspraken",
  description: "Afsprakenoverzicht — voorbij, binnenkort en later.",
  robots: { index: false, follow: false },
  icons: { icon: "/afspraken-icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

const TABS = new Set(["voorbij", "binnenkort", "later"]);

/** Only pass a calendar link through when it is one; the proxy checks the rest. */
function safeIcsUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/^webcal:\/\//i, "https://");
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export default function EmbedPage({ searchParams }) {
  const tab = TABS.has(searchParams?.tab) ? searchParams.tab : "binnenkort";
  return <EmbedFrame tab={tab} icsUrl={safeIcsUrl(searchParams?.ics)} />;
}
