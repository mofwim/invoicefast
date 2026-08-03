/**
 * Open what the tools actually produced. A green test that never looks at the
 * file only proves the button worked.
 */
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
process.chdir(dirname(fileURLToPath(import.meta.url)));

/**
 * The words in a PDF, read straight out of the file.
 *
 * Not a renderer — just the text-showing operators inside the content
 * streams. Enough to answer the only question being asked here: are the words
 * still words, or did they become pixels?
 */
async function textOf(bytes) {
  const doc = await PDFDocument.load(bytes);
  const out = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    let raw;
    try {
      raw = object?.getContents?.();
    } catch {
      continue;
    }
    if (!raw) continue;
    let text = Buffer.from(raw).toString("latin1");
    if (!/\bTj\b|\bTJ\b/.test(text)) {
      try {
        text = zlib.inflateSync(Buffer.from(raw)).toString("latin1");
      } catch {
        continue;
      }
    }
    // Two shapes of string operand: the literal form, and the hex form that
    // pdf-lib actually writes.
    for (const match of text.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) out.push(match[1]);
    for (const match of text.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      out.push(Buffer.from(match[1].replace(/\s+/g, ""), "hex").toString("latin1"));
    }
  }
  return out.join(" ");
}

const problems = [];
const check = (ok, what) => { console.log(`${ok ? "  ok" : "FAIL"}  ${what}`); if (!ok) problems.push(what); };

for (const locale of ["nl", "en"]) {
  // merge: 5 + 2 = 7 pages
  const merged = await PDFDocument.load(await readFile(`out/merge-pdf-${locale}.pdf`));
  check(merged.getPageCount() === 7, `${locale} merge → 7 pages (got ${merged.getPageCount()})`);

  // split: pages 1 and 3 were picked
  const split = await PDFDocument.load(await readFile(`out/split-pdf-${locale}.pdf`));
  check(split.getPageCount() === 2, `${locale} split → 2 pages (got ${split.getPageCount()})`);

  // organise: page 1 moved after 2, turned 90°, last page dropped
  const organised = await PDFDocument.load(await readFile(`out/organise-pdf-${locale}.pdf`));
  check(organised.getPageCount() === 4, `${locale} organise → 4 pages (got ${organised.getPageCount()})`);
  const turns = organised.getPages().map((p) => p.getRotation().angle);
  check(turns[0] === 90 && turns.slice(1).every((a) => a === 0),
    `${locale} organise → only the moved page is turned (got ${turns.join(",")})`);

  // images to pdf
  const built = await PDFDocument.load(await readFile(`out/images-to-pdf-${locale}.pdf`));
  check(built.getPageCount() === 2, `${locale} images→pdf → 2 pages (got ${built.getPageCount()})`);

  // stamp
  const stamped = await PDFDocument.load(await readFile(`out/stamp-pdf-${locale}.pdf`));
  check(stamped.getPageCount() === 5, `${locale} stamp → 5 pages (got ${stamped.getPageCount()})`);

  // compress at the image level: the scan shrinks, keeps its pages and paper,
  // and — the whole point — its text objects are still text.
  const scanIn = (await readFile("fx/scan.pdf")).length;
  const scanOut = await readFile(`out/compress-pdf-${locale}.pdf`);
  const smaller = await PDFDocument.load(scanOut);
  const size = smaller.getPage(0).getSize();
  check(smaller.getPageCount() === 2, `${locale} compress → 2 pages (got ${smaller.getPageCount()})`);
  check(Math.round(size.width) === 595 && Math.round(size.height) === 842,
    `${locale} compress → still A4 (got ${Math.round(size.width)}×${Math.round(size.height)})`);
  check(scanOut.length < scanIn * 0.4,
    `${locale} compress → the scan came down hard (${Math.round(scanIn / 1024)} kB → ${Math.round(scanOut.length / 1024)} kB)`);

  // text and picture together: much smaller, and every word still a word
  const mixedIn = (await readFile("fx/gemengd.pdf")).length;
  const mixedOut = await readFile(`out/compress-pdf-mixed-${locale}.pdf`);
  check(mixedOut.length < mixedIn * 0.5,
    `${locale} compress → mixed document halved (${Math.round(mixedIn / 1024)} kB → ${Math.round(mixedOut.length / 1024)} kB)`);
  const words = await textOf(mixedOut);
  check(/nog steeds tekst/.test(words),
    `${locale} compress → the text is still text afterwards`);
  check((words.match(/Jaarverslag pagina/g) || []).length === 3,
    `${locale} compress → all three pages kept their words`);

  // the heavy path, on the text document
  const raster = await PDFDocument.load(await readFile(`out/compress-pdf-raster-${locale}.pdf`));
  check(raster.getPageCount() === 5, `${locale} compress (heavy) → 5 pages (got ${raster.getPageCount()})`);

  // metadata: the new title is really in the file
  const titled = await PDFDocument.load(await readFile(`out/pdf-metadata-${locale}.pdf`));
  check(titled.getTitle() === "Nieuwe titel", `${locale} metadata → title written (got "${titled.getTitle()}")`);
  check(titled.getAuthor() === "M. de Vries", `${locale} metadata → author untouched (got "${titled.getAuthor()}")`);

  // signature: opens, keeps its pages, and grew (an image went in)
  const signedBytes = await readFile(`out/sign-pdf-${locale}.pdf`);
  const signed = await PDFDocument.load(signedBytes);
  check(signed.getPageCount() === 5, `${locale} sign → 5 pages (got ${signed.getPageCount()})`);
  const original = (await readFile("fx/rapport.pdf")).length;
  check(signedBytes.length > original, `${locale} sign → the signature is in the file (${signedBytes.length} vs ${original})`);

  // the pictures pulled out of a document
  const { stdout: pulled } = await run("unzip", ["-l", `out/extract-images-${locale}.zip`]);
  check((pulled.match(/\.png/g) || []).length === 2, `${locale} extract → 2 pngs in the zip`);

  // the zip of page images
  const { stdout } = await run("unzip", ["-l", `out/pdf-to-images-${locale}.zip`]);
  const jpgs = (stdout.match(/\.jpg/g) || []).length;
  check(jpgs === 2, `${locale} pdf→images → 2 jpgs in the zip (got ${jpgs})`);
  const { stdout: tested } = await run("unzip", ["-t", `out/pdf-to-images-${locale}.zip`]);
  check(/No errors detected/.test(tested), `${locale} pdf→images → the zip is sound`);
}

console.log(problems.length ? `\n${problems.length} problems` : "\neverything checked out");
process.exit(problems.length ? 1 : 0);
