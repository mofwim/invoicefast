/**
 * Timezone helpers.
 *
 * Calendars hand us wall-clock times plus a zone name ("14:00 in
 * Europe/Amsterdam"). To place an appointment on a timeline we need the real
 * instant, which means resolving the zone offset *for that moment* — including
 * DST. `Intl.DateTimeFormat` knows every IANA zone, so we use it as the oracle
 * instead of shipping a timezone database.
 */

// Outlook writes Windows zone names into TZID. Map the ones that actually show
// up in invitations; anything else falls through to the IANA path.
const WINDOWS_TO_IANA = {
  "utc": "UTC",
  "gmt standard time": "Europe/London",
  "greenwich standard time": "Atlantic/Reykjavik",
  "w. europe standard time": "Europe/Berlin",
  "romance standard time": "Europe/Paris",
  "central europe standard time": "Europe/Budapest",
  "central european standard time": "Europe/Warsaw",
  "e. europe standard time": "Europe/Chisinau",
  "fle standard time": "Europe/Kiev",
  "gtb standard time": "Europe/Bucharest",
  "turkey standard time": "Europe/Istanbul",
  "russian standard time": "Europe/Moscow",
  "eastern standard time": "America/New_York",
  "central standard time": "America/Chicago",
  "mountain standard time": "America/Denver",
  "pacific standard time": "America/Los_Angeles",
  "us mountain standard time": "America/Phoenix",
  "alaskan standard time": "America/Anchorage",
  "hawaiian standard time": "Pacific/Honolulu",
  "atlantic standard time": "America/Halifax",
  "sa pacific standard time": "America/Bogota",
  "sa eastern standard time": "America/Cayenne",
  "e. south america standard time": "America/Sao_Paulo",
  "argentina standard time": "America/Argentina/Buenos_Aires",
  "arabian standard time": "Asia/Dubai",
  "arab standard time": "Asia/Riyadh",
  "arabic standard time": "Asia/Baghdad",
  "egypt standard time": "Africa/Cairo",
  "israel standard time": "Asia/Jerusalem",
  "jordan standard time": "Asia/Amman",
  "middle east standard time": "Asia/Beirut",
  "syria standard time": "Asia/Damascus",
  "iran standard time": "Asia/Tehran",
  "afghanistan standard time": "Asia/Kabul",
  "india standard time": "Asia/Kolkata",
  "pakistan standard time": "Asia/Karachi",
  "bangladesh standard time": "Asia/Dhaka",
  "nepal standard time": "Asia/Kathmandu",
  "myanmar standard time": "Asia/Yangon",
  "se asia standard time": "Asia/Bangkok",
  "singapore standard time": "Asia/Singapore",
  "china standard time": "Asia/Shanghai",
  "taipei standard time": "Asia/Taipei",
  "tokyo standard time": "Asia/Tokyo",
  "korea standard time": "Asia/Seoul",
  "central asia standard time": "Asia/Almaty",
  "north asia east standard time": "Asia/Irkutsk",
  "azerbaijan standard time": "Asia/Baku",
  "georgian standard time": "Asia/Tbilisi",
  "caucasus standard time": "Asia/Yerevan",
  "aus eastern standard time": "Australia/Sydney",
  "cen. australia standard time": "Australia/Adelaide",
  "e. australia standard time": "Australia/Brisbane",
  "w. australia standard time": "Australia/Perth",
  "new zealand standard time": "Pacific/Auckland",
  "south africa standard time": "Africa/Johannesburg",
  "w. central africa standard time": "Africa/Lagos",
  "e. africa standard time": "Africa/Nairobi",
  "morocco standard time": "Africa/Casablanca",
};

const zoneCache = new Map();
const formatterCache = new Map();

/**
 * Turn whatever a calendar put in TZID into something usable: an IANA zone
 * name, or a fixed offset in minutes for `(UTC+01:00) …` style labels.
 *
 * @returns {{zone: string|null, fixedOffsetMinutes: number|null}}
 */
