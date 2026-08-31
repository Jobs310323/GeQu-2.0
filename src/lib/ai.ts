// Client-side Groq integration (free tier). The API key is stored locally in
// the browser (entered in Settings) and used to call Groq directly — no backend
// and no server-side environment variables required.
//
// This suits a single-user personal app: the key is NOT baked into the deployed
// bundle, it only ever lives in this browser's localStorage. Note that anyone
// with access to this browser's devtools could read it, so use a dedicated key.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const KEY_STORAGE = 'gequ_groq_key';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

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

export function getGroqKey(): string {
    try {
        return localStorage.getItem(KEY_STORAGE) || '';
    } catch {
        return '';
    }
}

export function setGroqKey(key: string): void {
    try {
        localStorage.setItem(KEY_STORAGE, key.trim());
    } catch {
        // ignore storage errors
    }
}

export function hasGroqKey(): boolean {
    return getGroqKey().length > 0;
}

/** Shared error mapping so every call site reports the same Russian messages. */
async function toError(res: Response): Promise<Error> {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) return new Error('Неверный ключ Groq — проверь его в Настройках.');
    if (res.status === 429) return new Error('Слишком много запросов к Groq. Подожди минуту и попробуй снова.');
    return new Error(detail ? `Ошибка Groq (${res.status}): ${detail.slice(0, 200)}` : `Ошибка Groq (${res.status}).`);
}

function requireKey(): string {
    if (!isOnline()) throw new Error('Нет подключения к сети — ИИ недоступен офлайн.');
    const key = getGroqKey();
    if (!key) throw new Error('Не задан ключ Groq. Добавь его в Настройках → раздел «ИИ (Groq)».');
    return key;
}

/**
 * Non-streaming call that asks the model for a single JSON object and parses it.
 * Used where the UI needs structured data (e.g. the day planner) rather than prose.
 */
export async function callAIJson<T = any>(opts: { system?: string; prompt: string; maxTokens?: number; signal?: AbortSignal }): Promise<T> {
    const key = requireKey();

    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
                { role: 'user', content: opts.prompt },
            ],
            max_tokens: Math.min(Math.max(opts.maxTokens || 1500, 256), 4096),
            temperature: 0.4,
            response_format: { type: 'json_object' },
        }),
        ...(opts.signal ? { signal: opts.signal } : {}),
    });

    if (!res.ok) throw await toError(res);

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Пустой ответ от ИИ.');
    try {
        return JSON.parse(content) as T;
    } catch {
        throw new Error('ИИ вернул ответ в неожиданном формате. Попробуй ещё раз.');
    }
}

/**
 * Streams a Groq chat completion straight from the browser. Calls `onToken` for
 * each text chunk and resolves with the full accumulated text. Throws with a
 * human-readable (Russian) message on failure.
 */
export async function streamAI(opts: StreamOptions): Promise<string> {
    const key = requireKey();

    const messages: ChatMessage[] = [
        ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
        ...opts.messages,
    ];

    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: Math.min(Math.max(opts.maxTokens || 1024, 256), 4096),
            // Lower temperature keeps the Russian output clean — at higher values
            // this model occasionally bleeds stray CJK tokens into the text.
            temperature: 0.5,
            stream: true,
        }),
        ...(opts.signal ? { signal: opts.signal } : {}),
    });

    if (!res.ok || !res.body) throw await toError(res);

    // Groq streams OpenAI-style SSE: lines of `data: {json}` ending with `[DONE]`.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') return full;
            try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content;
                if (text) {
                    full += text;
                    opts.onToken(text);
                }
            } catch {
                // partial/non-JSON keep-alive line — ignore
            }
        }
    }

    return full;
}
