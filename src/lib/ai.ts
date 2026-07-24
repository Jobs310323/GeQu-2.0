// Client-side helper for talking to the Claude proxy (netlify/functions/claude).
// The API key never touches the browser — this only calls our own endpoint.

const ENDPOINT = '/.netlify/functions/claude';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface StreamOptions {
    system?: string;
    messages: ChatMessage[];
    maxTokens?: number;
    onToken: (chunk: string) => void;
    signal?: AbortSignal;
}

export function isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// Optional access passphrase (matches GEQU_ACCESS_KEY on the server, if set).
export function getAccessKey(): string {
    try {
        return localStorage.getItem('gequ_ai_key') || '';
    } catch {
        return '';
    }
}

export function setAccessKey(key: string): void {
    try {
        localStorage.setItem('gequ_ai_key', key);
    } catch {
        // ignore
    }
}

/**
 * Streams a Claude response. Calls `onToken` for each text chunk and resolves
 * with the full accumulated text. Throws with a human-readable message on
 * failure (offline, server error, etc.).
 */
export async function streamClaude(opts: StreamOptions): Promise<string> {
    if (!isOnline()) {
        throw new Error('Нет подключения к сети — ИИ-функции недоступны офлайн.');
    }

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-gequ-key': getAccessKey(),
        },
        body: JSON.stringify({
            system: opts.system,
            messages: opts.messages,
            maxTokens: opts.maxTokens,
        }),
        signal: opts.signal,
    });

    if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '');
        if (res.status === 401) {
            throw new Error('Доступ закрыт: неверный ключ доступа (проверь настройки).');
        }
        throw new Error(detail || `Сервер вернул ошибку (${res.status}).`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        opts.onToken(chunk);
    }

    return full;
}
