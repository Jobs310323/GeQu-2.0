// Per-user cloud storage for the whole app state.
//
// The app keeps working out of localStorage; this endpoint just stores one
// JSON snapshot per Clerk user so the same account sees the same data from any
// browser. One row per user is enough — the payload is a few hundred KB at most
// and every write replaces it wholesale.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Runs once per cold start rather than on every request.
let schemaReady: Promise<unknown> | null = null;
function ensureSchema() {
    schemaReady ??= sql`
        CREATE TABLE IF NOT EXISTS user_state (
            user_id    text PRIMARY KEY,
            data       jsonb NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
        )`;
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
            const rows = await sql`SELECT data, updated_at FROM user_state WHERE user_id = ${userId}`;
            const row = rows[0];
            return res.status(200).json({ data: row?.data ?? null, updatedAt: row?.updated_at ?? null });
        }

        if (req.method === 'PUT') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const data = body?.data;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                return res.status(400).json({ error: 'expected { data: object }' });
            }
            await sql`
                INSERT INTO user_state (user_id, data, updated_at)
                VALUES (${userId}, ${JSON.stringify(data)}::jsonb, now())
                ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ error: 'method not allowed' });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message ?? 'server error' });
    }
}
