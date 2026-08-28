import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { todayKey, toLocalDateKey, daysBetween, isToday, nowInstant } from '../lib/datetime';

export type Category = { id: string; icon: string; label: string; color: string };
export type FinanceEntry = { id: number; type: 'expense' | 'income'; categoryId: string; amount: number; date: string };
export type Debt = { id: number; title: string; amount: number; direction: 'i_owe' | 'owed_to_me'; status: 'active' | 'paid'; createdAt: string; paidAt?: string };
export type Subscription = { id: string; name: string; amount: number; nextPaymentDate: string };
export type FinanceData = {
    pin: string | null;
    initialBalance: number;
    categories: { expense: Category[]; income: Category[] };
    entries: FinanceEntry[];
    debts: Debt[];
    subscriptions: Subscription[];
};

const DEFAULT_EXPENSE_CATS: Category[] = [
    { id: 'food', icon: '🍔', label: 'Еда', color: '#EA580C' },
    { id: 'transport', icon: '🚌', label: 'Транспорт', color: '#0284C7' },
    { id: 'home', icon: '🏠', label: 'Жильё', color: '#7C3AED' },
    { id: 'fun', icon: '🎮', label: 'Развлечения', color: '#DB2777' },
    { id: 'health', icon: '💊', label: 'Здоровье', color: '#16A34A' },
    { id: 'shopping', icon: '🛍️', label: 'Покупки', color: '#CA8A04' },
    { id: 'subscription', icon: '🔁', label: 'Подписки', color: '#0EA5E9' },
    { id: 'debt', icon: '💳', label: 'Погашение долга', color: '#7C3AED' },
    { id: 'other_e', icon: '📦', label: 'Прочее', color: '#64748B' },
];
const DEFAULT_INCOME_CATS: Category[] = [
    { id: 'salary', icon: '💰', label: 'Зарплата', color: '#16A34A' },
    { id: 'gift', icon: '🎁', label: 'Подарок', color: '#DB2777' },
    { id: 'freelance', icon: '💻', label: 'Фриланс', color: '#0284C7' },
    { id: 'debt', icon: '💳', label: 'Возврат долга', color: '#7C3AED' },
    { id: 'other_i', icon: '📦', label: 'Прочее', color: '#64748B' },
];

export const DEFAULT_FINANCE: FinanceData = {
    pin: null,
    initialBalance: 0,
    categories: { expense: DEFAULT_EXPENSE_CATS, income: DEFAULT_INCOME_CATS },
    entries: [],
    debts: [],
    subscriptions: [],
};

const PALETTE = ['#0284C7', '#EA580C', '#7C3AED', '#DB2777', '#16A34A', '#CA8A04', '#64748B', '#0EA5E9', '#F43F5E'];

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
                labels: byCat.map(x => `${x.cat.icon} ${x.cat.label}`),
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

    if (byCat.length === 0) return <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">Нет данных за период</div>;
    return <canvas ref={canvasRef} />;
}

function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState(false);
    const submit = () => { if (value === pin) { onUnlock(); } else { setError(true); setValue(''); } };
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center">
            <div className="glass-card rounded-2xl p-10 flex flex-col items-center gap-4 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
                    <Icon name="lock" size={26} />
                </div>
                <h1 className="text-2xl font-bold">Финансы защищены</h1>
                <p className="text-[var(--text-muted)] text-sm">Введите пароль, чтобы открыть раздел</p>
                <div className="flex gap-2">
                    <input autoFocus type="password" value={value} onChange={e => { setValue(e.target.value); setError(false); }}
                        onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Пароль"
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-cyan-400 text-center" />
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Войти</button>
                </div>
                {error && <p className="text-red-400 text-sm">Неверный пароль</p>}
            </div>
        </div>
    );
}

