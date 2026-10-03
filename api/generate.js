export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { prompt } = req.body || {};

  if (!prompt?.trim()) {
    return res.status(400).json({
      error: 'Missing prompt',
    });
  }

  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({
      error: 'Server API key not configured',
    });
  }

  const apiKey = rawKey
    .trim()
    .replace(/^["']|["']$/g, '');

  console.log('Gemini API key configured');
  console.log('KEY LENGTH:', apiKey.length);
  console.log('KEY PREFIX:', apiKey.slice(0, 6));
  console.log('KEY SUFFIX:', apiKey.slice(-4));

  // ---------------------------------------------------------
  // CV JSON SCHEMA
  // ---------------------------------------------------------

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
        required: [
          'name',
          'email',
          'phone',
          'location',
          'linkedin',
          'github',
        ],
      },

      summary: {
        type: 'string',
      },

      experience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            role: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },

            bullets: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },

          required: [
            'company',
            'role',
            'startDate',
            'endDate',
            'bullets',
          ],
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

          required: [
            'institution',
            'degree',
            'year',
            'gpa',
          ],
        },
      },

      skills: {
        type: 'object',
        properties: {
          technical: {
            type: 'array',
            items: {
              type: 'string',
            },
          },

          soft: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },

        required: [
          'technical',
          'soft',
        ],
      },

      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },

            tech: {
              type: 'array',
              items: {
                type: 'string',
              },
            },

            link: { type: 'string' },
          },

          required: [
            'name',
            'description',
            'tech',
            'link',
          ],
        },
      },

      certifications: {
        type: 'array',
        items: {
          type: 'string',
        },
      },

      languages: {
        type: 'array',
        items: {
          type: 'string',
        },
      },

      awards: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },

    required: [
      'personalInfo',
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'languages',
      'awards',
    ],
  };

  // ---------------------------------------------------------
  // PROMPT
  // ---------------------------------------------------------

  const systemPrompt = `
  You are an expert professional CV writer.

Create a complete, professional CV from the user's description.

Rules:
- Use strong action verbs in experience bullets.
- Quantify impact only when the user provides enough information.
- Never invent emails, phone numbers, companies, degrees, dates,
  achievements, certifications, awards, or technologies.
- Use empty strings for unknown scalar fields.
- Use empty arrays when information is not provided.
- Keep the summary to 2 - 3 sentences.
- Write 3 - 5 bullets per experience entry when experience exists.
- Keep all information truthful to the user's description.
  - Return only the requested JSON structure.
`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `${ systemPrompt } \n\n` +
              `User description: \n${ prompt } `,
          },
        ],
      },
    ],

    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4,
    },
  };

  // ---------------------------------------------------------
  // CURRENT GEMINI MODELS
  // ---------------------------------------------------------

  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];

  // ---------------------------------------------------------
  // TRY MODELS
  // ---------------------------------------------------------

  let lastError = null;

  for (const model of models) {
    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

console.log(`Trying Gemini model: ${model}`);

const r = await fetch(url, {
  method: 'POST',

  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  },

  body: JSON.stringify(body),
});

const detail = await r.text();

// -----------------------------------------------------
// API ERROR
// -----------------------------------------------------

if (!r.ok) {
  console.error(
    `[${model}] Gemini ${r.status}:`,
    detail.slice(0, 2000)
  );

  lastError = {
    model,
    status: r.status,
    detail: detail.slice(0, 2000),
  };

  // Model doesn't exist / isn't available
  if (r.status === 404) {
    console.log(
      `${model} unavailable. Trying next model...`
    );

    continue;
  }

  // Bad request may mean the schema/configuration
  // isn't supported by that model.
  if (r.status === 400) {
    console.log(
      `${model} rejected the request. Trying next model...`
    );

    continue;
  }

  // Authentication
  if (r.status === 401) {
    return res.status(401).json({
      error: 'Gemini authentication failed',
      message:
        'The GEMINI_API_KEY was rejected by Google Gemini API.',
      detail: detail.slice(0, 2000),
    });
  }

  // Permission / billing
  if (r.status === 403) {
    return res.status(403).json({
      error: 'Gemini API permission denied',
      message:
        'The API key does not have permission to use this Gemini model/API.',
      detail: detail.slice(0, 2000),
    });
  }

  // Rate limit
  if (r.status === 429) {
    return res.status(429).json({
      error: 'Gemini API quota exceeded',
      message:
        'Gemini API rate limit or quota was exceeded.',
      detail: detail.slice(0, 2000),
    });
  }

  return res.status(r.status).json({
    error: `Gemini error (${model})`,
    detail: detail.slice(0, 2000),
  });
}

// -----------------------------------------------------
// PARSE RESPONSE
// -----------------------------------------------------

let data;

try {
  data = JSON.parse(detail);
} catch {
  return res.status(500).json({
    error: 'Invalid response from Gemini',
    detail: detail.slice(0, 2000),
  });
}

const text =
  data?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!text) {
  console.error(
    `[${model}] Empty Gemini response:`,
    JSON.stringify(data).slice(0, 3000)
  );

  lastError = {
    model,
    status: 500,
    detail: JSON.stringify(data).slice(0, 2000),
  };

  continue;
}

// -----------------------------------------------------
// PARSE GENERATED JSON
// -----------------------------------------------------

let parsed;

try {
  parsed = JSON.parse(text);
} catch (parseError) {
  console.error(
    `[${model}] Invalid JSON returned by Gemini:`,
    text.slice(0, 3000)
  );

  return res.status(500).json({
    error: 'Gemini returned invalid JSON',
    detail: text.slice(0, 2000),
  });
}

// -----------------------------------------------------
// LOCAL IDS
// -----------------------------------------------------

const uid = () =>
  Math.random()
    .toString(36)
    .slice(2, 10);

parsed.experience =
  (parsed.experience || []).map((entry) => ({
    ...entry,
    id: uid(),
  }));

parsed.education =
  (parsed.education || []).map((entry) => ({
    ...entry,
    id: uid(),
  }));

parsed.projects =
  (parsed.projects || []).map((entry) => ({
    ...entry,
    id: uid(),
  }));

// -----------------------------------------------------
// SUCCESS
// -----------------------------------------------------

console.log(
  `Gemini ${model} generated CV successfully`
);

return res.status(200).json(parsed);

    } catch (error) {
  console.error(
    `[${model}] Request exception:`,
    error
  );

  lastError = {
    model,
    status: 500,
    detail: error?.message || String(error),
  };

  continue;
}
  }

// ---------------------------------------------------------
// ALL MODELS FAILED
// ---------------------------------------------------------

console.error(
  'All Gemini models failed.',
  lastError
);

return res.status(500).json({
  error: 'No compatible Gemini model available',
  message:
    'All configured Gemini models failed to generate the CV.',
  lastError,
});
}

