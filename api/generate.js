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

  // Clean environment variable
  const apiKey = rawKey
    .trim()
    .replace(/^["']|["']$/g, '');

  // Diagnostics — DO NOT log the complete API key
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
  // SYSTEM PROMPT
  // ---------------------------------------------------------

  const systemPrompt =
    'You are an expert CV writer. Given a short description of a person, ' +
    'produce a complete, professional CV. ' +
    'Use strong action verbs in experience bullets. ' +
    'Quantify impact where plausible. ' +
    'Keep the summary to 2-3 sentences. ' +
    'Use empty strings for unknown fields. ' +
    'Never invent emails, phone numbers, companies, degrees, dates, or achievements. ' +
    'Write 3-5 bullets per experience entry. ' +
    'Keep the information truthful to the user description.';

  // ---------------------------------------------------------
  // GEMINI REQUEST BODY
  // ---------------------------------------------------------

  const body = {
    contents: [
      {
        role: 'user',

        parts: [
          {
            text:
              `${systemPrompt}\n\n` +
              `User description:\n${prompt}`,
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
  // MODELS
  // ---------------------------------------------------------

  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  // ---------------------------------------------------------
  // TRY EACH MODEL
  // ---------------------------------------------------------

  for (const model of models) {
    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      console.log(`Trying Gemini model: ${model}`);

      // IMPORTANT:
      // API key is now sent through x-goog-api-key.
      // Do NOT put the key in the URL.
      const r = await fetch(url, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },

        body: JSON.stringify(body),
      });

      // -----------------------------------------------------
      // HANDLE API ERROR
      // -----------------------------------------------------

      if (!r.ok) {
        const detail = await r.text();

        console.error(
          `[${model}] Gemini ${r.status}:`,
          detail.slice(0, 1000)
        );

        // Model unavailable / unsupported
        if (r.status === 404) {
          console.log(
            `${model} is unavailable. Trying next model...`
          );

          continue;
        }

        // Invalid request
        if (r.status === 400) {
          console.log(
            `${model} rejected the request. Trying next model...`
          );

          continue;
        }

        // Authentication failure
        if (r.status === 401) {
          return res.status(401).json({
            error: 'Gemini authentication failed',
            message:
              'The GEMINI_API_KEY was rejected by Google Gemini API.',
            detail,
          });
        }

        // Permission / billing / quota
        if (r.status === 403) {
          return res.status(403).json({
            error: 'Gemini API permission denied',
            message:
              'The API key is valid but the Gemini API request is not permitted for this project.',
            detail,
          });
        }

        // Rate limit / quota
        if (r.status === 429) {
          return res.status(429).json({
            error: 'Gemini API quota exceeded',
            message:
              'Gemini API rate limit or quota was exceeded.',
            detail,
          });
        }

        // Other API error
        return res.status(r.status).json({
          error: `Gemini error (${model})`,
          detail,
        });
      }

      // -----------------------------------------------------
      // PARSE RESPONSE
      // -----------------------------------------------------

      const data = await r.json();

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error(
          `[${model}] Empty Gemini response:`,
          JSON.stringify(data).slice(0, 2000)
        );

        return res.status(500).json({
          error: 'Empty response from Gemini',
          detail: JSON.stringify(data).slice(0, 1000),
        });
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
          text.slice(0, 2000)
        );

        return res.status(500).json({
          error: 'Gemini returned invalid JSON',
          detail: text.slice(0, 1000),
        });
      }

      // -----------------------------------------------------
      // ADD LOCAL IDS
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
        `[${model}] Request threw an exception:`,
        error
      );

      // Continue to next model instead of immediately failing
      continue;
    }
  }

  // ---------------------------------------------------------
  // ALL MODELS FAILED
  // ---------------------------------------------------------

  return res.status(500).json({
    error: 'No compatible Gemini model available',
    message:
      'All configured Gemini models failed to generate the CV.',
  });
}