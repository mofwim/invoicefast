import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(dirname(fileURLToPath(import.meta.url)));
await mkdir("fx", { recursive: true });

// A five-page document with real text on every page.
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
doc.setTitle("Kwartaalrapport");
doc.setAuthor("M. de Vries");
doc.setSubject("Cijfers Q3");
for (let i = 1; i <= 5; i++) {
  const page = doc.addPage([595.28, 841.89]);
  page.drawText(`Pagina ${i} van het kwartaalrapport`, { x: 60, y: 760, size: 20, font });
  page.drawText(`Deze regel staat op bladzijde ${i}.`, { x: 60, y: 720, size: 12, font });
  page.drawRectangle({ x: 60, y: 400, width: 200, height: 120, color: rgb(0.2, 0.45, 0.9) });
}
await writeFile("fx/rapport.pdf", await doc.save());

// A second one, so merging has something to merge.
const two = await PDFDocument.create();
const f2 = await two.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 2; i++) {
  const page = two.addPage([595.28, 841.89]);
  page.drawText(`Bijlage ${i}`, { x: 60, y: 760, size: 24, font: f2 });
}
await writeFile("fx/bijlage.pdf", await two.save());

// A PNG, written by hand: 120x80, a solid colour with a stripe.
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let at = 0;
  for (let y = 0; y < height; y++) {
    raw[at++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[at++] = r; raw[at++] = g; raw[at++] = b;
    }
  }
  const zlib = require("node:zlib");
  const idat = zlib.deflateSync(raw);
  const chunk = (type, data) => {
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4);
    data.copy(out, 8);
    const crcInput = Buffer.concat([Buffer.from(type), data]);
    out.writeUInt32BE(zlib.crc32 ? zlib.crc32(crcInput) : crc32(crcInput), 8 + data.length);
    return out;
  };
  function crc32(buf) {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const { createRequire } = await import("node:module");
globalThis.require = createRequire(import.meta.url);
await writeFile("fx/foto.png", png(320, 200, (x, y) => (y > 100 ? [230, 90, 60] : [40, 110, 220])));
await writeFile("fx/logo.png", png(256, 256, (x, y) => ((x + y) % 64 < 32 ? [20, 20, 30] : [250, 250, 250])));

// A document with pictures actually embedded in it, which is a different
// thing from a page that happens to look like one.
const withImages = await PDFDocument.create();
const f3 = await withImages.embedFont(StandardFonts.Helvetica);
const photo = await withImages.embedPng(await readFile("fx/foto.png"));
const mark = await withImages.embedPng(await readFile("fx/logo.png"));
for (let i = 1; i <= 2; i++) {
  const page = withImages.addPage([595.28, 841.89]);
  page.drawText(`Fotopagina ${i}`, { x: 60, y: 780, size: 18, font: f3 });
  page.drawImage(photo, { x: 60, y: 480, width: 320, height: 200 });
  page.drawImage(mark, { x: 60, y: 300, width: 120, height: 120 });
}
await writeFile("fx/met-fotos.pdf", await withImages.save());

// A calendar file and a saved e-mail.
await writeFile(
  "fx/agenda.ics",
  ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//test//NL","BEGIN:VEVENT","UID:1@test","DTSTAMP:20260801T090000Z",
   "DTSTART:20260804T071500Z","DTEND:20260804T080000Z","SUMMARY:Tandarts","LOCATION:Vondelstraat 84, Amsterdam",
   "END:VEVENT","BEGIN:VEVENT","UID:2@test","DTSTAMP:20260801T090000Z","DTSTART:20260812T130000Z",
   "DTEND:20260812T140000Z","SUMMARY:Teamoverleg","END:VEVENT","END:VCALENDAR"].join("\r\n")
);
await writeFile(
  "fx/afspraken.csv",
  'onderwerp,datum,tijd,locatie\nTandarts,2026-08-04,09:15,Amsterdam\nTeamoverleg,2026-08-12,15:00,Kantoor\n'
);
await writeFile(
  "fx/bericht.eml",
  ["From: Praktijk <balie@praktijk.nl>","To: mij@example.com","Subject: Bevestiging afspraak",
   "MIME-Version: 1.0",'Content-Type: multipart/mixed; boundary="grens"',"","--grens",
   'Content-Type: text/plain; charset="utf-8"',"","Uw afspraak is op dinsdag 4 augustus om 9:15 uur.",
   "Neem uw verzekeringspas mee.","","--grens",'Content-Type: text/plain; name="brief.txt"',
   "Content-Disposition: attachment; filename=\"brief.txt\"","","Dit is de bijlage.","","--grens--",""].join("\r\n")
);
console.log("fixtures written");
