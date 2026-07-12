import "./globals.css";

export const metadata = {
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
