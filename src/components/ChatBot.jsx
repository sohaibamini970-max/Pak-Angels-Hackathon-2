import { useState, useRef, useEffect } from 'react';

const QUICK = [
  { label: '🛠 Fix all mistakes', text: 'Fix all spelling, grammar and formatting mistakes in my CV.', auto: true },
  { label: '✨ Stronger summary', text: 'Rewrite my summary to be more impactful and concise.', auto: true },
  { label: '➕ Add project', text: 'Add a project: ' },
  { label: '➕ Add skills', text: 'Add these skills: ' },
  { label: '➕ Add experience', text: 'Add experience: ' },
];

export default function ChatBot({ messages = [], busy = false, disabled = false, onSend }) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [safeMessages.length, busy]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t || disabled || busy) return;
    onSend?.(t);
    setInput('');
  };

  const handleQuick = (q) => {
    if (q.auto) return send(q.text);
    setInput(q.text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuick(q)}
            disabled={disabled || busy}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="mb-3 h-64 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
        {safeMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user'
                  ? 'rounded-br-sm bg-indigo-600 text-white'
                  : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'
                }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="relative rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          disabled={disabled || busy}
          placeholder={
            disabled
              ? 'Upload a CV to start chatting…'
              : 'e.g. Add a project: AI CV Builder using React + Node. Won hackathon 2nd place.'
          }
          className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <span className="text-[10px] text-slate-400">Enter to send · Shift+Enter for new line</span>
          <button
            onClick={() => send()}
            disabled={!input.trim() || disabled || busy}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
          >
            Send
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}