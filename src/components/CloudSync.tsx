import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { onDbChange } from '../lib/db';
import { OWNER_KEY, applySnapshot, clearLocalData, collectSnapshot, fetchRemote, pushRemote } from '../lib/cloud';

const PUSH_DEBOUNCE_MS = 2500;

/**
 * Bridges this browser's localStorage with the signed-in user's Postgres row.
 *
 * Runs once per sign-in: if this device already belongs to this account, it
 * just pushes local changes up (debounced). If the device switched accounts
 * (or is new), it pulls that account's data down first so nothing from the
 * previous user leaks in. Renders nothing — mount it once, high in the tree.
 */
export function CloudSync() {
    const { isSignedIn, userId, getToken } = useAuth();
    const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncingUser = useRef<string | null>(null);

    useEffect(() => {
        if (!isSignedIn || !userId) return;
        let cancelled = false;

        (async () => {
            const owner = localStorage.getItem(OWNER_KEY);
            const token = await getToken();
            if (!token || cancelled) return;

            if (owner === userId) {
                // Same account as last time on this device — nothing to pull.
                syncingUser.current = userId;
                return;
            }

            // New device, or a different account just signed in here: the
            // account's cloud copy is the source of truth.
            const remote = await fetchRemote(token).catch(() => null);
            if (cancelled) return;
            if (remote) {
                applySnapshot(remote);
            } else {
                // Nothing saved yet for this account — start clean rather
                // than handing it whatever the previous user left behind.
                clearLocalData();
            }
            localStorage.setItem(OWNER_KEY, userId);
            syncingUser.current = userId;
            // Every page's state was already initialized from localStorage at
            // mount, before this pull resolved — a reload is the simplest way
            // to make every `useState(DB.get(...))` pick up the new account's data.
            window.location.reload();
        })();

        return () => { cancelled = true; };
    }, [isSignedIn, userId, getToken]);

    useEffect(() => {
        if (!isSignedIn) return;
        return onDbChange(() => {
            // Ignore writes made by applySnapshot() itself finishing, and any
            // write before the initial pull has resolved.
            if (syncingUser.current !== userId) return;
            if (pushTimer.current) clearTimeout(pushTimer.current);
            pushTimer.current = setTimeout(async () => {
                const token = await getToken();
                if (!token) return;
                pushRemote(token, collectSnapshot()).catch(() => { /* retried on next change */ });
            }, PUSH_DEBOUNCE_MS);
        });
    }, [isSignedIn, userId, getToken]);

    return null;
}
