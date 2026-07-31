/**
 * Automatic document corner detection.
 *
 * Strategy: find the page as the largest bright blob (Otsu), take its convex
 * hull, fit the largest quadrilateral inside that hull, then snap each of the
 * four edges onto the strongest nearby image gradient. Cheap enough to run on
 * every preview frame at low resolution, accurate enough to run once at full
 * resolution before the warp.
 */

import { toGray, downscaleGray, boxBlur, otsuThreshold, sobelMagnitude } from './imaging';

const ANALYSIS_LONG_SIDE = 320;

/** Smallest blob, as a fraction of the frame, that can still be a page. */
const MIN_AREA_FRACTION = 0.07;
/** Mean inside-minus-outside brightness required to call a border "paper". */
const MIN_EDGE_CONTRAST = 9;
/** Fraction of the perimeter that must actually be brighter inside. */
const MIN_EDGE_CONSISTENCY = 0.7;

/* ------------------------------------------------------------------ */
/* geometry helpers                                                     */
/* ------------------------------------------------------------------ */

export function quadArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Sort 4 points into [top-left, top-right, bottom-right, bottom-left]. */
export function orderCorners(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  // With y pointing down, increasing atan2 walks the points clockwise on screen.
  const sorted = [...pts].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
  let start = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x + sorted[i].y < sorted[start].x + sorted[start].y) start = i;
  }
  return sorted.slice(start).concat(sorted.slice(0, start));
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Andrew's monotone chain convex hull, counter-clockwise. */
function convexHull(points) {
  if (points.length < 4) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Largest-area quadrilateral with vertices on the hull. Seeded from the
 * extreme-corner heuristic, then hill-climbed one vertex at a time — converges
 * in a handful of passes and handles rotated pages that the plain heuristic
 * gets wrong.
 */
function largestQuad(hull) {
  if (hull.length < 4) return null;
  const pick = (score) =>
    hull.reduce((best, p) => (score(p) > score(best) ? p : best), hull[0]);
  let idx = [
    hull.indexOf(pick((p) => -(p.x + p.y))), // top-left
    hull.indexOf(pick((p) => p.x - p.y)), // top-right
    hull.indexOf(pick((p) => p.x + p.y)), // bottom-right
    hull.indexOf(pick((p) => p.y - p.x)), // bottom-left
  ];
  if (new Set(idx).size < 4) idx = [0, 1, 2, 3].map((i) => Math.floor((i * hull.length) / 4));

  let best = quadArea(idx.map((i) => hull[i]));
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (let c = 0; c < 4; c++) {
      for (let i = 0; i < hull.length; i++) {
        if (idx.includes(i)) continue;
        const trial = idx.slice();
        trial[c] = i;
        const sorted = trial.slice().sort((a, b) => a - b);
        if (new Set(sorted).size < 4) continue;
        const area = quadArea(trial.map((k) => hull[k]));
        if (area > best + 1e-6) {
          best = area;
          idx = trial;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return idx.map((i) => hull[i]);
}

/* ------------------------------------------------------------------ */
/* blob extraction                                                      */
/* ------------------------------------------------------------------ */

/**
 * Iterative flood fill over the binary mask, returning the boundary points of
 * the largest component. Boundary-only keeps the hull input small.
 */
function largestBlobBoundary(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let bestSize = 0;
  let bestLabel = -1;
  const labels = new Int32Array(w * h).fill(-1);
  let label = 0;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || seen[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let size = 0;
    while (sp > 0) {
      const i = stack[--sp];
      labels[i] = label;
      size++;
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) (seen[i - 1] = 1), (stack[sp++] = i - 1);
      if (x < w - 1 && mask[i + 1] && !seen[i + 1]) (seen[i + 1] = 1), (stack[sp++] = i + 1);
      if (y > 0 && mask[i - w] && !seen[i - w]) (seen[i - w] = 1), (stack[sp++] = i - w);
      if (y < h - 1 && mask[i + w] && !seen[i + w]) (seen[i + w] = 1), (stack[sp++] = i + w);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
    label++;
  }
  if (bestLabel < 0) return { points: [], size: 0 };

  const points = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (labels[i] !== bestLabel) continue;
      const edge =
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === h - 1 ||
        labels[i - 1] !== bestLabel ||
        labels[i + 1] !== bestLabel ||
        labels[i - w] !== bestLabel ||
        labels[i + w] !== bestLabel;
      if (edge) points.push({ x, y });
    }
  }
  return { points, size: bestSize };
}

/* ------------------------------------------------------------------ */
/* edge snapping                                                        */
/* ------------------------------------------------------------------ */

/**
 * Weighted total-least-squares line fit, returned as (a,b,c) with
 * a*x + b*y + c = 0 and (a,b) unit-length, so |a*x+b*y+c| is a true distance.
 */
function lineFromPoints(pts) {
  if (pts.length < 2) return null;
  let sw = 0;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    const w = p.w ?? 1;
    sw += w;
    mx += p.x * w;
    my += p.y * w;
  }
  if (sw <= 0) return null;
  mx /= sw;
  my /= sw;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const w = p.w ?? 1;
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += w * dx * dx;
    syy += w * dy * dy;
    sxy += w * dx * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  // Normal of the principal axis.
  const a = -Math.sin(theta);
  const b = Math.cos(theta);
  return { a, b, c: -(a * mx + b * my) };
}

/**
 * Fit a line, then repeatedly drop the samples furthest from it and refit.
 *
 * Without this, a run of samples that latched onto a heading or a table rule
 * near the page border tilts the whole edge — which shows up as one corner
 * sliding along the border while the opposite one lifts off it.
 */
function fitLineRobust(samples) {
  let pts = samples;
  let line = lineFromPoints(pts);
  if (!line) return null;
  for (let iter = 0; iter < 3; iter++) {
    const residuals = pts.map((p) => Math.abs(line.a * p.x + line.b * p.y + line.c));
    const sorted = residuals.slice().sort((m, n) => m - n);
    const median = sorted[sorted.length >> 1];
    const limit = Math.max(0.8, median * 2.5);
    const kept = pts.filter((_, i) => residuals[i] <= limit);
    if (kept.length < Math.max(6, samples.length * 0.4) || kept.length === pts.length) break;
    const next = lineFromPoints(kept);
    if (!next) break;
    pts = kept;
    line = next;
  }
  return line;
}

function intersect(l1, l2) {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < 1e-9) return null;
  return {
    x: (l1.b * l2.c - l2.b * l1.c) / det,
    y: (l2.a * l1.c - l1.a * l2.c) / det,
  };
}

