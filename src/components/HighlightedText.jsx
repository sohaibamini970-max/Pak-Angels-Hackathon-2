/**
 * Highlights all occurrences of issues[].original inside `text`.
 * Renders as inline spans with a red wavy underline and a hover tooltip.
 */
export default function HighlightedText({ text, issues = [] }) {
  if (!text || !issues?.length) return <>{text}</>;

  // Build a list of { start, end, issue } ranges
  const ranges = [];
  for (const issue of issues) {
    if (!issue.original) continue;
    let idx = 0;
    while (idx < text.length) {
      const found = text.indexOf(issue.original, idx);
      if (found === -1) break;
      ranges.push({ start: found, end: found + issue.original.length, issue });
      idx = found + issue.original.length;
    }
  }

  if (ranges.length === 0) return <>{text}</>;

  // Sort by start; drop overlaps (keep the first)
  ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      merged.push(r);
      lastEnd = r.end;
    }
  }

  // Build segments
  const out = [];
  let cursor = 0;
  merged.forEach((r, i) => {
    if (r.start > cursor) {
      out.push(<span key={`t-${i}`}>{text.slice(cursor, r.start)}</span>);
    }
    out.push(
      <span
        key={`m-${i}`}
        className="relative underline decoration-red-500 decoration-wavy decoration-2 group cursor-help bg-red-50/60"
      >
        {text.slice(r.start, r.end)}
        <span className="pointer-events-none absolute hidden group-hover:block bottom-full left-0 mb-1 z-50 max-w-xs whitespace-normal rounded-md bg-red-600 px-2 py-1 text-[11px] leading-snug text-white shadow-lg">
          <span className="font-bold uppercase">{r.issue.type}</span>
          {' · '}
          <span className="line-through opacity-75">{r.issue.original}</span>
          {' → '}
          <span className="font-semibold">{r.issue.suggestion}</span>
        </span>
      </span>
    );
    cursor = r.end;
  });
  if (cursor < text.length) out.push(<span key="tail">{text.slice(cursor)}</span>);

  return <>{out}</>;
}