// The finance data model: shapes and defaults, with no UI and no chart library
// attached.
//
// These live apart from the Finance page on purpose. The app's initial state has
// to know the default shape, and importing it from the page pulled the entire
// page — Chart.js included — into the entry bundle, undoing the route-level code
// splitting for every user whether or not they ever opened Finance.

export type Category = { id: string; icon: string; label: string; color: string };

export type FinanceEntry = {
    id: number;
    type: 'expense' | 'income';
    categoryId: string;
    amount: number;
    /** ISO-8601 instant. Derive the calendar day with `toLocalDateKey`. */
    date: string;
};

export type Debt = {
    id: number;
    title: string;
    amount: number;
    direction: 'i_owe' | 'owed_to_me';
    status: 'active' | 'paid';
    createdAt: string;
    paidAt?: string;
};

export type Subscription = {
    id: string;
    name: string;
    amount: number;
    /** Calendar date, `YYYY-MM-DD`. */
    nextPaymentDate: string;
};

export type FinanceData = {
    /**
     * Section passcode.
     *
     * This is a UI curtain, not a lock: it is stored in plaintext, compared with
     * `===`, and swept into the cloud snapshot with everything else. It keeps a
     * shoulder-surfer out of the tab and nothing more. Phase 12 either makes it
     * a real device-local gate or drops the claim — see
     * docs/GEQU_ARCHITECTURE_AUDIT.md, risk S1.
     */
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
