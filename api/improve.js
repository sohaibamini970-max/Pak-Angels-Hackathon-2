import { callGemini } from '../api-lib/gemini.js';

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

        // Guard against oversized inputs
        const safeText = text.slice(0, 12000);
        const safeInstruction = instruction.slice(0, 800);

        const out = await callGemini({
            system: SYSTEM,
            user: `CV:\n<cv>\n${safeText}\n</cv>\n\nInstruction: ${safeInstruction}`,
            temperature: 0.3,
            maxOutputTokens: 8192,
        });

        if (!out || !out.trim()) {
            console.error('Empty output from Gemini');
            return res.status(502).json({ error: 'Model returned an empty response' });
        }

        const cvMatch = out.match(/<cv>\s*([\s\S]*?)\s*<\/cv>/i);
        const replyMatch = out.match(/<reply>\s*([\s\S]*?)\s*<\/reply>/i);

        // Fallback: if <cv> tags are missing, use the whole output
        const cv = cvMatch ? cvMatch[1].trim() : out.trim();
        const reply = replyMatch ? replyMatch[1].trim() : '';

        if (!cv) {
            console.error('Unparseable output:', out.slice(0, 500));
            return res.status(502).json({ error: 'Model returned an unexpected format' });
        }

        return res.status(200).json({ updatedText: cv, reply });
    } catch (e) {
        console.error('improve failed:', e);
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}