import Anthropic from '@anthropic-ai/sdk';

// Serverless proxy for Claude. The ANTHROPIC_API_KEY lives only here (Netlify
// env var) — it is never shipped to the browser. Streams plain-text deltas back
// to the client so the UI can render the answer as it is generated.
//
// Optional access gate: set GEQU_ACCESS_KEY in the Netlify env to require a
// matching `x-gequ-key` header. Since the deployed URL is public, this stops a
// random visitor from finding the endpoint and burning your API credits.

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const gate = process.env.GEQU_ACCESS_KEY;
    if (gate && req.headers.get('x-gequ-key') !== gate) {
        return new Response('Unauthorized', { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return new Response('ANTHROPIC_API_KEY is not configured on the server', { status: 500 });
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

    const anthropic = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                const messageStream = anthropic.messages.stream({
                    model: 'claude-sonnet-5',
                    max_tokens: Math.min(Math.max(Number(maxTokens) || 1024, 256), 4096),
                    thinking: { type: 'disabled' }, // keep it fast and cheap for short answers
                    ...(typeof system === 'string' && system ? { system } : {}),
                    messages,
                });
                for await (const event of messageStream) {
                    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                        controller.enqueue(encoder.encode(event.delta.text));
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
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
};
