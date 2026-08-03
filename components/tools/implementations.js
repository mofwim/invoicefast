import dynamic from "next/dynamic";

/**
 * Which code belongs to which registry entry.
 *
 * Loaded lazily on purpose: one dynamic route serves the whole market, so a
 * static import list would ship every tool's code to every tool's page. This
 * way each tool gets its own chunk and a visitor downloads only the one they
 * opened. The words around it are still rendered on the server, so the page
 * has its content before any of this arrives.
 */
const IMPLEMENTATIONS = {
  "compress-image": dynamic(() => import("./compress-image")),
  "convert-image": dynamic(() => import("./convert-image")),
  "resize-image": dynamic(() => import("./resize-image")),
  "make-favicon": dynamic(() => import("./make-favicon")),
  "watermark-image": dynamic(() => import("./watermark-image")),
  "merge-pdf": dynamic(() => import("./merge-pdf")),
  "split-pdf": dynamic(() => import("./split-pdf")),
  "organise-pdf": dynamic(() => import("./organise-pdf")),
  "images-to-pdf": dynamic(() => import("./images-to-pdf")),
  "stamp-pdf": dynamic(() => import("./stamp-pdf")),
  "pdf-to-images": dynamic(() => import("./pdf-to-images")),
  "pdf-to-text": dynamic(() => import("./pdf-to-text")),
  "compress-pdf": dynamic(() => import("./compress-pdf")),
  "pdf-metadata": dynamic(() => import("./pdf-metadata")),
  "sign-pdf": dynamic(() => import("./sign-pdf")),
  "unpack-email": dynamic(() => import("./unpack-email")),
  "convert-calendar": dynamic(() => import("./convert-calendar")),
  "word-count": dynamic(() => import("./word-count")),
  "json-format": dynamic(() => import("./json-format")),
  base64: dynamic(() => import("./base64")),
  "text-diff": dynamic(() => import("./text-diff")),
  "slug-url": dynamic(() => import("./slug-url")),
  "qr-code": dynamic(() => import("./qr-code")),
  password: dynamic(() => import("./password")),
  hash: dynamic(() => import("./hash")),
  "vat-calculator": dynamic(() => import("./vat-calculator")),
  "iban-check": dynamic(() => import("./iban-check")),
};

export function loadTool(id) {
  return IMPLEMENTATIONS[id] || null;
}

export function hasImplementation(id) {
  return Boolean(IMPLEMENTATIONS[id]);
}

export const IMPLEMENTED_IDS = Object.keys(IMPLEMENTATIONS);
