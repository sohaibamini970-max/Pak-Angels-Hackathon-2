import { useState } from 'react';

export default function PromptBar({ onSubmit, disabled, examples = [] }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (!prompt.trim() || disabled) return;
    onSubmit?.(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="flex flex-col">
      {examples.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex.text)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}

      <label className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Describe yourself
      </label>
      <div className="relative rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={6}
          placeholder={
            disabled
              ? 'Generating…'
              : 'e.g. 3rd year CS student in Karachi. Interned at Systems Ltd summer 2024 on React dashboards. Skills: JS, Python, React. Won 2nd place in uni hackathon.'
          }
          disabled={disabled}
          className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <span className="text-[10px] text-slate-400">Enter to send · Shift+Enter for new line</span>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || disabled}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
          >
            Generate
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}