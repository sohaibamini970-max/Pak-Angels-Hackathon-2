import { useState } from 'react';
import CVPreview from '../components/CVPreview';
import PromptInput from '../components/PromptInput';
import { generateCV, improveCV } from '../api/client';

const EXAMPLES = [
  {
    label: 'CS student',
    text: 'I am a 3rd year Computer Science student at FAST University in Karachi. I interned at Systems Limited in summer 2024 working on React dashboards for internal analytics. My skills include JavaScript, React, Python, Node.js, and Tailwind CSS. I won 2nd place in my university hackathon in 2023 with a food delivery app built in React Native. Expected graduation 2026, current CGPA 3.7.',
  },
  {
    label: 'Frontend engineer',
    text: 'Senior frontend engineer with 5 years of experience in React and TypeScript. Currently at Careem in Dubai, previously at Arbisoft in Lahore. Led migration of a legacy jQuery dashboard to React, reducing bundle size by 60% and improving Lighthouse score from 45 to 92. Skills: React, TypeScript, Next.js, Tailwind, GraphQL, Jest, Cypress. BS Computer Science from NED University 2019.',
  },
  {
    label: 'Fresh graduate',
    text: 'Recent Computer Science graduate from NUST Islamabad (2024), CGPA 3.5. Final year project was an AI-powered study planner using Python and OpenAI API. Skills: Python, JavaScript, SQL, Git, basic machine learning with scikit-learn. Seeking entry-level software engineering role. Did a 6-week internship at NetSol Technologies working on ASP.NET Core APIs.',
  },
  {
    label: 'Data analyst',
    text: 'Data analyst with 3 years of experience. Work at Engro Corp in Karachi since 2022. Built dashboards in Power BI that reduced monthly reporting time by 40%. Proficient in Python (pandas, numpy), SQL, Excel, Power BI, and Tableau. BBA from IBA Karachi 2021, GPA 3.8. Interested in transitioning into data science.',
  },
];

