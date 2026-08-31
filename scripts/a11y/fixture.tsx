/**
 * Accessibility fixture.
 *
 * Almost every screen in GeQu is behind Clerk auth, so an automated pass over
 * the running app can only reach the sign-in page. Rather than ship an auth
 * bypass just so a test can log in — a real security surface, kept out of the
 * repository on purpose — this mounts the shared interaction primitives
 * directly and drives *those*.
 *
 * It is not a substitute for a per-screen sweep. It covers the components whose
 * accessibility is structural and shared: get `Modal` wrong and every one of
 * the eight overlays is wrong. The per-screen sweep needs the authenticated E2E
 * harness and belongs to Phase 7.
 *
 * Dev-server only. Vite builds from the root `index.html`, so nothing here is
 * reachable from a production bundle.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { Modal } from '../../src/components/Modal';

function Harness() {
    const [open, setOpen] = useState(false);
    const [sheet, setSheet] = useState(false);

    return (
        <div style={{ padding: 24 }}>
            <a href="#main" className="gq-skip-link">К основному содержимому</a>
            <h1 className="t-h1">Fixture</h1>
            <main id="main">
                <button id="open-modal" type="button" onClick={() => setOpen(true)}
                    className="px-4 py-2 rounded-lg bg-cyan-400 text-black font-bold">
                    Открыть диалог
                </button>
                <button id="open-sheet" type="button" onClick={() => setSheet(true)}
                    className="ml-3 px-4 py-2 rounded-lg border border-[var(--border)]">
                    Открыть лист
                </button>
                <p id="outside" className="t-body mt-4">Фоновый текст</p>
                <button id="outside-button" type="button" className="px-3 py-1.5 rounded border border-[var(--border)]">
                    Кнопка снаружи
                </button>
            </main>

            {open && (
                <Modal title="Тестовый диалог" subtitle="Проверка фокуса" onClose={() => setOpen(false)}>
                    <button id="inside-a" type="button" className="px-3 py-1.5 rounded bg-white/5">A</button>
                    <button id="inside-b" type="button" className="px-3 py-1.5 rounded bg-white/5 ml-2">B</button>
                </Modal>
            )}
            {sheet && (
                <Modal title="Лист" onClose={() => setSheet(false)} sheet size="full">
                    <button id="sheet-a" type="button" className="px-3 py-1.5 rounded bg-white/5">A</button>
                </Modal>
            )}
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<Harness />);
