/**
 * OCR via tesseract.js, loaded lazily.
 *
 * The engine and language data are several megabytes, so nothing is fetched
 * until the user actually asks to recognise text. The worker is kept alive
 * between pages — spinning it up is by far the slowest part.
 */

export const OCR_LANGUAGES = [
  { id: 'eng', label: 'English', labelAr: 'إنجليزي' },
  { id: 'ara', label: 'Arabic', labelAr: 'عربي' },
  { id: 'ara+eng', label: 'Arabic + English', labelAr: 'عربي + إنجليزي' },
  { id: 'fra', label: 'French', labelAr: 'فرنسي' },
  { id: 'deu', label: 'German', labelAr: 'ألماني' },
  { id: 'spa', label: 'Spanish', labelAr: 'إسباني' },
  { id: 'rus', label: 'Russian', labelAr: 'روسي' },
  { id: 'chi_sim', label: 'Chinese (simplified)', labelAr: 'صيني مبسّط' },
];

let worker = null;
let workerLang = null;
let loading = null;
let pathsPromise = null;

/**
 * Where to load the engine and language data from.
 *
 * Default is tesseract.js's own jsDelivr CDN: it keeps the deploy small and
 * the bandwidth free. But a CDN is also a single point of failure — blocked by
 * corporate proxies, unreachable in some regions, and useless offline — and
 * when it fails the browser reports only a bare `importScripts` error. So if
 * `npm run vendor:ocr` has put a copy under /tesseract, prefer that.
 */
async function resolvePaths() {
  if (pathsPromise) return pathsPromise;
  pathsPromise = (async () => {
    try {
      const res = await fetch('/tesseract/worker.min.js', { method: 'HEAD' });
      if (res.ok) {
        return {
          local: true,
          workerPath: '/tesseract/worker.min.js',
          corePath: '/tesseract/core/',
          langPath: '/tesseract/lang',
        };
      }
    } catch {
      // Offline or blocked — fall through to the CDN and let it report.
    }
    return { local: false };
  })();
  return pathsPromise;
}

async function getWorker(lang, onProgress) {
  if (worker && workerLang === lang) return worker;
  if (loading) await loading.catch(() => {});
  if (worker && workerLang === lang) return worker;

  loading = (async () => {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* already gone */
      }
      worker = null;
      workerLang = null;
    }
    const [{ createWorker }, paths] = await Promise.all([import('tesseract.js'), resolvePaths()]);
    const { local, ...pathOptions } = paths;
    const w = await createWorker(lang, 1, {
      ...pathOptions,
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress ?? 0, 'recognize');
        else onProgress?.(m.progress ?? 0, m.status || 'loading');
      },
    });
    worker = w;
    workerLang = lang;
    return w;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/** tesseract.js moved words inside blocks in v5; accept either shape. */
function collectWords(data) {
  if (Array.isArray(data?.words) && data.words.length) return data.words;
  const words = [];
  for (const block of data?.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const word of line.words || []) words.push(word);
      }
    }
  }
  return words;
}

/**
 * Recognise text in an image.
 * @param {Blob|HTMLCanvasElement|HTMLImageElement|string} image
 * @param {{lang?:string, onProgress?:(p:number,stage:string)=>void}} opts
 * @returns {Promise<{text:string, words:Array, confidence:number, lang:string}>}
 */
export async function recognize(image, opts = {}) {
  const lang = opts.lang || 'eng';
  const w = await getWorker(lang, opts.onProgress);
  const { data } = await w.recognize(image, {}, { blocks: true, text: true });
  const words = collectWords(data)
    .filter((x) => x && x.text)
    .map((x) => ({
      text: x.text,
      confidence: x.confidence,
      bbox: x.bbox
        ? { x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1 }
        : null,
    }));
  return {
    text: (data.text || '').replace(/\n{3,}/g, '\n\n').trim(),
    words,
    confidence: data.confidence ?? 0,
    lang,
  };
}

/** Free the engine — worth calling when leaving the OCR screen on low-RAM phones. */
export async function terminateOcr() {
  if (!worker) return;
  try {
    await worker.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
  workerLang = null;
}
