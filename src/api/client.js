export async function generateCV(prompt) {
    const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!r.ok) {
        const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        console.error('API error response:', err);
        const message = err.detail
            ? `${err.error} — ${err.detail}`
            : err.error || `HTTP ${r.status}`;
        throw new Error(message);
    }

    return r.json();
}

export async function checkMistakes(text) {
    const r = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        console.error('Check API error:', err);
        throw new Error(err.detail || err.error || `HTTP ${r.status}`);
    }
    return r.json();
}

export async function improveCV(currentText, instruction) {
    const r = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentText, instruction }),
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        throw new Error(err.detail || err.error || `HTTP ${r.status}`);
    }
    return r.json();
}