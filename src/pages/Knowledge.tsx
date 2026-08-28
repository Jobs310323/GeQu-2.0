import { useState, useMemo } from 'react';
import { marked } from 'marked';
import { CATEGORIES, ARTICLES, ARTICLES_BY_CATEGORY, searchArticles, relatedTo, type Article } from '../lib/knowledge';
import { DB } from '../lib/db';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { useNavigate } from 'react-router';
import { findTab } from '../lib/nav';

/** Former «Про СДВГ» page — kept as a fixed entry point at the top of the list. */
const INTRO_IDS = ['adhd-what', 'adhd-symptoms', 'adhd-impact', 'adhd-not-a-sentence'];

function loadSet(key: string): string[] {
    const v = DB.get(key, []);
    return Array.isArray(v) ? v : [];
}

export function Knowledge() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [open, setOpen] = useState<Article | null>(null);
    const [saved, setSaved] = useState<string[]>(() => loadSet('kbSaved'));
    const [read, setRead] = useState<string[]>(() => loadSet('kbRead'));

    const persist = (key: string, next: string[], set: (v: string[]) => void) => {
        set(next);
        DB.save(key, next);
    };

    const toggleSaved = (id: string) =>
        persist('kbSaved', saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id], setSaved);

    const openArticle = (a: Article) => {
        setOpen(a);
        if (!read.includes(a.id)) persist('kbRead', [...read, a.id], setRead);
    };

    const results = useMemo(() => searchArticles(query), [query]);

    // ---------- reading view ----------
    if (open) {
        const cat = CATEGORIES.find(c => c.id === open.category);
        const related = relatedTo(open);
        return (
            <div className="max-w-3xl">
                <button onClick={() => setOpen(null)}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 mb-4 transition">
                    <Icon name="chevronLeft" size={14} /> Назад к базе знаний
                </button>

                <div className="glass-card p-8 rounded-2xl">
                    <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/30">
                            {cat?.icon} {cat?.title}
                        </span>
                        <span className="text-gray-500">{open.minutes} мин чтения</span>
                        <button onClick={() => toggleSaved(open.id)}
                            className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border transition ${
                                saved.includes(open.id)
                                    ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/40'
                                    : 'border-[var(--border)] text-gray-500 hover:text-white'
                            }`}>
                            <Icon name="star" size={13} className={saved.includes(open.id) ? 'fill-current' : ''} />
                            {saved.includes(open.id) ? 'В закладках' : 'В закладки'}
                        </button>
                    </div>

                    <h1 className="text-3xl font-bold mb-4">{open.title}</h1>
                    <div className="text-gray-200 markdown-content leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: marked.parse(open.body) as string }} />

                    {open.action && (
                        <button onClick={() => navigate(findTab(open.action!.page)?.path ?? '/')}
                            className="mt-6 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">
                            {open.action.label} →
                        </button>
                    )}
                </div>

                {related.length > 0 && (
                    <div className="mt-6">
                        <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Читать дальше</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {related.map(a => (
                                <button key={a.id} onClick={() => openArticle(a)}
                                    className="glass-card p-4 rounded-xl text-left hover:border-cyan-400/40 border border-transparent transition">
                                    <div className="font-bold text-sm mb-1">{a.title}</div>
                                    <div className="text-xs text-gray-500">{a.summary}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ---------- list view ----------
    const listed = category ? ARTICLES_BY_CATEGORY(category) : null;
    const savedArticles = ARTICLES.filter(a => saved.includes(a.id));
    const intro = ARTICLES.filter(a => INTRO_IDS.includes(a.id));

    const Card = ({ a }: { a: Article }) => (
        <button onClick={() => openArticle(a)}
            className="glass-card p-5 rounded-2xl text-left border border-transparent hover:border-cyan-400/40 transition flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold flex-1">{a.title}</h3>
                {saved.includes(a.id) && <Icon name="star" size={14} className="text-yellow-400 fill-current shrink-0 mt-0.5" />}
            </div>
            <p className="text-sm text-gray-400 flex-1 mb-3">{a.summary}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{a.minutes} мин</span>
                {read.includes(a.id) && <span className="text-green-400">✓ прочитано</span>}
            </div>
        </button>
    );

    return (
        <div className="max-w-5xl">
            <PageHeader page="knowledge" title="База знаний"
                subtitle={`${ARTICLES.length} статей о том, как устроен СДВГ и что с этим делать. Каждая — на несколько минут.`} />

            <div className="relative mb-6">
                <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Поиск по всем статьям…"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-11 pr-4 py-3 outline-none focus:border-cyan-400 text-white"
                />
            </div>

            {query.trim() ? (
                <>
                    <div className="text-sm text-gray-400 mb-3">
                        {results.length === 0 ? 'Ничего не найдено' : `Найдено: ${results.length}`}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.map(a => <Card key={a.id} a={a} />)}
                    </div>
                </>
            ) : category ? (
                <>
                    <button onClick={() => setCategory(null)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 mb-4 transition">
                        <Icon name="chevronLeft" size={14} /> Все разделы
                    </button>
                    <h2 className="text-2xl font-bold mb-4">
                        {CATEGORIES.find(c => c.id === category)?.icon} {CATEGORIES.find(c => c.id === category)?.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listed!.map(a => <Card key={a.id} a={a} />)}
                    </div>
                </>
            ) : (
                <>
                    {intro.length > 0 && (
                        <div className="glass-card p-5 rounded-2xl mb-8">
                            <div className="flex items-start gap-3 mb-3">
                                <Icon name="info" size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                                <div>
                                    <h2 className="font-bold mb-1">Про СДВГ — с чего начать</h2>
                                    <p className="text-sm text-gray-400">
                                        Что это такое, как проявляется и на что влияет. Если раньше не читал — начни отсюда.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {intro.map(a => (
                                    <button key={a.id} onClick={() => openArticle(a)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                                            read.includes(a.id)
                                                ? 'border-[var(--border)] text-gray-500 hover:text-white'
                                                : 'border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10'
                                        }`}>
                                        {read.includes(a.id) && <Icon name="check" size={12} />}
                                        {a.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {savedArticles.length > 0 && (
                        <div className="mb-8">
                            <h2 className="flex items-center gap-1.5 text-sm uppercase tracking-wider text-gray-500 mb-3">
                                <Icon name="star" size={12} className="text-yellow-400 fill-current" /> Закладки
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedArticles.map(a => <Card key={a.id} a={a} />)}
                            </div>
                        </div>
                    )}

                    <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Разделы</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CATEGORIES.map(c => {
                            const items = ARTICLES_BY_CATEGORY(c.id);
                            const doneCount = items.filter(a => read.includes(a.id)).length;
                            return (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                    className="glass-card p-5 rounded-2xl text-left border border-transparent hover:border-cyan-400/40 transition">
                                    <div className="text-3xl mb-2">{c.icon}</div>
                                    <h3 className="font-bold mb-1">{c.title}</h3>
                                    <p className="text-sm text-gray-400 mb-3">{c.blurb}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 rounded-full bg-black/30 overflow-hidden">
                                            <div className="h-full bg-cyan-400/70 transition-all"
                                                style={{ width: `${(doneCount / items.length) * 100}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500 tabular-nums">{doneCount}/{items.length}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
