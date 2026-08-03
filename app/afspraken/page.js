import AfsprakenApp from "./AfsprakenApp";
import Bootstrap from "./Bootstrap";

export const metadata = {
  title: "Mijn Afspraken — al je afspraken op één plek",
  description:
    "Haal je afspraken uit je agenda en je e-mail en zie ze in drie tabbladen: voorbij, binnenkort en later. Met tijd, plaats, met wie en de papieren die erbij horen. Alles blijft op je eigen apparaat.",
  keywords:
    "mijn afspraken, afspraken overzicht, agenda samenvoegen, ics importeren, afspraken uit e-mail, appointments",
  applicationName: "Mijn Afspraken",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mijn Afspraken",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/afspraken-icon.svg", type: "image/svg+xml" },
      { url: "/afspraken-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/afspraken-icon-180.png",
  },
  openGraph: {
    title: "Mijn Afspraken",
    description:
      "Al je afspraken bij elkaar — uit je agenda en je e-mail. Voorbij, binnenkort en later.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function AfsprakenPage() {
  return (
    <div className="ma-page">
      <Bootstrap />
      <AfsprakenApp variant="full" />
    </div>
  );
}
