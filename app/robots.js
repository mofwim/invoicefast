const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://invoicefast.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The widget is a frame for other people's pages, not a page to index.
        disallow: ["/embed/", "/api/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
