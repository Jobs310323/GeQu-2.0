import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatDateTime } from '../lib/format';
import { changeLocale } from '../i18n';
import { SUPPORTED_LOCALES, LOCALE_NAMES, getLocale, type Locale } from '../i18n/locale';
import { getGroqKey, setGroqKey } from '../lib/ai';
import { SECTIONS, LOCKED_IDS } from '../lib/nav';
import { DASHBOARD_WIDGETS, toggleIn } from '../lib/prefs';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { todayKey } from '../lib/datetime';
import type { SettingsProps } from '../types/props';
import type { ChangeEvent } from 'react';

export function Settings({ diary, logs, prefs, setPrefs }: SettingsProps) {
    const { t } = useTranslation(['common', 'nav', 'profile']);
    const hiddenTabs: string[] = prefs?.hiddenTabs ?? [];
    const hiddenWidgets: string[] = prefs?.hiddenWidgets ?? [];

    const toggleTab = (id: string) => {
        if (LOCKED_IDS.has(id)) return;
        setPrefs((p) => ({ ...p, hiddenTabs: toggleIn(p.hiddenTabs ?? [], id) }));
    };
    const toggleWidget = (id: string) =>
        setPrefs((p) => ({ ...p, hiddenWidgets: toggleIn(p.hiddenWidgets ?? [], id) }));
    const [groqKey, setGroqKeyState] = useState(getGroqKey());
    const [savedMsg, setSavedMsg] = useState('');
    const saveGroqKey = () => {
        setGroqKey(groqKey);
        setSavedMsg(t('profile:settings.keySaved'));
        setTimeout(() => setSavedMsg(''), 2500);
    };

    const exportTxt = () => { 
        let text = `${t('profile:settings.diaryHeader')}\n\n`;
        diary.forEach(d => { text += `${formatDateTime(d.date)}\n${d.content}\n--------------------\n\n`; });
        downloadFile(text, "gequ_diary.txt", "text/plain"); 
    };
    
    const exportCsv = () => { 
        let csv = `${t('profile:settings.csvHeader')}\n`;
        logs.forEach(l => { 
            const helped = l.helped ? l.helped.join('; ') : '';
            const hindered = l.hindered ? l.hindered.join('; ') : '';
            csv += `${formatDateTime(l.date)},${l.sleep},${l.focus},${l.mood},"${helped}","${hindered}","${l.mainEvent || ''}"\n`; 
        }); 
        downloadFile(csv, "gequ_logs.csv", "text/csv;charset=utf-8;"); 
    };
    
    const downloadFile = (content: string, fileName: string, mimeType: string) => { 
        const blob = new Blob([content], { type: mimeType }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = fileName; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
    };

    const exportAllData = () => {
        // Whatever `gequ_*` keys exist at export time, as their raw stored JSON.
        const backup: Record<string, unknown> = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('gequ_')) {
                backup[key] = localStorage.getItem(key);
            }
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gequ_backup_${todayKey()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importAllData = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('gequ_')) {
                        localStorage.setItem(key, data[key]);
                    }
                });
                alert(t('profile:settings.imported'));
                window.location.reload();
            } catch {
                alert(t('profile:settings.importFailed'));
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <PageHeader page="settings" title={t('profile:settings.title')} />

            <LanguageSettings currency={prefs?.currency ?? 'RUB'}
                onCurrency={code => setPrefs(p => ({ ...p, currency: code }))} />

            {/* Which pages appear in the sidebar */}
            <div className="glass-card p-6 rounded-2xl mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-xl flex items-center gap-2">
                        <Icon name="columns" size={17} className="text-[var(--text-muted)]" /> {t('profile:settings.menuSections')}
                    </h2>
                    {hiddenTabs.length > 0 && (
                        <button onClick={() => setPrefs((p) => ({ ...p, hiddenTabs: [] }))}
                            className="text-xs text-cyan-400 hover:underline">
                            {t('profile:settings.showAll', { count: hiddenTabs.length })}
                        </button>
                    )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                    {t('profile:settings.menuBlurb')}
                </p>
                <div className="space-y-4">
                    {SECTIONS.map(section => (
                        <div key={section.id}>
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">{t(section.titleKey)}</div>
                            <div className="flex flex-wrap gap-2">
                                {section.items.map(item => {
                                    const locked = LOCKED_IDS.has(item.id);
                                    const visible = !hiddenTabs.includes(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => toggleTab(item.id)}
                                            disabled={locked}
                                            title={locked ? t('profile:settings.cannotHide') : visible ? t('profile:settings.hide') : t('profile:settings.restore')}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition flex items-center gap-2 ${
                                                locked ? 'border-[var(--border)] text-gray-500 cursor-not-allowed opacity-60'
                                                    : visible ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
                                                    : 'border-[var(--border)] text-gray-500 hover:text-white line-through'
                                            }`}
                                        >
                                            <Icon name={item.icon} size={13} />{t(item.labelKey)}
                                            {locked && <Icon name="lock" size={11} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Which blocks appear on the dashboard */}
            <div className="glass-card p-6 rounded-2xl mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-xl flex items-center gap-2">
                        <Icon name="grid" size={17} className="text-[var(--text-muted)]" /> {t('profile:settings.widgets')}
                    </h2>
                    {hiddenWidgets.length > 0 && (
                        <button onClick={() => setPrefs((p) => ({ ...p, hiddenWidgets: [] }))}
                            className="text-xs text-cyan-400 hover:underline">
                            {t('profile:settings.showAll', { count: hiddenWidgets.length })}
                        </button>
                    )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                    {t('profile:settings.widgetsBlurb')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {DASHBOARD_WIDGETS.map(w => {
                        const visible = !hiddenWidgets.includes(w.id);
                        return (
                            <button
                                key={w.id}
                                onClick={() => toggleWidget(w.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition flex items-center gap-2 ${
                                    visible ? 'bg-purple-400/10 text-purple-400 border-purple-400/30'
                                        : 'border-[var(--border)] text-gray-500 hover:text-white line-through'
                                }`}
                            >
                                <span>{w.icon}</span>{t(w.labelKey)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                <h2 className="text-xl mb-2 text-purple-400 flex items-center gap-2">
                    <Icon name="sparkle" size={18} /> {t('profile:settings.aiHeading')}
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                    <Trans i18nKey="profile:settings.aiBlurb" components={[<span key="0" />, <span key="1" className="text-purple-300" />]} />
                </p>
                <div className="flex gap-3 flex-wrap items-center">
                    <input
                        type="password"
                        value={groqKey}
                        onChange={e => setGroqKeyState(e.target.value)}
                        placeholder="gsk_..."
                        autoComplete="off"
                        className="flex-1 min-w-[240px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-purple-400 text-white font-mono text-sm"
                    />
                    <button onClick={saveGroqKey} className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg">{t('profile:settings.aiSave')}</button>
                    {savedMsg && <span className="text-green-400 text-sm">{savedMsg}</span>}
                </div>
                <p className="text-gray-500 text-xs mt-3">{t('profile:settings.aiWarning')}</p>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/30 bg-cyan-400/5">
                <h2 className="text-xl mb-2 text-cyan-400 flex items-center gap-2">
                    <Icon name="download" size={18} /> {t('profile:settings.backupHeading')}
                </h2>
                <p className="text-gray-400 mb-4 text-sm">{t('profile:settings.backupBlurb')}</p>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportAllData} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">{t('profile:settings.exportAll')}</button>
                    <label className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg cursor-pointer">
                        {t('profile:settings.importFile')}
                        <input type="file" accept=".json" onChange={importAllData} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl mb-4">{t('profile:settings.exportSome')}</h2>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportTxt} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">{t('profile:settings.exportDiary')}</button>
                    <button onClick={exportCsv} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">{t('profile:settings.exportLogs')}</button>
                </div>
            </div>
        </div>
    );
}

/** Currencies offered by name. Anything else can be typed in — see the input. */
const COMMON_CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'KZT', 'GEL', 'TRY', 'RSD', 'AMD'];

function LanguageSettings({ currency, onCurrency }: { currency: string; onCurrency: (code: string) => void }) {
    const { t } = useTranslation('common');
    // `getLocale()` rather than store state: the language is not domain data,
    // and re-rendering on `t` changing is what keeps this in step.
    const current = getLocale();

    return (
        <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="text-xl flex items-center gap-2 mb-4">
                <Icon name="library" size={17} className="text-[var(--text-muted)]" />
                {t('language.heading')}
            </h2>

            <div className="mb-5">
                <label htmlFor="locale-select" className="text-sm text-[var(--text-muted)] block mb-2">
                    {t('language.label')}
                </label>
                <select
                    id="locale-select"
                    value={current}
                    onChange={e => { void changeLocale(e.target.value as Locale); }}
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400"
                >
                    {SUPPORTED_LOCALES.map(code => (
                        <option key={code} value={code}>{LOCALE_NAMES[code]}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">{t('language.hint')}</p>
            </div>

            <div>
                <label htmlFor="currency-input" className="text-sm text-[var(--text-muted)] block mb-2">
                    {t('language.currency')}
                </label>
                <input
                    id="currency-input"
                    list="currency-options"
                    value={currency}
                    maxLength={3}
                    onChange={e => {
                        const code = e.target.value.toUpperCase();
                        // Only commit a complete code, so the field stays editable
                        // while a three-letter code is half-typed.
                        if (/^[A-Z]{3}$/.test(code)) onCurrency(code);
                    }}
                    className="w-24 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm uppercase outline-none focus:border-cyan-400"
                />
                <datalist id="currency-options">
                    {COMMON_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                </datalist>
                <p className="text-xs text-gray-500 mt-2">{t('language.currencyHint')}</p>
            </div>
        </div>
    );
}
