import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractPdfLines } from './pdfExport';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/* -------------------- PDF -------------------- */
async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];

    if (file.name.toLowerCase().endsWith('.pdf')) {
        const lines = await extractPdfLines(file);
        return lines.map((l) => l.text).join('\n');
    }
s
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items into lines by their vertical position
    const byLine = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!byLine.has(y)) byLine.set(y, []);
      byLine.get(y).push({ x: item.transform[4], str: item.str });
    }

    // Sort lines top→bottom, and within a line left→right
    const lines = [...byLine.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((it) => it.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);

    pages.push(lines.join('\n'));
  }

  return pages.join('\n\n');
}

/* -------------------- DOCX -------------------- */
async function parseDOCX(file) {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

/* -------------------- TXT -------------------- */
async function parseTXT(file) {
  return await file.text();
}

/* -------------------- Router -------------------- */
export async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return parsePDF(file);
  if (name.endsWith('.docx')) return parseDOCX(file);
  if (name.endsWith('.doc')) {
    // Legacy .doc — mammoth doesn't support it. Fall back to raw text (may be garbage).
    return parseTXT(file);
  }
  if (name.endsWith('.txt')) return parseTXT(file);
  throw new Error('Unsupported file type');
}