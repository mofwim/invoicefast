/**
 * Export scanned pages as PDF, images, or plain text.
 *
 * The PDF path optionally embeds an invisible OCR text layer, which is what
 * makes a scan searchable and copy-pasteable in any PDF reader.
 */

import { jsPDF } from 'jspdf';

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** `Scan-2026-07-31-1653` — always safe, always identifiable. */
export function datedStem(prefix = 'Scan', date = new Date()) {
  const p = (v) => String(v).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
}

/**
 * Turn a document title into a filename that actually survives the download.
 *
 * Chromium discards a download name containing non-ASCII characters and saves
 * the file as plain "download" instead, so an Arabic document title silently
 * loses its name. Non-ASCII names are also the first thing to break on FAT
 * volumes, in email clients and across OS locales. So: keep the portable
 * subset, and when a title has nothing left after that (Arabic, Chinese,
 * Cyrillic…), fall back to a dated stem rather than to something meaningless.
 */
export function safeFilename(name, fallback = '') {
  const cleaned = (name || '')
    // "Août" -> "Aout" rather than "Ao t": strip accents before dropping
    // anything non-ASCII, so Latin-script titles survive intact.
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '');
  // Require letters, not just digits: a title that reduces to bare numbers
  // ("2026-07-31") says less than the dated stem, which at least says "Scan".
  if (cleaned.replace(/[^A-Za-z]/g, '').length >= 2) return cleaned.slice(0, 80);
  return fallback || datedStem();
}

/* ------------------------------------------------------------------ */
/* page geometry                                                        */
/* ------------------------------------------------------------------ */

// jsPDF works in points here; 72pt = 1 inch.
export const PDF_PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

const ASSUMED_DPI = 150;

function pageBoxFor(pageSize, imgW, imgH) {
  if (pageSize === 'fit') {
    const w = (imgW * 72) / ASSUMED_DPI;
    const h = (imgH * 72) / ASSUMED_DPI;
    return [w, h];
  }
  const [w, h] = PDF_PAGE_SIZES[pageSize] || PDF_PAGE_SIZES.a4;
  // Match the page orientation to the image so landscape scans aren't letterboxed.
  return imgW > imgH ? [h, w] : [w, h];
}

/* ------------------------------------------------------------------ */
/* OCR text layer                                                       */
/* ------------------------------------------------------------------ */

// jsPDF's built-in fonts are WinAnsi only. Words outside that range would be
// mangled, so they're skipped in the invisible layer — they're still available
// in the .txt export and in the on-screen OCR panel.
const WINANSI = /^[\x20-\x7E\xA0-\xFF]+$/;

function drawTextLayer(doc, words, box) {
  if (!words?.length) return;
  const { drawX, drawY, drawW, drawH, imgW, imgH } = box;
  const sx = drawW / imgW;
  const sy = drawH / imgH;
  doc.setTextColor(0, 0, 0);
  for (const word of words) {
    const text = (word.text || '').trim();
    if (!text || !WINANSI.test(text)) continue;
    const b = word.bbox;
    if (!b) continue;
    const h = (b.y1 - b.y0) * sy;
    if (h <= 0.5) continue;
    const size = Math.min(72, Math.max(2, h * 0.86));
    doc.setFontSize(size);
    try {
      doc.text(text, drawX + b.x0 * sx, drawY + b.y1 * sy, {
        renderingMode: 'invisible',
        baseline: 'alphabetic',
      });
    } catch {
      // A single unencodable word must never abort the whole export.
    }
  }
}

/* ------------------------------------------------------------------ */
/* PDF                                                                  */
/* ------------------------------------------------------------------ */

/**
 * @param {Array<{blob: Blob, ocr?: {words?: Array}}>} pages
 * @param {{pageSize?:string, margin?:number, searchable?:boolean, title?:string,
 *          onProgress?:(done:number,total:number)=>void}} opts
 * @returns {Promise<Blob>}
 */
export async function exportPdf(pages, opts = {}) {
  const pageSize = opts.pageSize || 'a4';
  const margin = opts.margin ?? 24;
  const searchable = opts.searchable ?? true;
  const onProgress = opts.onProgress;

  let doc = null;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const dataUrl = await blobToDataUrl(page.blob);
    const img = await loadImage(dataUrl);
    const [pw, ph] = pageBoxFor(pageSize, img.width, img.height);

    if (!doc) {
      doc = new jsPDF({
        unit: 'pt',
        format: [pw, ph],
        orientation: pw > ph ? 'landscape' : 'portrait',
        compress: true,
      });
    } else {
      doc.addPage([pw, ph], pw > ph ? 'landscape' : 'portrait');
    }

    const m = pageSize === 'fit' ? 0 : margin;
    const availW = pw - m * 2;
    const availH = ph - m * 2;
    const scale = Math.min(availW / img.width, availH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (pw - drawW) / 2;
    const drawY = (ph - drawH) / 2;

    const format = /^data:image\/png/.test(dataUrl) ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, format, drawX, drawY, drawW, drawH, undefined, 'FAST');

    if (searchable && page.ocr?.words?.length) {
      drawTextLayer(doc, page.ocr.words, {
        drawX,
        drawY,
        drawW,
        drawH,
        imgW: img.width,
        imgH: img.height,
      });
    }
    onProgress?.(i + 1, pages.length);
  }

  if (!doc) throw new Error('no pages');
  if (opts.title) doc.setProperties({ title: opts.title, creator: 'ScanFast' });
  return doc.output('blob');
}

/* ------------------------------------------------------------------ */
/* text                                                                 */
/* ------------------------------------------------------------------ */

export function exportText(pages) {
  const parts = pages.map((p, i) => {
    const body = p.ocr?.text?.trim();
    return `--- Page ${i + 1} ---\n${body || '(no recognised text)'}`;
  });
  return new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
}

/* ------------------------------------------------------------------ */
/* zip (stored, no compression) — images are already compressed          */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Minimal ZIP writer so "export all pages as images" is one file instead of N
 * download prompts. Store-only, which is right for JPEG/PNG payloads.
 * @param {Array<{name:string, blob:Blob}>} files
 */
export async function makeZip(files) {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const entries = [];
  let offset = 0;
  const chunks = [];

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const crc = crc32(data);

    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true);
    hv.setUint16(4, 20, true); // version needed
    hv.setUint16(6, 0, true); // flags
    hv.setUint16(8, 0, true); // method: store
    hv.setUint16(10, time, true);
    hv.setUint16(12, date, true);
    hv.setUint32(14, crc, true);
    hv.setUint32(18, data.length, true);
    hv.setUint32(22, data.length, true);
    hv.setUint16(26, nameBytes.length, true);
    hv.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    chunks.push(header, data);
    entries.push({ nameBytes, crc, size: data.length, offset });
    offset += header.length + data.length;
  }

  const cdStart = offset;
  for (const e of entries) {
    const cd = new Uint8Array(46 + e.nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.size, true);
    cv.setUint32(24, e.size, true);
    cv.setUint16(28, e.nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, e.offset, true);
    cd.set(e.nameBytes, 46);
    chunks.push(cd);
    offset += cd.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, offset - cdStart, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);
  chunks.push(eocd);

  return new Blob(chunks, { type: 'application/zip' });
}
