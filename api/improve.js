export const maxDuration = 60;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { currentText, instruction } = req.body || {};
    if (!currentText?.trim() || !instruction?.trim()) {
        return res.status(400).json({ error: 'Missing currentText or instruction' });
    }

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(500).json({ error: 'Server API key not configured' });
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    const schema = {
        type: 'object',
        properties: {
            updatedText: { type: 'string' },
            changesSummary: { type: 'string' },
        },
        required: ['updatedText', 'changesSummary'],
    };

    const systemPrompt =
        'You are editing a CV. The user provides the current CV text and an instruction. ' +
        'Apply the instruction and return the FULL updated CV text. ' +
        'Preserve all sections and formatting. Do NOT add commentary inside the text. ' +
        'Also return a one-sentence summary of what you changed.';

    const body = {
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `${systemPrompt}\n\n--- CURRENT CV ---\n${currentText}\n\n--- INSTRUCTION ---\n${instruction}`,
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.3,
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
                console.error(`[improve:${model}] ${r.status}:`, detail.slice(0, 300));
                if (r.status === 404 || r.status === 400 || r.status === 503) continue;
                return res.status(r.status).json({ error: `Gemini error (${model})`, detail });
            }

            const data = await r.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) continue;

            const parsed = JSON.parse(text);
            return res.status(200).json(parsed);
        } catch (e) {
            console.error(`[improve:${model}] threw:`, e);
        }
    }

    return res.status(500).json({ error: 'No compatible Gemini model available' });
}