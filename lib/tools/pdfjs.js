/**
 * Reading a PDF the way a reader does — as pictures and as words.
 *
 * pdf-lib next door moves pages around without ever looking inside them, which
 * is exactly right for merging and rotating: nothing is redrawn, so nothing is
 * lost. But it cannot show a page, and a page organiser that shows numbered
 * grey rectangles is asking people to work from memory. This module is the
 * other half — pdf.js, loaded only when a tool needs to *see* the document.
 *
 * It is the heaviest thing in the market by a distance, so nothing here is
 * imported statically and no page pays for it until a picture is asked for.
 */

import { fail } from "./errors.js";

let libraryPromise = null;

/**
 * Load pdf.js and point it at its runtime files.
 *
 * The worker, the character maps and the standard fonts are fetched over HTTP
 * rather than bundled — a document that needs a Japanese cmap gets that one
 * file, and every other document downloads none of them.
 */
export function loadPdfjs() {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      // pdf.js 4 uses this and Safari only grew it in 17.4. One line here is
      // cheaper than telling a reader their browser is too old.
      if (typeof Promise.withResolvers !== "function") {
        Promise.withResolvers = function withResolvers() {
          let resolve;
          let reject;
          const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });
          return { promise, resolve, reject };
        };
      }

      const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return pdfjs;
    })();
  }
  return libraryPromise;
}

const RUNTIME = {
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
};

/**
 * Open a document for reading.
 *
 * The bytes are copied first: pdf.js takes ownership of the buffer it is given
 * and detaches it, which would quietly break a tool that also hands the same
 * file to pdf-lib.
 */
export async function openDocument(file, { password } = {}) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());

  try {
    return await pdfjs.getDocument({ data, password, ...RUNTIME }).promise;
  } catch (err) {
    if (err?.name === "PasswordException") fail("pdfLocked", { name: file.name });
    return fail("pdfUnreadable", { name: file.name });
  }
}

/** Render one page onto a canvas at a given scale, and hand back the canvas. */
export async function renderPage(doc, number, { scale = 1, maxSide = 0, background = "#ffffff" } = {}) {
  const page = await doc.getPage(number);
  let viewport = page.getViewport({ scale });

  // A cap in pixels rather than in scale, because "the tile is 150 across"
  // is the thing a caller actually knows; the page's own size is not.
  if (maxSide > 0) {
    const longest = Math.max(viewport.width, viewport.height);
    if (longest > maxSide) viewport = page.getViewport({ scale: (scale * maxSide) / longest });
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** A page as an image file, at a resolution given in dots per inch. */
export async function pageToBlob(doc, number, { dpi = 150, mime = "image/jpeg", quality = 0.9 } = {}) {
  // A PDF point is 1/72 inch, so the scale is simply the ratio.
  const canvas = await renderPage(doc, number, { scale: dpi / 72 });
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("canvas"))),
      mime,
      mime === "image/png" ? undefined : quality
    );
  });
  // Free the backing store now rather than when the collector gets round to
  // it; a hundred page-sized canvases is a lot of memory to leave lying about.
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

/** A small preview of a page, as a data URL that can go straight in an <img>. */
export async function pageThumbnail(doc, number, { maxSide = 200 } = {}) {
  const canvas = await renderPage(doc, number, { scale: 1, maxSide });
  const url = canvas.toDataURL("image/jpeg", 0.72);
  canvas.width = 0;
  canvas.height = 0;
  return url;
}

/**
 * The words on a page, with the line breaks put back.
 *
 * pdf.js hands back positioned fragments, not lines — a PDF has no idea what a
 * paragraph is. Fragments are grouped by their vertical position, which is
 * what makes the difference between readable text and one endless line.
 */
export async function pageText(doc, number) {
  const page = await doc.getPage(number);
  const content = await page.getTextContent();

  const lines = [];
  let current = null;

  for (const item of content.items) {
    if (typeof item.str !== "string") continue;
    const y = Math.round(item.transform[5]);

    if (!current || Math.abs(current.y - y) > 2) {
      current = { y, parts: [] };
      lines.push(current);
    }
    current.parts.push(item.str);
    if (item.hasEOL) current = null;
  }

  page.cleanup();
  return lines
    .map((line) => line.parts.join("").replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Everything a tool wants to say about a document before doing anything. */
export async function describeDocument(doc) {
  const info = await doc.getMetadata().catch(() => ({ info: {} }));
  const first = await doc.getPage(1);
  const view = first.getViewport({ scale: 1 });
  first.cleanup();

  return {
    pages: doc.numPages,
    width: Math.round(view.width),
    height: Math.round(view.height),
    portrait: view.height >= view.width,
    title: info.info?.Title || "",
    author: info.info?.Author || "",
    producer: info.info?.Producer || "",
  };
}

/** Page sizes for every page, which is what an organiser needs to lay out. */
export async function pageSizes(doc) {
  const sizes = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number);
    const view = page.getViewport({ scale: 1 });
    sizes.push({ width: Math.round(view.width), height: Math.round(view.height) });
    page.cleanup();
  }
  return sizes;
}
