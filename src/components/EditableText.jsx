export default function EditableText({ text, issues = [], onEdit, className = '' }) {
    const [editing, setEditing] = useState(null);

    if (!text) return <span className={className}>—</span>;

    if (editing) {
        return (
            <EditableSpan
                text={text}
                editing={editing}
                onCommit={(newValue) => {
                    if (editing.oldValue !== newValue) onEdit?.(editing.oldValue, newValue);
                    setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                className={className}
            />
        );
    }

    // Find first issue match in this text
    const match = issues
        .map((issue) => ({ issue, idx: text.indexOf(issue.original) }))
        .find((m) => m.idx !== -1);

    if (match) {
        const { issue, idx } = match;
        const before = text.slice(0, idx);
        const target = text.slice(idx, idx + issue.original.length);
        const after = text.slice(idx + issue.original.length);
        return (
            <span className={className}>
                <ClickableSpan text={before} onEdit={() => setEditing({ oldValue: before })} />
                <button
                    onClick={() => setEditing({ oldValue: target, issue })}
                    className="relative underline decoration-red-500 decoration-wavy decoration-2 bg-red-50/60 hover:bg-red-100/80 cursor-pointer"
                    title={`${issue.type}: ${issue.suggestion}`}
                >
                    {target}
                </button>
                <EditableText
                    text={after}
                    issues={issues}
                    onEdit={onEdit}
                    className={className}
                />
            </span>
        );
    }

    return <ClickableSpan text={text} onEdit={() => setEditing({ oldValue: text })} />;
}

function ClickableSpan({ text, onEdit }) {
    return (
        <span
            onClick={onEdit}
            className="cursor-text rounded hover:bg-indigo-50/60 transition"
            title="Click to edit"
        >
            {text}
        </span>
    );
}