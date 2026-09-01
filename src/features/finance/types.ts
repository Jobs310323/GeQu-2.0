// The finance data model: shapes and defaults, with no UI and no chart library
// attached.
//
// These live apart from the Finance page on purpose. The app's initial state has
// to know the default shape, and importing it from the page pulled the entire
// page — Chart.js included — into the entry bundle, undoing the route-level code
// splitting for every user whether or not they ever opened Finance.

export type Category = {
    id: string;
    icon: string;
    /**
     * The label as stored. For a category the user created or renamed, this is
     * their own words and is shown verbatim in every language.
     */
    label: string;
    /**
     * Set only on the categories the app seeds. When present it wins over
     * `label`, so a built-in reads in the interface language.
     *
     * Both fields exist because a category is half ours and half the user's.
     * Existing installs already hold these categories with Russian labels and
     * no key, so they keep reading exactly as they did; a rename clears the key
     * and the user's word takes over permanently.
     */
    labelKey?: string;
    color: string;
};

/** What to display for a category: our translation if it is still ours, their words otherwise. */
export function categoryLabel(category: Category, t: (key: string) => string): string {
    return category.labelKey ? t(category.labelKey) : category.label;
}

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

// The `label` on each of these is the Russian text every existing install
// already holds in its stored categories. It is left exactly as it is so that
// nothing about a user's saved data changes; `labelKey` is what actually gets
// displayed while the category is still ours.
export const DEFAULT_EXPENSE_CATS: Category[] = [
    { id: 'food', icon: '🍔', label: 'Еда', labelKey: 'track:finance.category.food', color: '#EA580C' }, // i18n-allow: stored label
    { id: 'transport', icon: '🚌', label: 'Транспорт', labelKey: 'track:finance.category.transport', color: '#0284C7' }, // i18n-allow: stored label
    { id: 'home', icon: '🏠', label: 'Жильё', labelKey: 'track:finance.category.home', color: '#7C3AED' }, // i18n-allow: stored label
    { id: 'fun', icon: '🎮', label: 'Развлечения', labelKey: 'track:finance.category.fun', color: '#DB2777' }, // i18n-allow: stored label
    { id: 'health', icon: '💊', label: 'Здоровье', labelKey: 'track:finance.category.health', color: '#16A34A' }, // i18n-allow: stored label
    { id: 'shopping', icon: '🛍️', label: 'Покупки', labelKey: 'track:finance.category.shopping', color: '#CA8A04' }, // i18n-allow: stored label
    { id: 'subscription', icon: '🔁', label: 'Подписки', labelKey: 'track:finance.category.subscription', color: '#0EA5E9' }, // i18n-allow: stored label
    { id: 'debt', icon: '💳', label: 'Погашение долга', labelKey: 'track:finance.category.debtPayment', color: '#7C3AED' }, // i18n-allow: stored label
    { id: 'other_e', icon: '📦', label: 'Прочее', labelKey: 'track:finance.category.otherExpense', color: '#64748B' }, // i18n-allow: stored label
];

export const DEFAULT_INCOME_CATS: Category[] = [
    { id: 'salary', icon: '💰', label: 'Зарплата', labelKey: 'track:finance.category.salary', color: '#16A34A' }, // i18n-allow: stored label
    { id: 'gift', icon: '🎁', label: 'Подарок', labelKey: 'track:finance.category.gift', color: '#DB2777' }, // i18n-allow: stored label
    { id: 'freelance', icon: '💻', label: 'Фриланс', labelKey: 'track:finance.category.freelance', color: '#0284C7' }, // i18n-allow: stored label
    { id: 'debt', icon: '💳', label: 'Возврат долга', labelKey: 'track:finance.category.debtReturn', color: '#7C3AED' }, // i18n-allow: stored label
    { id: 'other_i', icon: '📦', label: 'Прочее', labelKey: 'track:finance.category.otherIncome', color: '#64748B' }, // i18n-allow: stored label
];

export const DEFAULT_FINANCE: FinanceData = {
    pin: null,
    initialBalance: 0,
    categories: { expense: DEFAULT_EXPENSE_CATS, income: DEFAULT_INCOME_CATS },
    entries: [],
    debts: [],
    subscriptions: [],
};
