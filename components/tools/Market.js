"use client";

import { useMemo, useState } from "react";
import Icon from "../Icons";
import { LOCALES, LOCALE_META } from "../../lib/i18n/locales";
import { translator } from "../../lib/i18n/ui";
import { categoriesForLocale, toolsForLocale } from "../../lib/tools/registry";
import { LanguageSwitch } from "./ToolShell";
import AdSlot from "../ads/AdSlot";
import ConsentGate from "../ads/Consent";
import { adWords } from "../../lib/ads/words";
import "./tools.css";

/**
 * The hub.
 *
 * Rendered from the registry, so a new tool appears here the moment it is
 * described — nothing to remember to update. Search is client-side over the
 * same data, which is small enough that anything cleverer would be waste.
 */
export default function Market({ locale }) {
  const t = translator(locale);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => categoriesForLocale(locale), [locale]);
  const all = useMemo(() => toolsForLocale(locale), [locale]);

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    const words = needle.split(/\s+/);
    return all.filter((tool) => {
      const haystack = [tool.name, tool.tagline, tool.description, ...(tool.keywords || [])]
        .join(" ")
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [all, query]);

  const marketAlternates = Object.fromEntries(LOCALES.map((code) => [code, `/${code}/tools`]));

  return (
    <div className="tp-page">
      <div className="tp">
      <nav className="tp-nav">
        <span className="tp-nav-spacer" />
        <LanguageSwitch current={locale} alternates={marketAlternates} label={t("common.language")} />
      </nav>

      <header className="tp-hero">
        {/* Once, here — not whispered at the foot of all twenty-nine cards. */}
        <p className="tp-promise">
          <Icon name="check" size={14} strokeWidth={2.6} />
          {t("market.local")}
        </p>
        <h1 className="tp-title">{t("market.title")}</h1>
        <p className="tp-sub">{t("market.tagline")}</p>
      </header>

      <div className="tp-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("market.searchPlaceholder")}
          aria-label={t("market.search")}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("market.clear")}>
            <Icon name="close" size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {hits ? (
        hits.length ? (
          <section className="tp-group">
            <div className="tp-cards">
              {hits.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ) : (
          <p className="tp-empty">
            {t("market.noResults")} <strong>{query}</strong>.
          </p>
        )
      ) : (
        groups.map((group) => (
          <section className="tp-group" key={group.id}>
            <h2>
              {t(`category.${group.id}`)}
              <small>{group.tools.length}</small>
            </h2>
            <div className="tp-cards">
              {group.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* After every category, so it never sits between somebody and the tool
          they were reading about. */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADS_SLOT_MARKET} label={adWords(locale).ad} minHeight={280} />

      <p className="tp-privacy">
        <Icon name="check" size={15} strokeWidth={2.2} />
        <span>{t("privacy.market")}</span>
      </p>

      <p className="tp-foot">
        <a href={`/${locale}/privacy`}>{t("privacy.link")}</a>
      </p>
      <ConsentGate locale={locale} />
      </div>
    </div>
  );
}

function ToolCard({ tool }) {
  return (
    <a className="tp-card" href={tool.href} data-tint={tool.tint}>
      <span className="tp-card-go" aria-hidden="true">
        <Icon name="chevron" size={17} strokeWidth={2.2} />
      </span>
      <span className="tp-card-top">
        <span className="tp-badge" data-tint={tool.tint} aria-hidden="true">
          <Icon name={tool.icon} size={22} strokeWidth={1.9} />
        </span>
        <span className="tp-card-name">
          <strong>{tool.name}</strong>
          <span>{tool.tagline}</span>
        </span>
      </span>
    </a>
  );
}

export { LOCALE_META };
