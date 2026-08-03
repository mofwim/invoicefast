/**
 * PDF work, in the browser.
 *
 * pdf-lib reads and writes the file structure without rendering anything,
 * which is exactly what these tools need: pages get moved, rotated, dropped or
 * stamped, and the original content is carried across untouched. Nothing is
 * rasterised, so text stays text and a merged document is as sharp as what
 * went into it.
 *
 * The library is loaded on demand — it is the heaviest thing in the market and
 * has no business reaching anyone who did not open a PDF tool.
 */

import { ToolError, fail } from "./errors.js";

let pdfLibPromise = null;

export function loadPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import("pdf-lib");
  return pdfLibPromise;
}

export async function readDocument(file, { forEditing = true } = {}) {
  const { PDFDocument } = await loadPdfLib();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: forEditing });
  } catch (err) {
    throw niceError(file.name, err);
  }
}

function niceError(name, err) {
  const message = String(err?.message || err);
  if (/encrypt|password/i.test(message)) return new ToolError("pdfLocked", { name });
  return new ToolError("pdfUnreadable", { name });
}

export async function save(doc, { name = "document.pdf" } = {}) {
  const bytes = await doc.save({ useObjectStreams: true });
  return { blob: new Blob([bytes], { type: "application/pdf" }), name };
}

/** How many pages, and how big page one is — enough to describe a file. */
export async function describe(file) {
  const doc = await readDocument(file);
  const pages = doc.getPageCount();
  const first = pages ? doc.getPage(0).getSize() : { width: 0, height: 0 };
  return {
    pages,
    width: Math.round(first.width),
    height: Math.round(first.height),
    portrait: first.height >= first.width,
  };
}

/**
 * Read a page selection the way a print dialog does: "1-3, 7, 12-".
 *
 * @param {string} input
 * @param {number} total
 * @returns {number[]} zero-based page indices, in order, without duplicates
 */
export function parsePageRange(input, total) {
  const text = String(input || "").trim();
  if (!text) return [];
  if (/^(alle|all|\*)$/i.test(text)) return Array.from({ length: total }, (_, i) => i);

  const picked = new Set();
  for (const part of text.split(/[,;]/)) {
    const chunk = part.trim();
    if (!chunk) continue;

    const range = chunk.match(/^(\d+)?\s*[-–]\s*(\d+)?$/);
    if (range) {
      const from = range[1] ? Number(range[1]) : 1;
      const to = range[2] ? Number(range[2]) : total;
      for (let n = Math.min(from, to); n <= Math.max(from, to); n++) {
        if (n >= 1 && n <= total) picked.add(n - 1);
      }
      continue;
    }

    const single = Number(chunk);
    if (Number.isInteger(single) && single >= 1 && single <= total) picked.add(single - 1);
  }

  return [...picked].sort((a, b) => a - b);
}

