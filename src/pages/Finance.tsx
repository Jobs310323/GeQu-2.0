import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'chart.js/auto';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { todayKey, toLocalDateKey, daysBetween, isToday, nowInstant } from '../lib/datetime';
import { DEFAULT_FINANCE, DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, categoryLabel, type Category, type FinanceEntry, type Debt, type Subscription, type FinanceData } from '../features/finance/types';
import { formatCurrency, formatDate } from '../lib/format';
import type { FinanceProps } from '../types/props';
import type { NonEmptyArray } from '../lib/nonEmpty';

// The data model lives in features/finance/types so the app's initial state can
// import the defaults without dragging this page (and Chart.js) into the entry
// bundle. Re-exported here because call sites already reach for it by this path.
export type { Category, FinanceEntry, Debt, Subscription, FinanceData } from '../features/finance/types';
export { DEFAULT_FINANCE };

const PALETTE: NonEmptyArray<string> = ['#0284C7', '#EA580C', '#7C3AED', '#DB2777', '#16A34A', '#CA8A04', '#64748B', '#0EA5E9', '#F43F5E'];

// Periods are counted in the user's calendar days, not in elapsed hours: "this
// week" means the last seven days including today, so an entry made yesterday
// evening still counts as yesterday rather than dropping out 168 hours later.
function inPeriod(dateStr: string, period: 'day' | 'week' | 'month') {
    if (period === 'day') return isToday(dateStr);
    if (period === 'week') {
        const age = daysBetween(toLocalDateKey(dateStr), todayKey());
        return age >= 0 && age < 7;
    }
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function daysUntil(dateStr: string) {
    return daysBetween(todayKey(), toLocalDateKey(dateStr));
}

function useLightTick() {
    const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
    useEffect(() => {
        const obs = new MutationObserver(() => setIsLight(document.documentElement.classList.contains('light')));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return isLight;
}

function CategoryPie({ entries, categories }: { entries: FinanceEntry[]; categories: Category[] }) {
    const { t } = useTranslation(['track']);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const isLight = useLightTick();

    const byCat = categories
        .map(c => ({ cat: c, total: entries.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
        .filter(x => x.total > 0);
    const key = byCat.map(x => `${x.cat.id}:${x.total}`).join(',');

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        chartRef.current?.destroy();
        chartRef.current = null;
        if (byCat.length === 0) return;

        const ink = isLight ? '#4A4A55' : '#8892B0';
        chartRef.current = new Chart(el, {
            type: 'doughnut',
            data: {
                labels: byCat.map(x => `${x.cat.icon} ${categoryLabel(x.cat, t)}`),
                datasets: [{ data: byCat.map(x => x.total), backgroundColor: byCat.map(x => x.cat.color), borderWidth: 0 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { color: ink, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 12 } } },
            },
        });

        return () => { chartRef.current?.destroy(); chartRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, isLight]);

    if (byCat.length === 0) return <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">{t('track:finance.noDataForPeriod')}</div>;
    return <canvas ref={canvasRef} />;
}

function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
    const { t } = useTranslation(['track']);
    const [value, setValue] = useState('');
    const [error, setError] = useState(false);
    const submit = () => { if (value === pin) { onUnlock(); } else { setError(true); setValue(''); } };
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center">
            <div className="glass-card rounded-2xl p-10 flex flex-col items-center gap-4 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
                    <Icon name="lock" size={26} />
                </div>
                <h1 className="text-2xl font-bold">{t('track:finance.lock.heading')}</h1>
                <p className="text-[var(--text-muted)] text-sm">{t('track:finance.lock.prompt')}</p>
                <div className="flex gap-2">
                    <input autoFocus type="password" value={value} onChange={e => { setValue(e.target.value); setError(false); }}
                        onKeyDown={e => e.key === 'Enter' && submit()} placeholder={t('track:finance.lock.placeholder')}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-cyan-400 text-center" />
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">{t('track:finance.lock.submit')}</button>
                </div>
                {error && <p className="text-red-400 text-sm">{t('track:finance.lock.wrong')}</p>}
            </div>
        </div>
    );
}

function FinanceSettings({ data, setPin, setInitialBalance, onClose }: {
    data: FinanceData; setPin: (p: string | null) => void; setInitialBalance: (v: number) => void; onClose: () => void;
}) {
    const { t } = useTranslation(['track']);
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [err, setErr] = useState('');
    const [balance, setBalance] = useState(String(data.initialBalance ?? 0));

    const applyPin = () => {
        if (data.pin && oldPin !== data.pin) { setErr(t('track:finance.settings.wrongCurrent')); return; }
        if (newPin && newPin !== confirmPin) { setErr(t('track:finance.settings.mismatch')); return; }
        setPin(newPin.trim() || null);
        setOldPin(''); setNewPin(''); setConfirmPin(''); setErr('');
    };

    return (
        <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="font-bold mb-4">{t('track:finance.settings.heading')}</h2>
            <div className="mb-4">
                <label htmlFor="initial-balance" className="text-sm text-[var(--text-muted)] block mb-1">{t('track:finance.settings.initialBalance')}</label>
                <div className="flex gap-2">
                    <input id="initial-balance" type="number" value={balance} onChange={e => setBalance(e.target.value)}
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <button onClick={() => setInitialBalance(parseFloat(balance) || 0)} className="bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg">{t('track:finance.settings.save')}</button>
                </div>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
                <label className="text-sm text-[var(--text-muted)] block mb-2">{data.pin ? t('track:finance.settings.changePin') : t('track:finance.settings.setPin')}</label>
                {data.pin && <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} placeholder={t('track:finance.settings.currentPin')}
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />}
                <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder={t('track:finance.settings.newPin')}
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder={t('track:finance.settings.repeatPin')}
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
                <div className="flex gap-2">
                    <button onClick={applyPin} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">{t('track:finance.settings.apply')}</button>
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-white/5">{t('track:finance.settings.close')}</button>
                </div>
            </div>
        </div>
    );
}

function CategoryForm({ initial, initialLabel, onSave, onClose }: {
    initial?: Category | undefined;
    /** What the label reads as on screen, which for a built-in is a translation. */
    initialLabel?: string | undefined;
    onSave: (c: { icon: string; label: string; color: string }) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation(['track']);
    const [icon, setIcon] = useState(initial?.icon ?? '🔖');
    const [label, setLabel] = useState(initialLabel ?? initial?.label ?? '');
    const [color, setColor] = useState(initial?.color ?? PALETTE[0]);

    return (
        <div className="mt-4 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
            <div className="flex gap-2 mb-3">
                <input value={icon} onChange={e => setIcon(e.target.value.slice(0, 2))} placeholder="🔖"
                    className="w-14 text-center text-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-2 outline-none" />
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('track:finance.category.namePlaceholder')}
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
            </div>
            {/* Swatches carry no text, so colour alone would be their only
                label — unusable to a screen reader and to anyone who cannot
                distinguish these hues. Name each one and expose selection. */}
            <fieldset className="mb-3">
                <legend className="sr-only">{t('track:finance.category.colourLegend')}</legend>
                <div className="flex gap-2">
                    {PALETTE.map((c, i) => (
                        <button key={c} type="button" onClick={() => setColor(c)}
                            aria-pressed={color === c}
                            aria-label={t('track:finance.category.colourOption', { n: i + 1 })}
                            className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`}
                            style={{ backgroundColor: c }} />
                    ))}
                </div>
            </fieldset>
            <div className="flex gap-2">
                <button onClick={() => { if (!label.trim()) return; onSave({ icon: icon || '🔖', label: label.trim(), color }); }}
                    className="bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg">{initial ? t('track:finance.category.save') : t('track:finance.category.add')}</button>
                <button onClick={onClose} className="px-5 py-2 rounded-lg bg-white/5">{t('track:finance.category.cancel')}</button>
            </div>
        </div>
    );
}

function DebtRow({ debt, onPaid, onDelete, onEdit }: {
    debt: Debt; onPaid?: () => void; onDelete: () => void; onEdit: (patch: Partial<Debt>) => void;
}) {
    const { t } = useTranslation(['track']);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(debt.title);
    const [amount, setAmount] = useState(String(debt.amount));
    const [direction, setDirection] = useState(debt.direction);

    const save = () => { onEdit({ title: title.trim() || debt.title, amount: parseFloat(amount) || debt.amount, direction }); setEditing(false); };

    if (editing) {
        return (
            <div className="flex flex-wrap gap-2 items-center bg-[var(--bg-input)] p-3 rounded-lg">
                <input value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[140px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-28 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <select value={direction} onChange={e => setDirection(e.target.value as Debt['direction'])} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-1.5 outline-none">
                    <option value="i_owe">{t('track:finance.debt.iOwe')}</option>
                    <option value="owed_to_me">{t('track:finance.debt.owedToMe')}</option>
                </select>
                <button onClick={save} className="text-cyan-400 text-sm font-bold">{t('track:finance.form.save')}</button>
                <button onClick={() => setEditing(false)} className="text-[var(--text-muted)] text-sm">{t('track:finance.form.cancel')}</button>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg ${debt.status === 'paid' ? 'opacity-60' : ''}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                debt.direction === 'i_owe' ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'
            }`}>
                <Icon name={debt.direction === 'i_owe' ? 'trendDown' : 'trendUp'} size={16} />
            </span>
            <div className="flex-1">
                <div className="text-sm">{debt.title}</div>
                <div className="text-xs text-[var(--text-muted)]">
                    {debt.direction === 'i_owe' ? t('track:finance.debt.iOwe') : t('track:finance.debt.owedToMe')}
                    {debt.paidAt ? t('track:finance.debt.settledOn', { date: formatDate(debt.paidAt) }) : ''}
                </div>
            </div>
            <span className={`font-bold ${debt.direction === 'i_owe' ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(debt.amount)}</span>
            {debt.status === 'active' && onPaid && <button onClick={onPaid} className="text-green-400 text-xs border border-green-400/40 px-2 py-1 rounded whitespace-nowrap">{t('track:finance.debt.markPaid')}</button>}
            {debt.status === 'active' && <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-cyan-400 text-sm">✎</button>}
            <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
        </div>
    );
}

function DebtsPanel({ debts, addDebt, markPaid, deleteDebt, updateDebt }: {
    debts: Debt[]; addDebt: (title: string, amount: number, direction: Debt['direction']) => void;
    markPaid: (id: number) => void; deleteDebt: (id: number) => void; updateDebt: (id: number, patch: Partial<Debt>) => void;
}) {
    const { t } = useTranslation(['track']);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [direction, setDirection] = useState<Debt['direction']>('i_owe');

    const active = debts.filter(d => d.status === 'active');
    const paid = debts.filter(d => d.status === 'paid');
    const totalIOwe = active.filter(d => d.direction === 'i_owe').reduce((s, d) => s + d.amount, 0);
    const totalOwedToMe = active.filter(d => d.direction === 'owed_to_me').reduce((s, d) => s + d.amount, 0);

    const submit = () => {
        const val = parseFloat(amount);
        if (!title.trim() || !val || val <= 0) return;
        addDebt(title, val, direction);
        setTitle(''); setAmount('');
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl flex flex-wrap gap-6 justify-around text-center">
                <div><div className="text-xs text-[var(--text-muted)]">{t('track:finance.debt.iOwe')}</div><div className="text-2xl font-bold text-red-400">{formatCurrency(totalIOwe)}</div></div>
                <div><div className="text-xs text-[var(--text-muted)]">{t('track:finance.debt.owedToMe')}</div><div className="text-2xl font-bold text-green-400">{formatCurrency(totalOwedToMe)}</div></div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">{t('track:finance.debt.newHeading')}</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder={t('track:finance.debt.who')} className="flex-1 min-w-[180px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder={t('track:finance.form.amount')} className="w-32 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <select value={direction} onChange={e => setDirection(e.target.value as Debt['direction'])}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none">
                        <option value="i_owe">{t('track:finance.debt.iOwe')}</option>
                        <option value="owed_to_me">{t('track:finance.debt.owedToMe')}</option>
                    </select>
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">{t('track:finance.form.add')}</button>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">{t('track:finance.debt.activeHeading')}</h2>
                <div className="space-y-2">
                    {active.map(d => <DebtRow key={d.id} debt={d} onPaid={() => markPaid(d.id)} onDelete={() => deleteDebt(d.id)} onEdit={patch => updateDebt(d.id, patch)} />)}
                    {active.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">{t('track:finance.debt.activeEmpty')}</div>}
                </div>
            </div>

            {paid.length > 0 && (
                <div className="glass-card p-6 rounded-2xl">
                    <h2 className="font-bold mb-4 text-[var(--text-muted)]">{t('track:finance.debt.settledHeading')}</h2>
                    <div className="space-y-2">
                        {paid.map(d => <DebtRow key={d.id} debt={d} onDelete={() => deleteDebt(d.id)} onEdit={patch => updateDebt(d.id, patch)} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubscriptionRow({ sub, onPaid, onDelete, onEdit }: {
    sub: Subscription; onPaid: () => void; onDelete: () => void; onEdit: (patch: Partial<Subscription>) => void;
}) {
    const { t } = useTranslation(['track']);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(sub.name);
    const [amount, setAmount] = useState(String(sub.amount));
    const [date, setDate] = useState(sub.nextPaymentDate);

    const left = daysUntil(sub.nextPaymentDate);
    const alertText = left < 0 ? t('track:finance.subscription.overdue', { count: Math.abs(left) })
        : left === 0 ? t('track:finance.subscription.dueToday')
        : [1, 3, 7].includes(left) ? t('track:finance.subscription.dueIn', { count: left })
        : null;
    const save = () => { onEdit({ name: name.trim() || sub.name, amount: parseFloat(amount) || sub.amount, nextPaymentDate: date }); setEditing(false); };

    if (editing) {
        return (
            <div className="flex flex-wrap gap-2 items-center bg-[var(--bg-input)] p-3 rounded-lg">
                <input value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[140px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-28 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <button onClick={save} className="text-cyan-400 text-sm font-bold">{t('track:finance.form.save')}</button>
                <button onClick={() => setEditing(false)} className="text-[var(--text-muted)] text-sm">{t('track:finance.form.cancel')}</button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-yellow-400/10 text-yellow-400">
                <Icon name="repeat" size={16} />
            </span>
            <div className="flex-1">
                <div className="text-sm">{sub.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{t('track:finance.subscription.nextPayment', { date: formatDate(sub.nextPaymentDate) })}</div>
                {alertText && <div className={`text-xs font-bold mt-0.5 ${left <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>⏰ {alertText}</div>}
            </div>
            <span className="font-bold text-yellow-400 whitespace-nowrap">{t('track:finance.subscription.perMonth', { amount: formatCurrency(sub.amount) })}</span>
            <button onClick={onPaid} className="text-green-400 text-xs border border-green-400/40 px-2 py-1 rounded whitespace-nowrap">{t('track:finance.subscription.markPaid')}</button>
            <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-cyan-400 text-sm">✎</button>
            <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
        </div>
    );
}

function SubscriptionsPanel({ subs, addSub, markPaid, deleteSub, updateSub }: {
    subs: Subscription[]; addSub: (name: string, amount: number, date: string) => void;
    markPaid: (id: string) => void; deleteSub: (id: string) => void; updateSub: (id: string, patch: Partial<Subscription>) => void;
}) {
    const { t } = useTranslation(['track']);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => todayKey());

    const submit = () => {
        const val = parseFloat(amount);
        if (!name.trim() || !val || val <= 0 || !date) return;
        addSub(name, val, date);
        setName(''); setAmount('');
    };

    const sorted = [...subs].sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    const monthlyTotal = subs.reduce((s, x) => s + x.amount, 0);

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                <div><div className="text-xs text-[var(--text-muted)]">{t('track:finance.subscription.monthlyTotal')}</div><div className="text-2xl font-bold text-yellow-400">{formatCurrency(monthlyTotal)}</div></div>
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
                    <Icon name="repeat" size={22} />
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">{t('track:finance.subscription.newHeading')}</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder={t('track:finance.subscription.name')} className="flex-1 min-w-[160px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder={t('track:finance.form.amount')} className="w-32 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">{t('track:finance.form.add')}</button>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">{t('track:finance.subscription.heading')}</h2>
                <div className="space-y-2">
                    {sorted.map(s => <SubscriptionRow key={s.id} sub={s} onPaid={() => markPaid(s.id)} onDelete={() => deleteSub(s.id)} onEdit={patch => updateSub(s.id, patch)} />)}
                    {sorted.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">{t('track:finance.subscription.empty')}</div>}
                </div>
            </div>
        </div>
    );
}

export function Finance({ finance, setFinance }: FinanceProps) {
    const { t } = useTranslation(['track', 'common']);
    const savedExpenseCats = finance?.categories?.expense ?? DEFAULT_EXPENSE_CATS;
    const withSubscription = savedExpenseCats.some(c => c.id === 'subscription')
        ? savedExpenseCats
        : [...savedExpenseCats, DEFAULT_EXPENSE_CATS.find(c => c.id === 'subscription')!];
    const expenseCats = withSubscription.some(c => c.id === 'debt')
        ? withSubscription
        : [...withSubscription, DEFAULT_EXPENSE_CATS.find(c => c.id === 'debt')!];
    const savedIncomeCats = finance?.categories?.income ?? DEFAULT_INCOME_CATS;
    const incomeCats = savedIncomeCats.some(c => c.id === 'debt')
        ? savedIncomeCats
        : [...savedIncomeCats, DEFAULT_INCOME_CATS.find(c => c.id === 'debt')!];

    const data: FinanceData = {
        ...DEFAULT_FINANCE,
        ...finance,
        categories: { expense: expenseCats, income: incomeCats },
        entries: finance?.entries ?? [],
        debts: finance?.debts ?? [],
        subscriptions: finance?.subscriptions ?? [],
    };

    const [unlocked, setUnlocked] = useState(!data.pin);
    const [section, setSection] = useState<'ledger' | 'debts' | 'subs'>('ledger');
    const [tab, setTab] = useState<'expense' | 'income'>('expense');
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [quickCat, setQuickCat] = useState<Category | null>(null);
    const [amount, setAmount] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showAddCat, setShowAddCat] = useState(false);
    const [manageCats, setManageCats] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);

    if (!unlocked && data.pin) return <LockScreen pin={data.pin} onUnlock={() => setUnlocked(true)} />;

    const entries = data.entries;
    const categories = data.categories;
    const filtered = entries.filter(e => inPeriod(e.date, period));
    const expenseTotal = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const incomeTotal = filtered.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const allExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const allIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const savings = data.initialBalance + allIncome - allExpense;
    const confirmQuickAdd = () => {
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0 || !quickCat) return;
        const entry: FinanceEntry = { id: Date.now(), type: tab, categoryId: quickCat.id, amount: val, date: nowInstant() };
        setFinance({ ...data, entries: [entry, ...entries] });
        setAmount(''); setQuickCat(null);
    };
    const deleteEntry = (id: number) => setFinance({ ...data, entries: entries.filter(e => e.id !== id) });
    const addCategory = (cat: { icon: string; label: string; color: string }) =>
        setFinance({ ...data, categories: { ...categories, [tab]: [...categories[tab], { ...cat, id: 'c' + Date.now() }] } });
    // Renaming a built-in makes the category theirs: `labelKey` is dropped so
    // our translation stops overriding the word they just typed.
    const updateCategory = (id: string, patch: { icon: string; label: string; color: string }) =>
        setFinance({
            ...data,
            categories: {
                ...categories,
                [tab]: categories[tab].map(c => {
                    if (c.id !== id) return c;
                    const { labelKey: _dropped, ...rest } = c;
                    return { ...rest, ...patch };
                }),
            },
        });
    const deleteCategory = (id: string) =>
        setFinance({ ...data, categories: { ...categories, [tab]: categories[tab].filter(c => c.id !== id) } });
    const setPin = (p: string | null) => setFinance({ ...data, pin: p });
    const setInitialBalance = (v: number) => setFinance({ ...data, initialBalance: v });

    const switchTab = (kind: 'expense' | 'income') => { setTab(kind); setQuickCat(null); setEditingCatId(null); setManageCats(false); setShowAddCat(false); };

    const addDebt = (title: string, amount: number, direction: Debt['direction']) => {
        const debt: Debt = { id: Date.now(), title: title.trim(), amount, direction, status: 'active', createdAt: nowInstant() };
        setFinance({ ...data, debts: [debt, ...data.debts] });
    };
    // Repaying a debt moves real money: settling what I owe is an expense,
    // getting repaid is income — either way savings must reflect it.
    const markDebtPaid = (id: number) => {
        const debt = data.debts.find(d => d.id === id);
        if (!debt) return;
        const entry: FinanceEntry = {
            id: Date.now(),
            type: debt.direction === 'i_owe' ? 'expense' : 'income',
            categoryId: 'debt',
            amount: debt.amount,
            date: nowInstant(),
        };
        setFinance({
            ...data,
            entries: [entry, ...data.entries],
            debts: data.debts.map(d => d.id === id ? { ...d, status: 'paid' as const, paidAt: nowInstant() } : d),
        });
    };
    const deleteDebt = (id: number) => setFinance({ ...data, debts: data.debts.filter(d => d.id !== id) });
    const updateDebt = (id: number, patch: Partial<Debt>) => setFinance({ ...data, debts: data.debts.map(d => d.id === id ? { ...d, ...patch } : d) });

    const addSubscription = (name: string, amount: number, nextPaymentDate: string) => {
        const sub: Subscription = { id: 's' + Date.now(), name: name.trim(), amount, nextPaymentDate };
        setFinance({ ...data, subscriptions: [...data.subscriptions, sub] });
    };
    const deleteSubscription = (id: string) => setFinance({ ...data, subscriptions: data.subscriptions.filter(s => s.id !== id) });
    const updateSubscription = (id: string, patch: Partial<Subscription>) => setFinance({ ...data, subscriptions: data.subscriptions.map(s => s.id === id ? { ...s, ...patch } : s) });
    const markSubscriptionPaid = (id: string) => {
        const sub = data.subscriptions.find(s => s.id === id);
        if (!sub) return;
        const next = new Date(sub.nextPaymentDate);
        next.setMonth(next.getMonth() + 1);
        const entry: FinanceEntry = { id: Date.now(), type: 'expense', categoryId: 'subscription', amount: sub.amount, date: nowInstant() };
        setFinance({
            ...data,
            entries: [entry, ...data.entries],
            subscriptions: data.subscriptions.map(s => s.id === id ? { ...s, nextPaymentDate: toLocalDateKey(next) } : s),
        });
    };

    return (
        <div>
            <PageHeader page="finance" title={t('track:finance.title')} action={
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(s => !s)}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                        <Icon name="settings" size={14} /> {t('track:finance.settings.open')}
                    </button>
                    {data.pin && (
                        <button onClick={() => setUnlocked(false)}
                            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                            <Icon name="lock" size={14} /> {t('track:finance.lock.close')}
                        </button>
                    )}
                </div>
            } />

            {showSettings && <FinanceSettings data={data} setPin={setPin} setInitialBalance={setInitialBalance} onClose={() => setShowSettings(false)} />}

            <div className="glass-card p-6 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">{t('track:finance.savings')}</div>
                    <div className={`text-4xl font-bold ${savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(savings)}</div>
                </div>
                <div className="flex gap-6 text-right">
                    <div><div className="text-xs text-[var(--text-muted)]">{t('track:finance.totalIncome')}</div><div className="text-lg font-bold text-green-400">+{formatCurrency(allIncome)}</div></div>
                    <div><div className="text-xs text-[var(--text-muted)]">{t('track:finance.totalExpense')}</div><div className="text-lg font-bold text-red-400">-{formatCurrency(allExpense)}</div></div>
                </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setSection('ledger')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'ledger' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="wallet" size={14} /> {t('track:finance.tab.ledger')}
                </button>
                <button onClick={() => setSection('debts')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'debts' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="swap" size={14} /> {t('track:finance.tab.debts')}
                </button>
                <button onClick={() => setSection('subs')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'subs' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="repeat" size={14} /> {t('track:finance.tab.subscriptions')}
                </button>
            </div>

            {section === 'ledger' && (
                <>
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => switchTab('expense')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'expense' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                            <Icon name="trendDown" size={14} /> {t('track:finance.kind.expense')}
                        </button>
                        <button onClick={() => switchTab('income')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'income' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                            <Icon name="trendUp" size={14} /> {t('track:finance.kind.income')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">{t('track:finance.quickAdd.heading')}</h2>
                                <button onClick={() => { setManageCats(m => !m); setEditingCatId(null); setQuickCat(null); }} className="text-xs px-3 py-1 rounded-full bg-white/5 text-[var(--text-muted)]">
                                    {manageCats ? t('track:finance.category.done') : `✎ ${t('track:finance.category.manage')}`}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 sm:grid-cols-5 gap-3">
                                {categories[tab].map(cat => (
                                    <div key={cat.id} className="relative flex flex-col items-center gap-1">
                                        <button onClick={() => manageCats ? setEditingCatId(cat.id) : (setQuickCat(cat), setAmount(''))} className="flex flex-col items-center gap-1 group w-full">
                                            <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-150 group-hover:scale-110 group-active:scale-90"
                                                style={{ backgroundColor: cat.color + '30', border: `2px solid ${cat.color}` }}>{cat.icon}</span>
                                            <span className="text-xs text-[var(--text-muted)] truncate w-16 text-center">{categoryLabel(cat, t)}</span>
                                        </button>
                                        {manageCats && (
                                            <button onClick={() => deleteCategory(cat.id)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => setShowAddCat(true)} className="flex flex-col items-center gap-1">
                                    <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 border-dashed border-[var(--border)] text-[var(--text-muted)]">+</span>
                                    <span className="text-xs text-[var(--text-muted)]">{t('track:finance.category.own')}</span>
                                </button>
                            </div>

                            {quickCat && (
                                <div className="mt-6 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{quickCat.icon}</span><span className="font-bold">{quickCat.label}</span></div>
                                    <div className="flex gap-2">
                                        <input autoFocus type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && confirmQuickAdd()} placeholder={t('track:finance.quickAdd.amount')}
                                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                                        <button onClick={confirmQuickAdd} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">{t('track:finance.quickAdd.done')}</button>
                                        <button onClick={() => { setQuickCat(null); setAmount(''); }} className="px-4 py-2 rounded-lg bg-white/5">✕</button>
                                    </div>
                                </div>
                            )}

                            {editingCatId && (
                                <CategoryForm
                                    initial={categories[tab].find(c => c.id === editingCatId)}
                                    initialLabel={(() => {
                                        const cat = categories[tab].find(c => c.id === editingCatId);
                                        // Seed the field with what they can SEE, not the
                                        // stored Russian label behind a built-in's key.
                                        return cat ? categoryLabel(cat, t) : '';
                                    })()}
                                    onSave={c => { updateCategory(editingCatId, c); setEditingCatId(null); }}
                                    onClose={() => setEditingCatId(null)}
                                />
                            )}

                            {showAddCat && <CategoryForm onSave={c => { addCategory(c); setShowAddCat(false); }} onClose={() => setShowAddCat(false)} />}
                        </div>

                        <div className="glass-card p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">{t('track:finance.stats.heading')}</h2>
                                <div className="flex gap-1 text-xs">
                                    {(['day', 'week', 'month'] as const).map(p => (
                                        <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-full transition-colors ${period === p ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                            {t(`track:finance.period.${p}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-around mb-4 text-sm">
                                <div><span className="text-[var(--text-muted)]">{t('track:finance.stats.spent')}</span><span className="text-red-400 font-bold">{formatCurrency(expenseTotal)}</span></div>
                                <div><span className="text-[var(--text-muted)]">{t('track:finance.stats.earned')}</span><span className="text-green-400 font-bold">{formatCurrency(incomeTotal)}</span></div>
                            </div>
                            <div className="h-64">
                                <CategoryPie entries={filtered.filter(e => e.type === tab)} categories={categories[tab]} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl mt-6">
                        <h2 className="font-bold mb-4">{t('track:finance.entries.heading')}</h2>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {entries.slice(0, 30).map(e => {
                                const cat = categories[e.type].find(c => c.id === e.categoryId);
                                return (
                                    <div key={e.id} className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg">
                                        <span className="text-xl">{cat?.icon ?? '❓'}</span>
                                        <div className="flex-1">
                                            <div className="text-sm">{cat ? categoryLabel(cat, t) : '—'}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{new Date(e.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <span className={`font-bold ${e.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount)}</span>
                                        <button onClick={() => deleteEntry(e.id)} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
                                    </div>
                                );
                            })}
                            {entries.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">{t('track:finance.entries.empty')}</div>}
                        </div>
                    </div>
                </>
            )}

            {section === 'debts' && (
                <DebtsPanel debts={data.debts} addDebt={addDebt} markPaid={markDebtPaid} deleteDebt={deleteDebt} updateDebt={updateDebt} />
            )}

            {section === 'subs' && (
                <SubscriptionsPanel subs={data.subscriptions} addSub={addSubscription} markPaid={markSubscriptionPaid} deleteSub={deleteSubscription} updateSub={updateSubscription} />
            )}
        </div>
    );
}
