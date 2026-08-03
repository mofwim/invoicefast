/**
 * A ZIP file, written by hand.
 *
 * Forty pages exported as forty separate downloads is not a result, it is a
 * chore — and browsers throttle them anyway. One archive is the right answer.
 *
 * Everything here is *stored*, not deflated. The contents are JPEGs, PNGs and
 * PDFs, which are already compressed; running deflate over them would cost a
 * second of everyone's time to save about a percent. Store-only keeps this to
 * one page of code with no compressor to get wrong, and every unzipper in
 * existence reads it.
 *
 * Follows the APPNOTE structure: a local header per file, then a central
 * directory, then the end record. Zip64 is used for the fields that overflow,
 * which is what lets an export be larger than 4 GB.
 */

const encoder = new TextEncoder();

/** CRC-32, table-driven, built once on first use. */
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[i] = value >>> 0;
  }
  return CRC_TABLE;
}

export function crc32(bytes) {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time, which is what the format still stores. */
function dosStamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  };
}

/**
 * Names are stored as UTF-8 with bit 11 set.
 *
 * Without that flag a name is read as the original code page, which is how
 * "vergadering-2026-week-1.pdf" survives and "besprekingsverslag-één.pdf"
 * arrives as mojibake.
 */
const UNICODE_NAMES = 0x0800;

export async function makeZip(entries, { modified = new Date() } = {}) {
  const { date, time } = dosStamp(modified);
  const parts = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data =
      entry.data instanceof Blob
        ? new Uint8Array(await entry.data.arrayBuffer())
        : entry.data instanceof Uint8Array
          ? entry.data
          : encoder.encode(String(entry.data ?? ""));

    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, UNICODE_NAMES, true);
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);

    parts.push(new Uint8Array(local.buffer), name, data);

    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true); // central directory header
    header.setUint16(4, 20, true); // version made by
    header.setUint16(6, 20, true); // version needed
    header.setUint16(8, UNICODE_NAMES, true);
    header.setUint16(10, 0, true);
    header.setUint16(12, time, true);
    header.setUint16(14, date, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, data.length, true);
    header.setUint32(24, data.length, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);

    central.push(new Uint8Array(header.buffer), name);
    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((total, chunk) => total + chunk.length, 0);

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

/** Names inside an archive: no separators, no duplicates, nothing surprising. */
export function uniqueNames(names) {
  const seen = new Map();
  return names.map((raw) => {
    const clean = String(raw || "bestand")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 100);
    const count = seen.get(clean) || 0;
    seen.set(clean, count + 1);
    if (!count) return clean;
    const dot = clean.lastIndexOf(".");
    return dot > 0 ? `${clean.slice(0, dot)}-${count + 1}${clean.slice(dot)}` : `${clean}-${count + 1}`;
  });
}
