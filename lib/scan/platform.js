/**
 * Web vs. native (Capacitor) delivery of a finished export.
 *
 * Inside an Android WebView neither of the browser mechanisms works: an
 * `<a download>` click on a blob URL is dropped unless the host registers a
 * DownloadListener, and `navigator.share` is not implemented at all. Both fail
 * silently, so the user taps "download" and simply nothing happens. On native
 * the file is written to app storage and handed to the system share sheet,
 * which is also where "Save to Files/Drive" lives.
 */

import { downloadBlob } from './export';

/** True when running inside the Capacitor shell rather than a browser. */
export function isNative() {
  try {
    return Boolean(globalThis.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result);
      // Strip the "data:<type>;base64," prefix — Filesystem wants raw base64.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Deliver an exported file.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @param {{title?: string, preferShare?: boolean}} opts
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function deliverFile(blob, filename, opts = {}) {
  const title = opts.title || filename;

  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    // Cache is app-private and needs no storage permission; the Share plugin
    // exposes it through its own FileProvider.
    const written = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({ title, files: [written.uri], dialogTitle: title });
      return 'shared';
    } catch (err) {
      // The share sheet reports a plain dismissal as an error on Android.
      if (/cancel/i.test(err?.message || '')) return 'cancelled';
      throw err;
    }
  }

  if (opts.preferShare && typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return 'shared';
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
