/**
 * The admin jobs: VAT and IBAN.
 *
 * These are the ones the audience that actually pays reaches for — a
 * bookkeeper checking an account number before a payment run does that many
 * times a week, and would rather not paste a client's IBAN into a stranger's
 * form to do it.
 */

// ---------------------------------------------------------------------------
// VAT / BTW
// ---------------------------------------------------------------------------

/** The rates people meet in practice, by country. */
export const VAT_RATES = {
  NL: { label: "Nederland", rates: [21, 9, 0] },
  BE: { label: "België", rates: [21, 12, 6, 0] },
  DE: { label: "Duitsland", rates: [19, 7, 0] },
  FR: { label: "Frankrijk", rates: [20, 10, 5.5, 2.1] },
  UK: { label: "Verenigd Koninkrijk", rates: [20, 5, 0] },
  IE: { label: "Ierland", rates: [23, 13.5, 9, 0] },
  ES: { label: "Spanje", rates: [21, 10, 4] },
  IT: { label: "Italië", rates: [22, 10, 5, 4] },
};

/**
 * Work out the three numbers from whichever one is known.
 *
 * @param {number} amount
 * @param {number} rate      percent
 * @param {string} basis     "excl" when the amount is net, "incl" when gross
 */
export function calculateVat(amount, rate, basis = "excl") {
  const value = Number(amount);
  const percent = Number(rate);
  if (!Number.isFinite(value) || !Number.isFinite(percent)) {
    return { net: 0, vat: 0, gross: 0, rate: 0 };
  }

  const factor = percent / 100;
  const net = basis === "incl" ? value / (1 + factor) : value;
  const vat = net * factor;

  // Round only at the end, and only the parts that get printed, so the three
  // numbers still add up on the invoice.
  const roundedNet = round2(net);
  const roundedVat = round2(vat);
  return {
    net: roundedNet,
    vat: roundedVat,
    gross: round2(roundedNet + roundedVat),
    rate: percent,
  };
}

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function formatMoney(value, locale = "nl-NL", currency = "EUR") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value || 0);
  } catch {
    return `€ ${(value || 0).toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// IBAN
// ---------------------------------------------------------------------------

/** Length per country — the first check, and the one that catches typos. */
export const IBAN_LENGTHS = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22,
  MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25,
  QA: 29, RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28,
  TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

/** Dutch bank codes, so a valid NL number can also say whose it is. */
const NL_BANKS = {
  ABNA: "ABN AMRO", INGB: "ING", RABO: "Rabobank", SNSB: "SNS Bank", ASNB: "ASN Bank",
  BUNQ: "bunq", KNAB: "Knab", TRIO: "Triodos", RBRB: "RegioBank", FVLB: "Van Lanschot",
  REVO: "Revolut", NTSB: "N26", BITS: "Bits of Stock", HAND: "Svenska Handelsbanken",
  DEUT: "Deutsche Bank", FTSB: "Fintro", NWAB: "Nederlandse Waterschapsbank",
  RBOS: "RBS", ANDL: "Anadolubank", ATBA: "Amsterdam Trade Bank", LOYD: "Lloyds",
  BOFA: "Bank of America", CITI: "Citibank", BCIT: "Intesa Sanpaolo", ISBK: "Isbank",
  MOYO: "Moneyou", PCBC: "Bank of China", ZWLB: "Zwitserleven",
};

export function normaliseIban(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatIban(value) {
  return normaliseIban(value).replace(/(.{4})/g, "$1 ").trim();
}

/**
 * The ISO 13616 check: move the first four characters to the end, turn letters
 * into numbers, and the whole thing modulo 97 must be 1.
 *
 * The remainder is computed in chunks because the number is far too long for a
 * JavaScript integer.
 */
function mod97(digits) {
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(String(remainder) + digits.slice(i, i + 7)) % 97;
  }
  return remainder;
}

export function validateIban(input) {
  const iban = normaliseIban(input);

  if (!iban) return { valid: false, reason: "empty" };
  if (iban.length < 5) return { valid: false, reason: "short", iban };

  const country = iban.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(country)) return { valid: false, reason: "country", iban };

  const expected = IBAN_LENGTHS[country];
  if (!expected) return { valid: false, reason: "unknownCountry", iban, country };
  if (iban.length !== expected) {
    return { valid: false, reason: "length", iban, country, expected, actual: iban.length };
  }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return { valid: false, reason: "shape", iban, country };

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = [...rearranged]
    .map((char) => (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char))
    .join("");

  if (mod97(digits) !== 1) return { valid: false, reason: "checksum", iban, country };

  const bank = country === "NL" ? NL_BANKS[iban.slice(4, 8)] || null : null;
  return {
    valid: true,
    iban,
    formatted: formatIban(iban),
    country,
    bankCode: country === "NL" ? iban.slice(4, 8) : null,
    bank,
    account: country === "NL" ? iban.slice(8).replace(/^0+/, "") : null,
  };
}

export const __testing = { mod97, round2, NL_BANKS };
