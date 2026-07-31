/**
 * The Android build needs a fully static site to bundle into the APK, but the
 * web deploy should keep Next's normal server output. `CAPACITOR_BUILD=1`
 * switches to static export; `npm run android:build` sets it for you.
 */
const isCapacitor = process.env.CAPACITOR_BUILD === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isCapacitor
    ? {
        output: 'export',
        // Emits out/scan/index.html, which the WebView's local server resolves
        // directly. Without it the export is out/scan.html and /scan/ 404s.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

module.exports = nextConfig;
