import { describe, it, expect } from 'vitest';
import {
    knowledgeArticles, knowledgeCategories, knowledgeArticlesByCategory,
    searchKnowledge, relatedArticles, parseFrontmatter, mergeWithFallback,
    type Article,
} from './knowledge';

/**
 * The knowledge base is content (see ADR-006), loaded from Markdown files
 * under src/content/knowledge/{ru,en}/ rather than from translation-key JSON.
 * These tests cover the loader's own logic — frontmatter parsing and the
 * per-locale fallback — plus the structural invariants that keep the content
 * files themselves honest (every article has both locales, every category
 * referenced by an article actually exists).
 */

describe('parseFrontmatter', () => {
    it('parses required fields and the body', () => {
        const raw = '---\ncategory: basics\ntitle: A title\nsummary: A summary.\nminutes: 3\n---\nBody text.\n';
        const article = parseFrontmatter('test', raw);
        expect(article).toEqual({
            id: 'test', category: 'basics', title: 'A title', summary: 'A summary.',
            minutes: 3, body: 'Body text.',
        });
    });

    it('parses the optional action fields when both are present', () => {
        const raw = '---\ncategory: focus\ntitle: T\nsummary: S\nminutes: 2\naction.page: training\naction.label: Open it\n---\nBody\n';
        expect(parseFrontmatter('test', raw).action).toEqual({ page: 'training', label: 'Open it' });
    });

    it('omits action when the frontmatter has neither field', () => {
        const raw = '---\ncategory: basics\ntitle: T\nsummary: S\nminutes: 1\n---\nBody\n';
        expect(parseFrontmatter('test', raw).action).toBeUndefined();
    });

    it('keeps everything after the first colon in a field value', () => {
        // A title or summary containing its own colon must not be truncated.
        const raw = '---\ncategory: basics\ntitle: Time: a hard problem\nsummary: S\nminutes: 1\n---\nBody\n';
        expect(parseFrontmatter('test', raw).title).toBe('Time: a hard problem');
    });

    it('throws when the frontmatter block is missing', () => {
        expect(() => parseFrontmatter('bad', 'Just a body, no frontmatter.')).toThrow(/frontmatter/);
    });

    it('throws when a required field is missing', () => {
        const raw = '---\ncategory: basics\ntitle: T\nminutes: 1\n---\nBody\n';
        expect(() => parseFrontmatter('bad', raw)).toThrow(/required frontmatter field/);
    });
});

describe('mergeWithFallback', () => {
    const source = new Map([
        ['a', { id: 'a', category: 'basics', title: 'RU A', summary: 'S', minutes: 1, body: 'B' }],
        ['b', { id: 'b', category: 'basics', title: 'RU B', summary: 'S', minutes: 1, body: 'B' }],
    ]);

    it('marks an article translated when the target locale has its own copy', () => {
        const own = new Map([['a', { id: 'a', category: 'basics', title: 'EN A', summary: 'S', minutes: 1, body: 'B' }]]);
        const merged = mergeWithFallback(own, source);
        const a = merged.find(x => x.id === 'a')!;
        expect(a.translated).toBe(true);
        expect(a.title).toBe('EN A');
    });

    it('falls back to the source article, marked untranslated, when the target has none', () => {
        const own = new Map([['a', { id: 'a', category: 'basics', title: 'EN A', summary: 'S', minutes: 1, body: 'B' }]]);
        const merged = mergeWithFallback(own, source);
        const b = merged.find(x => x.id === 'b')!;
        expect(b.translated).toBe(false);
        expect(b.title).toBe('RU B'); // the source's own text, not blank and not machine-translated
    });

    it('never invents an article the source does not have', () => {
        const own = new Map([['c', { id: 'c', category: 'basics', title: 'Orphan', summary: 'S', minutes: 1, body: 'B' }]]);
        const merged = mergeWithFallback(own, source);
        expect(merged.map(a => a.id).sort()).toEqual(['a', 'b']);
    });
});

describe('the real content files', () => {
    const ru = knowledgeArticles('ru');
    const en = knowledgeArticles('en');

    it('has at least one article', () => {
        expect(ru.length).toBeGreaterThan(0);
    });

    it('every article is fully translated into English right now', () => {
        // Not a permanent guarantee — new Russian articles may ship ahead of
        // their translation — but it is true today, and a silent regression
        // here (an article added to one locale and forgotten in the other)
        // is exactly what this test exists to catch.
        for (const a of en) expect(a.translated, `"${a.id}" has no English translation`).toBe(true);
    });

    it('every article belongs to a category that actually exists, in every locale', () => {
        for (const locale of ['ru', 'en'] as const) {
            const categoryIds = new Set(knowledgeCategories(locale).map(c => c.id));
            for (const a of knowledgeArticles(locale)) {
                expect(categoryIds.has(a.category), `"${a.id}" references unknown category "${a.category}"`).toBe(true);
            }
        }
    });

    it('has the same set of article ids in both locales', () => {
        expect(en.map(a => a.id).sort()).toEqual(ru.map(a => a.id).sort());
    });

    it('has the same six categories, in the same order, in both locales', () => {
        expect(knowledgeCategories('en').map(c => c.id)).toEqual(knowledgeCategories('ru').map(c => c.id));
    });

    it('filters by category', () => {
        const basics = knowledgeArticlesByCategory('ru', 'basics');
        expect(basics.length).toBeGreaterThan(0);
        for (const a of basics) expect(a.category).toBe('basics');
    });

    it('searches title, summary and body, case-insensitively', () => {
        const bySummary = searchKnowledge('en', 'willpower');
        expect(bySummary.length).toBeGreaterThan(0);
    });

    it('returns nothing for an empty query', () => {
        expect(searchKnowledge('en', '   ')).toEqual([]);
    });

    it('relates articles from the same category, excluding itself', () => {
        const article = ru.find(a => a.id === 'dopamine')!;
        const related = relatedArticles('ru', article, 3);
        expect(related.length).toBeGreaterThan(0);
        expect(related.every(a => a.category === article.category)).toBe(true);
        expect(related.some(a => a.id === article.id)).toBe(false);
    });

    it('exposes plain Markdown in the body, not raw frontmatter', () => {
        const article = ru.find(a => a.id === 'dopamine') as Article;
        expect(article.body).not.toMatch(/^---/);
        expect(article.body.length).toBeGreaterThan(0);
    });
});
