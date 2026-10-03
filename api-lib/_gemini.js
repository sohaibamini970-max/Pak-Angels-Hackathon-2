export async function callGemini({ system, user, temperature = 0.3, maxOutputTokens = 8192 }) {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) throw new Error('GEMINI_API_KEY not configured');
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: `${system}\n\n${user}` }],
            },
        ],
        generationConfig: {
            temperature,
            maxOutputTokens,
        },
    };

    const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let lastError = '';

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!r.ok) {
                lastError = `${model} → ${r.status}: ${(await r.text()).slice(0, 200)}`;
                if (r.status === 404 || r.status === 400 || r.status === 503) continue;
                throw new Error(lastError);
            }

            const data = await r.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                lastError = `${model} → empty response`;
                continue;
            }
            return text;
        } catch (e) {
            lastError = `${model} → ${e.message}`;
        }
    }

    throw new Error(`All models failed: ${lastError}`);
}