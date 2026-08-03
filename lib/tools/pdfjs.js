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
 * Open a document for reading — from a file, or from bytes already in hand.
 *
 * The bytes are copied first: pdf.js takes ownership of the buffer it is given
 * and detaches it, which would quietly break a tool that also hands the same
 * file to pdf-lib.
 */
export async function openDocument(source, { password, name } = {}) {
  const pdfjs = await loadPdfjs();
  const label = name || source?.name || "PDF";
  const data =
    source instanceof Uint8Array ? new Uint8Array(source) : new Uint8Array(await source.arrayBuffer());

  try {
    return await pdfjs.getDocument({ data, password, ...RUNTIME }).promise;
  } catch (err) {
    if (err?.name === "PasswordException") fail("pdfLocked", { name: label });
    return fail("pdfUnreadable", { name: label });
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

/**
 * The pictures embedded in a page, at their own resolution.
 *
 * Not the page rendered as a picture — the actual photographs and logos that
 * were put into the document, pulled back out at the size they went in at. A
 * scan of a page is one image; a report is a handful, at whatever resolution
 * the author supplied.
 *
 * pdf.js decodes them into raw pixels of three shapes, and each has to be laid
 * out into RGBA by hand before a canvas will take it. Anything it will not
 * decode is skipped rather than allowed to stop the rest.
 */
export async function pageImages(doc, number, { minSide = 24 } = {}) {
  const pdfjs = await loadPdfjs();
  const page = await doc.getPage(number);
  const operators = await page.getOperatorList();

  // The worker only hands the decoded pixels over while the page is being
  // drawn. Asking the object store before that waits for ever, so the page is
  // rendered small and thrown away purely to make the images arrive.
  const viewport = page.getViewport({ scale: 0.2 });
  const scratch = document.createElement("canvas");
  scratch.width = Math.max(1, Math.round(viewport.width));
  scratch.height = Math.max(1, Math.round(viewport.height));
  try {
    await page.render({ canvasContext: scratch.getContext("2d"), viewport }).promise;
  } catch {
    // A page that will not draw may still have readable objects; carry on.
  }
  scratch.width = 0;
  scratch.height = 0;

  const wanted = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintJpegXObject]);
  const found = [];
  const seen = new Set();

  for (let at = 0; at < operators.fnArray.length; at++) {
    if (!wanted.has(operators.fnArray[at])) continue;
    const name = operators.argsArray[at][0];
    // The same logo on a page ten times is still one picture.
    if (typeof name !== "string" || seen.has(name)) continue;
    seen.add(name);

    const image = await resolveObject(page, doc, name);
    if (!image?.width || !image?.height) continue;
    if (Math.min(image.width, image.height) < minSide) continue;

    const canvas = toCanvas(image);
    if (!canvas) continue;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    canvas.width = 0;
    canvas.height = 0;
    if (blob) found.push({ blob, width: image.width, height: image.height, page: number });
  }

  page.cleanup();
  return found;
}

/**
 * Fetch one decoded object, from wherever it ended up.
 *
 * An image used by a single page lives on that page's store; one shared across
 * pages is promoted to the document's. Neither lookup is allowed to hang: an
 * object that never arrives means one missing picture, not a stuck tool.
 */
async function resolveObject(page, doc, name) {
  for (const store of [page.objs, doc.commonObjs]) {
    if (!store) continue;
    try {
      if (typeof store.has === "function" && store.has(name)) return store.get(name);
    } catch {
      // Not in this one; try the next.
    }
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    try {
      page.objs.get(name, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** pdf.js's three pixel layouts, laid out into the one a canvas accepts. */
function toCanvas(image) {
  const { width, height, data, kind, bitmap } = image;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Newer builds hand back an ImageBitmap directly, which is simply drawn.
  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  }
  if (!data) return null;

  const out = ctx.createImageData(width, height);
  const pixels = out.data;

  if (kind === 3 || data.length === width * height * 4) {
    pixels.set(data.subarray(0, pixels.length));
  } else if (kind === 2 || data.length === width * height * 3) {
    for (let i = 0, at = 0; i < data.length; i += 3, at += 4) {
      pixels[at] = data[i];
      pixels[at + 1] = data[i + 1];
      pixels[at + 2] = data[i + 2];
      pixels[at + 3] = 255;
    }
  } else if (kind === 1) {
    // One bit per pixel, packed eight to a byte, most significant first.
    const perRow = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (data[y * perRow + (x >> 3)] >> (7 - (x & 7))) & 1;
        const at = (y * width + x) * 4;
        const tone = bit ? 255 : 0;
        pixels[at] = tone;
        pixels[at + 1] = tone;
        pixels[at + 2] = tone;
        pixels[at + 3] = 255;
      }
    }
  } else {
    return null;
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
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
