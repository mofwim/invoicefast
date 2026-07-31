/**
 * Core image processing for the document scanner.
 *
 * Everything here works on plain ImageData (RGBA Uint8ClampedArray) so it can
 * run on the main thread or inside a worker. No dependencies, no WASM — small
 * enough to ship over mobile data.
 */

/* ------------------------------------------------------------------ */
/* basic conversions                                                    */
/* ------------------------------------------------------------------ */

/** Luma (ITU-R BT.601) plane as Uint8ClampedArray of length w*h. */
export function toGray(img) {
  const { data, width, height } = img;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < out.length; p++, i += 4) {
    out[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }
  return out;
}

/** Nearest-neighbour downscale of a gray plane. Fast and good enough for analysis. */
export function downscaleGray(gray, w, h, targetLong) {
  const long = Math.max(w, h);
  if (long <= targetLong) return { gray, w, h, scale: 1 };
  const scale = targetLong / long;
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const out = new Uint8ClampedArray(nw * nh);
  // Box-average so we don't alias away thin document edges.
  const sx = w / nw;
  const sy = h / nh;
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(h, Math.floor((y + 1) * sy)) || y0 + 1;
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(w, Math.floor((x + 1) * sx)) || x0 + 1;
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * w;
        for (let xx = x0; xx < x1; xx++) {
          sum += gray[row + xx];
          n++;
        }
      }
      out[y * nw + x] = n ? sum / n : 0;
    }
  }
  return { gray: out, w: nw, h: nh, scale: nw / w };
}

/* ------------------------------------------------------------------ */
/* integral images + blur                                               */
/* ------------------------------------------------------------------ */

/**
 * Summed-area table with a zero row/column border, so a box sum is 4 lookups
 * regardless of window size. Float64 because w*h*255 overflows 32-bit ints on
 * big captures.
 */
export function integralImage(gray, w, h) {
  const iw = w + 1;
  const sat = new Float64Array(iw * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const src = y * w;
    const cur = (y + 1) * iw;
    const prev = y * iw;
    for (let x = 0; x < w; x++) {
      rowSum += gray[src + x];
      sat[cur + x + 1] = sat[prev + x + 1] + rowSum;
    }
  }
  return sat;
}

/** Mean of the box [x0,x1) x [y0,y1) using a summed-area table. */
function boxMean(sat, iw, x0, y0, x1, y1) {
  const a = sat[y0 * iw + x0];
  const b = sat[y0 * iw + x1];
  const c = sat[y1 * iw + x0];
  const d = sat[y1 * iw + x1];
  const area = (x1 - x0) * (y1 - y0);
  return area > 0 ? (d - b - c + a) / area : 0;
}

/**
 * Box blur via integral image — O(1) per pixel whatever the radius, which is
 * what makes the shadow-removal pass below affordable on a phone.
 */
export function boxBlur(gray, w, h, radius) {
  const sat = integralImage(gray, w, h);
  const iw = w + 1;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w, x + radius + 1);
      out[y * w + x] = boxMean(sat, iw, x0, y0, x1, y1);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* thresholding                                                         */
/* ------------------------------------------------------------------ */

/** Otsu's global threshold — used to separate paper from background. */
export function otsuThreshold(gray) {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = t;
    }
  }
  return best;
}

/**
 * Adaptive (Bradley–Roth) threshold: a pixel goes black when it is more than
 * `sensitivity` below the mean of its neighbourhood. This is what produces the
 * clean black-on-white "scanned" look under uneven lighting.
 */
export function adaptiveThreshold(gray, w, h, { window = 0, sensitivity = 0.13 } = {}) {
  const win = window || Math.max(11, Math.round(Math.max(w, h) / 22) | 1);
  const r = win >> 1;
  const sat = integralImage(gray, w, h);
  const iw = w + 1;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const mean = boxMean(sat, iw, x0, y0, x1, y1);
      out[y * w + x] = gray[y * w + x] < mean * (1 - sensitivity) ? 0 : 255;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* gradients                                                            */
/* ------------------------------------------------------------------ */

/** Sobel magnitude, clamped to 0..255. Used by the edge-based corner search. */
export function sobelMagnitude(gray, w, h) {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1];
      const t = gray[i - w];
      const tr = gray[i - w + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + w - 1];
      const b = gray[i + w];
      const br = gray[i + w + 1];
      const gx = tr + 2 * r + br - (tl + 2 * l + bl);
      const gy = bl + 2 * b + br - (tl + 2 * t + tr);
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* shadow removal                                                       */
/* ------------------------------------------------------------------ */

/**
 * Estimate the illumination field with a very large box blur and divide it out.
 * This is the single biggest quality win: it flattens the shadow your hand or
 * phone casts across the page before any filter runs.
 */
export function removeShadows(img, strength = 1) {
  const { width: w, height: h } = img;
  const gray = toGray(img);
  const radius = Math.max(8, Math.round(Math.max(w, h) / 12));
  const bg = boxBlur(gray, w, h, radius);
  const data = img.data;
  const out = new ImageData(w, h);
  const o = out.data;
  for (let p = 0, i = 0; p < bg.length; p++, i += 4) {
    // Target a bright page: scale each channel by (255 / local background).
    const base = bg[p] || 1;
    const gain = 1 + strength * (255 / base - 1);
    o[i] = data[i] * gain;
    o[i + 1] = data[i + 1] * gain;
    o[i + 2] = data[i + 2] * gain;
    o[i + 3] = 255;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* filters                                                              */
/* ------------------------------------------------------------------ */

/** Percentile-based contrast stretch. Ignores the extreme tails so a single
 *  specular highlight can't flatten the whole page. */
function percentiles(gray, lowP = 0.02, highP = 0.985) {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * lowP) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * (1 - highP)) {
      hi = v;
      break;
    }
  }
  if (hi <= lo) hi = Math.min(255, lo + 1);
  return { lo, hi };
}

