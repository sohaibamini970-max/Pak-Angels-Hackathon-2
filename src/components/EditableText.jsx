import { useState, useRef, useEffect } from 'react';

export default function EditableText({ text, issues = [], onEdit, className = '' }) {
    const [editing, setEditing] = useState(null);

    if (text === undefined || text === null || text === '') {
        return <span className={className}>—</span>;
    }

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

    const match = issues
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
                    <ClickableSpan text={before} onClick={() => setEditing({ target: before })} />
                )}
                <button
                    type="button"
                    onClick={() => setEditing({ target })}
                    className="relative underline decoration-red-500 decoration-wavy decoration-2 bg-red-50/60 hover:bg-red-100/80 cursor-pointer"
                    title={`${issue.type}: ${issue.original} → ${issue.suggestion}`}
                >
                    {target}
                </button>
                {after && (
                    <EditableText text={after} issues={issues} onEdit={onEdit} className={className} />
                )}
            </span>
        );
    }

    return <ClickableSpan text={str} onClick={() => setEditing({ target: str })} />;
}

function ClickableSpan({ text, onClick }) {
    return (
        <span
            onClick={onClick}
            className="cursor-text rounded px-0.5 -mx-0.5 transition hover:bg-indigo-50"
            title="Click to edit"
        >
            {text}
        </span>
    );
}

function EditableSpan({ target, onCommit, onCancel }) {
    const [draft, setDraft] = useState(target);
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
            ref.current.select();
        }
    }, []);

    return (
        <input
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onCommit(draft)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onCommit(draft);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            }}
            className="inline-block rounded border-2 border-indigo-500 bg-white px-1 text-inherit outline-none"
            style={{ width: `${Math.max(draft.length, 4) + 2}ch` }}
        />
    );
}