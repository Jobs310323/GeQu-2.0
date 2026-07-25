import { useState } from 'react';
import { ALL_TABS, LOCKED_TABS } from '../lib/nav';
import { DASHBOARD_WIDGETS, UNMOVABLE_PAGES } from '../lib/prefs';

type Zone = 'menu' | 'dashboard';
type Item = { id: string; icon: string; label: string; origin: 'page' | 'widget'; locked: boolean };

/**
 * Chip and DropZone live at module scope on purpose. Declared inside the
 * component they would be a new component *type* on every render, so React
 * would unmount and remount them — which destroys the element mid-drag and
 * breaks the operation.
 */
function Chip({ item, misplaced, isDragging, onDragStart, onDragEnd }: {
    item: Item; misplaced: boolean; isDragging: boolean;
    onDragStart: () => void; onDragEnd: () => void;
}) {
    return (
        <div
            draggable={!item.locked}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title={item.locked ? 'Этот раздел нельзя перемещать'
                : misplaced ? 'Перетащи обратно, чтобы вернуть на место' : 'Перетащи в другую колонку'}
            className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 select-none ${
                item.locked ? 'border-[var(--border)] text-gray-500 opacity-60 cursor-not-allowed'
                    : 'cursor-grab active:cursor-grabbing hover:border-cyan-400/40 ' + (
                        misplaced ? 'bg-purple-400/10 text-purple-400 border-purple-400/40'
                                  : 'bg-[var(--bg-input)] text-gray-300 border-[var(--border)]')
            } ${isDragging ? 'opacity-40' : ''}`}
        >
            <span>{item.icon}</span>{item.label}
            {item.locked && <span className="text-[10px]">🔒</span>}
        </div>
    );
}

function DropZone({ title, hint, active, children, onEnter, onLeave, onDrop }: any) {
    return (
        <div
            onDragOver={e => { e.preventDefault(); onEnter(); }}
            onDragLeave={onLeave}
            onDrop={e => { e.preventDefault(); onDrop(); }}
            className={`flex-1 min-w-0 rounded-xl border-2 border-dashed p-4 transition ${
                active ? 'border-cyan-400 bg-cyan-400/5' : 'border-[var(--border)]'
            }`}
        >
            <div className="mb-1 font-bold">{title}</div>
            <p className="text-xs text-gray-500 mb-3">{hint}</p>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

/**
 * Two drop zones — the menu and the dashboard — with every page and widget
 * draggable between them.
 *
 * `asWidget` holds pages living on the dashboard, `asPage` holds widgets living
 * in the menu. Both are overrides on top of each item's natural home, so
 * dragging something back simply clears its override.
 */
export function LayoutArranger({ prefs, setPrefs }: any) {
    const asWidget: string[] = prefs?.asWidget ?? [];
    const asPage: string[] = prefs?.asPage ?? [];
    const [dragging, setDragging] = useState<Item | null>(null);
    const [over, setOver] = useState<Zone | null>(null);

    const all: Item[] = [
        ...ALL_TABS.map(t => ({
            id: t.id, icon: t.icon, label: t.label, origin: 'page' as const,
            locked: UNMOVABLE_PAGES.has(t.id) || LOCKED_TABS.has(t.id),
        })),
        ...DASHBOARD_WIDGETS.map(w => ({
            id: w.id, icon: w.icon, label: w.label, origin: 'widget' as const, locked: false,
        })),
    ];

    const homeOf = (i: Item): Zone => (i.origin === 'page' ? 'menu' : 'dashboard');
    const zoneOf = (i: Item): Zone =>
        i.origin === 'page'
            ? (asWidget.includes(i.id) ? 'dashboard' : 'menu')
            : (asPage.includes(i.id) ? 'menu' : 'dashboard');

    const moveTo = (item: Item, zone: Zone) => {
        if (item.locked || zoneOf(item) === zone) return;
        setPrefs((p: any) => {
            const w: string[] = p.asWidget ?? [];
            const g: string[] = p.asPage ?? [];
            return item.origin === 'page'
                ? { ...p, asWidget: zone === 'dashboard' ? [...w, item.id] : w.filter(x => x !== item.id) }
                : { ...p, asPage: zone === 'menu' ? [...g, item.id] : g.filter(x => x !== item.id) };
        });
    };

    const handleDrop = (zone: Zone) => {
        if (dragging) moveTo(dragging, zone);
        setDragging(null);
        setOver(null);
    };

    const movedCount = asWidget.length + asPage.length;

    const chipsFor = (zone: Zone) =>
        all.filter(i => zoneOf(i) === zone).map(i => (
            <Chip
                key={`${i.origin}-${i.id}`}
                item={i}
                misplaced={zoneOf(i) !== homeOf(i)}
                isDragging={dragging?.id === i.id && dragging?.origin === i.origin}
                onDragStart={() => setDragging(i)}
                onDragEnd={() => { setDragging(null); setOver(null); }}
            />
        ));

    return (
        <div className="glass-card p-6 rounded-2xl mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h2 className="text-xl">🧲 Раскладка интерфейса</h2>
                {movedCount > 0 && (
                    <button onClick={() => setPrefs((p: any) => ({ ...p, asWidget: [], asPage: [] }))}
                        className="text-xs text-cyan-400 hover:underline">
                        Вернуть всё по местам ({movedCount})
                    </button>
                )}
            </div>
            <p className="text-gray-400 text-sm mb-4">
                Перетаскивай мышью: раздел из меню станет мини-приложением на дашборде, а виджет дашборда — отдельным разделом меню.
                Фиолетовым отмечено то, что переехало.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
                <DropZone title="🧭 Меню" hint="Разделы в боковой панели"
                    active={over === 'menu'}
                    onEnter={() => setOver('menu')}
                    onLeave={() => setOver(o => (o === 'menu' ? null : o))}
                    onDrop={() => handleDrop('menu')}>
                    {chipsFor('menu')}
                </DropZone>

                <DropZone title="⬢ Дашборд" hint="Блоки на «Закрытии дня»"
                    active={over === 'dashboard'}
                    onEnter={() => setOver('dashboard')}
                    onLeave={() => setOver(o => (o === 'dashboard' ? null : o))}
                    onDrop={() => handleDrop('dashboard')}>
                    {chipsFor('dashboard')}
                </DropZone>
            </div>
        </div>
    );
}
