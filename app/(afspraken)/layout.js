import "../globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://invoicefast.app"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Mijn Afspraken, and the widget it becomes inside someone else's page.
 *
 * Its own root, because every word of it is Dutch and a document has to say
 * so: a screen reader picks its voice from this attribute, and reading Dutch
 * aloud in an English voice makes it close to unintelligible.
 */
export default function AfsprakenLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