function FinanceSettings({ data, setPin, setInitialBalance, onClose }: {
    data: FinanceData; setPin: (p: string | null) => void; setInitialBalance: (v: number) => void; onClose: () => void;
}) {
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [err, setErr] = useState('');
    const [balance, setBalance] = useState(String(data.initialBalance ?? 0));

    const applyPin = () => {
        if (data.pin && oldPin !== data.pin) { setErr('Неверный текущий пароль'); return; }
        if (newPin && newPin !== confirmPin) { setErr('Пароли не совпадают'); return; }
        setPin(newPin.trim() || null);
        setOldPin(''); setNewPin(''); setConfirmPin(''); setErr('');
    };

    return (
        <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="font-bold mb-4">Настройки раздела</h2>
            <div className="mb-4">
                <label className="text-sm text-[var(--text-muted)] block mb-1">Начальный баланс сбережений</label>
                <div className="flex gap-2">
                    <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <button onClick={() => setInitialBalance(parseFloat(balance) || 0)} className="bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg">Сохранить</button>
                </div>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
                <label className="text-sm text-[var(--text-muted)] block mb-2">{data.pin ? 'Изменить или снять пароль' : 'Установить пароль на раздел'}</label>
                {data.pin && <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} placeholder="Текущий пароль"
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />}
                <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Новый пароль (пусто — снять пароль)"
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Повторите новый пароль"
                    className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
                <div className="flex gap-2">
                    <button onClick={applyPin} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">Применить</button>
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-white/5">Закрыть</button>
                </div>
            </div>
        </div>
    );
}

function CategoryForm({ initial, onSave, onClose }: { initial?: Category; onSave: (c: { icon: string; label: string; color: string }) => void; onClose: () => void }) {
    const [icon, setIcon] = useState(initial?.icon ?? '🔖');
    const [label, setLabel] = useState(initial?.label ?? '');
    const [color, setColor] = useState(initial?.color ?? PALETTE[0]);

    return (
        <div className="mt-4 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
            <div className="flex gap-2 mb-3">
                <input value={icon} onChange={e => setIcon(e.target.value.slice(0, 2))} placeholder="🔖"
                    className="w-14 text-center text-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-2 outline-none" />
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Название категории"
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
            </div>
            <div className="flex gap-2 mb-3">
                {PALETTE.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c }} />
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={() => { if (!label.trim()) return; onSave({ icon: icon || '🔖', label: label.trim(), color }); }}
                    className="bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg">{initial ? 'Сохранить' : 'Добавить'}</button>
                <button onClick={onClose} className="px-5 py-2 rounded-lg bg-white/5">Отмена</button>
            </div>
        </div>
    );
}

function DebtRow({ debt, onPaid, onDelete, onEdit, fmt }: {
    debt: Debt; onPaid?: () => void; onDelete: () => void; onEdit: (patch: Partial<Debt>) => void; fmt: (n: number) => string;
}) {
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
                    <option value="i_owe">Я должен</option>
                    <option value="owed_to_me">Мне должны</option>
                </select>
                <button onClick={save} className="text-cyan-400 text-sm font-bold">Сохранить</button>
                <button onClick={() => setEditing(false)} className="text-[var(--text-muted)] text-sm">Отмена</button>
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
                    {debt.direction === 'i_owe' ? 'Я должен' : 'Мне должны'}
                    {debt.paidAt ? ` · погашен ${new Date(debt.paidAt).toLocaleDateString('ru-RU')}` : ''}
                </div>
            </div>
            <span className={`font-bold ${debt.direction === 'i_owe' ? 'text-red-400' : 'text-green-400'}`}>{fmt(debt.amount)} ₽</span>
            {debt.status === 'active' && onPaid && <button onClick={onPaid} className="text-green-400 text-xs border border-green-400/40 px-2 py-1 rounded whitespace-nowrap">Погашен</button>}
            {debt.status === 'active' && <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-cyan-400 text-sm">✎</button>}
            <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
        </div>
    );
}

