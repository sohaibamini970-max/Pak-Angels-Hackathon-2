import { useState, useRef, useEffect } from 'react';

export default function EditableText({ text, issues = [], highlights = [], onEdit, className = '' }) {
    const [editing, setEditing] = useState(null);

    if (text === undefined || text === null || text === '') return null;

    const str = String(text);

    if (editing) {
        return (
            <EditableSpan
                target={editing.target}
                onCommit={(newValue) => {
                    if (editing.target !== newValue) onEdit?.(editing.target, newValue);
                    setEditing(null);
                }}
                onCancel={() => setEditing(null)}
            />
        );
    }

    // Green flash for text just changed by AI / fixes
    const trimmed = str.trim();
    const changed = trimmed.length > 2 && highlights.some((l) => l.includes(trimmed));

    // Find first issue that appears in this string (ignore empty originals)
    const match = issues
        .filter((issue) => issue.original)
        .map((issue) => ({ issue, idx: str.indexOf(issue.original) }))
        .find((m) => m.idx !== -1);

    if (match) {
        const { issue, idx } = match;
        const before = str.slice(0, idx);
        const target = str.slice(idx, idx + issue.original.length);
        const after = str.slice(idx + issue.original.length);
        return (
            <span className={className}>
                {before && (
                    <ClickableSpan text={before} changed={changed} onClick={() => setEditing({ target: before })} />
                )}
                <button
                    type="button"
                    data-issue
                    onClick={() => setEditing({ target })}
                    className="relative cursor-pointer bg-red-50/60 underline decoration-red-500 decoration-wavy decoration-2 hover:bg-red-100/80"
                    title={`${issue.type}: ${issue.original} → ${issue.suggestion}`}
                >
                    {target}
                </button>
                {after && (
                    <EditableText
                        text={after}
                        issues={issues}
                        highlights={highlights}
                        onEdit={onEdit}
                        className={className}
                    />
                )}
            </span>
        );
    }

    return <ClickableSpan text={str} changed={changed} onClick={() => setEditing({ target: str })} />;
}

function ClickableSpan({ text, onClick, changed }) {
    return (
        <span
            onClick={onClick}
            data-changed={changed ? '' : undefined}
            className={`-mx-0.5 cursor-text rounded px-0.5 transition-colors duration-700 hover:bg-indigo-50 ${changed ? 'bg-green-100 ring-1 ring-green-300' : ''
                }`}
            title="Click to edit"
        >
            {text}
        </span>
    );
}

function EditableSpan({ target, onCommit, onCancel }) {
    const [draft, setDraft] = useState(target);
    const ref = useRef(null);
    const done = useRef(false); // prevents double commit (Enter + blur)

    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
            ref.current.select();
        }
    }, []);

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
        <input
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            className="inline-block rounded border-2 border-indigo-500 bg-white px-1 text-inherit outline-none"
            style={{ width: `${Math.max(draft.length, 4) + 2}ch`, maxWidth: '100%' }}
        />
    );
}