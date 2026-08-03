import EmbedFrame from "./EmbedFrame";
import { STORAGE_KEY } from "../../../lib/afspraken/store";
import { isTheme, themeBootScript } from "../../../lib/afspraken/theme";

export const metadata = {
  title: "Mijn Afspraken",
  description: "Afsprakenoverzicht — voorbij, binnenkort en later.",
  robots: { index: false, follow: false },
  icons: { icon: "/afspraken-icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f2f7",
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
  // A host page can pin the widget's appearance to match its own.
  const theme = isTheme(searchParams?.theme) ? searchParams.theme : "";

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY, theme) }} />
      <EmbedFrame tab={tab} icsUrl={safeIcsUrl(searchParams?.ics)} theme={theme} />
    </>
  );
}