/**
 * Walk along each edge of the quad, look perpendicular for the strongest
 * gradient within `search` pixels, refit the line, then re-intersect. Pulls the
 * blob-derived quad onto the actual paper border.
 */
function snapToEdges(quad, grad, w, h) {
  const search = Math.max(3, Math.round(Math.max(w, h) * 0.035));
  const sigma = search / 2.5;
  const sampleAt = (x, y) => (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 ? 0 : grad[y * w + x]);
  const lines = [];

  for (let e = 0; e < 4; e++) {
    const p0 = quad[e];
    const p1 = quad[(e + 1) % 4];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) return null;
    const nx = -dy / len;
    const ny = dx / len;
    const samples = [];
    const steps = Math.min(90, Math.max(12, Math.round(len / 2)));

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const bx = p0.x + dx * t;
      const by = p0.y + dy * t;
      // Score = edge strength under a Gaussian centred on the current estimate.
      // Text inside the page often has a *stronger* gradient than the paper
      // border — a heading running parallel to the top edge will out-gradient
      // the border of a page photographed on a light desk — so a plain maximum
      // drags the edge inwards. The blob quad is already accurate to a few
      // pixels, so trusting it and only refining nearby is the right prior.
      // The border is also the outermost edge, hence the outside-in scan: ties
      // keep the more outward candidate.
      let bestScore = 0;
      let bestVal = 0;
      let bestOff = 0;
      for (let o = -search; o <= search; o++) {
        const v = sampleAt(Math.round(bx + nx * o), Math.round(by + ny * o));
        if (v <= 40) continue;
        const z = o / sigma;
        const score = v * Math.exp(-0.5 * z * z);
        if (score > bestScore) {
          bestScore = score;
          bestVal = v;
          bestOff = o;
        }
      }
      if (bestVal <= 40) continue; // no clear edge along this normal

      // Sub-pixel peak: fit a parabola through the neighbours of the maximum.
      const prev = sampleAt(Math.round(bx + nx * (bestOff - 1)), Math.round(by + ny * (bestOff - 1)));
      const next = sampleAt(Math.round(bx + nx * (bestOff + 1)), Math.round(by + ny * (bestOff + 1)));
      const denom = prev - 2 * bestVal + next;
      const shift = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (prev - next)) / denom)) : 0;
      const off = bestOff + shift;

      samples.push({ x: bx + nx * off, y: by + ny * off, w: bestVal });
    }

    if (samples.length < 10) return null;
    const line = fitLineRobust(samples);
    if (!line) return null;
    lines.push(line);
  }

  const corners = [];
  for (let i = 0; i < 4; i++) {
    const p = intersect(lines[(i + 3) % 4], lines[i]);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    if (p.x < -w * 0.3 || p.x > w * 1.3 || p.y < -h * 0.3 || p.y > h * 1.3) return null;
    corners.push(p);
  }
  return corners;
}

/* ------------------------------------------------------------------ */
/* validation                                                           */
/* ------------------------------------------------------------------ */

