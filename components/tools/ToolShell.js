import Icon from "../Icons";
import { STORAGE_KEY } from "../../lib/afspraken/store";
import { themeBootScript } from "../../lib/afspraken/theme";
import { LOCALES, LOCALE_META } from "../../lib/i18n/locales";
import { translator } from "../../lib/i18n/ui";
import { alternatesFor, relatedTools } from "../../lib/tools/registry";
import "./tools.css";

/**
 * The frame every tool sits in: back to the market, a title, what else is
 * nearby, and the promise spelled out at the foot of the page rather than
 * asserted in a banner.
 *
 * Appearance follows whatever was chosen in Mijn Afspraken — same storage, same
 * pre-paint script — so the market does not flip between light and dark as you
 * move between tools.
 */
export default function ToolShell({ tool, locale, children }) {
  const t = translator(locale);
  const related = relatedTools(tool, locale);
  const alternates = alternatesFor(tool.id);

  return (
    <div className="tp-page">
      <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY) }} />
      <div className="tp tp-tool">
        <nav className="tp-nav">
          <a className="tp-back" href={`/${locale}/tools`}>
            <Icon name="chevron" size={17} strokeWidth={2.4} className="tp-back-icon" />
            {t("market.back")}
          </a>
          <LanguageSwitch current={locale} alternates={alternates} label={t("common.language")} />
        </nav>

        <h1 className="tp-title">{tool.name}</h1>
        <p className="tp-sub">{tool.intro || tool.description}</p>

        {children}

        <p className="tp-privacy">
          <Icon name="check" size={15} strokeWidth={2.2} />
          <span>{t("privacy.tool")}</span>
        </p>

        {related.length > 0 && (
          <section className="tp-group tp-related">
            <h2>{t("market.related")}</h2>
            <div className="tp-cards">
              {related.map((entry) => (
                <a className="tp-card" href={entry.href} key={entry.id}>
                  <span className="tp-card-top">
                    <span className="tp-badge" data-tint={entry.tint} aria-hidden="true">
                      <Icon name={entry.icon} size={21} strokeWidth={1.9} />
                    </span>
                    <span className="tp-card-name">
                      <strong>{entry.name}</strong>
                      <span>{entry.tagline}</span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <p className="tp-foot">
          <a href={`/${locale}/tools`}>{t("market.all")}</a>
        </p>
      </div>
    </div>
  );
}

/** Links, not a dropdown: a search engine should be able to follow them. */
export function LanguageSwitch({ current, alternates, label }) {
  const available = LOCALES.filter((locale) => alternates[locale]);
  if (available.length < 2) return null;

  return (
    <span className="tp-langs" role="group" aria-label={label}>
      {available.map((locale) => (
        <a
          key={locale}
          href={alternates[locale]}
          hrefLang={LOCALE_META[locale].hrefLang}
          aria-current={locale === current ? "true" : undefined}
        >
          {LOCALE_META[locale].short}
        </a>
      ))}
    </span>
  );
}
