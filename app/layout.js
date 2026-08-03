import "./globals.css";

export const metadata = {
  // Makes every canonical and hreflang absolute, which is what a crawler wants.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://invoicefast.app"),
  title: "InvoiceFast — Free invoice generator, no signup",
  description:
    "Create a professional invoice in seconds and download the PDF. No account needed — your data stays in your browser. USD, EUR, GBP.",
  keywords:
    "free invoice generator, invoice pdf, freelancer invoice, invoice maker, no signup invoice",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
