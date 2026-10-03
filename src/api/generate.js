export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured' });

  const schema = {
    type: 'json_schema',
    json_schema: {
      name: 'cv_data',
      strict: true,
      schema: {
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
            additionalProperties: false,
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
              additionalProperties: false,
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
              additionalProperties: false,
            },
          },
          skills: {
            type: 'object',
            properties: {
              technical: { type: 'array', items: { type: 'string' } },
              soft: { type: 'array', items: { type: 'string' } },
            },
            required: ['technical', 'soft'],
            additionalProperties: false,
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
              additionalProperties: false,
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
        additionalProperties: false,
      },
    },
  };

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert CV writer. Given a short description of a person, produce a ' +
              'complete, professional CV. Rules:\n' +
              '1. Use strong action verbs (Built, Led, Designed, Reduced, Shipped) in experience bullets.\n' +
              '2. Quantify impact where plausible (numbers, %, time saved).\n' +
              '3. Keep the summary to 2-3 sentences.\n' +
              '4. If a field is unknown, use an empty string — never invent emails, phone numbers, or specific companies.\n' +
              '5. Write 3-5 bullets per experience entry.\n' +
              '6. Infer the field (frontend/backend/data/etc.) from the skills and projects mentioned.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: schema,
      }),
    });

    if (!r.ok) {
      return res.status(500).json({ error: 'OpenAI error', detail: await r.text() });
    }

    const data = await r.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    // Add stable IDs for React keys
    const uid = () => Math.random().toString(36).slice(2, 10);
    parsed.experience = parsed.experience.map((e) => ({ ...e, id: uid() }));
    parsed.education = parsed.education.map((e) => ({ ...e, id: uid() }));
    parsed.projects = parsed.projects.map((e) => ({ ...e, id: uid() }));

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}