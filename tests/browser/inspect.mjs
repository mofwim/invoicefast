/**
 * Open what the tools actually produced. A green test that never looks at the
 * file only proves the button worked.
 */
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
process.chdir(dirname(fileURLToPath(import.meta.url)));

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

  // compress, the heavy path: same page count, same paper size
  const smaller = await PDFDocument.load(await readFile(`out/compress-pdf-${locale}.pdf`));
  const size = smaller.getPage(0).getSize();
  check(smaller.getPageCount() === 5, `${locale} compress → 5 pages (got ${smaller.getPageCount()})`);
  check(Math.round(size.width) === 595 && Math.round(size.height) === 842,
    `${locale} compress → still A4 (got ${Math.round(size.width)}×${Math.round(size.height)})`);

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

  // the zip of page images
  const { stdout } = await run("unzip", ["-l", `out/pdf-to-images-${locale}.zip`]);
  const jpgs = (stdout.match(/\.jpg/g) || []).length;
  check(jpgs === 2, `${locale} pdf→images → 2 jpgs in the zip (got ${jpgs})`);
  const { stdout: tested } = await run("unzip", ["-t", `out/pdf-to-images-${locale}.zip`]);
  check(/No errors detected/.test(tested), `${locale} pdf→images → the zip is sound`);
}

console.log(problems.length ? `\n${problems.length} problems` : "\neverything checked out");
process.exit(problems.length ? 1 : 0);
