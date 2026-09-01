import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SECTIONS, TODAY_ITEM, sectionForPath } from '../lib/nav';
import { Icon } from './Icons';
import { Modal } from './Modal';

/**
 * Mobile navigation.
 *
 * Five targets: Today, Plan, Track, Insights, and a drawer holding the rest.
 * Five because a sixth stops being reachable with a thumb on a 375px screen,
 * and because the first four cover the loop — capture, plan, act, reflect.
 *
 * Hidden on desktop; `Sidebar` takes over there.
 */
export function BottomNav() {
    const { t } = useTranslation(['common', 'nav']);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { pathname } = useLocation();
    const current = sectionForPath(pathname);

    const primary = SECTIONS.filter(s => ['plan', 'track', 'insights'].includes(s.id));
    const inDrawer = SECTIONS.filter(s => ['brain', 'profile'].includes(s.id));
    const drawerActive = inDrawer.some(s => s.id === current?.id);

    return (
        <>
            <nav
                aria-label={t('common:nav.main')}
                className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-card)] border-t border-[var(--border)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
            >
                <ul className="flex items-stretch">
                    <li className="flex-1">
                        <NavLink to={TODAY_ITEM.path} end className={({ isActive }) => tabClass(isActive)}>
                            <Icon name={TODAY_ITEM.icon} size={19} />
                            <span className="text-[10px]">{t(TODAY_ITEM.labelKey)}</span>
                        </NavLink>
                    </li>
                    {primary.map(section => (
                        <li key={section.id} className="flex-1">
                            <NavLink to={section.path} className={() => tabClass(current?.id === section.id)}>
                                <Icon name={section.icon} size={19} />
                                <span className="text-[10px]">{t(section.titleKey)}</span>
                            </NavLink>
                        </li>
                    ))}
                    <li className="flex-1">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            aria-expanded={drawerOpen}
                            aria-haspopup="dialog"
                            className={`${tabClass(drawerActive)} w-full`}
                        >
                            <Icon name="grid" size={19} />
                            <span className="text-[10px]">{t('common:nav.more')}</span>
                        </button>
                    </li>
                </ul>
            </nav>

            {drawerOpen && <MoreDrawer onClose={() => setDrawerOpen(false)} />}
        </>
    );
}

function tabClass(isActive: boolean): string {
    // min-h-14 keeps every tab a comfortable thumb target without claiming a
    // specific pixel size is a WCAG requirement — it is not; it is good practice.
    return `flex flex-col items-center justify-center gap-1 min-h-14 py-2 transition ${
        isActive ? 'text-cyan-400' : 'text-[var(--text-muted)]'
    }`;
}

/** Everything that does not fit the five tabs, one tap away. */
function MoreDrawer({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation(['common', 'nav']);
    const sections = SECTIONS.filter(s => ['brain', 'profile', 'today'].includes(s.id));

    return (
        <Modal title={t('common:nav.sections')} onClose={onClose} sheet size="full">

                {sections.map(section => (
                    <div key={section.id} className="mb-4 last:mb-0">
                        <h3 className="t-label mb-1.5 px-1">{t(section.titleKey)}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {section.items.map(item => (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    onClick={onClose}
                                    className={({ isActive }) => `flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm transition ${
                                        isActive
                                            ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/25'
                                            : 'border-[var(--border)] hover:bg-white/5'
                                    }`}
                                >
                                    <Icon name={item.icon} size={16} className="shrink-0" />
                                    <span className="truncate">{t(item.labelKey)}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
        </Modal>
    );
}
