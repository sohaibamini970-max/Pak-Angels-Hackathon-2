export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured' });

  const schema = {
    type: 'object',
    properties: {
      personalInfo: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          location: { type: 'string' },
          linkedin: { type: 'string' },
          github: { type: 'string' },
        },
        required: ['name', 'email', 'phone', 'location', 'linkedin', 'github'],
      },
      summary: { type: 'string' },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            role: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
          required: ['company', 'role', 'startDate', 'endDate', 'bullets'],
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution: { type: 'string' },
            degree: { type: 'string' },
            year: { type: 'string' },
            gpa: { type: 'string' },
          },
          required: ['institution', 'degree', 'year', 'gpa'],
        },
      },
      skills: {
        type: 'object',
        properties: {
          technical: { type: 'array', items: { type: 'string' } },
          soft: { type: 'array', items: { type: 'string' } },
        },
        required: ['technical', 'soft'],
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            tech: { type: 'array', items: { type: 'string' } },
            link: { type: 'string' },
          },
          required: ['name', 'description', 'tech', 'link'],
        },
      },
      certifications: { type: 'array', items: { type: 'string' } },
      languages: { type: 'array', items: { type: 'string' } },
      awards: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'personalInfo', 'summary', 'experience', 'education',
      'skills', 'projects', 'certifications', 'languages', 'awards',
    ],
  };

  const systemPrompt =
    'You are an expert CV writer. Given a short description of a person, produce a ' +
    'complete, professional CV. Use strong action verbs in experience bullets. ' +
    'Quantify impact where plausible. Keep the summary to 2-3 sentences. ' +
    'Use empty strings for unknown fields — never invent emails, phone numbers, or companies. ' +
    'Write 3-5 bullets per experience entry.';

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser description:\n${prompt}` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4,
    },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(500).json({ error: 'Gemini error', detail });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini', detail: JSON.stringify(data) });
    }

    const parsed = JSON.parse(text);
    const uid = () => Math.random().toString(36).slice(2, 10);
    parsed.experience = (parsed.experience || []).map((e) => ({ ...e, id: uid() }));
    parsed.education = (parsed.education || []).map((e) => ({ ...e, id: uid() }));
    parsed.projects = (parsed.projects || []).map((e) => ({ ...e, id: uid() }));

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}