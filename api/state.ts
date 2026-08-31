// Per-user cloud storage for the whole app state.
//
// The app keeps working out of localStorage; this endpoint stores one JSON
// snapshot per Clerk user so the same account sees the same data from any
// browser. One row per user is enough — the payload is a few hundred KB at most.
//
// WRITES ARE CONDITIONAL. A PUT carries the `version` the client last read, and
// the update only applies if the stored row is still at that version. If it has
// moved on, the write is refused with 409 and the current row is returned so the
// client can merge and retry.
//
// Without that check a client cannot tell it is overwriting newer data — which
// is precisely how this app used to lose a device's work whenever two browsers
// were used in sequence. The client-side half of the fix is `src/lib/merge.ts`.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Runs once per cold start rather than on every request.
let schemaReady: Promise<unknown> | null = null;
function ensureSchema() {
    schemaReady ??= (async () => {
        await sql`
            CREATE TABLE IF NOT EXISTS user_state (
                user_id    text PRIMARY KEY,
                data       jsonb NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now()
            )`;
        // Added after the table shipped, so it has to be a separate migration:
        // `CREATE TABLE IF NOT EXISTS` does nothing to an existing table.
        // Existing rows start at version 1.
        await sql`ALTER TABLE user_state ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1`;
    })();
    return schemaReady;
}

async function userIdFrom(req: VercelRequest): Promise<string | null> {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return null;
    try {
        const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
        return payload.sub ?? null;
    } catch {
        return null; // expired or forged token
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const userId = await userIdFrom(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    try {
        await ensureSchema();

        if (req.method === 'GET') {
            const rows = await sql`
                SELECT data, version, updated_at FROM user_state WHERE user_id = ${userId}`;
            const row = rows[0];
            return res.status(200).json({
                data: row?.data ?? null,
                // 0 means "no row yet", which a client can send as baseVersion
                // to claim the row without racing another tab.
                version: row?.version ?? 0,
                updatedAt: row?.updated_at ?? null,
            });
        }

        if (req.method === 'PUT') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const data = body?.data;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                return res.status(400).json({ error: 'expected { data: object }' });
            }

            const baseVersion = Number(body?.baseVersion);
            if (!Number.isInteger(baseVersion) || baseVersion < 0) {
                return res.status(400).json({ error: 'expected integer baseVersion' });
            }

            const payload = JSON.stringify(data);

            if (baseVersion === 0) {
                // Claiming a row that should not exist yet. DO NOTHING rather
                // than DO UPDATE, so a second device that also thinks the row is
                // new cannot blank out the first one's data.
                const inserted = await sql`
                    INSERT INTO user_state (user_id, data, version, updated_at)
                    VALUES (${userId}, ${payload}::jsonb, 1, now())
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING version`;
                if (inserted.length > 0) {
                    return res.status(200).json({ ok: true, version: inserted[0]!.version });
                }
                // Somebody got there first — fall through to the conflict reply.
            } else {
                const updated = await sql`
                    UPDATE user_state
                       SET data = ${payload}::jsonb,
                           version = version + 1,
                           updated_at = now()
                     WHERE user_id = ${userId} AND version = ${baseVersion}
                 RETURNING version`;
                if (updated.length > 0) {
                    return res.status(200).json({ ok: true, version: updated[0]!.version });
                }
            }

            // Stale write. Hand back the current row so the client can merge
            // against it and retry, rather than being told only that it failed.
            const rows = await sql`
                SELECT data, version, updated_at FROM user_state WHERE user_id = ${userId}`;
            const row = rows[0];
            return res.status(409).json({
                error: 'version conflict',
                data: row?.data ?? null,
                version: row?.version ?? 0,
                updatedAt: row?.updated_at ?? null,
            });
        }

        if (req.method === 'DELETE') {
            // Account data deletion. Phase 12 extends this to the Clerk account
            // itself; today it removes everything this endpoint stores.
            await sql`DELETE FROM user_state WHERE user_id = ${userId}`;
            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'method not allowed' });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'server error';
        return res.status(500).json({ error: message });
    }
}
