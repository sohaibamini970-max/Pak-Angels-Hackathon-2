export const maxDuration = 60;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(500).json({ error: 'Server API key not configured' });
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    const schema = {
        type: 'object',
        properties: {
            issues: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        original: { type: 'string' },
                        suggestion: { type: 'string' },
                        type: { type: 'string' },       // spelling | grammar | tone | clarity
                        explanation: { type: 'string' },
                    },
                    required: ['original', 'suggestion', 'type', 'explanation'],
                },
            },
        },
        required: ['issues'],
    };

    const systemPrompt =
        'You are a professional CV proofreader. Find spelling, grammar, tone, and clarity ' +
        'issues in the provided CV text. Return ONLY issues that are worth fixing — skip ' +
        'trivial stylistic preferences. For each issue, provide the exact original substring ' +
        '(copy it verbatim so it can be found in the text), a suggestion, a type ' +
        '(spelling|grammar|tone|clarity), and a one-sentence explanation. ' +
        'If there are no issues, return an empty array.';

    const body = {
        contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nCV text:\n${text}` }] },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.2,
        },
    };

    const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!r.ok) {
                const detail = await r.text();
                console.error(`[check:${model}] ${r.status}:`, detail.slice(0, 300));
                if (r.status === 404 || r.status === 400 || r.status === 503) continue;
                return res.status(r.status).json({ error: `Gemini error (${model})`, detail });
            }

            const data = await r.json();
            const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!out) continue;

            const parsed = JSON.parse(out);
            return res.status(200).json({ issues: parsed.issues || [] });
        } catch (e) {
            console.error(`[check:${model}] threw:`, e);
        }
    }

    return res.status(500).json({ error: 'No compatible Gemini model available' });
}