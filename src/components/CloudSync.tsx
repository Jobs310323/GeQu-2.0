import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { onDbChange } from '../lib/db';
import {
    OWNER_KEY, VersionConflict, applySnapshot, clearLocalData,
    collectSnapshot, fetchRemote, pushRemote,
} from '../lib/cloud';
import { mergeSnapshots } from '../lib/merge';
import { rehydrateStores } from '../stores/rehydrate';

const PUSH_DEBOUNCE_MS = 2500;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * Bridges this browser's localStorage with the signed-in user's Postgres row.
 *
 * WHAT CHANGED, AND WHY IT MATTERED
 *
 * This component used to pull only when the *account* changed:
 *
 *     const owner = localStorage.getItem(OWNER_KEY);
 *     if (owner === userId) return;           // ← never fetched
 *
 * So a device that had been used before never re-read the cloud. Laptop, then
 * phone, then laptop again: the laptop still had `OWNER_KEY === userId`, skipped
 * the pull, and its first edit pushed a stale whole-blob snapshot over
 * everything the phone had done. Silently, and with no bound on how much was
 * lost.
 *
 * Now it always pulls, always merges (`lib/merge.ts`), and pushes conditionally
 * on the version it read. A conflicting write comes back as 409 with the winning
 * row attached, which is merged and retried once.
 *
 * Renders a small status chip; mount it once, high in the tree.
 */
export function CloudSync() {
    const { isSignedIn, userId, getToken } = useAuth();
    const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ready = useRef<string | null>(null);
    /** The version the local data is based on. Updated by every pull and push. */
    const baseVersion = useRef(0);
    const [status, setStatus] = useState<SyncStatus>('idle');

    /** Merge the account's copy into this device's, then adopt the result. */
    const pullAndMerge = useCallback(async (token: string) => {
        const remote = await fetchRemote(token);
        baseVersion.current = remote.version;
        if (!remote.snapshot) return;

        const merged = mergeSnapshots(collectSnapshot(), remote.snapshot);
        applySnapshot(merged);
        // The stores were built from localStorage at mount, before this
        // resolved. Re-read them rather than reloading the page.
        rehydrateStores();
    }, []);

    // ── Sign-in: adopt the account's data ───────────────────────────────────
    useEffect(() => {
        if (!isSignedIn || !userId) return;
        let cancelled = false;

        (async () => {
            setStatus('syncing');
            const token = await getToken();
            if (!token || cancelled) return;

            const owner = localStorage.getItem(OWNER_KEY);
            if (owner && owner !== userId) {
                // A different account signed in on this device. Its data is not
                // this account's to merge — start from the account's own copy.
                clearLocalData();
            }

            try {
                await pullAndMerge(token);
                if (cancelled) return;
                localStorage.setItem(OWNER_KEY, userId);
                ready.current = userId;
                setStatus('synced');
            } catch {
                if (cancelled) return;
                // Offline or the endpoint is down. Local data is untouched and
                // still usable; do NOT arm the pusher, or this device would
                // push a snapshot it never reconciled.
                setStatus(navigator.onLine ? 'error' : 'offline');
            }
        })();

        return () => { cancelled = true; };
    }, [isSignedIn, userId, getToken, pullAndMerge]);

    // ── Local change: push, conditionally ───────────────────────────────────
    useEffect(() => {
        if (!isSignedIn) return;
        return onDbChange(() => {
            // Ignore writes made by applySnapshot() itself, and anything before
            // the initial pull has resolved.
            if (ready.current !== userId) return;
            if (pushTimer.current) clearTimeout(pushTimer.current);
            pushTimer.current = setTimeout(async () => {
                const token = await getToken();
                if (!token) return;
                setStatus('syncing');
                try {
                    baseVersion.current = await pushRemote(token, collectSnapshot(), baseVersion.current);
                    setStatus('synced');
                } catch (e) {
                    if (e instanceof VersionConflict) {
                        // Another device wrote first. Merge its copy in and
                        // retry once against the version it reported.
                        try {
                            const { snapshot, version } = e.current;
                            baseVersion.current = version;
                            if (snapshot) {
                                applySnapshot(mergeSnapshots(collectSnapshot(), snapshot));
                                rehydrateStores();
                            }
                            baseVersion.current = await pushRemote(token, collectSnapshot(), baseVersion.current);
                            setStatus('synced');
                        } catch {
                            // A second conflict means a third device is active.
                            // Leave it — the next local change retries, and the
                            // merge is a union so nothing has been lost.
                            setStatus('error');
                        }
                        return;
                    }
                    setStatus(navigator.onLine ? 'error' : 'offline');
                }
            }, PUSH_DEBOUNCE_MS);
        });
    }, [isSignedIn, userId, getToken]);

    if (!isSignedIn || status === 'idle' || status === 'synced') return null;

    return <SyncChip status={status} />;
}

const CHIP: Record<Exclude<SyncStatus, 'idle' | 'synced'>, { key: string; tone: string }> = {
    syncing: { key: 'common:sync.syncing', tone: 'text-[var(--gq-text-tertiary)]' },
    offline: { key: 'common:sync.offline', tone: 'text-warning' },
    error: { key: 'common:sync.error', tone: 'text-danger' },
};

/**
 * Deliberately unobtrusive and deliberately not a modal: sync state is
 * information, not a decision the user has to make. Local data is always
 * usable, so nothing here should block or alarm.
 */
function SyncChip({ status }: { status: Exclude<SyncStatus, 'idle' | 'synced'> }) {
    const { t } = useTranslation('common');
    const { key, tone } = CHIP[status];
    return (
        <output
            aria-live="polite"
            className={`fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-sticky
                glass-card rounded-full px-3.5 py-1.5 t-caption ${tone} pointer-events-none`}
        >
            {t(key)}
        </output>
    );
}
