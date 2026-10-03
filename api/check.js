import { callGemini } from './_gemini.js';

export const config = { maxDuration: 60 };

const SYSTEM = `You proofread CVs. Find spelling, grammar, punctuation, capitalization and wording mistakes.
Return ONLY a JSON object, no markdown:
{"issues":[{"type":"spelling|grammar|punctuation|style","original":"...","suggestion":"...","explanation":"..."}]}
Rules:
- "original" must be copied EXACTLY, character for character, from the CV, and kept short (the wrong word or phrase, not the whole line).
- "suggestion" is the corrected replacement for "original".
- Do not flag names, emails, URLs or technical terms (React, Node.js, etc.).
- If there are no mistakes, return {"issues":[]}.`;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const { text } = body;
        if (!text) return res.status(400).json({ error: '"text" is required' });

        const out = await callGemini({
            system: SYSTEM,
            user: `CV:\n${text}`,
            json: true,
        });

        let parsed;
        try {
            parsed = JSON.parse(out.replace(/```json|```/g, '').trim());
        } catch {
            console.error('Bad JSON from model:', out.slice(0, 500));
            return res.status(502).json({ error: 'Model returned invalid JSON' });
        }

        // keep only issues whose "original" really exists in the CV
        const issues = (Array.isArray(parsed.issues) ? parsed.issues : []).filter(
            (i) =>
                i &&
                typeof i.original === 'string' &&
                i.original &&
                typeof i.suggestion === 'string' &&
                text.includes(i.original)
        );
        return res.status(200).json({ issues });
    } catch (e) {
        console.error('check failed:', e);
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}