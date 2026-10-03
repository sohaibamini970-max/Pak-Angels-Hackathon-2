import { useState } from 'react';
import CVPreview from '../components/CVPreview';
import PromptBar from '../components/ChatBot';
import { generateCV } from '../api/client';

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
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = (entry) => setLog((l) => [entry, ...l].slice(0, 20));

  const handlePrompt = async (prompt) => {
    setLoading(true);
    pushLog(`Generating from: "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"`);

    try {
      const data = await generateCV(prompt);
      setCv(data);

      const counts = {
        exp: data.experience?.length || 0,
        edu: data.education?.length || 0,
        skills: data.skills?.technical?.length || 0,
        proj: data.projects?.length || 0,
      };
      pushLog(`✅ CV generated — exp:${counts.exp} edu:${counts.edu} skills:${counts.skills} proj:${counts.proj}`);
    } catch (e) {
      pushLog(`❌ ${e.message}`);
      alert('Generation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCv(null);
    setLog([]);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* LEFT: Preview */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-slate-100">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/60 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                loading ? 'animate-pulse bg-amber-500' : cv ? 'bg-green-500' : 'bg-slate-300'
              }`}
            />
            <h2 className="text-sm font-semibold text-slate-700">
              {loading ? 'Generating…' : 'Live Preview'}
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
                onClick={() => window.print()}
                className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-900"
              >
                Download PDF
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && !cv && <LoadingSkeleton />}
          {!loading && !cv && <EmptyState />}
          {cv && <CVPreview cv={cv} />}
        </div>
      </div>

      {/* RIGHT: Prompt + Activity */}
      <div className="flex flex-col gap-5 overflow-hidden">
        {/* Prompt — the primary action on this page */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Describe yourself</h3>
          </div>
          <PromptBar onSubmit={handlePrompt} disabled={loading} examples={EXAMPLES} />
        </div>

        {/* Activity */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              2
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
          </div>
          <div className="h-full overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-slate-400">
                Type a description or tap an example to get started.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {log.map((entry, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Tip card */}
        {!cv && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-[11px] leading-relaxed text-indigo-900">
              <span className="font-semibold">Tip:</span> include your education, past internships or
              jobs, tech stack, and any achievements (awards, hackathons, published work) — the more
              specific, the better the result.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function EmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-[820px] min-h-[700px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 p-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <svg
            className="h-8 w-8 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="mb-1 text-base font-bold text-slate-800">Your CV will appear here</h3>
        <p className="mx-auto max-w-xs text-sm text-slate-500">
          Describe yourself in the panel on the right — or click one of the examples — and we'll
          draft a full CV in seconds.
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