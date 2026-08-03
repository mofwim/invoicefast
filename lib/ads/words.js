/**
 * What the advertising question says, per language.
 *
 * Plain data, kept out of the client module: a server component may render a
 * slot's label, and a module marked "use client" can only hand components
 * across that boundary — never a helper.
 */

const WORDS = {
  nl: {
    title: "Advertenties?",
    body: "Deze tools zijn gratis en draaien volledig in je eigen browser. Advertenties betalen de hosting. Je bestand blijft hoe dan ook op je apparaat — een advertentie ziet het niet, kan er niet bij, en weet niet dat het bestaat.",
    detail: "Wat is het verschil?",
    detailBody:
      "Zonder personalisatie kiest Google de advertentie op basis van de pagina waar je op bent, niet op basis van jou. Er wordt dan nog steeds een cookie gezet om te voorkomen dat je dezelfde advertentie tien keer ziet — daarom is ook dit een keuze en geen standaard.",
    plain: "Zonder personalisatie",
    personalised: "Persoonlijk maken",
    refuse: "Geen advertenties",
    change: "Advertentie-instelling",
    changed: "Opgeslagen.",
    ad: "Advertentie",
  },
  en: {
    title: "Advertising?",
    body: "These tools are free and run entirely in your own browser. Advertising pays for the hosting. Your file stays on your device either way — an advertisement never sees it, cannot reach it, and does not know it exists.",
    detail: "What is the difference?",
    detailBody:
      "Without personalisation, Google picks the advertisement from the page you are on rather than from you. A cookie is still set so you do not see the same advertisement ten times — which is why this is a choice and not a default.",
    plain: "Without personalisation",
    personalised: "Personalise them",
    refuse: "No advertising",
    change: "Advertising choice",
    changed: "Saved.",
    ad: "Advertisement",
  },
};

export function adWords(locale) {
  return WORDS[locale] || WORDS.nl;
}

