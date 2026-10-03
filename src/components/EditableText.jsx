import { useState, useRef, useEffect } from 'react';

/**
 * Renders `text`. Clicking any word opens an inline input to edit it.
 * If `issues` contains a matching fragment, that fragment gets a red wavy underline.
 * On commit, calls `onEdit(oldValue, newValue)`.
 */
export default function EditableText({ text, issues = [], onEdit, className = '' }) {
    const [editing, setEditing] = useState(null);

    if (text === undefined || text === null || text === '') {
        return <span className={className}>—</span>;
    }

    const str = String(text);

    if (editing) {
        return (
            <EditableSpan
                before={editing.before}
                target={editing.target}
                after={editing.after}
                onCommit={(newValue) => {
                    if (editing.target !== newValue) {
                        onEdit?.(editing.target, newValue);
                    }
                    setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                className={className}
            />
        );
    }

    // Find first issue whose `original` appears in this text
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
                    <ClickableSpan
                        text={before}
                        onClick={() => setEditing({ before: '', target: before, after: '' })}
                    />
                )}
                <button
                    type="button"
                    onClick={() => setEditing({ before: '', target, after: '' })}
                    className="relative underline decoration-red-500 decoration-wavy decoration-2 bg-red-50/60 hover:bg-red-100/80 cursor-pointer"
                    title={`${issue.type}: ${issue.original} → ${issue.suggestion}`}
                >
                    {target}
                </button>
                {after && (
                    <EditableText
                        text={after}
                        issues={issues}
                        onEdit={onEdit}
                        className={className}
                    />
                )}
            </span>
        );
    }

    return (
        <ClickableSpan
            text={str}
            onClick={() => setEditing({ before: '', target: str, after: '' })}
        />
    );
}

function ClickableSpan({ text, onClick }) {
    return (
        <span
            onClick={onClick}
            className="cursor-text rounded px-0.5 -mx-0.5 hover:bg-indigo-50 transition"
            title="Click to edit"
        >
            {text}
        </span>
    );
}

function EditableSpan({ before, target, after, onCommit, onCancel, className }) {
    const [draft, setDraft] = useState(target);
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
            ref.current.select();
        }
    }, []);

    return (
        <span className={className}>
            {before}
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
            {after}
        </span>
    );
}