export default function CreateCV() {
  const [cv, setCv] = useState(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = (entry) => setLog((l) => [entry, ...l].slice(0, 25));

  const handleGenerate = async (prompt) => {
    setLoading(true);
    pushLog(`Generating from: "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"`);

    try {
      const data = await generateCV(prompt);
      setCv(data);
      setRawText(flattenCV(data));

      const counts = {
        exp: data.experience?.length || 0,
        edu: data.education?.length || 0,
        skills: data.skills?.technical?.length || 0,
        proj: data.projects?.length || 0,
      };
      pushLog(`✅ Generated — exp:${counts.exp} edu:${counts.edu} skills:${counts.skills} proj:${counts.proj}`);
    } catch (e) {
      pushLog(`❌ ${e.message}`);
      alert('Generation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (instruction) => {
    if (!rawText) {
      alert('Generate a CV first.');
      return;
    }
    setPrompting(true);
    pushLog(`💬 ${instruction}`);
    try {
      const result = await improveCV(rawText, instruction);
      if (result.updatedText) {
        setRawText(result.updatedText);
        setCv(textToCV(result.updatedText));
        pushLog(`✅ AI updated the CV`);
      }
    } catch (e) {
      pushLog(`❌ ${e.message}`);
      alert('Update failed: ' + e.message);
    } finally {
      setPrompting(false);
    }
  };

  const handleReset = () => {
    setCv(null);
    setRawText('');
    setLog([]);
  };

  const handleDownload = () => {
    pushLog('Opening print dialog…');
    setTimeout(() => window.print(), 100);
  };

  const busy = loading || prompting;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* LEFT: Preview */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/60 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-500' : cv ? 'bg-green-500' : 'bg-slate-300'
                }`}
            />
            <h2 className="text-sm font-semibold text-slate-700">
              {loading ? 'Generating…' : prompting ? 'Updating…' : 'Live Preview'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {cv && (
              <button
                onClick={handleReset}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Start over
              </button>
            )}
            {cv && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-900"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && !cv && <LoadingSkeleton />}
          {!loading && !cv && <EmptyState />}
          {cv && <CVPreview cv={cv} issues={[]} onInlineEdit={() => { }} />}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
            <h3 className="text-sm font-semibold text-slate-800">Describe yourself</h3>
          </div>
          <PromptInput
            onSubmit={handleGenerate}
            disabled={busy}
            examples={EXAMPLES}
            placeholder="e.g. 3rd year CS student in Karachi. Interned at Systems Ltd summer 2024 on React dashboards. Skills: JS, Python, React."
          />
        </div>

        {cv && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">2</span>
              <h3 className="text-sm font-semibold text-slate-800">Ask AI to change it</h3>
            </div>
            <PromptInput
              onSubmit={handleChat}
              disabled={busy}
              label="What to change?"
              placeholder="e.g. make the summary more senior"
              rows={4}
            />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              {cv ? 3 : 2}
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {log.length === 0 ? (
              <p className="text-xs text-slate-400">
                Type a description or tap an example to get started.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {log.map((entry, i) => (
                  <li key={i} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {!cv && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-[11px] leading-relaxed text-indigo-900">
              <span className="font-semibold">Tip:</span> include education, internships, tech stack, projects, and achievements — the more specific, the better the result.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function flattenCV(cv) {
  const lines = [];
  const p = cv.personalInfo || {};
  if (p.name) lines.push(p.name);
  const contact = [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean);
  if (contact.length) lines.push(contact.join(' | '));

  if (cv.summary) lines.push('\nSUMMARY', cv.summary);

  if (cv.experience?.length) {
    lines.push('\nEXPERIENCE');
    for (const e of cv.experience) {
      const head = [e.role, e.company, [e.startDate, e.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' | ');
      if (head) lines.push(head);
      for (const b of e.bullets || []) if (b) lines.push(`- ${b}`);
    }
  }

  if (cv.education?.length) {
    lines.push('\nEDUCATION');
    for (const ed of cv.education) {
      lines.push([ed.degree, ed.institution, ed.year, ed.gpa && `GPA ${ed.gpa}`].filter(Boolean).join(' | '));
    }
  }

  if (cv.skills?.technical?.length || cv.skills?.soft?.length) {
    lines.push('\nSKILLS');
    if (cv.skills.technical?.length) lines.push(`Technical: ${cv.skills.technical.join(', ')}`);
    if (cv.skills.soft?.length) lines.push(`Soft: ${cv.skills.soft.join(', ')}`);
  }

  if (cv.projects?.length) {
    lines.push('\nPROJECTS');
    for (const pr of cv.projects) {
      lines.push([pr.name, pr.link].filter(Boolean).join(' — '));
      if (pr.description) lines.push(pr.description);
      if (pr.tech?.length) lines.push(pr.tech.join(', '));
    }
  }

  if (cv.certifications?.length) {
    lines.push('\nCERTIFICATIONS');
    for (const c of cv.certifications) lines.push(`- ${c}`);
  }

  if (cv.languages?.length) lines.push('\nLANGUAGES', cv.languages.join(', '));

  if (cv.awards?.length) {
    lines.push('\nAWARDS');
    for (const a of cv.awards) lines.push(`- ${a}`);
  }

  return lines.join('\n');
}

function textToCV(text) {
  const lines = text.split(/\r?\n/);
  const cv = {
    personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '', experience: [], education: [],
    skills: { technical: [], soft: [] },
    projects: [], certifications: [], languages: [], awards: [],
  };

  const HEADERS = {
    SUMMARY: 'summary', PROFILE: 'summary',
    EXPERIENCE: 'experience', 'WORK EXPERIENCE': 'experience',
    EDUCATION: 'education', SKILLS: 'skills', 'TECHNICAL SKILLS': 'skills',
    PROJECTS: 'projects', CERTIFICATIONS: 'certifications',
    LANGUAGES: 'languages', AWARDS: 'awards', ACHIEVEMENTS: 'awards',
  };

  let section = null;
  const buf = { summary: [], experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], awards: [] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (HEADERS[upper]) { section = HEADERS[upper]; continue; }

    if (!section && !cv.personalInfo.name) {
      if (!line.includes('@') && !line.includes('|') && !line.includes('·')) {
        cv.personalInfo.name = line;
        continue;
      }
      if (line.includes('@')) {
        for (const part of line.split(/[|·•]/).map((s) => s.trim())) {
          if (part.includes('@')) cv.personalInfo.email = part;
          else if (/^\+?\d[\d\s().-]{6,}/.test(part)) cv.personalInfo.phone = part;
          else if (/linkedin/i.test(part)) cv.personalInfo.linkedin = part;
          else if (/github/i.test(part)) cv.personalInfo.github = part;
          else if (part) cv.personalInfo.location = part;
        }
        continue;
      }
    }

    if (section) buf[section].push(line);
  }

  cv.summary = buf.summary.join(' ').replace(/^[-•]\s*/, '');
  cv.experience = parseEntries(buf.experience).map((e, i) => ({ id: `exp-${i}`, ...e }));
  cv.education = parseEntries(buf.education).map((e, i) => ({
    id: `edu-${i}`, degree: e.role, institution: e.company, year: e.startDate, gpa: '',
  }));

  for (const line of buf.skills) {
    const m = line.match(/^(Technical|Soft)\s*:\s*(.+)$/i);
    if (m) {
      const key = m[1].toLowerCase() === 'technical' ? 'technical' : 'soft';
      cv.skills[key] = m[2].split(/[,•·]/).map((s) => s.trim()).filter(Boolean);
    } else {
      cv.skills.technical.push(...line.replace(/^[-•]\s*/, '').split(/[,•·]/).map((s) => s.trim()).filter(Boolean));
    }
  }

  const projectBlocks = buf.projects.join('\n').split(/\n\s*\n/);
  cv.projects = projectBlocks
    .map((block, i) => {
      const blockLines = block.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!blockLines.length) return null;
      const first = blockLines.shift();
      const [name, link] = first.split(/\s+—\s+|\s+-\s+/);
      const description = blockLines.join(' ').replace(/^[-•]\s*/, '');
      return { id: `prj-${i}`, name: name || 'Project', description, tech: [], link: link || '' };
    })
    .filter(Boolean);

  cv.certifications = buf.certifications.map((l) => l.replace(/^[-•]\s*/, ''));
  cv.languages = buf.languages.join(', ').split(/[,•·]/).map((s) => s.trim()).filter(Boolean);
  cv.awards = buf.awards.map((l) => l.replace(/^[-•]\s*/, ''));

  return cv;
}

function parseEntries(lines) {
  const entries = [];
  let current = null;

  const flush = () => {
    if (current && (current.role || current.company || current.bullets.length)) entries.push(current);
  };

  for (const line of lines) {
    if (/^[-•]\s+/.test(line)) {
      if (!current) current = { role: '', company: '', startDate: '', endDate: '', bullets: [] };
      current.bullets.push(line.replace(/^[-•]\s+/, ''));
      continue;
    }

    const parts = line.split(/\s*\|\s*/);
    const hasDate = /\b(19|20)\d{2}\b/.test(line) || /\bpresent\b/i.test(line);

    if (parts.length >= 2 || hasDate) {
      flush();
      current = { role: '', company: '', startDate: '', endDate: '', bullets: [] };
      const [a, b, c] = parts;
      current.role = a || '';
      current.company = b || '';
      if (c) {
        const [start, end] = c.split(/\s*[–-]\s*/);
        current.startDate = start || '';
        current.endDate = end || '';
      } else if (hasDate) {
        const m = line.match(/((?:19|20)\d{2})\s*[–-]\s*((?:19|20)\d{2}|[Pp]resent)/);
        if (m) { current.startDate = m[1]; current.endDate = m[2]; }
      }
      continue;
    }

    if (!current) current = { role: line, company: '', startDate: '', endDate: '', bullets: [] };
    else if (!current.company) current.company = line;
    else current.bullets.push(line);
  }
  flush();
  return entries;
}

/* ---------- Subcomponents ---------- */

function EmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-[820px] min-h-[700px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 p-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="mb-1 text-base font-bold text-slate-800">Your CV will appear here</h3>
        <p className="mx-auto max-w-xs text-sm text-slate-500">
          Describe yourself in the panel on the right — or click one of the examples — and we'll draft a full CV in seconds.
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[820px] animate-pulse rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
      <div className="mb-8 border-b border-slate-200 pb-5 text-center">
        <div className="mx-auto mb-3 h-9 w-64 rounded bg-slate-200" />
        <div className="mx-auto h-3 w-80 rounded bg-slate-100" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-7">
          <div className="mb-3 h-3 w-32 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
            <div className="h-3 w-4/6 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}