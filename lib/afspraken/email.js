/**
 * Reading appointments out of e-mail.
 *
 * Two very different cases live here. A proper invitation carries a
 * `text/calendar` part, and then we get exact data for free. Far more common is
 * a confirmation written by a human ("uw afspraak is op dinsdag 4 augustus om
 * 9:15"), where the appointment has to be inferred from the prose — and where
 * the attachments (a referral letter, a parking pass) matter just as much as
 * the time.
 *
 * Raw messages are handled as binary strings (one character per byte) so that
 * per-part charsets can still be decoded correctly after the fact.
 */

import { parseIcs, findMeetingUrl } from "./ics.js";
import { extractAppointments, findLocation, findPeople } from "./datetext.js";

// ---------------------------------------------------------------------------
// Byte plumbing
// ---------------------------------------------------------------------------

export function bytesToBinaryString(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return out;
}

function binaryStringToBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function base64ToBytes(value) {
  const clean = String(value || "").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) return new Uint8Array(0);
  try {
    return binaryStringToBytes(atob(clean));
  } catch {
    return new Uint8Array(0);
  }
}

function quotedPrintableToBytes(value) {
  const joined = String(value || "").replace(/=\r?\n/g, "");
  const out = [];
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    const hex = joined.slice(i + 1, i + 3);
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      out.push(parseInt(hex, 16));
      i += 2;
    } else if (ch !== "\r") {
      out.push(ch.charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function decodeBytes(bytes, charset) {
  const label = (charset || "utf-8").toLowerCase().replace(/^["']|["']$/g, "");
  for (const candidate of [label, "utf-8"]) {
    try {
      return new TextDecoder(candidate, { fatal: false }).decode(bytes);
    } catch {
      /* try the next one */
    }
  }
  return bytesToBinaryString(bytes);
}

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

/** RFC 2047 encoded words: `=?UTF-8?B?SGFsbG8=?=`. */
export function decodeEncodedWords(value) {
  if (!value || !value.includes("=?")) return value || "";
  return String(value)
    // Whitespace between two encoded words is folding, not content.
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (whole, charset, encoding, payload) => {
      try {
        const bytes =
          encoding.toUpperCase() === "B"
            ? base64ToBytes(payload)
            : quotedPrintableToBytes(payload.replace(/_/g, " "));
        return decodeBytes(bytes, charset);
      } catch {
        return whole;
      }
    });
}

function splitHeaders(raw) {
  const separator = raw.search(/\r?\n\r?\n/);
  const headerBlock = separator === -1 ? raw : raw.slice(0, separator);
  const body = separator === -1 ? "" : raw.slice(separator).replace(/^\r?\n\r?\n/, "");

  const headers = {};
  const order = [];
  for (const line of headerBlock.replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ").split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!name) continue;
    headers[name] = name in headers ? `${headers[name]}, ${value}` : value;
    order.push(name);
  }
  return { headers, body, order };
}

function parseHeaderParams(value) {
  const parts = [];
  let current = "";
  let quoted = false;
  for (const ch of String(value || "")) {
    if (ch === '"') {
      quoted = !quoted;
      current += ch;
    } else if (ch === ";" && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const main = (parts.shift() || "").trim();
  const params = {};
  const continued = {};

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    let key = part.slice(0, eq).trim().toLowerCase();
    let raw = part.slice(eq + 1).trim().replace(/^"(.*)"$/s, "$1");

    // RFC 2231: filename*0*, filename*1* … and charset''-prefixed values.
    const continuation = key.match(/^([^*]+)\*(\d+)\*?$/);
    if (continuation) {
      const base = continuation[1];
      continued[base] = continued[base] || [];
      continued[base][Number(continuation[2])] = raw;
      continue;
    }
    if (key.endsWith("*")) {
      key = key.slice(0, -1);
      const m = raw.match(/^([^']*)'([^']*)'(.*)$/);
      if (m) raw = decodeBytes(percentToBytes(m[3]), m[1]);
    }
    params[key] = decodeEncodedWords(raw);
  }

  for (const [key, pieces] of Object.entries(continued)) {
    let joined = pieces.filter((p) => p != null).join("");
    const m = joined.match(/^([^']*)'([^']*)'(.*)$/);
    joined = m ? decodeBytes(percentToBytes(m[3]), m[1]) : decodeEncodedWords(joined);
    params[key] = joined;
  }

  return { value: main, params };
}

function percentToBytes(value) {
  const out = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "%" && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      out.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(value.charCodeAt(i) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** `"Jan de Vries" <jan@example.nl>, info@example.nl` → structured people. */
export function parseAddressList(value) {
  if (!value) return [];
  const decoded = decodeEncodedWords(value);
  const out = [];
  let current = "";
  let quoted = false;
  let angled = false;

  const flush = () => {
    const entry = current.trim();
    current = "";
    if (!entry) return;
    const angle = entry.match(/^(.*?)<([^>]+)>\s*$/);
    const name = angle ? angle[1].trim().replace(/^"(.*)"$/, "$1") : "";
    const email = (angle ? angle[2] : entry).trim().replace(/^mailto:/i, "");
    if (!email && !name) return;
    out.push({
      name: name || email.split("@")[0].replace(/[._]+/g, " "),
      email: /@/.test(email) ? email.toLowerCase() : "",
    });
  };

  for (const ch of decoded) {
    if (ch === '"') quoted = !quoted;
    if (ch === "<") angled = true;
    if (ch === ">") angled = false;
    if ((ch === "," || ch === ";") && !quoted && !angled) flush();
    else current += ch;
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// MIME tree
// ---------------------------------------------------------------------------

function splitMultipart(body, boundary) {
  const marker = `--${boundary}`;
  const parts = [];
  const lines = body.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (line.trimEnd() === marker) {
      if (current !== null) parts.push(current.join("\n"));
      current = [];
    } else if (line.trimEnd() === `${marker}--`) {
      if (current !== null) parts.push(current.join("\n"));
      current = null;
      break;
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current !== null && current.length) parts.push(current.join("\n"));
  return parts;
}

function walkPart(raw, collected, depth = 0) {
  if (depth > 12) return;
  const { headers, body } = splitHeaders(raw);
  const contentType = parseHeaderParams(headers["content-type"] || "text/plain");
  const type = contentType.value.toLowerCase();
  const disposition = parseHeaderParams(headers["content-disposition"] || "");
  const encoding = (headers["content-transfer-encoding"] || "7bit").trim().toLowerCase();

  if (type.startsWith("multipart/") && contentType.params.boundary) {
    for (const child of splitMultipart(body, contentType.params.boundary)) {
      walkPart(child, collected, depth + 1);
    }
    return;
  }

  if (type === "message/rfc822") {
    walkPart(body, collected, depth + 1);
    return;
  }

  let bytes;
  if (encoding === "base64") bytes = base64ToBytes(body);
  else if (encoding === "quoted-printable") bytes = quotedPrintableToBytes(body);
  else bytes = binaryStringToBytes(body.replace(/\r\n/g, "\n"));

  const filename = disposition.params.filename || contentType.params.name || "";
  const isAttachment =
    disposition.value.toLowerCase() === "attachment" ||
    (Boolean(filename) && !type.startsWith("text/") && type !== "text/calendar");

  if (type === "text/calendar" || /\.ics$/i.test(filename)) {
    collected.calendars.push(decodeBytes(bytes, contentType.params.charset));
    return;
  }

  if (isAttachment && filename) {
    collected.attachments.push({
      name: decodeEncodedWords(filename),
      mime: type || "application/octet-stream",
      size: bytes.length,
      bytes,
    });
    return;
  }

  if (type === "text/plain") collected.text.push(decodeBytes(bytes, contentType.params.charset));
  else if (type === "text/html") collected.html.push(decodeBytes(bytes, contentType.params.charset));
  else if (filename) {
    collected.attachments.push({
      name: decodeEncodedWords(filename),
      mime: type || "application/octet-stream",
      size: bytes.length,
      bytes,
    });
  }
}

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  euro: "€", pound: "£", eacute: "é", egrave: "è", euml: "ë", iuml: "ï",
  ouml: "ö", uuml: "ü", auml: "ä", ccedil: "ç", hellip: "…", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
};

export function htmlToText(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<td[^>]*>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Parse a raw RFC 822 message.
 *
 * @param {string} raw  binary string (one char per byte)
 */
export function parseEml(raw) {
  const source = String(raw || "").replace(/\r\n/g, "\n");
  const { headers } = splitHeaders(source);
  const collected = { text: [], html: [], calendars: [], attachments: [] };
  walkPart(source, collected);

  const text = collected.text.join("\n\n").trim();
  const html = collected.html.join("\n\n");
  const sentAt = headers.date ? Date.parse(decodeEncodedWords(headers.date)) : NaN;

  return {
    subject: decodeEncodedWords(headers.subject || "").trim(),
    from: parseAddressList(headers.from)[0] || null,
    to: parseAddressList(headers.to),
    cc: parseAddressList(headers.cc),
    sentAt: Number.isFinite(sentAt) ? sentAt : null,
    text: text || htmlToText(html),
    html,
    calendars: collected.calendars,
    attachments: collected.attachments,
    headers,
  };
}

export function parseEmlBytes(bytes) {
  return parseEml(bytesToBinaryString(bytes));
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

/**
 * Turn a raw e-mail into appointment drafts.
 *
 * Invitations resolve exactly; prose resolves with a confidence score so the
 * import screen can flag what needs a second look. Attachments ride along
 * either way — that referral letter is part of the appointment.
 */
export function appointmentsFromEmail(raw, options = {}) {
  const { now = Date.now(), sourceLabel = "E-mail" } = options;
  const mail = typeof raw === "string" ? parseEml(raw) : parseEmlBytes(raw);
  const reference = mail.sentAt || now;

  const attachments = mail.attachments.map((a, i) => ({
    id: `${i}`,
    name: a.name,
    mime: a.mime,
    size: a.size,
    bytes: a.bytes,
    kind: "file",
  }));

  const senderPeople = [];
  if (mail.from) senderPeople.push({ ...mail.from, role: "afzender" });
  for (const person of mail.to.slice(0, 8)) senderPeople.push({ ...person, role: "deelnemer" });

  const results = [];

  // 1. A real invitation — trust it completely.
  for (const ics of mail.calendars) {
    const { events } = parseIcs(ics, { now });
    for (const event of events) {
      results.push({
        ...event,
        attachments: [...(event.attachments || []), ...attachments],
        people: event.people?.length ? event.people : senderPeople,
        organizer: event.organizer || mail.from || null,
        emailSubject: mail.subject,
        confidence: 1,
        origin: "uitnodiging",
        sourceLabel,
      });
    }
  }
  if (results.length) return results;

  // 2. Prose — read the subject and body together, subject first so it can
  //    supply the title and any date it happens to mention.
  const body = mail.text || htmlToText(mail.html);
  const haystack = [mail.subject, body].filter(Boolean).join("\n\n");

  const candidates = extractAppointments(haystack, {
    now: reference,
    title: mail.subject,
    max: 4,
  });

  for (const candidate of candidates) {
    results.push({
      id: "",
      uid: "",
      title: candidate.title,
      start: candidate.start,
      end: candidate.end,
      allDay: candidate.allDay,
      location: candidate.location || findLocation(body),
      meetingUrl: findMeetingUrl(body, mail.subject),
      description: trimBody(body),
      organizer: mail.from || null,
      people: mergePeople(senderPeople, candidate.people?.length ? candidate.people : findPeople(body)),
      attachments,
      status: "CONFIRMED",
      emailSubject: mail.subject,
      matchedText: candidate.matchedText,
      confidence: candidate.confidence,
      origin: "e-mail",
      sourceLabel,
    });
  }

  return results;
}

/** Same treatment for text pasted straight into the app. */
export function appointmentsFromText(text, options = {}) {
  const { now = Date.now(), sourceLabel = "Geplakte tekst" } = options;
  const source = String(text || "");

  if (/BEGIN:VCALENDAR|BEGIN:VEVENT/i.test(source)) {
    const { events } = parseIcs(source, { now });
    return events.map((event) => ({ ...event, origin: "agenda", sourceLabel, confidence: 1 }));
  }

  return extractAppointments(source, { now, max: 6 }).map((candidate) => ({
    id: "",
    uid: "",
    title: candidate.title,
    start: candidate.start,
    end: candidate.end,
    allDay: candidate.allDay,
    location: candidate.location,
    meetingUrl: findMeetingUrl(source),
    description: trimBody(source),
    organizer: null,
    people: candidate.people || [],
    attachments: [],
    status: "CONFIRMED",
    matchedText: candidate.matchedText,
    confidence: candidate.confidence,
    origin: "tekst",
    sourceLabel,
  }));
}

function mergePeople(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const person of list || []) {
      const key = (person.email || person.name || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(person);
    }
  }
  return out.slice(0, 14);
}

function trimBody(text) {
  return String(text || "")
    // Drop the quoted history and the signature boilerplate below it.
    .split(/\n-{2,}\s*\n|\nOp .{0,60} schreef |\nOn .{0,60} wrote:|\nVan:\s|\nFrom:\s/)[0]
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}
