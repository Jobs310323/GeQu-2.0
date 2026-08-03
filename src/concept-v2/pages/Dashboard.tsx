import { MOCK } from '../lib/mockData';
import { BentoCard } from '../components/BentoCard';
import { RadialGauge } from '../components/RadialGauge';
import { TagPill } from '../components/TagPill';
import { Icon } from '../components/Icons';

export function Dashboard() {
    const xpPct = Math.round((MOCK.xp / MOCK.xpToNext) * 100);

    return (
        <div className="h-full overflow-y-auto">
            <div className="mb-5">
                <h1 className="text-xl font-semibold text-white">Дашборд</h1>
                <p className="text-sm text-slate-500">Сегодня, коротко и по делу.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BentoCard title="Уровень">
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-white">{MOCK.level}</span>
                        <span className="text-xs text-slate-500">{MOCK.xp} / {MOCK.xpToNext} XP</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${xpPct}%` }} />
                    </div>
                </BentoCard>

                <BentoCard title="Энергия" className="items-center">
                    <RadialGauge value={MOCK.energy} label="из 10" color="#22d3ee" />
                </BentoCard>

                <BentoCard title="Задачи">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-2xl font-bold text-white">{MOCK.tasksDone}</div>
                            <div className="text-xs text-slate-500">закрыто</div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <div className="text-2xl font-bold text-slate-300">{MOCK.tasksQueued}</div>
                            <div className="text-xs text-slate-500">в очереди</div>
                        </div>
                    </div>
                </BentoCard>

                <BentoCard title="Сон · Фокус · Настроение" span="col-span-1 md:col-span-2">
                    <div className="flex justify-around">
                        <RadialGauge value={MOCK.sleep} label="Сон" color="#a78bfa" />
                        <RadialGauge value={MOCK.focus} label="Фокус" color="#22d3ee" />
                        <RadialGauge value={MOCK.mood} label="Настроение" color="#fbbf24" />
                    </div>
                </BentoCard>

                <BentoCard title="Тренировки">
                    <div className="flex items-center gap-2 text-white">
                        <Icon name="dumbbell" size={20} className="text-slate-500" />
                        <span className="text-2xl font-bold">{MOCK.workouts}</span>
                    </div>
                    <div className="text-xs text-slate-500">{MOCK.workoutsVolume.toLocaleString('ru-RU')} кг тоннаж</div>
                </BentoCard>

                <BentoCard title="Тестов пройдено">
                    <div className="flex items-center gap-2 text-white">
                        <Icon name="clipboard" size={20} className="text-slate-500" />
                        <span className="text-2xl font-bold">{MOCK.testsCount}</span>
                    </div>
                </BentoCard>

                <BentoCard title="КПТ · чаще всего помогало" span="col-span-1 md:col-span-3">
                    <div className="flex flex-wrap gap-2">
                        {MOCK.helped.map(t => <TagPill key={t.label} label={t.label} count={t.count} tone="good" />)}
                    </div>
                    <div className="h-px bg-white/5 my-1" />
                    <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Чаще всего мешало</h4>
                    <div className="flex flex-wrap gap-2">
                        {MOCK.hindered.map(t => <TagPill key={t.label} label={t.label} count={t.count} tone="bad" />)}
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
