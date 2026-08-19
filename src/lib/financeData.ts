// Finance's shape and seed data, split out of the page so App can create the
// initial state without pulling in the page — and Chart.js with it — on load.
// The page re-exports these, so existing imports keep working.

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

export const DEFAULT_EXPENSE_CATS: Category[] = [
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
export const DEFAULT_INCOME_CATS: Category[] = [
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
