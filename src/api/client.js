export async function generateCV(prompt) {
  const r = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Generate failed');
  }
  return r.json();
}