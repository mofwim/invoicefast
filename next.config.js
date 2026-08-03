/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // The widget is meant to be framed by other sites, so say so explicitly
        // rather than relying on the absence of a blocking header.
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/embed.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        // A cached service worker would pin an old build; always revalidate.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },

  async redirects() {
    return [
      { source: "/mijn-afspraken", destination: "/afspraken", permanent: true },
      { source: "/afspraken/embed", destination: "/afspraken/insluiten", permanent: true },
    ];
  },
};

module.exports = nextConfig;
