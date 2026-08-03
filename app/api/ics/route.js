/**
 * Read-only proxy for subscribed calendar links.
 *
 * Browsers refuse to fetch a calendar from another origin, so the request has
 * to be made server-side. That makes this endpoint a potential doorway into the
 * private network, so every hop — including each redirect — is resolved and
 * checked against the internal address ranges before a connection is made.
 * Nothing is stored: the calendar is fetched, handed to the caller, forgotten.
 */

import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

const RATE_LIMIT = { windowMs: 5 * 60000, max: 60 };
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

/** Block loopback, link-local, private and other non-routable destinations. */
function isBlockedAddress(address) {
  const version = net.isIP(address);
  if (!version) return true;

  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier NAT
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // IPv4-mapped IPv6 hides a v4 address inside a v6 literal.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]);
  return false;
}

async function assertPublicHost(hostname) {
  if (!hostname) throw new Error("Ongeldige agenda-link");

  const bare = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(bare)) {
    if (isBlockedAddress(bare)) throw new Error("Deze link wijst naar een intern adres");
    return;
  }

  if (/^(localhost|.*\.local|.*\.internal|.*\.localdomain)$/i.test(bare)) {
    throw new Error("Deze link wijst naar een intern adres");
  }

  let addresses;
  try {
    addresses = await dns.lookup(bare, { all: true });
  } catch {
    throw new Error("Kon dit adres niet vinden");
  }

  if (!addresses.length) throw new Error("Kon dit adres niet vinden");
  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new Error("Deze link wijst naar een intern adres");
  }
}

function parseTarget(raw) {
  let value = String(raw || "").trim();
  if (!value) throw new Error("Geen agenda-link opgegeven");
  if (/^webcal:\/\//i.test(value)) value = value.replace(/^webcal:\/\//i, "https://");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Ongeldige agenda-link");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Alleen http- en https-links zijn toegestaan");
  }
  return url;
}

/** Follow redirects by hand so every hop is validated, not just the first. */
async function fetchCalendar(startUrl, signal) {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);

    const response = await fetch(url.toString(), {
      signal,
      redirect: "manual",
      headers: {
        accept: "text/calendar, text/plain;q=0.9, */*;q=0.5",
        "user-agent": "MijnAfspraken/1.0 (+agenda-import)",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Ongeldige omleiding");
      url = new URL(location, url);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Ongeldige omleiding");
      }
      continue;
    }

    return { response, finalUrl: url };
  }

  throw new Error("Te veel omleidingen");
}

/** Read at most MAX_BYTES so a huge or endless response cannot exhaust memory. */
async function readCapped(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared && declared > MAX_BYTES) throw new Error("Deze agenda is te groot (max 5 MB)");

  if (!response.body) return await response.text();

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("Deze agenda is te groot (max 5 MB)");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}

const fail = (message, status) =>
  Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

export async function GET(request) {
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "anoniem";

  if (rateLimited(clientKey)) {
    return fail("Even rustig aan — probeer het over een paar minuten opnieuw", 429);
  }

  let target;
  try {
    target = parseTarget(new URL(request.url).searchParams.get("url"));
  } catch (err) {
    return fail(err.message, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { response } = await fetchCalendar(target, controller.signal);

    if (!response.ok) {
      const hint =
        response.status === 401 || response.status === 403
          ? "Deze agenda is niet openbaar. Gebruik de privé- of geheime ICS-link."
          : `De agenda gaf status ${response.status}`;
      return fail(hint, 502);
    }

    const body = await readCapped(response);
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      return fail("Dit adres geeft geen agenda terug. Controleer of het een ICS-link is.", 422);
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    if (err.name === "AbortError") return fail("De agenda reageerde niet op tijd", 504);
    return fail(err.message || "Ophalen mislukt", 502);
  } finally {
    clearTimeout(timer);
  }
}
