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

export async function rotateAndDrop(file, { rotate = {}, drop = [] } = {}) {
  const { degrees } = await loadPdfLib();
  const doc = await readDocument(file);
  const dropped = new Set(drop);

  doc.getPages().forEach((page, index) => {
    const turn = rotate[index] || 0;
    if (turn) page.setRotation(degrees((page.getRotation().angle + turn) % 360));
  });

  // Remove from the back so the earlier indices stay valid.
  [...dropped].sort((a, b) => b - a).forEach((index) => doc.removePage(index));

  if (!doc.getPageCount()) fail("pdfAllDropped");
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
