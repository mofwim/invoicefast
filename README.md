# InvoiceFast + ScanFast

Two no-signup web tools in one Next.js app. Everything runs in the browser —
no accounts, no uploads, no server-side storage.

| Route   | What it is                                                                |
| ------- | ------------------------------------------------------------------------- |
| `/`     | **InvoiceFast** — invoice generator with live preview and PDF download.    |
| `/scan` | **ScanFast** — document scanner: camera → clean, deskewed, searchable PDF. |

```bash
npm install
npm run dev        # http://localhost:3000
```

---

# ScanFast — the document scanner

A full document scanner that runs entirely client-side, in the same class as the
native scanner apps on Google Play. Point the camera at a page and it finds the
paper, flattens the perspective, removes the shadow your hand casts, and turns
it into a PDF.

Nothing is uploaded. Scans live in IndexedDB on the device.

## Features

**Capture**

- Live edge detection with an overlay showing the page it has locked onto.
- Auto-capture: hold the phone still over a detected page and it shoots by itself.
- Torch toggle on devices that expose it.
- Import from the gallery — one image opens the crop screen, a batch is
  auto-cropped so importing 20 photos isn't 20 taps.
- Android share target: share images straight into the app from any other app.

**Correct**

- Four draggable corners with a magnifier loupe, because fingers are not precise.
- Perspective correction to a real rectangle, with A4 / Letter / Legal / square
  or free aspect.

**Clean up**

- `Auto` — de-shadow + contrast stretch, keeps colour. The default.
- `Magic color` — stronger stretch and saturation, for receipts and forms.
- `Grayscale`, `B & W` (adaptive threshold — the classic scan look), `Original`.
- Brightness / contrast sliders, rotate, re-crop. Every edit re-renders from the
  original capture, so nothing degrades no matter how often you change your mind.

**Deliver**

- Multi-page PDF: page size, margin, page reordering.
- OCR in 8 languages (Arabic and English included) → **searchable PDF** with an
  invisible text layer you can select and search in any reader.
- Export as images (one file, or a ZIP for several) or as plain text.
- Web Share API, so "send to WhatsApp" behaves like a native app.

**Installable**

- PWA with a service worker: works offline after the first visit.
- Add to home screen, launcher shortcut straight to a new scan.

## How it works

Everything is plain JavaScript over `ImageData` — no OpenCV, no WASM, nothing to
download before the app is usable.

| File                   | Role                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `lib/scan/imaging.js`  | Integral images, box blur, Otsu, adaptive threshold, Sobel, shadow removal, filters. |
| `lib/scan/detect.js`   | Page detection: blob → convex hull → largest quad → edge snap → confidence check.    |
| `lib/scan/warp.js`     | Homography solve and inverse-mapped bilinear perspective warp.                       |
| `lib/scan/pipeline.js` | Decode → warp → filter → rotate → encode, at preview and full resolution.            |
| `lib/scan/export.js`   | PDF (with OCR text layer), plain text, and a small store-only ZIP writer.            |
| `lib/scan/db.js`       | IndexedDB: documents, pages, blobs.                                                  |
| `lib/scan/ocr.js`      | Lazy-loaded tesseract.js wrapper.                                                    |

### Page detection

1. Downscale to 320px on the long side — detection runs on every preview frame.
2. Box blur, Otsu threshold; paper is the bright class.
3. Largest connected component → convex hull → hill-climb the largest inscribed
   quadrilateral (this handles rotated pages, which the usual extreme-corner
   heuristic gets wrong).
4. Snap each edge onto the strongest nearby gradient, scored under a Gaussian
   centred on the current estimate. **This part matters more than it looks:**
   text inside the page often has a *stronger* gradient than the paper border,
   so taking the plain maximum drags the edge inward wherever a heading runs
   parallel to it. Then sub-pixel peak interpolation, a robust line refit that
   drops outliers, and re-intersection for the corners.
