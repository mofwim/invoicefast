/**
 * Put pdf.js's runtime files where the browser can fetch them.
 *
 * Three things have to be reachable over HTTP rather than bundled: the worker,
 * the character maps a CJK document needs to give up its text, and the fourteen
 * standard fonts a PDF is allowed to assume the reader already has. pdf.js
 * fetches each one only when a document actually asks for it, so this costs
 * nothing on a page that never opens a PDF.
 *
 * Copied at build time instead of committed, so the files can never drift out
 * of step with the installed version.
 */

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist");
const to = join(root, "public", "pdfjs");

await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });

await cp(join(from, "build", "pdf.worker.min.mjs"), join(to, "pdf.worker.min.mjs"));
await cp(join(from, "cmaps"), join(to, "cmaps"), { recursive: true });
await cp(join(from, "standard_fonts"), join(to, "standard_fonts"), { recursive: true });

console.log("pdf.js runtime copied to public/pdfjs");
