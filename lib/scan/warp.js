/**
 * Perspective correction: map an arbitrary quadrilateral onto a flat rectangle.
 *
 * We solve the homography that takes the *output* rectangle to the *input*
 * quad, then inverse-map every destination pixel with bilinear sampling. Doing
 * it in that direction means no holes in the result.
 */

/** Gaussian elimination with partial pivoting. `a` is n x (n+1), solved in place. */
function solveLinearSystem(a, n) {
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      const t = a[pivot];
      a[pivot] = a[col];
      a[col] = t;
    }
    const p = a[col][col];
    for (let c = col; c <= n; c++) a[col][c] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row) => row[n]);
}

/**
 * Homography mapping src[i] -> dst[i], returned as the 8 free coefficients
 * [h0..h7] of the 3x3 matrix (h8 fixed at 1).
 */
export function computeHomography(src, dst) {
  const m = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    m.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u]);
    m.push([0, 0, 0, x, y, 1, -x * v, -y * v, v]);
  }
  return solveLinearSystem(m, 8);
}

/** Side lengths of the quad, used to pick a sensible output resolution. */
function quadExtents(quad) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const [tl, tr, br, bl] = quad;
  const width = Math.max(d(tl, tr), d(bl, br));
  const height = Math.max(d(tl, bl), d(tr, br));
  return { width, height };
}

/**
 * Shrink the quad slightly toward its centre before sampling.
 *
 * Corner detection lands within a few pixels of the paper border, and on the
 * side where it falls *outside*, a sliver of desk gets warped in — which the
 * black-and-white filter then renders as a dark dashed rim. Giving up ~1% of
 * the page (about a millimetre on A4) removes it. Documents don't carry
 * content that close to the paper edge.
 */
function insetQuad(quad, fraction) {
  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
  return quad.map((p) => ({
    x: p.x + (cx - p.x) * fraction,
    y: p.y + (cy - p.y) * fraction,
  }));
}

export const DEFAULT_INSET = 0.012;

export const PAGE_RATIOS = {
  auto: null,
  a4: 210 / 297,
  letter: 8.5 / 11,
  legal: 8.5 / 14,
  square: 1,
};

/**
 * Flatten `quad` out of `img` into a rectangle.
 *
 * @param {ImageData} img source frame
 * @param {{x:number,y:number}[]} quad corners, ordered TL, TR, BR, BL
 * @param {{maxLongSide?:number, ratio?:number|null}} opts
 *   ratio forces a width/height aspect (see PAGE_RATIOS); null keeps the shape
 *   implied by the quad itself.
 * @returns {ImageData}
 */
export function warpQuad(img, sourceQuad, opts = {}) {
  const maxLongSide = opts.maxLongSide ?? 2200;
  const ratio = opts.ratio ?? null;
  const quad = insetQuad(sourceQuad, opts.inset ?? DEFAULT_INSET);

  let { width, height } = quadExtents(quad);
  if (ratio) {
    // Keep the larger dimension and derive the other so nothing gets squashed.
    if (width / height > ratio) height = width / ratio;
    else width = height * ratio;
  }

  const long = Math.max(width, height);
  const scale = long > maxLongSide ? maxLongSide / long : 1;
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const dstRect = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];
  // Solve rect -> quad so we can walk destination pixels and read from source.
  const h = computeHomography(dstRect, quad);
  if (!h) return img;

  const [h0, h1, h2, h3, h4, h5, h6, h7] = h;
  const src = img.data;
  const sw = img.width;
  const sh = img.height;
  const out = new ImageData(outW, outH);
  const o = out.data;

  for (let y = 0; y < outH; y++) {
    // The homography is affine along a scanline apart from the denominator, so
    // step the numerators incrementally instead of recomputing per pixel.
    let nx = h1 * y + h2;
    let ny = h4 * y + h5;
    let nd = h7 * y + 1;
    let di = y * outW * 4;
    for (let x = 0; x < outW; x++, nx += h0, ny += h3, nd += h6, di += 4) {
      const w = nd || 1e-9;
      const sx = nx / w;
      const sy = ny / w;

      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
        o[di] = o[di + 1] = o[di + 2] = 255;
        o[di + 3] = 255;
        continue;
      }

      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 + 1 < sw ? x0 + 1 : x0;
      const y1 = y0 + 1 < sh ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;

      o[di] = src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
      o[di + 1] =
        src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
      o[di + 2] =
        src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
      o[di + 3] = 255;
    }
  }
  return out;
}