export function normalizeZone(tzid) {
  if (!tzid || typeof tzid !== "string") return { zone: null, fixedOffsetMinutes: null };
  if (zoneCache.has(tzid)) return zoneCache.get(tzid);

  let raw = tzid.trim().replace(/^"|"$/g, "");
  let result = { zone: null, fixedOffsetMinutes: null };

  // Mozilla writes "/mozilla.org/20050126_1/Europe/Amsterdam".
  if (raw.startsWith("/")) {
    const segments = raw.split("/").filter(Boolean);
    if (segments.length >= 2) raw = segments.slice(-2).join("/");
  }

  // "(UTC+01:00) Amsterdam, Berlin, Bern" — the offset is the only reliable bit.
  const offsetLabel = raw.match(/(?:GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i);

  if (isValidZone(raw)) {
    result = { zone: raw, fixedOffsetMinutes: null };
  } else if (WINDOWS_TO_IANA[raw.toLowerCase()]) {
    result = { zone: WINDOWS_TO_IANA[raw.toLowerCase()], fixedOffsetMinutes: null };
  } else if (offsetLabel) {
    const sign = offsetLabel[1] === "-" ? -1 : 1;
    const minutes = Number(offsetLabel[2]) * 60 + Number(offsetLabel[3] || 0);
    result = { zone: null, fixedOffsetMinutes: sign * minutes };
  } else {
    // Last chance: a bare city that happens to match a known zone suffix.
    const guess = raw.replace(/\s+/g, "_");
    if (isValidZone(`Europe/${guess}`)) result = { zone: `Europe/${guess}`, fixedOffsetMinutes: null };
  }

  zoneCache.set(tzid, result);
  return result;
}

export function isValidZone(zone) {
  if (!zone || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function formatterFor(zone) {
  let fmt = formatterCache.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(zone, fmt);
  }
  return fmt;
}

/**
 * Offset of `zone` at a given instant, in milliseconds.
 * Positive east of Greenwich (Amsterdam in July → +7200000).
 */
export function zoneOffsetMs(instantMs, zone) {
  if (!zone) return 0;
  let parts;
  try {
    parts = formatterFor(zone).formatToParts(new Date(instantMs));
  } catch {
    return 0;
  }
  const f = {};
  for (const p of parts) f[p.type] = p.value;
  // Some ICU builds report midnight as hour 24.
  const hour = Number(f.hour) === 24 ? 0 : Number(f.hour);
  const asUtc = Date.UTC(
    Number(f.year),
    Number(f.month) - 1,
    Number(f.day),
    hour,
    Number(f.minute),
    Number(f.second)
  );
  return asUtc - instantMs;
}

/**
 * Wall-clock fields in a zone → real epoch milliseconds.
 *
 * `wallMs` is the wall time encoded with Date.UTC (a "floating" timestamp), so
 * date arithmetic on it never trips over DST. One refinement pass is enough to
 * settle on the correct offset around transitions.
 */
export function wallToInstant(wallMs, tzid) {
  const { zone, fixedOffsetMinutes } = normalizeZone(tzid);
  if (fixedOffsetMinutes != null) return wallMs - fixedOffsetMinutes * 60000;
  if (!zone) return floatingToInstant(wallMs);

  let instant = wallMs - zoneOffsetMs(wallMs, zone);
  instant = wallMs - zoneOffsetMs(instant, zone);
  // During a spring-forward gap the wall time does not exist; RFC 5545 readers
  // conventionally land on the moment right after the jump, which is what a
  // second refinement gives us.
  const check = wallMs - zoneOffsetMs(instant, zone);
  return check === instant ? instant : check;
}

/** Real epoch milliseconds → wall-clock fields in a zone, as a floating timestamp. */
export function instantToWall(instantMs, tzid) {
  const { zone, fixedOffsetMinutes } = normalizeZone(tzid);
  if (fixedOffsetMinutes != null) return instantMs + fixedOffsetMinutes * 60000;
  if (!zone) return instantToFloating(instantMs);
  return instantMs + zoneOffsetMs(instantMs, zone);
}

/** A time with no zone at all means "whatever clock the reader is looking at". */
export function floatingToInstant(wallMs) {
  const d = new Date(wallMs);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds()
  ).getTime();
}

export function instantToFloating(instantMs) {
  const d = new Date(instantMs);
  return Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds()
  );
}

export function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