function applyLut(img, lut) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  return img;
}

function buildLevelsLut(lo, hi, gamma = 1) {
  const lut = new Uint8ClampedArray(256);
  const span = hi - lo || 1;
  for (let v = 0; v < 256; v++) {
    let t = (v - lo) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (gamma !== 1) t = Math.pow(t, gamma);
    lut[v] = t * 255;
  }
  return lut;
}

function cloneImageData(img) {
  const out = new ImageData(img.width, img.height);
  out.data.set(img.data);
  return out;
}

/**
 * Named filters, mirroring what people expect from a scanner app.
 *  - original : untouched capture
 *  - auto     : de-shadow + contrast stretch, keeps colour (the default)
 *  - color    : "magic colour" — de-shadow, stronger stretch, saturation boost
 *  - gray     : neutral greyscale with levels
 *  - bw       : adaptive-threshold black & white, the classic scan look
 */
export const FILTERS = [
  { id: 'auto', label: 'Auto', labelAr: 'تلقائي' },
  { id: 'color', label: 'Magic color', labelAr: 'ألوان' },
  { id: 'gray', label: 'Grayscale', labelAr: 'رمادي' },
  { id: 'bw', label: 'B & W', labelAr: 'أبيض وأسود' },
  { id: 'original', label: 'Original', labelAr: 'الأصلي' },
];

/**
 * @param {ImageData} src
 * @param {string} filterId
 * @param {{brightness?:number, contrast?:number}} adjust brightness/contrast in -100..100
 */
export function applyFilter(src, filterId, adjust = {}) {
  const brightness = adjust.brightness ?? 0;
  const contrast = adjust.contrast ?? 0;

  let img;
  switch (filterId) {
    case 'original':
      img = cloneImageData(src);
      break;

    case 'gray': {
      img = removeShadows(src, 0.85);
      const g = toGray(img);
      const { lo, hi } = percentiles(g);
      const lut = buildLevelsLut(lo, hi, 0.95);
      const d = img.data;
      for (let p = 0, i = 0; p < g.length; p++, i += 4) {
        const v = lut[g[p]];
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }

    case 'bw': {
      const deshadowed = removeShadows(src, 1);
      const g = toGray(deshadowed);
      const bin = adaptiveThreshold(g, src.width, src.height, { sensitivity: 0.12 });
      img = new ImageData(src.width, src.height);
      const d = img.data;
      for (let p = 0, i = 0; p < bin.length; p++, i += 4) {
        d[i] = d[i + 1] = d[i + 2] = bin[p];
        d[i + 3] = 255;
      }
      break;
    }

    case 'color': {
      img = removeShadows(src, 1);
      const g = toGray(img);
      const { lo, hi } = percentiles(g, 0.03, 0.99);
      const lut = buildLevelsLut(lo, hi, 0.9);
      applyLut(img, lut);
      saturate(img, 1.25);
      break;
    }

    case 'auto':
    default: {
      img = removeShadows(src, 0.8);
      const g = toGray(img);
      const { lo, hi } = percentiles(g);
      applyLut(img, buildLevelsLut(lo, hi, 1));
      saturate(img, 1.06);
      break;
    }
  }

  if (brightness !== 0 || contrast !== 0) applyBrightnessContrast(img, brightness, contrast);
  return img;
}

/** Saturation around the pixel's own luma. amount 1 = unchanged. */
function saturate(img, amount) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    d[i] = l + (d[i] - l) * amount;
    d[i + 1] = l + (d[i + 1] - l) * amount;
    d[i + 2] = l + (d[i + 2] - l) * amount;
  }
}

/** brightness/contrast both in -100..100. */
export function applyBrightnessContrast(img, brightness, contrast) {
  const b = (brightness / 100) * 96;
  const c = contrast / 100;
  const f = (1.02 * (c + 1)) / (1.02 - c);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = f * (v - 128) + 128 + b;
  return applyLut(img, lut);
}

/* ------------------------------------------------------------------ */
/* rotation                                                             */
/* ------------------------------------------------------------------ */

/** Rotate ImageData by a multiple of 90°. */
export function rotateImageData(img, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0) return img;
  const { width: w, height: h, data } = img;
  const swap = turns % 2 === 1;
  const nw = swap ? h : w;
  const nh = swap ? w : h;
  const out = new ImageData(nw, nh);
  const o = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx;
      let ny;
      if (turns === 1) {
        nx = h - 1 - y;
        ny = x;
      } else if (turns === 2) {
        nx = w - 1 - x;
        ny = h - 1 - y;
      } else {
        nx = y;
        ny = w - 1 - x;
      }
      const si = (y * w + x) * 4;
      const di = (ny * nw + nx) * 4;
      o[di] = data[si];
      o[di + 1] = data[si + 1];
      o[di + 2] = data[si + 2];
      o[di + 3] = data[si + 3];
    }
  }
  return out;
}

/** Estimate how "inky" a processed page is — used to warn about blank scans. */
export function inkCoverage(img) {
  const g = toGray(img);
  let dark = 0;
  for (let i = 0; i < g.length; i++) if (g[i] < 128) dark++;
  return dark / g.length;
}
