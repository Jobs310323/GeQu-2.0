import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/format';
import { NBackTest, SchulteTable, CorsiTest, ArithmeticTest, SwitchingTest, BreathingExercise, StroopTest, ReactionTest, TrailMakingTest, DigitSpanTest, GoNoGoTest, PomodoroTimer } from '../features/cognitive/exercises';
import { PageHeader } from '../components/PageHeader';
import { LOWER_IS_BETTER } from '../lib/profile';
import { assessments, drills } from '../features/cognitive/registry';
import { AttemptContext } from '../features/cognitive/AttemptContext';
import type { TrainingProps } from '../types/props';
import type { TestResult } from '../types/domain';

const TAB_TO_TYPE: Record<string, string> = {
    schulte: 'schulte', stroop: 'stroop', reaction: 'reaction', trail: 'tmt',
    digitspan: 'digitspan', gonogo: 'gonogo', nback: 'nback', corsi: 'corsi',
    arithmetic: 'arithmetic', switching: 'switching',
};

/** Last few attempts and the personal best for the exercise currently on screen. */
function RecentResults({ testResults, type }: { testResults: TestResult[]; type: string | undefined }) {
    // Above the early return, not below it: a hook after a conditional return
    // changes the hook count between renders. That exact bug was in `GymHome`
    // and made creating your first programme throw.
    const { t } = useTranslation('brain');
    if (!type) return null;
    const list = (testResults ?? [])
        .filter((r) => r.type === type)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (list.length === 0) return null;

    const lowerIsBetter = LOWER_IS_BETTER.has(type);
    const best = list.reduce<TestResult | null>((b, r) =>
        !b || (lowerIsBetter ? Number(r.value) < Number(b.value) : Number(r.value) > Number(b.value)) ? r : b, null);
    const fmtDate = (d: string) => formatDate(d, 'dayMonth');

    return (
        <div className="glass-card p-4 rounded-2xl mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-sm font-medium text-[var(--text-muted)]">{t('brain:training.recentAttempts')}</span>
                {best && (
                    <span className="text-xs text-cyan-400">
                        {t('brain:training.best')}<b className="tabular-nums">{best.value}</b> · {fmtDate(best.date)}
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {list.slice(0, 5).map((r) => (
                    <span key={r.id} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-gray-300 tabular-nums">
                        {r.value} <span className="text-gray-500">· {fmtDate(r.date)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export function Training({ setTestResults, testResults, achievements, setAchievements, pomodoro, setPomodoro }: TrainingProps) {
    const { t } = useTranslation('brain');
    const [tab, setTab] = useState('schulte');

    /* Measure / Practise / Regulate.
     *
     * The page used to be one flat strip of twelve tabs, which said that a
     * standardised-ish reaction measurement and a breathing exercise were the
     * same kind of thing. They are not, and the difference changes how a result
     * should be read: an assessment feeds the profile and deserves its caveats,
     * a drill is practice, and regulation produces no score at all.
     *
     * The first two groups come from the engine registry, so adding an exercise
     * there puts it on the page automatically. */
    // `trail` is the tab id for the `tmt` engine, kept because it is what the
    // route and the stored results already use.
    const TAB_LABEL: Record<string, string> = { trail: t('brain:training.tab.trail') };
    const groups: { title: string; hint: string; items: { id: string; label: string }[] }[] = [
        {
            title: t('brain:training.group.assess.title'),
            hint: t('brain:training.group.assess.hint'),
            items: assessments().map(e => ({ id: e.id === 'tmt' ? 'trail' : e.id, label: t(e.labelKey) })),
        },
        {
            title: t('brain:training.group.train.title'),
            hint: t('brain:training.group.train.hint'),
            items: drills().map(e => ({ id: e.id, label: t(e.labelKey) })),
        },
        {
            title: t('brain:training.group.regulate.title'),
            hint: t('brain:training.group.regulate.hint'),
            items: [
                { id: 'breathing', label: t('brain:training.breathing') },
                { id: 'pomodoro', label: 'Pomodoro' },
            ],
        },
    ];

    return (
        <div>
            <PageHeader page="training" title={t('brain:training.title')} subtitle={t('brain:training.subtitle')} />

            <div className="space-y-3 mb-6">
                {groups.map(group => (
                    <div key={group.title}>
                        <div className="flex items-baseline gap-2 mb-1.5 px-1">
                            <h2 className="t-label">{group.title}</h2>
                            <span className="t-caption">{group.hint}</span>
                        </div>
                        <div className="glass-card rounded-2xl p-1.5 flex gap-1 flex-wrap">
                            {group.items.map(item => (
                                <button key={item.id} type="button" onClick={() => setTab(item.id)}
                                    aria-pressed={tab === item.id}
                                    className={`px-3.5 py-1.5 rounded-xl text-sm transition ${tab === item.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--gq-text-tertiary)] hover:bg-white/5 hover:text-[var(--gq-text-primary)]'}`}>
                                    {TAB_LABEL[item.id] ?? item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <AttemptContext testResults={testResults} type={TAB_TO_TYPE[tab]} />
            <RecentResults testResults={testResults} type={TAB_TO_TYPE[tab]} />
            {tab === 'schulte' && <SchulteTable setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
            {tab === 'stroop' && <StroopTest setTestResults={setTestResults} />}
            {tab === 'reaction' && <ReactionTest setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
            {tab === 'trail' && <TrailMakingTest setTestResults={setTestResults} />}
            {tab === 'digitspan' && <DigitSpanTest setTestResults={setTestResults} />}
            {tab === 'gonogo' && <GoNoGoTest setTestResults={setTestResults} />}
            {tab === 'nback' && <NBackTest setTestResults={setTestResults} />}
            {tab === 'corsi' && <CorsiTest setTestResults={setTestResults} />}
            {tab === 'arithmetic' && <ArithmeticTest setTestResults={setTestResults} />}
            {tab === 'switching' && <SwitchingTest setTestResults={setTestResults} />}
            {tab === 'breathing' && <BreathingExercise />}
            {tab === 'pomodoro' && <PomodoroTimer pomodoro={pomodoro} setPomodoro={setPomodoro} />}
        </div>
    );
}
