import { useState, useRef, useEffect } from 'react';

const BULLET = /^\s*([•·▪●○◦\-–*]|\d+[.)])\s+/;

// Light styling hints so the raw text is easier to scan (content is never changed)
function lineKind(line) {
    const t = line.trim();
    if (!t) return 'blank';
    if (t.length <= 40 && /[A-Za-z]/.test(t) && t === t.toUpperCase()) return 'heading';
    if (BULLET.test(line)) return 'bullet';
    return 'text';
}

const KIND_STYLE = {
    blank: 'min-h-[1.25rem] text-slate-700',
    heading: 'mt-4 border-b border-slate-200 pb-0.5 font-bold tracking-wide text-slate-900',
    bullet: 'pl-4 text-slate-700',
    text: 'text-slate-700',
};

// Splits a line into plain parts and parts that match an issue
function splitByIssues(line, issues) {
    const ranges = [];
    for (const issue of issues) {
        if (!issue?.original) continue;
        let from = 0;
        while (true) {
            const idx = line.indexOf(issue.original, from);
            if (idx === -1) break;
            const end = idx + issue.original.length;
            if (!ranges.some((r) => idx < r.end && end > r.start)) {
                ranges.push({ start: idx, end, issue });
            }
            from = end;
        }
    }
    ranges.sort((a, b) => a.start - b.start);

    const parts = [];
    let cursor = 0;
    for (const r of ranges) {
        if (r.start > cursor) parts.push({ text: line.slice(cursor, r.start) });
        parts.push({ text: line.slice(r.start, r.end), issue: r.issue });
        cursor = r.end;
    }
    if (cursor < line.length) parts.push({ text: line.slice(cursor) });
    return parts;
}

export default function DocumentView({
    text,
    issues: issuesProp,
    highlights: hlProp,
    onLineEdit,
    onApplyIssue,
    onDismissIssue,
}) {
    const issues = Array.isArray(issuesProp) ? issuesProp : [];
    const highlights = Array.isArray(hlProp) ? hlProp : [];

    if (!text) {
        return (
            <div className="mx-auto flex w-full max-w-[820px] min-h-[900px] items-center justify-center rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
                <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">No CV loaded</p>
                    <p className="mt-1 text-xs text-slate-400">Upload a file to see its content here</p>
                </div>
            </div>
        );
    }

    const lines = text.split('\n');

    return (
        <div
            id="doc-print"
            className="mx-auto w-full max-w-[820px] rounded-2xl bg-white px-14 py-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]"
        >
            {lines.map((line, i) => (
                <Line
                    key={i}
                    line={line}
                    issues={issues}
                    highlights={highlights}
                    onEdit={(newLine) => onLineEdit?.(i, newLine)}
                    onApplyIssue={onApplyIssue}
                    onDismissIssue={onDismissIssue}
                />
            ))}
        </div>
    );
}

function Line({ line, issues, highlights, onEdit, onApplyIssue, onDismissIssue }) {
    const [editing, setEditing] = useState(false);
    const [openIdx, setOpenIdx] = useState(null);

    if (editing) {
        return (
            <LineEditor
                value={line}
                onCommit={(v) => {
                    setEditing(false);
                    if (v !== line) onEdit(v);
                }}
                onCancel={() => setEditing(false)}
            />
        );
    }

    const kind = lineKind(line);
    const changed = line.trim().length > 2 && highlights.some((h) => h && line.includes(h));
    const parts = kind === 'blank' ? [] : splitByIssues(line, issues);
    const openIssue = openIdx !== null ? parts[openIdx]?.issue : null;

    return (
        <div
            data-changed={changed ? '' : undefined}
            onClick={() => setEditing(true)}
            title="Click to edit this line"
            className={`relative -mx-2 cursor-text whitespace-pre-wrap break-words rounded px-2 py-0.5 text-sm leading-relaxed transition-colors duration-700 ${KIND_STYLE[kind]
                } ${changed ? 'bg-green-100 ring-1 ring-green-300' : 'hover:bg-indigo-50'}`}
        >
            {kind === 'blank'
                ? '\u00A0'
                : parts.map((p, i) =>
                    p.issue ? (
                        <span
                            key={i}
                            data-issue
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenIdx(i);
                            }}
                            title={`${p.issue.type}: ${p.issue.original} → ${p.issue.suggestion}`}
                            className="cursor-pointer bg-red-50 underline decoration-red-500 decoration-wavy decoration-2 hover:bg-red-100"
                        >
                            {p.text}
                        </span>
                    ) : (
                        <span key={i}>{p.text}</span>
                    )
                )}

            {openIssue && (
                <>
                    <div
                        className="fixed inset-0 z-10 cursor-default print:hidden"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenIdx(null);
                        }}
                    />
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-2 top-full z-20 mt-1 w-72 cursor-default whitespace-normal rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal normal-case tracking-normal shadow-xl print:hidden"
                    >
                        <span className="rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-800">
                            {openIssue.type}
                        </span>
                        <p className="mt-2 text-slate-700">
                            <span className="text-red-500 line-through">{openIssue.original}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-semibold text-green-700">{openIssue.suggestion}</span>
                        </p>
                        {openIssue.explanation && (
                            <p className="mt-1 text-[11px] text-slate-500">{openIssue.explanation}</p>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <button
                                onClick={() => {
                                    setOpenIdx(null);
                                    onApplyIssue?.(openIssue);
                                }}
                                className="rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700"
                            >
                                Apply fix
                            </button>
                            <button
                                onClick={() => {
                                    setOpenIdx(null);
                                    setEditing(true);
                                }}
                                className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                            >
                                Edit line
                            </button>
                            <button
                                onClick={() => {
                                    setOpenIdx(null);
                                    onDismissIssue?.(openIssue);
                                }}
                                className="rounded px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function LineEditor({ value, onCommit, onCancel }) {
    const [draft, setDraft] = useState(value);
    const ref = useRef(null);
    const done = useRef(false); // prevents double commit (Enter + blur)

    const resize = () => {
        if (!ref.current) return;
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
    };

    useEffect(() => {
        const el = ref.current;
        if (el) {
            el.focus();
            el.setSelectionRange(value.length, value.length);
        }
        resize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(resize, [draft]);

    const commit = () => {
        if (done.current) return;
        done.current = true;
        onCommit(draft);
    };
    const cancel = () => {
        if (done.current) return;
        done.current = true;
        onCancel();
    };

    return (
        <textarea
            ref={ref}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            className="-mx-2 block w-[calc(100%+1rem)] resize-none rounded border-2 border-indigo-500 bg-white px-2 py-0.5 text-sm leading-relaxed text-slate-800 outline-none"
        />
    );
}