import test from "node:test";
import assert from "node:assert/strict";

import { calculateVat, formatIban, normaliseIban, validateIban, VAT_RATES, IBAN_LENGTHS } from "../lib/tools/business.js";

// ------------------------------------------------------------------- vat

test("adds VAT to a net amount", () => {
  const r = calculateVat(100, 21, "excl");
  assert.equal(r.net, 100);
  assert.equal(r.vat, 21);
  assert.equal(r.gross, 121);
});

test("takes VAT back out of a gross amount", () => {
  const r = calculateVat(121, 21, "incl");
  assert.equal(r.net, 100);
  assert.equal(r.vat, 21);
  assert.equal(r.gross, 121);
});

test("the three numbers still add up after rounding", () => {
  for (const amount of [0.01, 1.11, 19.99, 33.33, 1234.56, 9999.99]) {
    for (const rate of [21, 9, 6, 5.5]) {
      for (const basis of ["excl", "incl"]) {
        const r = calculateVat(amount, rate, basis);
        assert.equal(
          r.gross,
          Math.round((r.net + r.vat) * 100) / 100,
          `${amount} @ ${rate}% ${basis} telt niet op`
        );
      }
    }
  }
});

test("a zero rate changes nothing", () => {
  const r = calculateVat(250, 0, "excl");
  assert.equal(r.vat, 0);
  assert.equal(r.gross, 250);
});

test("nonsense in gives zeroes out, not NaN", () => {
  const r = calculateVat("appels", 21);
  assert.equal(r.net, 0);
  assert.equal(r.gross, 0);
});

test("the countries offered have real rates", () => {
  assert.ok(VAT_RATES.NL.rates.includes(21));
  assert.ok(VAT_RATES.DE.rates.includes(19));
  for (const [, entry] of Object.entries(VAT_RATES)) {
    assert.ok(entry.rates.length > 0);
    assert.ok(entry.rates.every((rate) => rate >= 0 && rate <= 30));
  }
});

// ------------------------------------------------------------------ iban

test("accepts real IBANs from several countries", () => {
  for (const iban of [
    "NL91ABNA0417164300",
    "DE89370400440532013000",
    "BE68539007547034",
    "GB82WEST12345698765432",
    "FR1420041010050500013M02606",
    "CH9300762011623852957",
  ]) {
    assert.equal(validateIban(iban).valid, true, `${iban} hoorde geldig te zijn`);
  }
});

test("spaces and lower case do not matter", () => {
  assert.equal(validateIban("nl91 abna 0417 1643 00").valid, true);
  assert.equal(normaliseIban("nl91 abna 0417 1643 00"), "NL91ABNA0417164300");
});

test("one wrong digit is caught by the checksum", () => {
  assert.equal(validateIban("NL91ABNA0417164301").reason, "checksum");
  assert.equal(validateIban("DE89370400440532013001").reason, "checksum");
});

test("the wrong length for the country is caught first", () => {
  const result = validateIban("NL91ABNA041716430");
  assert.equal(result.reason, "length");
  assert.equal(result.expected, 18);
  assert.equal(result.actual, 17);
});

test("an unknown country is named as such", () => {
  assert.equal(validateIban("ZZ0012345678").reason, "unknownCountry");
  assert.equal(validateIban("1234567890").reason, "country");
  assert.equal(validateIban("").reason, "empty");
});

test("a Dutch IBAN also says which bank", () => {
  const result = validateIban("NL91ABNA0417164300");
  assert.equal(result.bank, "ABN AMRO");
  assert.equal(result.bankCode, "ABNA");
  assert.equal(result.account, "417164300");
  assert.equal(result.formatted, "NL91 ABNA 0417 1643 00");
});

test("a foreign IBAN does not pretend to know the bank", () => {
  assert.equal(validateIban("DE89370400440532013000").bank, null);
});

test("formatting groups by four", () => {
  assert.equal(formatIban("NL91ABNA0417164300"), "NL91 ABNA 0417 1643 00");
});

test("the length table is sane", () => {
  assert.equal(IBAN_LENGTHS.NL, 18);
  assert.equal(IBAN_LENGTHS.DE, 22);
  for (const [country, length] of Object.entries(IBAN_LENGTHS)) {
    assert.match(country, /^[A-Z]{2}$/);
    assert.ok(length >= 15 && length <= 34, `${country} heeft een onmogelijke lengte`);
  }
});