/** Reject degenerate quads: too small, too skewed, or non-convex. */
export function isPlausibleQuad(quad, w, h) {
  if (!quad || quad.length !== 4) return false;
  for (const p of quad) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  }
  const area = quadArea(quad);
  if (area < w * h * 0.1) return false;

  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    const z = cross(a, b, c);
    if (sign === 0) sign = Math.sign(z);
    else if (Math.sign(z) !== sign) return false;

    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const cosang =
      (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
    const ang = (Math.acos(Math.max(-1, Math.min(1, cosang))) * 180) / Math.PI;
    if (ang < 50 || ang > 130) return false;
  }
  return true;
}

/**
 * Does this quad's border look like the edge of a sheet of paper?
 *
 * Samples just inside and just outside every edge: a real page is consistently
 * brighter than what surrounds it, all the way round. Gradient magnitude alone
 * can't tell paper from a noisy tabletop — grain produces strong gradients
 * everywhere — but this step test can, so it's what decides `confident`.
 *
 * @returns {{contrast:number, consistency:number, samples:number}} contrast is
 *   mean inside-minus-outside brightness; consistency is the fraction of
 *   positions where inside really is brighter.
 */
function quadSupport(gray, w, h, quad, offset) {
  let insideSum = 0;
  let outsideSum = 0;
  let agree = 0;
  let n = 0;

  for (let e = 0; e < 4; e++) {
    const p0 = quad[e];
    const p1 = quad[(e + 1) % 4];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 4) continue;
    // Corners are ordered clockwise on screen, so this normal points inward.
    const nx = -dy / len;
    const ny = dx / len;
    const steps = 40;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const bx = p0.x + dx * t;
      const by = p0.y + dy * t;
      const ix = Math.round(bx + nx * offset);
      const iy = Math.round(by + ny * offset);
      const ox = Math.round(bx - nx * offset);
      const oy = Math.round(by - ny * offset);
      // Skip where the page runs past the frame — there is no "outside" to compare.
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
      if (ox < 0 || oy < 0 || ox >= w || oy >= h) continue;
      const vi = gray[iy * w + ix];
      const vo = gray[oy * w + ox];
      insideSum += vi;
      outsideSum += vo;
      if (vi > vo + 6) agree++;
      n++;
    }
  }

  if (n < 40) return { contrast: 0, consistency: 0, samples: n };
  return { contrast: (insideSum - outsideSum) / n, consistency: agree / n, samples: n };
}

/** The safe fallback: the whole frame, inset slightly. */
export function defaultQuad(w, h, inset = 0.04) {
  const ix = w * inset;
  const iy = h * inset;
  return [
    { x: ix, y: iy },
    { x: w - ix, y: iy },
    { x: w - ix, y: h - iy },
    { x: ix, y: h - iy },
  ];
}

/* ------------------------------------------------------------------ */
/* entry point                                                          */
/* ------------------------------------------------------------------ */

/**
 * Detect page corners in an ImageData.
 * @returns {{corners: {x:number,y:number}[], confident: boolean}} corners are in
 *   source-image pixel coordinates, ordered TL, TR, BR, BL.
 */
export function detectDocument(img) {
  const fullW = img.width;
  const fullH = img.height;
  const grayFull = toGray(img);
  const { gray, w, h, scale } = downscaleGray(grayFull, fullW, fullH, ANALYSIS_LONG_SIDE);

  const blurred = boxBlur(gray, w, h, 2);
  const t = otsuThreshold(blurred);
  const grad = sobelMagnitude(blurred, w, h);

  // Paper is the brighter class. If the scene is inverted (dark doc on light
  // desk) the blob search below simply finds nothing plausible and we fall back.
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = blurred[i] > t ? 1 : 0;

  const { points, size } = largestBlobBoundary(mask, w, h);
  let confident = false;
  let quad = null;

  if (size > w * h * MIN_AREA_FRACTION && points.length >= 8) {
    const hull = convexHull(points);
    const candidate = largestQuad(hull);
    if (isPlausibleQuad(candidate, w, h)) {
      quad = orderCorners(candidate);
      const snapped = snapToEdges(quad, grad, w, h);
      if (snapped && isPlausibleQuad(orderCorners(snapped), w, h)) {
        quad = orderCorners(snapped);
      }
      const support = quadSupport(blurred, w, h, quad, Math.max(2, Math.round(w * 0.015)));
      confident =
        support.contrast >= MIN_EDGE_CONTRAST && support.consistency >= MIN_EDGE_CONSISTENCY;
    }
  }

  // Without a trustworthy quad, hand back the whole frame and let the user drag
  // the corners — far better than cropping confidently to the wrong thing.
  if (!confident) quad = defaultQuad(w, h);

  const inv = 1 / scale;
  const corners = quad.map((p) => ({
    x: Math.max(0, Math.min(fullW, p.x * inv)),
    y: Math.max(0, Math.min(fullH, p.y * inv)),
  }));
  return { corners, confident };
}