function DebtsPanel({ debts, addDebt, markPaid, deleteDebt, updateDebt, fmt }: {
    debts: Debt[]; addDebt: (title: string, amount: number, direction: Debt['direction']) => void;
    markPaid: (id: number) => void; deleteDebt: (id: number) => void; updateDebt: (id: number, patch: Partial<Debt>) => void; fmt: (n: number) => string;
}) {
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
                <div><div className="text-xs text-[var(--text-muted)]">Я должен</div><div className="text-2xl font-bold text-red-400">{fmt(totalIOwe)} ₽</div></div>
                <div><div className="text-xs text-[var(--text-muted)]">Мне должны</div><div className="text-2xl font-bold text-green-400">{fmt(totalOwedToMe)} ₽</div></div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">Новый долг</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder="Кому/от кого, за что" className="flex-1 min-w-[180px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder="Сумма ₽" className="w-32 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <select value={direction} onChange={e => setDirection(e.target.value as Debt['direction'])}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none">
                        <option value="i_owe">Я должен</option>
                        <option value="owed_to_me">Мне должны</option>
                    </select>
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">Добавить</button>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">Активные долги</h2>
                <div className="space-y-2">
                    {active.map(d => <DebtRow key={d.id} debt={d} fmt={fmt} onPaid={() => markPaid(d.id)} onDelete={() => deleteDebt(d.id)} onEdit={patch => updateDebt(d.id, patch)} />)}
                    {active.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">Активных долгов нет</div>}
                </div>
            </div>

            {paid.length > 0 && (
                <div className="glass-card p-6 rounded-2xl">
                    <h2 className="font-bold mb-4 text-[var(--text-muted)]">Погашенные</h2>
                    <div className="space-y-2">
                        {paid.map(d => <DebtRow key={d.id} debt={d} fmt={fmt} onDelete={() => deleteDebt(d.id)} onEdit={patch => updateDebt(d.id, patch)} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubscriptionRow({ sub, onPaid, onDelete, onEdit, fmt }: {
    sub: Subscription; onPaid: () => void; onDelete: () => void; onEdit: (patch: Partial<Subscription>) => void; fmt: (n: number) => string;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(sub.name);
    const [amount, setAmount] = useState(String(sub.amount));
    const [date, setDate] = useState(sub.nextPaymentDate);

    const left = daysUntil(sub.nextPaymentDate);
    const alertText = left < 0 ? `Просрочено на ${Math.abs(left)} дн.` : left === 0 ? 'Оплата сегодня' : [1, 3, 7].includes(left) ? `Оплата через ${left} дн.` : null;
    const save = () => { onEdit({ name: name.trim() || sub.name, amount: parseFloat(amount) || sub.amount, nextPaymentDate: date }); setEditing(false); };

    if (editing) {
        return (
            <div className="flex flex-wrap gap-2 items-center bg-[var(--bg-input)] p-3 rounded-lg">
                <input value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[140px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-28 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400" />
                <button onClick={save} className="text-cyan-400 text-sm font-bold">Сохранить</button>
                <button onClick={() => setEditing(false)} className="text-[var(--text-muted)] text-sm">Отмена</button>
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
                <div className="text-xs text-[var(--text-muted)]">Следующая оплата: {new Date(sub.nextPaymentDate).toLocaleDateString('ru-RU')}</div>
                {alertText && <div className={`text-xs font-bold mt-0.5 ${left <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>⏰ {alertText}</div>}
            </div>
            <span className="font-bold text-yellow-400 whitespace-nowrap">{fmt(sub.amount)} ₽/мес</span>
            <button onClick={onPaid} className="text-green-400 text-xs border border-green-400/40 px-2 py-1 rounded whitespace-nowrap">Оплачено</button>
            <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-cyan-400 text-sm">✎</button>
            <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
        </div>
    );
}

function SubscriptionsPanel({ subs, addSub, markPaid, deleteSub, updateSub, fmt }: {
    subs: Subscription[]; addSub: (name: string, amount: number, date: string) => void;
    markPaid: (id: string) => void; deleteSub: (id: string) => void; updateSub: (id: string, patch: Partial<Subscription>) => void; fmt: (n: number) => string;
}) {
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
                <div><div className="text-xs text-[var(--text-muted)]">Расход на подписки в месяц</div><div className="text-2xl font-bold text-yellow-400">{fmt(monthlyTotal)} ₽</div></div>
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
                    <Icon name="repeat" size={22} />
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">Новая подписка</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder="Название" className="flex-1 min-w-[160px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder="Сумма ₽" className="w-32 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                    <button onClick={submit} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">Добавить</button>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="font-bold mb-4">Подписки</h2>
                <div className="space-y-2">
                    {sorted.map(s => <SubscriptionRow key={s.id} sub={s} fmt={fmt} onPaid={() => markPaid(s.id)} onDelete={() => deleteSub(s.id)} onEdit={patch => updateSub(s.id, patch)} />)}
                    {sorted.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">Подписок пока нет</div>}
                </div>
            </div>
        </div>
    );
}

export function Finance({ finance, setFinance }: { finance: FinanceData; setFinance: (f: FinanceData) => void }) {
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
    const fmt = (n: number) => n.toLocaleString('ru-RU');

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
    const updateCategory = (id: string, patch: { icon: string; label: string; color: string }) =>
        setFinance({ ...data, categories: { ...categories, [tab]: categories[tab].map(c => c.id === id ? { ...c, ...patch } : c) } });
    const deleteCategory = (id: string) =>
        setFinance({ ...data, categories: { ...categories, [tab]: categories[tab].filter(c => c.id !== id) } });
    const setPin = (p: string | null) => setFinance({ ...data, pin: p });
    const setInitialBalance = (v: number) => setFinance({ ...data, initialBalance: v });

    const switchTab = (t: 'expense' | 'income') => { setTab(t); setQuickCat(null); setEditingCatId(null); setManageCats(false); setShowAddCat(false); };

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
            <PageHeader page="finance" title="Финансы" action={
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(s => !s)}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                        <Icon name="settings" size={14} /> Настройки
                    </button>
                    {data.pin && (
                        <button onClick={() => setUnlocked(false)}
                            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                            <Icon name="lock" size={14} /> Закрыть
                        </button>
                    )}
                </div>
            } />

            {showSettings && <FinanceSettings data={data} setPin={setPin} setInitialBalance={setInitialBalance} onClose={() => setShowSettings(false)} />}

            <div className="glass-card p-6 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">Личные сбережения</div>
                    <div className={`text-4xl font-bold ${savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(savings)} ₽</div>
                </div>
                <div className="flex gap-6 text-right">
                    <div><div className="text-xs text-[var(--text-muted)]">Доходы всего</div><div className="text-lg font-bold text-green-400">+{fmt(allIncome)}</div></div>
                    <div><div className="text-xs text-[var(--text-muted)]">Расходы всего</div><div className="text-lg font-bold text-red-400">-{fmt(allExpense)}</div></div>
                </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setSection('ledger')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'ledger' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="wallet" size={14} /> Учёт
                </button>
                <button onClick={() => setSection('debts')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'debts' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="swap" size={14} /> Долги
                </button>
                <button onClick={() => setSection('subs')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${section === 'subs' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    <Icon name="repeat" size={14} /> Подписки
                </button>
            </div>

            {section === 'ledger' && (
                <>
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => switchTab('expense')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'expense' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                            <Icon name="trendDown" size={14} /> Расходы
                        </button>
                        <button onClick={() => switchTab('income')} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'income' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black' : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                            <Icon name="trendUp" size={14} /> Доходы
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">Быстрое добавление</h2>
                                <button onClick={() => { setManageCats(m => !m); setEditingCatId(null); setQuickCat(null); }} className="text-xs px-3 py-1 rounded-full bg-white/5 text-[var(--text-muted)]">
                                    {manageCats ? 'Готово' : '✎ Управление'}
                                </button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {categories[tab].map(cat => (
                                    <div key={cat.id} className="relative flex flex-col items-center gap-1">
                                        <button onClick={() => manageCats ? setEditingCatId(cat.id) : (setQuickCat(cat), setAmount(''))} className="flex flex-col items-center gap-1 group w-full">
                                            <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-150 group-hover:scale-110 group-active:scale-90"
                                                style={{ backgroundColor: cat.color + '30', border: `2px solid ${cat.color}` }}>{cat.icon}</span>
                                            <span className="text-xs text-[var(--text-muted)] truncate w-16 text-center">{cat.label}</span>
                                        </button>
                                        {manageCats && (
                                            <button onClick={() => deleteCategory(cat.id)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => setShowAddCat(true)} className="flex flex-col items-center gap-1">
                                    <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 border-dashed border-[var(--border)] text-[var(--text-muted)]">+</span>
                                    <span className="text-xs text-[var(--text-muted)]">Своя</span>
                                </button>
                            </div>

                            {quickCat && (
                                <div className="mt-6 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{quickCat.icon}</span><span className="font-bold">{quickCat.label}</span></div>
                                    <div className="flex gap-2">
                                        <input autoFocus type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && confirmQuickAdd()} placeholder="Сумма ₽"
                                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                                        <button onClick={confirmQuickAdd} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2 rounded-lg">Готово</button>
                                        <button onClick={() => { setQuickCat(null); setAmount(''); }} className="px-4 py-2 rounded-lg bg-white/5">✕</button>
                                    </div>
                                </div>
                            )}

                            {editingCatId && (
                                <CategoryForm
                                    initial={categories[tab].find(c => c.id === editingCatId)}
                                    onSave={c => { updateCategory(editingCatId, c); setEditingCatId(null); }}
                                    onClose={() => setEditingCatId(null)}
                                />
                            )}

                            {showAddCat && <CategoryForm onSave={c => { addCategory(c); setShowAddCat(false); }} onClose={() => setShowAddCat(false)} />}
                        </div>

                        <div className="glass-card p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">Статистика</h2>
                                <div className="flex gap-1 text-xs">
                                    {(['day', 'week', 'month'] as const).map(p => (
                                        <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-full transition-colors ${period === p ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-around mb-4 text-sm">
                                <div><span className="text-[var(--text-muted)]">Расход: </span><span className="text-red-400 font-bold">{fmt(expenseTotal)} ₽</span></div>
                                <div><span className="text-[var(--text-muted)]">Доход: </span><span className="text-green-400 font-bold">{fmt(incomeTotal)} ₽</span></div>
                            </div>
                            <div className="h-64">
                                <CategoryPie entries={filtered.filter(e => e.type === tab)} categories={categories[tab]} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl mt-6">
                        <h2 className="font-bold mb-4">Последние записи</h2>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {entries.slice(0, 30).map(e => {
                                const cat = categories[e.type].find(c => c.id === e.categoryId);
                                return (
                                    <div key={e.id} className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg">
                                        <span className="text-xl">{cat?.icon ?? '❓'}</span>
                                        <div className="flex-1">
                                            <div className="text-sm">{cat?.label ?? '—'}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{new Date(e.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <span className={`font-bold ${e.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{e.type === 'income' ? '+' : '-'}{fmt(e.amount)} ₽</span>
                                        <button onClick={() => deleteEntry(e.id)} className="text-[var(--text-muted)] hover:text-red-400 text-sm">✕</button>
                                    </div>
                                );
                            })}
                            {entries.length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">Пока нет записей</div>}
                        </div>
                    </div>
                </>
            )}

            {section === 'debts' && (
                <DebtsPanel debts={data.debts} fmt={fmt} addDebt={addDebt} markPaid={markDebtPaid} deleteDebt={deleteDebt} updateDebt={updateDebt} />
            )}

            {section === 'subs' && (
                <SubscriptionsPanel subs={data.subscriptions} fmt={fmt} addSub={addSubscription} markPaid={markSubscriptionPaid} deleteSub={deleteSubscription} updateSub={updateSubscription} />
            )}
        </div>
    );
}
