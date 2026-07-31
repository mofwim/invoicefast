/**
 * Canvas glue between the raw capture and the stored page: decode -> warp ->
 * filter -> rotate -> encode.
 *
 * Pages keep their original capture blob, so changing the crop or the filter
 * later re-runs this pipeline from source instead of degrading an already
 * processed image.
 */

import { applyFilter, rotateImageData } from './imaging';
import { warpQuad, PAGE_RATIOS } from './warp';

/** Longest side of a stored page. 2200px ≈ 260 dpi on A4 — plenty for print. */
export const MAX_PAGE_SIDE = 2200;
const THUMB_SIDE = 320;

function canvasFrom(imageData) {
  const c = document.createElement('canvas');
  c.width = imageData.width;
  c.height = imageData.height;
  c.getContext('2d', { willReadFrequently: true }).putImageData(imageData, 0, 0);
  return c;
}

/** Decode any image source into ImageData, downscaling very large captures. */
export async function toImageData(source, maxSide = 3000) {
  let bitmap;
  if (source instanceof ImageData) return source;
  if (typeof createImageBitmap === 'function' && (source instanceof Blob || source instanceof File)) {
    bitmap = await createImageBitmap(source);
  } else {
    const url = source instanceof Blob ? URL.createObjectURL(source) : source;
    try {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('could not decode image'));
        img.src = url;
      });
    } finally {
      if (source instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close?.();
  return ctx.getImageData(0, 0, cw, ch);
}

export function imageDataToBlob(imageData, { type = 'image/jpeg', quality = 0.88 } = {}) {
  const c = canvasFrom(imageData);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), type, quality));
}

export function makeThumbData(imageData, maxSide = THUMB_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(imageData.width, imageData.height));
  if (scale === 1) return imageData;
  const src = canvasFrom(imageData);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(imageData.width * scale));
  c.height = Math.max(1, Math.round(imageData.height * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/**
 * Run a page's stored edit state over its original capture.
 *
 * @param {ImageData} original decoded source capture
 * @param {{quad?:Array, filter?:string, rotation?:number, adjust?:object, ratio?:string,
 *          quality?:number}} edit
 * @returns {Promise<{blob:Blob, thumb:Blob, width:number, height:number, imageData:ImageData}>}
 */
export async function renderPage(original, edit = {}) {
  const filter = edit.filter || 'auto';
  const ratio = PAGE_RATIOS[edit.ratio || 'auto'] ?? null;

  let img = edit.quad
    ? warpQuad(original, edit.quad, { maxLongSide: MAX_PAGE_SIDE, ratio })
    : original;
  img = applyFilter(img, filter, edit.adjust);
  if (edit.rotation) img = rotateImageData(img, Math.round(edit.rotation / 90));

  // Pure black-and-white compresses far better (and stays crisp) as PNG.
  const isBw = filter === 'bw';
  const type = isBw ? 'image/png' : 'image/jpeg';
  const blob = await imageDataToBlob(img, { type, quality: edit.quality ?? 0.88 });
  const thumb = await imageDataToBlob(makeThumbData(img), {
    type: 'image/jpeg',
    quality: 0.72,
  });

  return { blob, thumb, width: img.width, height: img.height, imageData: img };
}

/** Preview-sized render — same look, small enough to feel instant while tweaking. */
export async function renderPreview(original, edit = {}, maxSide = 900) {
  const filter = edit.filter || 'auto';
  const ratio = PAGE_RATIOS[edit.ratio || 'auto'] ?? null;
  let img = edit.quad
    ? warpQuad(original, edit.quad, { maxLongSide: maxSide, ratio })
    : makeThumbData(original, maxSide);
  img = applyFilter(img, filter, edit.adjust);
  if (edit.rotation) img = rotateImageData(img, Math.round(edit.rotation / 90));
  return img;
}