5. Confidence check: sample just inside and just outside the border all the way
   round. Real paper is consistently brighter than what surrounds it; a noisy
   tabletop is not. When this fails, the app hands back the whole frame and lets
   you drag the corners rather than confidently cropping the wrong thing.

Measured against synthetic ground truth (skew, rotation up to 42°, strong
shadows, low-contrast desks, heavy grain, small pages): **worst corner error 7px
on a 1200×1600 frame**, mean 3–5px, 13–60ms per detection. It correctly declines
on a blank noisy surface and on a page genuinely indistinguishable from the desk.

### Shadow removal

The single biggest quality win. Estimate the illumination field with a very
large box blur — O(1) per pixel via an integral image, so it is affordable on a
phone — and divide it out. This is what flattens the shadow across the page
before any filter runs; without it the B&W filter turns half the page black.

## OCR

Text recognition uses [tesseract.js](https://github.com/naptha/tesseract.js),
loaded lazily — nothing is fetched until you actually ask for text. By default
the engine and language data come from jsDelivr, which keeps the deploy small
and the bandwidth free.

If the app has to work **offline, behind a corporate proxy, or anywhere jsDelivr
is unreachable**, vendor the engine locally:

```bash
npm run vendor:ocr             # engine + English and Arabic (~32 MB)
npm run vendor:ocr eng fra     # or pick your own languages
```

That copies the worker, the LSTM cores and the language data into
`public/tesseract/` (gitignored — it is reproducible from the pinned
dependencies). `lib/scan/ocr.js` probes for that copy at runtime and prefers it
when present, so there is nothing to configure. Languages beyond English and
Arabic need their data package first: `npm i -D @tesseract.js-data/<lang>`.

Note: jsPDF's built-in fonts are WinAnsi, so the invisible text layer covers
Latin text only. Arabic OCR output is still shown on screen and included in the
`.txt` export.

## Icons

PWA icons are generated, not committed as binaries you cannot diff:

```bash
npm run icons
```

`scripts/gen-icons.mjs` rasterises the mark by hand and encodes the PNGs with
`zlib` — no image toolchain needed.

## Requirements and limits

- The camera needs **HTTPS** (or `localhost`). Vercel gives you that.
- No camera — desktop, or permission denied — falls back to gallery import, and
  the flow routes to the document instead of a dead viewfinder.
- Filenames are forced to ASCII: Chromium silently discards a download name
  containing non-ASCII characters and saves the file as `download` instead, so
  an Arabic document title would otherwise lose its name. Latin titles keep
  their spelling with accents folded (`Août` → `Aout`); other scripts fall back
  to a dated stem (`Scan-2026-07-31-1730`). The export sheet shows the filename
  and lets you change it.
- Originals are capped at 2600px on the long side and pages render at 2200px
  (~260 dpi on A4) — plenty for print, and it keeps a 40-page document inside a
  sane storage budget.

---

# InvoiceFast — the invoice generator

Fill the form, watch the live preview, download a clean PDF. Multi-currency
(USD / EUR / GBP), all data stays in the browser. Free with a small watermark;
a one-time $9 unlock removes it.

## Turning on real payments

The "Unlock" button currently flips a `localStorage` flag (demo mode). To take
real money, connect a checkout:

**Lemon Squeezy** (handles EU/US tax for you) — create a $9 one-time product,
then in `app/page.js` replace the body of `unlock()` so it opens the checkout
and only sets the paid flag after a successful payment.

**Stripe Payment Links** — create a $9 link, point the button at it, set the
flag on the success URL.

> The `localStorage` unlock is per-device and not secure. Fine for an MVP; for a
> real paywall, verify the payment server-side before unlocking.

---

## Deploy

```bash
npm run build
```

Push to GitHub, import the repo on Vercel, deploy. No environment variables are
needed. Add a custom domain in the Vercel dashboard.

## Roadmap

**Scanner** — ID-card mode (two sides on one page), signature stamp, batch
rename, folders, PDF import for re-editing, cloud sync as a paid tier.

**Invoices** — logo upload, saved clients, recurring invoices, more templates,
email delivery.
