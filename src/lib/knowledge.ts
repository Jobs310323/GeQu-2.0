// Knowledge base loader.
//
// The articles themselves are content, not translation strings — see ADR-006.
// Each is a Markdown file with a small frontmatter header, one file per
// article per locale under `src/content/knowledge/{ru,en}/`, loaded at build
// time via `import.meta.glob` (the same mechanism `rehydrate.test.ts` already
// uses for reading source files raw).
//
// Russian is the complete set: every article was authored there first, and
// `knowledgeArticles` uses it as the fallback when a locale's own file is
// missing, marking that article `translated: false` so the screen can show a
// visible "available in Russian only" label instead of a blank entry or a
// silently machine-translated one.

import type { Locale } from '../i18n/locale';
import { categories as categoriesRu } from '../content/knowledge/categories/ru';
import { categories as categoriesEn } from '../content/knowledge/categories/en';
import type { Category } from '../content/knowledge/categories/types';

export type { Category };

export type Article = {
    id: string;
    category: string;
    title: string;
    summary: string;
    minutes: number;
    /** Where in the app to go and try it, if that applies. */
    action?: { page: string; label: string };
    body: string;
    /** False when this locale has no article of its own and Russian is shown instead. */
    translated: boolean;
};

type RawArticle = Omit<Article, 'translated'>;

const RAW_RU = import.meta.glob('../content/knowledge/ru/*.md', {
    query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const RAW_EN = import.meta.glob('../content/knowledge/en/*.md', {
    query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

/** `path/to/dopamine.md` -> `dopamine`, independent of the glob's exact key format. */
function idFromPath(path: string): string {
    return path.split('/').pop()!.replace(/\.md$/, '');
}

export function parseFrontmatter(id: string, raw: string): RawArticle {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`content/knowledge: "${id}" has no frontmatter block`);
    const [, frontmatter, body] = match;

    const fields: Record<string, string> = {};
    for (const line of frontmatter!.split('\n')) {
        const sep = line.indexOf(':');
        if (sep === -1) continue;
        fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }

    const minutes = Number(fields.minutes);
    if (!fields.category || !fields.title || !fields.summary || !Number.isFinite(minutes)) {
        throw new Error(`content/knowledge: "${id}" is missing a required frontmatter field`);
    }

    const article: RawArticle = {
        id, category: fields.category, title: fields.title, summary: fields.summary,
        minutes, body: body!.trim(),
    };
    if (fields['action.page'] && fields['action.label']) {
        article.action = { page: fields['action.page'], label: fields['action.label'] };
    }
    return article;
}

export function loadLocale(raw: Record<string, string>): Map<string, RawArticle> {
    const out = new Map<string, RawArticle>();
    for (const [path, text] of Object.entries(raw)) {
        const id = idFromPath(path);
        out.set(id, parseFrontmatter(id, text));
    }
    return out;
}

/**
 * Every article, in `own` where a translation exists there, falling back to
 * `source` (Russian, in production) where it doesn't. Order follows `source`,
 * which is authoritative for which articles exist at all. A free function of
 * its two maps rather than reading the module-level ones directly, so tests
 * can exercise the fallback without needing an actual missing content file.
 */
export function mergeWithFallback(own: Map<string, RawArticle>, source: Map<string, RawArticle>): Article[] {
    return [...source.keys()].map(id => {
        const localized = own.get(id);
        if (localized) return { ...localized, translated: true };
        return { ...source.get(id)!, translated: false };
    });
}

const BY_LOCALE: Record<Locale, Map<string, RawArticle>> = {
    ru: loadLocale(RAW_RU),
    en: loadLocale(RAW_EN),
};

export function knowledgeArticles(locale: Locale): Article[] {
    return mergeWithFallback(BY_LOCALE[locale], BY_LOCALE.ru);
}

export function knowledgeCategories(locale: Locale): Category[] {
    return locale === 'ru' ? categoriesRu : categoriesEn;
}

export function knowledgeArticlesByCategory(locale: Locale, categoryId: string): Article[] {
    return knowledgeArticles(locale).filter(a => a.category === categoryId);
}

export function searchKnowledge(locale: Locale, query: string): Article[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return knowledgeArticles(locale).filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q));
}

/** Other articles in the same category, for the "read next" row. */
export function relatedArticles(locale: Locale, article: Article, limit = 3): Article[] {
    return knowledgeArticles(locale)
        .filter(a => a.category === article.category && a.id !== article.id)
        .slice(0, limit);
}
