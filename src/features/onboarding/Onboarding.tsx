import { useState } from 'react';
import { Icon } from '../../components/Icons';
import { Logo } from '../../components/Logo';
import { useAppUi } from '../../stores/app-ui.store';
import { SECTIONS } from '../../lib/nav';
import { DB } from '../../lib/db';

// Two questions, then the app. Not a tour.
//
// A product tour teaches the interface; these questions shape it. What comes
// back is used immediately — screens the user did not ask for start hidden, so
// the first session is the small version of GeQu rather than all of it. Nothing
// is deleted: everything stays reachable from the palette and from Settings.

export const ONBOARDING_KEY = 'onboarding';

type Focus = 'focus' | 'productivity' | 'adhd' | 'health' | 'self' | 'all';
type Depth = 'minimal' | 'balanced' | 'detailed';

export type OnboardingAnswers = { focus: Focus; depth: Depth; completedAt: string };

const FOCUS_OPTIONS: { id: Focus; label: string; hint: string; icon: string }[] = [
    { id: 'focus', label: 'Фокус', hint: 'Меньше отвлекаться, дольше держаться задачи', icon: 'target' },
    { id: 'productivity', label: 'Продуктивность', hint: 'Задачи, цели, планирование дня', icon: 'columns' },
    { id: 'adhd', label: 'СДВГ', hint: 'Структура, напоминания, опросники', icon: 'flask' },
    { id: 'health', label: 'Здоровье', hint: 'Сон, тело, тренировки, настроение', icon: 'heart' },
    { id: 'self', label: 'Понять себя', hint: 'Дневник, закономерности, выводы', icon: 'book' },
    { id: 'all', label: 'Всё сразу', hint: 'Показать полный набор', icon: 'grid' },
];

const DEPTH_OPTIONS: { id: Depth; label: string; hint: string }[] = [
    { id: 'minimal', label: 'Минимум', hint: 'Только самое нужное, ничего лишнего' },
    { id: 'balanced', label: 'Средне', hint: 'Основные разделы, остальное — по желанию' },
    { id: 'detailed', label: 'Подробно', hint: 'Все инструменты сразу' },
];

/**
 * Screens each focus keeps beyond the always-on core. Everything not listed
 * starts hidden at the "minimal" depth and is one click away in Settings.
 */
const KEEP: Record<Focus, string[]> = {
    focus: ['kanban', 'habits', 'training'],
    productivity: ['kanban', 'goals', 'calendar', 'mindmap'],
    adhd: ['kanban', 'habits', 'clinical', 'training', 'knowledge'],
    health: ['habits', 'gym', 'snowman', 'progress'],
    self: ['diary', 'habits', 'progress', 'circles'],
    all: [],
};

/** Never hidden — the loop does not work without them. */
const CORE = ['checkin', 'aiplan', 'kanban', 'habits', 'progress', 'card', 'settings'];

/** Kept at "balanced" on top of the focus choice: the everyday capture surfaces. */
const BALANCED_EXTRAS = ['diary', 'calendar', 'goals'];

export function Onboarding({ onDone }: { onDone: () => void }) {
    const [step, setStep] = useState(0);
    const [focus, setFocus] = useState<Focus | null>(null);
    const setPrefs = useAppUi(s => s.setPrefs);

    const finish = (depth: Depth) => {
        const chosen = focus ?? 'all';
        const keep = new Set([...CORE, ...KEEP[chosen]]);
        const everything = SECTIONS.flatMap(s => s.items.map(i => i.id));

        // "Detailed" and "everything" hide nothing; the other depths trim to
        // what the user said they came for.
        const hiddenTabs =
            depth === 'detailed' || chosen === 'all'
                ? []
                : depth === 'balanced'
                    ? everything.filter(id => !keep.has(id) && !BALANCED_EXTRAS.includes(id))
                    : everything.filter(id => !keep.has(id));

        setPrefs(prev => ({ ...prev, hiddenTabs }));
        const answers: OnboardingAnswers = { focus: chosen, depth, completedAt: new Date().toISOString() };
        DB.save(ONBOARDING_KEY, answers);
        onDone();
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
            <div className="w-full max-w-lg">
                <div className="flex justify-center mb-8"><Logo /></div>

                {step === 0 ? (
                    <section aria-labelledby="ob-1">
                        <h1 id="ob-1" className="text-xl font-semibold mb-1.5 text-center">
                            С чем GeQu должен помочь?
                        </h1>
                        <p className="text-sm text-[var(--text-muted)] text-center mb-6">
                            Ответ можно поменять в любой момент — ничего не удаляется.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {FOCUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setFocus(opt.id); setStep(1); }}
                                    className="glass-card rounded-2xl p-4 text-left flex gap-3 transition hover:bg-white/5 border border-transparent hover:border-cyan-400/25"
                                >
                                    <Icon name={opt.icon} size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                                    <span className="min-w-0">
                                        <span className="block font-medium text-sm">{opt.label}</span>
                                        <span className="block text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
                                            {opt.hint}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section aria-labelledby="ob-2">
                        <h1 id="ob-2" className="text-xl font-semibold mb-1.5 text-center">
                            Сколько хочешь отслеживать?
                        </h1>
                        <p className="text-sm text-[var(--text-muted)] text-center mb-6">
                            Лишние разделы просто скроются из меню.
                        </p>

                        <div className="space-y-2.5">
                            {DEPTH_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => finish(opt.id)}
                                    className="glass-card rounded-2xl p-4 w-full text-left flex items-center gap-3 hover:bg-white/5 transition"
                                >
                                    <span className="flex-1">
                                        <span className="block font-medium text-sm">{opt.label}</span>
                                        <span className="block text-xs text-[var(--text-muted)] mt-0.5">{opt.hint}</span>
                                    </span>
                                    <Icon name="chevronRight" size={16} className="text-[var(--text-muted)] shrink-0" />
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(0)}
                            className="mt-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition mx-auto block"
                        >
                            ← Назад
                        </button>
                    </section>
                )}

                <button
                    onClick={() => finish('detailed')}
                    className="mt-6 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition mx-auto block"
                >
                    Пропустить и показать всё
                </button>
            </div>
        </div>
    );
}

/** True once the questions have been answered — or skipped. */
export function hasOnboarded(): boolean {
    return DB.get<OnboardingAnswers | null>(ONBOARDING_KEY, null) !== null;
}
