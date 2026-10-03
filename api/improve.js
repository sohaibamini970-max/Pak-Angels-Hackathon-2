import { callGemini } from './_gemini.js';

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

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const { text, instruction } = body;
        if (!text || !instruction) {
            return res.status(400).json({ error: 'Both "text" and "instruction" are required' });
        }

        const out = await callGemini({
            system: SYSTEM,
            user: `CV:\n<cv>\n${text}\n</cv>\n\nInstruction: ${instruction}`,
        });

        const cv = out.match(/<cv>\s*([\s\S]*?)\s*<\/cv>/i)?.[1];
        const reply = out.match(/<reply>\s*([\s\S]*?)\s*<\/reply>/i)?.[1]?.trim();

        if (!cv) {
            console.error('Unparseable output:', out.slice(0, 500));
            return res.status(502).json({ error: 'Model returned an unexpected format' });
        }
        return res.status(200).json({ updatedText: cv, reply: reply || '' });
    } catch (e) {
        console.error('improve failed:', e);
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}