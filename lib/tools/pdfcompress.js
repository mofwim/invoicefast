/**
 * Making a PDF smaller the way it should be done.
 *
 * The naive way — draw every page as a picture and rebuild the document from
 * those — is what most browser tools do, and it is wrong twice over. On a
 * document that is mostly text it makes the file *bigger*, because a page of
 * type compresses far worse as pixels than as glyphs. And on the documents
 * where it does win, it wins by destroying the thing people came for: the text
 * stops being text, so it cannot be selected, searched or read aloud.
 *
 * What a real compressor does is leave the text and vector objects completely
 * alone and go after the only thing that is actually large: the embedded
 * images. A scan is one enormous picture per page; a report is a handful of
 * photographs at whatever resolution somebody's camera happened to produce.
 * Those get downsampled to a sensible resolution and re-encoded, and the rest
 * of the file is carried across untouched.
 *
 * Anything this cannot decode safely is left exactly as it was. A tool that
 * mangles one image in fifty is worse than one that skips it and says so.
 */

import { fail } from "./errors.js";
import { loadPdfLib, readDocument } from "./pdf.js";

/** Colour spaces this understands well enough to rebuild an image from. */
const PLAIN_COLOURS = new Set(["DeviceRGB", "DeviceGray", "CalRGB", "CalGray"]);

const name = (value) => (value ? String(value).replace(/^\//, "") : "");

/**
 * Read one entry out of an image dictionary, whatever shape it takes.
 * A filter is a single name on most images and an array on some.
 */
function filtersOf(dict, PDFName) {
  const filter = dict.get(PDFName.of("Filter"));
  if (!filter) return [];
  const asArray = typeof filter.asArray === "function" ? filter.asArray() : null;
  return (asArray || [filter]).map((entry) => name(entry?.toString?.()));
}

function numberOf(dict, PDFName, key) {
  const value = dict.get(PDFName.of(key));
  return typeof value?.asNumber === "function" ? value.asNumber() : null;
}

/** Inflate a Flate-encoded stream using the browser's own decompressor. */
async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Decode one image object into a canvas, or return null when it is not
 * something this understands. Null is a perfectly good answer: the caller
 * leaves that image alone.
 */
async function decodeImage(stream, PDFName) {
  const dict = stream.dict;
  const width = numberOf(dict, PDFName, "Width");
  const height = numberOf(dict, PDFName, "Height");
  if (!width || !height) return null;

  // A stencil mask is one bit per pixel and belongs to the drawing, not to the
  // picture; re-encoding one as a photograph would be nonsense.
  if (dict.get(PDFName.of("ImageMask"))) return null;
  // Transparency cannot survive a trip through JPEG, so anything carrying it
  // is left as it is rather than quietly losing its cut-out.
  if (dict.get(PDFName.of("SMask")) || dict.get(PDFName.of("Mask"))) return null;

  const filters = filtersOf(dict, PDFName);
  const colour = name(dict.get(PDFName.of("ColorSpace"))?.toString?.());
  const bits = numberOf(dict, PDFName, "BitsPerComponent");
  const bytes = stream.getContents();

  // The common case by a distance: the stream is already a JPEG, so the
  // browser's own decoder reads it.
  if (filters.includes("DCTDecode")) {
    if (colour === "DeviceCMYK") return null; // four-channel JPEG, decoded wrong by canvas
    try {
      return await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
    } catch {
      return null;
    }
  }

  // The other common case: raw samples, deflated. Only the straightforward
  // colour spaces at eight bits are rebuilt here.
  if (filters.length === 1 && filters[0] === "FlateDecode" && bits === 8 && PLAIN_COLOURS.has(colour)) {
    let raw;
    try {
      raw = await inflate(bytes);
    } catch {
      return null;
    }

    const channels = colour === "DeviceGray" || colour === "CalGray" ? 1 : 3;
    if (raw.length < width * height * channels) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(width, height);

    for (let pixel = 0, at = 0, from = 0; pixel < width * height; pixel++, at += 4, from += channels) {
      if (channels === 1) {
        image.data[at] = image.data[at + 1] = image.data[at + 2] = raw[from];
      } else {
        image.data[at] = raw[from];
        image.data[at + 1] = raw[from + 1];
        image.data[at + 2] = raw[from + 2];
      }
      image.data[at + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  // JPX, CCITT, JBIG2, LZW, indexed palettes — all left alone on purpose.
  return null;
}

/** Draw a decoded image at its new size and encode it as a JPEG. */
async function reEncode(source, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  canvas.width = 0;
  canvas.height = 0;
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/**
 * Compress a document by rewriting its images.
 *
 * @param {File} file
 * @param {{dpi?: number, quality?: number, onProgress?: Function}} options
 *        dpi is the resolution the images are worth keeping at, judged against
 *        the size of the page they could fill
 * @returns {Promise<{blob: Blob, pages: number, images: number, changed: number,
 *                    skipped: number, before: number, after: number}>}
 */
export async function compressImages(file, { dpi = 150, quality = 0.72, onProgress } = {}) {
  const { PDFName, PDFRawStream, PDFDict } = await loadPdfLib();
  const doc = await readDocument(file);
  if (!doc.getPageCount()) fail("pdfNoPages");

  // An image is never worth more pixels than the largest page could show at
  // the chosen resolution. That is a ceiling, not a target: a small logo stays
  // small, and only the oversized scans come down.
  const longestPage = doc.getPages().reduce((longest, page) => {
    const { width, height } = page.getSize();
    return Math.max(longest, width, height);
  }, 0);
  const ceiling = Math.max(200, Math.round((longestPage * dpi) / 72));

  const objects = doc.context.enumerateIndirectObjects();
  const images = objects.filter(
    ([, object]) =>
      object instanceof PDFRawStream &&
      object.dict instanceof PDFDict &&
      name(object.dict.get(PDFName.of("Subtype"))?.toString?.()) === "Image"
  );

  let changed = 0;
  let skipped = 0;
  let before = 0;
  let after = 0;

  for (let at = 0; at < images.length; at++) {
    const [ref, stream] = images[at];
    onProgress?.(at, images.length);

    const originalSize = stream.getContents().length;
    before += originalSize;

    const decoded = await decodeImage(stream, PDFName);
    if (!decoded) {
      skipped++;
      after += originalSize;
      continue;
    }

    const width = decoded.width;
    const height = decoded.height;
    const scale = Math.min(1, ceiling / Math.max(width, height));
    const target = {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };

    const bytes = await reEncode(decoded, target.width, target.height, quality);
    decoded.close?.();

    // Only accept a rewrite that actually pays: a JPEG that comes out larger
    // than what was there is a loss of quality for nothing.
    if (!bytes || bytes.length >= originalSize * 0.92) {
      skipped++;
      after += originalSize;
      continue;
    }

    const replacement = doc.context.obj({
      Type: "XObject",
      Subtype: "Image",
      Width: target.width,
      Height: target.height,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
      Filter: "DCTDecode",
      Length: bytes.length,
    });
    doc.context.assign(ref, PDFRawStream.of(replacement, bytes));

    changed++;
    after += bytes.length;
  }

  onProgress?.(images.length, images.length);
  const saved = await doc.save({ useObjectStreams: true });

  return {
    blob: new Blob([saved], { type: "application/pdf" }),
    pages: doc.getPageCount(),
    images: images.length,
    changed,
    skipped,
    before,
    after,
  };
}
