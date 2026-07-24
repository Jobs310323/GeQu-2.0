// Serverless proxy for a free LLM provider (Groq — OpenAI-compatible API).
// The GROQ_API_KEY lives only here (Netlify env var) and is never shipped to
// the browser. Streams plain-text deltas back so the UI can render as it goes.
//
// Request  (POST JSON): { system?: string, messages: {role, content}[], maxTokens?: number }
// Response: streamed text/plain
//
// Optional access gate: set GEQU_ACCESS_KEY in the Netlify env to require a
// matching `x-gequ-key` header (the deployed function URL is public).

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const gate = process.env.GEQU_ACCESS_KEY;
    if (gate && req.headers.get('x-gequ-key') !== gate) {
        return new Response('Unauthorized', { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return new Response('GROQ_API_KEY is not configured on the server', { status: 500 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response('Invalid JSON body', { status: 400 });
    }

    const { system, messages, maxTokens } = body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return new Response('`messages` array is required', { status: 400 });
    }

    const fullMessages = [
        ...(typeof system === 'string' && system ? [{ role: 'system', content: system }] : []),
        ...messages,
    ];

    const upstream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages: fullMessages,
            max_tokens: Math.min(Math.max(Number(maxTokens) || 1024, 256), 4096),
            stream: true,
        }),
    });

    if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => '');
        return new Response(`Ошибка провайдера (${upstream.status}): ${detail.slice(0, 300)}`, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    // Groq streams OpenAI-style SSE: lines of `data: {json}` ending with `[DONE]`.
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let buffer = '';
            try {
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
                        if (data === '[DONE]') return; // finally closes the stream
                        try {
                            const json = JSON.parse(data);
                            const text = json.choices?.[0]?.delta?.content;
                            if (text) controller.enqueue(encoder.encode(text));
                        } catch {
                            // partial/non-JSON keep-alive line — ignore
                        }
                    }
                }
            } catch (err: any) {
                controller.enqueue(encoder.encode(`\n\n[Ошибка ИИ: ${err?.message ?? 'неизвестная ошибка'}]`));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
};
