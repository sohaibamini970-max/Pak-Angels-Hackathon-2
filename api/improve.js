export const config = { maxDuration: 60 };

const SYSTEM = `You edit CVs. You receive the full CV text and an instruction.
Rules:
- Return the COMPLETE updated CV, not just the changed parts.
- Keep every unchanged line exactly identical, with the same line breaks.
- Add new items as new lines under the matching section (create the section heading in UPPERCASE if it is missing).
- Never invent facts. Only use what the user provides.
Output format, exactly:
<reply>one or two short sentences describing what you changed</reply>
<cv>
the full updated CV text
</cv>`;

async function callGemini({ system, user }) {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) throw new Error('GEMINI_API_KEY not configured');
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    const body = {
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    };

    const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let lastError = '';

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            console.log(`[improve] trying ${model}`);
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!r.ok) {
                const detail = (await r.text()).slice(0, 300);
                lastError = `${model} → ${r.status}: ${detail}`;
                console.error(`[improve] ${lastError}`);
                if (r.status === 404 || r.status === 400 || r.status === 503) continue;
                throw new Error(lastError);
            }

            const data = await r.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                lastError = `${model} → empty response`;
                continue;
            }
            console.log(`[improve] ${model} returned ${text.length} chars`);
            return text;
        } catch (e) {
            lastError = `${model} → ${e.message}`;
            console.error(`[improve] threw:`, e.message);
        }
    }

    throw new Error(`All models failed. Last: ${lastError}`);
}

export default async function handler(req, res) {
    console.log('=== /api/improve hit ===');
    console.log('KEY:', process.env.GEMINI_API_KEY ? 'present' : 'MISSING');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        console.log('BODY KEYS:', Object.keys(body));

        // Accept both field names
        const text = body.text || body.currentText;
        const instruction = body.instruction;

        if (!text || !instruction) {
            console.log('MISSING — text:', !!text, 'instruction:', !!instruction);
            return res.status(400).json({
                error: 'Both "text" and "instruction" are required',
                received: Object.keys(body),
            });
        }

        const out = await callGemini({
            system: SYSTEM,
            user: `CV:\n<cv>\n${text.slice(0, 12000)}\n</cv>\n\nInstruction: ${instruction.slice(0, 800)}`,
        });

        if (!out || !out.trim()) {
            return res.status(502).json({ error: 'Model returned an empty response' });
        }

        const cvMatch = out.match(/<cv>\s*([\s\S]*?)\s*<\/cv>/i);
        const replyMatch = out.match(/<reply>\s*([\s\S]*?)\s*<\/reply>/i);
        const cv = cvMatch ? cvMatch[1].trim() : out.trim();
        const reply = replyMatch ? replyMatch[1].trim() : '';

        return res.status(200).json({ updatedText: cv, reply });
    } catch (e) {
        console.error('IMPROVE FAILED:', e);
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}