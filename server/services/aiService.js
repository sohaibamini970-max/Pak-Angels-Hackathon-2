const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Fallback generator if no API key is set
function localGenerate({ name, role, experience, skills, education, tone }) {
    const skillList = Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim()).filter(Boolean);
    const expList = Array.isArray(experience) ? experience : (experience || '').split('\n').filter(Boolean);

    return {
        summary: `${tone || 'Motivated'} ${role} with proven experience in ${skillList.slice(0, 3).join(', ') || 'the field'}. Passionate about delivering high-quality results and collaborating with cross-functional teams.`,
        experience: expList.map((line, i) => ({
            title: `${role}${i > 0 ? ` (Level ${i + 1})` : ''}`,
            company: 'Company Name',
            duration: '20XX - Present',
            bullets: [
                `Led initiatives related to ${skillList[i % skillList.length] || 'core projects'}.`,
                `Collaborated with teams to deliver results on schedule.`,
                `Improved processes, increasing efficiency by ~15%.`,
            ],
        })),
        skills: skillList.length ? skillList : ['Communication', 'Problem Solving', 'Teamwork'],
        education: education || 'Bachelor\'s Degree',
        generatedBy: 'local-fallback',
    };
}

async function generateCVContent(input) {
    if (!openai) {
        console.warn('⚠️  No OPENAI_API_KEY — using local fallback generator');
        return localGenerate(input);
    }

    const prompt = `You are an expert CV writer. Create a professional CV for:
Name: ${input.name}
Target Role: ${input.role}
Experience: ${JSON.stringify(input.experience)}
Skills: ${JSON.stringify(input.skills)}
Education: ${input.education}
Tone: ${input.tone || 'professional'}

Return ONLY valid JSON in this exact shape:
{
  "summary": "string",
  "experience": [{ "title": "string", "company": "string", "duration": "string", "bullets": ["string"] }],
  "skills": ["string"],
  "education": "string"
}`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return { ...parsed, generatedBy: 'openai' };
}

async function enhanceSection(section, text) {
    if (!openai) {
        return `${text} — enhanced: delivered measurable impact and collaborated effectively.`;
    }

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
            role: 'user',
            content: `Rewrite this ${section} bullet for a CV to be more impactful and ATS-friendly. Return only the rewritten text:\n\n"${text}"`,
        }],
        temperature: 0.5,
    });

    return completion.choices[0].message.content.trim();
}

module.exports = { generateCVContent, enhanceSection };