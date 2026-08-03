import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { findTab } from './lib/nav';

export function ConceptV2App() {
    const [page, setPage] = useState('dashboard');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    return (
        <div className={`flex h-screen overflow-hidden font-sans ${theme === 'dark' ? 'bg-[#0a0b0e]' : 'bg-slate-50'}`}>
            <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
            <main className="flex-1 p-6 overflow-hidden">
                {page === 'dashboard'
                    ? <Dashboard />
                    : <PlaceholderPage title={findTab(page)?.label ?? page} />}
            </main>
        </div>
    );
}