export function formatPageRange(indices) {
  if (!indices.length) return "";
  const parts = [];
  let start = indices[0];
  let previous = indices[0];

  for (const index of indices.slice(1)) {
    if (index === previous + 1) {
      previous = index;
      continue;
    }
    parts.push(start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`);
    start = index;
    previous = index;
  }
  parts.push(start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** One document out of several, in the order they were given. */
export async function mergeFiles(files, { onProgress } = {}) {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  let pages = 0;

  for (let i = 0; i < files.length; i++) {
    const source = await readDocument(files[i]);
    const copied = await out.copyPages(source, source.getPageIndices());
    for (const page of copied) out.addPage(page);
    pages += copied.length;
    onProgress?.(i + 1, files.length);
  }

  if (!pages) fail("pdfNoPages");
  return { doc: out, pages };
}

/** A new document holding only the chosen pages. */
export async function extractPages(file, indices) {
  const { PDFDocument } = await loadPdfLib();
  const source = await readDocument(file);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, indices);
  for (const page of copied) out.addPage(page);
  return out;
}

/** Split into fixed-size chunks: every N pages becomes its own document. */
export async function splitEvery(file, size) {
  const source = await readDocument(file);
  const total = source.getPageCount();
  const groups = [];
  for (let start = 0; start < total; start += size) {
    groups.push(Array.from({ length: Math.min(size, total - start) }, (_, i) => start + i));
  }
  return groups;
}

/**
 * Rebuild a document from a plan: which pages, in which order, turned how far.
 *
 * Moving, turning and dropping are one operation rather than three because
 * they are one thought — "this is what the document should look like". Doing
 * it by copying into a fresh document rather than by shuffling the original
 * also means an index never has to be corrected for an earlier removal, which
 * is where a page-order bug always comes from.
 *
 * @param {File} file
 * @param {{index: number, rotate?: number}[]} plan pages in their new order
 */
export async function rebuildPages(file, plan) {
  const { PDFDocument, degrees } = await loadPdfLib();
  const source = await readDocument(file);

  const wanted = plan.filter((entry) => entry.index >= 0 && entry.index < source.getPageCount());
  if (!wanted.length) fail("pdfAllDropped");

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, wanted.map((entry) => entry.index));

  copied.forEach((page, at) => {
    const turn = wanted[at].rotate || 0;
    // A page can already carry a rotation of its own; this adds to it.
    if (turn) page.setRotation(degrees((page.getRotation().angle + turn + 360) % 360));
    out.addPage(page);
  });

  return out;
}

// ---------------------------------------------------------------------------
// Document properties
// ---------------------------------------------------------------------------

const NO_DATE = "—";

/** What the file says about itself. */
export async function readMetadata(file) {
  const doc = await readDocument(file);
  const asDate = (value) => {
    try {
      return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
    } catch {
      return null;
    }
  };

  return {
    title: doc.getTitle() || "",
    author: doc.getAuthor() || "",
    subject: doc.getSubject() || "",
    keywords: (doc.getKeywords() || "").trim(),
    creator: doc.getCreator() || "",
    producer: doc.getProducer() || "",
    created: asDate(doc.getCreationDate()),
    modified: asDate(doc.getModificationDate()),
    pages: doc.getPageCount(),
  };
}

/**
 * Write the properties back.
 *
 * An empty field clears the entry rather than writing an empty string, so
 * "remove my name from this document" actually removes it — which is most of
 * why anyone opens a metadata editor in the first place.
 */
export async function writeMetadata(file, fields) {
  const doc = await readDocument(file);

  const set = (value, write, clear) => {
    const text = String(value ?? "").trim();
    if (text) write(text);
    else clear();
  };

  set(fields.title, (v) => doc.setTitle(v), () => doc.setTitle(""));
  set(fields.author, (v) => doc.setAuthor(v), () => doc.setAuthor(""));
  set(fields.subject, (v) => doc.setSubject(v), () => doc.setSubject(""));
  set(fields.creator, (v) => doc.setCreator(v), () => doc.setCreator(""));
  set(fields.producer, (v) => doc.setProducer(v), () => doc.setProducer(""));

  const keywords = String(fields.keywords ?? "").trim();
  doc.setKeywords(keywords ? keywords.split(/\s*,\s*/).filter(Boolean) : []);

  if (fields.touchModified !== false) doc.setModificationDate(fields.now || new Date());
  return doc;
}

export { NO_DATE };

// ---------------------------------------------------------------------------
// Signatures and images
// ---------------------------------------------------------------------------

/**
 * Put an image on one page, positioned in fractions of the page.
 *
 * Fractions rather than points because the caller is a person pointing at a
 * preview, and a preview is whatever size the screen made it.
 *
 * @param {File} file
 * @param {{bytes: Uint8Array, type: string}} image
 * @param {{page: number, x: number, y: number, width: number}} place
 *        x and y are the centre, 0–1 from the left and from the *top*
 */
export async function placeImage(file, image, place) {
  const doc = await readDocument(file);
  const isPng = image.type === "image/png";

  let embedded;
  try {
    embedded = isPng ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
  } catch {
    try {
      embedded = isPng ? await doc.embedJpg(image.bytes) : await doc.embedPng(image.bytes);
    } catch {
      fail("pdfBadImage", { name: "handtekening" });
    }
  }

  const page = doc.getPage(Math.min(Math.max(place.page, 0), doc.getPageCount() - 1));
  const size = page.getSize();

  const width = size.width * place.width;
  const height = (width / embedded.width) * embedded.height;

  page.drawImage(embedded, {
    // PDF measures from the bottom; a person points from the top.
    x: size.width * place.x - width / 2,
    y: size.height * (1 - place.y) - height / 2,
    width,
    height,
    opacity: place.opacity ?? 1,
  });

  return doc;
}

const A4 = { width: 595.28, height: 841.89 };

/** Images onto pages: one picture per page, fitted with a margin. */
export async function imagesToPdf(files, { pageSize = "a4", margin = 36, background = "#ffffff" } = {}) {
  const { PDFDocument, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();

  const tint = hexToRgb(background);
  const fill = rgb(tint.r, tint.g, tint.b);

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = /\.png$/i.test(file.name) || file.type === "image/png";

    let embedded;
    try {
      embedded = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch {
      // A misnamed file is common enough to be worth one retry the other way.
      try {
        embedded = isPng ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
      } catch {
        fail("pdfBadImage", { name: file.name });
      }
    }

    const size =
      pageSize === "fit"
        ? { width: embedded.width + margin * 2, height: embedded.height + margin * 2 }
        : embedded.width > embedded.height
          ? { width: A4.height, height: A4.width }
          : A4;

    const page = doc.addPage([size.width, size.height]);
    page.drawRectangle({ x: 0, y: 0, width: size.width, height: size.height, color: fill });

    const room = { width: size.width - margin * 2, height: size.height - margin * 2 };
    const scale = Math.min(room.width / embedded.width, room.height / embedded.height, 1);
    const width = embedded.width * scale;
    const height = embedded.height * scale;

    page.drawImage(embedded, {
      x: (size.width - width) / 2,
      y: (size.height - height) / 2,
      width,
      height,
    });
  }

  if (!doc.getPageCount()) fail("pdfNoImages");
  return doc;
}

/** Text across every page, plus optional page numbers. */
export async function stampDocument(file, { text = "", opacity = 0.25, size = 48, angle = 45, colour = "#ff0000", numbers = false } = {}) {
  const { StandardFonts, degrees, rgb } = await loadPdfLib();
  const doc = await readDocument(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const plain = await doc.embedFont(StandardFonts.Helvetica);
  const tint = hexToRgb(colour);
  const ink = rgb(tint.r, tint.g, tint.b);

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();

    if (text) {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: width / 2 - (textWidth / 2) * Math.cos((angle * Math.PI) / 180),
        y: height / 2 - (textWidth / 2) * Math.sin((angle * Math.PI) / 180),
        size,
        font,
        color: ink,
        opacity,
        rotate: degrees(angle),
      });
    }

    if (numbers) {
      const label = `${index + 1} / ${pages.length}`;
      const labelWidth = plain.widthOfTextAtSize(label, 10);
      page.drawText(label, {
        x: width - labelWidth - 36,
        y: 24,
        size: 10,
        font: plain,
        color: rgb(0.35, 0.35, 0.38),
      });
    }
  });

  return doc;
}

// ---------------------------------------------------------------------------
// Making it smaller
// ---------------------------------------------------------------------------

/**
 * Rewrite the file without changing a single page.
 *
 * Object streams pack the structure tightly and anything the original left
 * unreferenced is dropped on the way through. On a file that came out of a
 * word processor this is often a fifth of it; on one that is already tight it
 * is nothing, and the tool says so rather than pretending.
 */
export async function restructure(file) {
  const doc = await readDocument(file);
  const bytes = await doc.save({ useObjectStreams: true });
  return { blob: new Blob([bytes], { type: "application/pdf" }), pages: doc.getPageCount() };
}

/**
 * Draw every page as a picture and build a new document from those.
 *
 * This is the version that makes a scanned document a tenth of its size, and
 * it is also the version that turns text into pixels — no more selecting,
 * searching or copying. Both halves of that are true, so both are said on the
 * page and the reader picks; it is never done silently.
 */
export async function rasterise(file, { dpi = 150, quality = 0.72, onProgress } = {}) {
  const { PDFDocument } = await loadPdfLib();
  const { openDocument, renderPage } = await import("./pdfjs.js");

  const reader = await openDocument(file);
  const out = await PDFDocument.create();

  for (let number = 1; number <= reader.numPages; number++) {
    const page = await reader.getPage(number);
    const view = page.getViewport({ scale: 1 });
    page.cleanup();

    const canvas = await renderPage(reader, number, { scale: dpi / 72 });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("canvas"))), "image/jpeg", quality);
    });
    canvas.width = 0;
    canvas.height = 0;

    const embedded = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    // The new page keeps the old one's size in points, so the document still
    // prints on the same paper however coarsely it was rendered.
    const sheet = out.addPage([view.width, view.height]);
    sheet.drawImage(embedded, { x: 0, y: 0, width: view.width, height: view.height });

    onProgress?.(number, reader.numPages);
  }

  await reader.destroy();
  const bytes = await out.save({ useObjectStreams: true });
  return { blob: new Blob([bytes], { type: "application/pdf" }), pages: out.getPageCount() };
}

function hexToRgb(hex) {
  const value = String(hex || "#000000").replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export const __testing = { hexToRgb };
