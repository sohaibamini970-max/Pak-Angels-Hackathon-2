import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* 1. Extract text lines WITH their position on the page               */
/* ------------------------------------------------------------------ */

async function openDoc(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // pdf.js transfers (detaches) the buffer it receives, so give it a copy
    const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    return { bytes, doc };
}

async function linesFromDoc(doc) {
    const lines = [];

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();

        const items = content.items
            .filter((it) => typeof it.str === 'string' && it.str.trim() !== '')
            .map((it) => {
                const t = it.transform;
                return {
                    str: it.str,
                    x: t[4],
                    y: t[5],
                    w: it.width,
                    fs: Math.hypot(t[0], t[1]) || Math.abs(t[3]) || it.height || 10,
                    fontName: it.fontName,
                };
            })
            .sort((a, b) => b.y - a.y || a.x - b.x);

        // group items into rows by baseline
        const rows = [];
        for (const it of items) {
            const row = rows.find((r) => Math.abs(r.y - it.y) <= r.fs * 0.4);
            if (row) row.items.push(it);
            else rows.push({ y: it.y, fs: it.fs, items: [it] });
        }
        rows.sort((a, b) => b.y - a.y);

        for (const row of rows) {
            row.items.sort((a, b) => a.x - b.x);

            // split a row into segments when there is a big horizontal gap
            // (e.g. "Software Engineer ........ 2022 – 2024")
            const segments = [];
            let seg = [];
            for (const it of row.items) {
                const prev = seg[seg.length - 1];
                if (prev && it.x - (prev.x + prev.w) > prev.fs * 2.5) {
                    segments.push(seg);
                    seg = [];
                }
                seg.push(it);
            }
            if (seg.length) segments.push(seg);

            for (const s of segments) {
                let text = '';
                s.forEach((it, i) => {
                    if (i > 0) {
                        const prev = s[i - 1];
                        const gap = it.x - (prev.x + prev.w);
                        if (gap > it.fs * 0.15 && !prev.str.endsWith(' ') && !it.str.startsWith(' ')) text += ' ';
                    }
                    text += it.str;
                });
                const last = s[s.length - 1];
                lines.push({
                    page: p,
                    text: norm(text),
                    x: s[0].x,
                    y: s[0].y,
                    w: last.x + last.w - s[0].x,
                    fs: Math.max(...s.map((i) => i.fs)),
                    fontName: s[0].fontName,
                });
            }
        }
    }
    return lines.filter((l) => l.text);
}

/** Used by parseFile so the editable text lines up 1:1 with the PDF */
export async function extractPdfLines(file) {
    const { doc } = await openDoc(file);
    return linesFromDoc(doc);
}

/* ------------------------------------------------------------------ */
/* 2. Line diff: original lines vs edited lines                        */
/* ------------------------------------------------------------------ */

function lineDiff(a, b) {
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
        if (i < n && j < m && a[i] === b[j]) {
            ops.push({ t: 'keep' });
            i++;
            j++;
        } else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) {
            ops.push({ t: 'del', i });
            i++;
        } else {
            ops.push({ t: 'ins', j });
            j++;
        }
    }

    // Turn runs of del/ins into replacements (same position) + leftovers
    const replaced = []; // { i, j }
    const deleted = []; // i
    const inserted = []; // j
    let dels = [];
    let inss = [];
    const flush = () => {
        const k = Math.min(dels.length, inss.length);
        for (let x = 0; x < k; x++) replaced.push({ i: dels[x], j: inss[x] });
        dels.slice(k).forEach((d) => deleted.push(d));
        inss.slice(k).forEach((s) => inserted.push(s));
        dels = [];
        inss = [];
    };
    for (const op of ops) {
        if (op.t === 'keep') flush();
        else if (op.t === 'del') dels.push(op.i);
        else inss.push(op.j);
    }
    flush();
    return { replaced, deleted, inserted };
}

/* ------------------------------------------------------------------ */
/* 3. Helpers: colors, fonts, text fitting                             */
/* ------------------------------------------------------------------ */

// Reads background + text color from the rendered page, so the patch blends in
function sampleColors(ctx, viewport, line) {
    const fallback = { bg: [1, 1, 1], fg: [0, 0, 0] };
    try {
        const [x1, y1] = viewport.convertToViewportPoint(line.x, line.y - line.fs * 0.22);
        const [x2, y2] = viewport.convertToViewportPoint(line.x + line.w, line.y + line.fs * 0.9);
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;
        const left = Math.max(0, Math.floor(Math.min(x1, x2)));
        const top = Math.max(0, Math.floor(Math.min(y1, y2)));
        const w = Math.min(cw - left, Math.ceil(Math.abs(x2 - x1)));
        const h = Math.min(ch - top, Math.ceil(Math.abs(y2 - y1)));
        if (w < 1 || h < 1) return fallback;

        const d = ctx.getImageData(left, top, w, h).data;

        // most common color = background
        const buckets = new Map();
        for (let k = 0; k < d.length; k += 4) {
            const key = ((d[k] >> 4) << 8) | ((d[k + 1] >> 4) << 4) | (d[k + 2] >> 4);
            const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
            b.n++;
            b.r += d[k];
            b.g += d[k + 1];
            b.b += d[k + 2];
            buckets.set(key, b);
        }
        let best = null;
        for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
        const bg = [best.r / best.n, best.g / best.n, best.b / best.n];

        // pixel furthest from the background = text color
        let far = null;
        let farDist = 0;
        for (let k = 0; k < d.length; k += 4) {
            const dist = (d[k] - bg[0]) ** 2 + (d[k + 1] - bg[1]) ** 2 + (d[k + 2] - bg[2]) ** 2;
            if (dist > farDist) {
                farDist = dist;
                far = [d[k], d[k + 1], d[k + 2]];
            }
        }
        const lum = (bg[0] + bg[1] + bg[2]) / 3;
        const fg = far && farDist > 1500 ? far : lum > 128 ? [0, 0, 0] : [255, 255, 255];

        return { bg: bg.map((v) => v / 255), fg: fg.map((v) => v / 255) };
    } catch {
        return fallback;
    }
}

const FONT_KEYS = {
    sans: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'],
    serif: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'],
    mono: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'],
};

function fontStyleOf(page, fontName) {
    let name = String(fontName || '');
    let bold = false;
    let italic = false;
    try {
        const f = page.commonObjs.get(fontName);
        if (f?.name) name = f.name;
        bold = !!f?.bold;
        italic = !!f?.italic;
    } catch {
        /* font not resolved, fall back to defaults */
    }
    bold = bold || /bold|black|heavy|semibold|demi/i.test(name);
    italic = italic || /italic|oblique/i.test(name);

    let family = 'sans';
    if (/courier|mono|consolas|menlo/i.test(name)) family = 'mono';
    else if (/sans|arial|helvet|calibri|verdana|tahoma|segoe|roboto|open|lato|inter|montserrat|poppins|myriad|gothic/i.test(name))
        family = 'sans';
    else if (/times|serif|georgia|garamond|cambria|book|minion|palat|charter/i.test(name)) family = 'serif';

    return { family, bold, italic };
}

const REPLACE = { '→': '->', '←': '<-', '★': '*', '✓': 'v', '“': '"', '”': '"', '’': "'", '‘': "'" };

// Standard PDF fonts only support Latin characters
function safeText(font, text) {
    let out = '';
    for (const raw of text) {
        const ch = REPLACE[raw] ?? raw;
        try {
            font.encodeText(ch);
            out += ch;
        } catch {
            out += '?';
        }
    }
    return out;
}

function wrap(font, text, size, maxW) {
    const words = text.split(' ');
    const out = [];
    let cur = '';
    for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(t, size) > maxW && cur) {
            out.push(cur);
            cur = w;
        } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
}

/* ------------------------------------------------------------------ */
/* 4. Main: apply the edited text onto the ORIGINAL pdf                */
/* ------------------------------------------------------------------ */

export async function exportEditedPdf(file, editedText) {
    const { bytes, doc } = await openDoc(file);
    const original = await linesFromDoc(doc);
    const edited = String(editedText)
        .split('\n')
        .map(norm)
        .filter(Boolean);

    const { replaced, deleted, inserted } = lineDiff(
        original.map((l) => l.text),
        edited
    );

    if (!replaced.length && !deleted.length && !inserted.length) return bytes;

    // Safety: if almost everything differs, the text no longer matches the PDF structure
    if (original.length && (replaced.length + deleted.length) / original.length > 0.6) {
        throw new Error('Edited text no longer matches the PDF structure');
    }

    const pdf = await PDFDocument.load(bytes);
    const pdfPages = pdf.getPages();
    const fontCache = {};
    const getFont = async (family, bold, italic) => {
        const key = FONT_KEYS[family][(bold ? 1 : 0) + (italic ? 2 : 0)];
        if (!fontCache[key]) fontCache[key] = await pdf.embedFont(StandardFonts[key]);
        return fontCache[key];
    };

    // Work per page: render once to sample colors, then patch
    const touched = new Map(); // page number -> [{ line, newText | null }]
    const addTouch = (i, text) => {
        const line = original[i];
        if (!touched.has(line.page)) touched.set(line.page, []);
        touched.get(line.page).push({ line, text });
    };
    replaced.forEach(({ i, j }) => addTouch(i, edited[j]));
    deleted.forEach((i) => addTouch(i, null));

    for (const [pageNum, changes] of touched) {
        const jsPage = await doc.getPage(pageNum);
        const viewport = jsPage.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        await jsPage.render({ canvasContext: ctx, canvas, viewport }).promise;

        const target = pdfPages[pageNum - 1];
        const pageW = target.getWidth();

        for (const { line, text } of changes) {
            const { bg, fg } = sampleColors(ctx, viewport, line);

            // 1) cover the old text with the page background
            target.drawRectangle({
                x: line.x - 1.5,
                y: line.y - line.fs * 0.25,
                width: line.w + 3,
                height: line.fs * 1.2,
                color: rgb(...bg),
                borderWidth: 0,
            });

            if (text === null) continue;

            // 2) draw the new text in the same spot, size and color
            const { family, bold, italic } = fontStyleOf(jsPage, line.fontName);
            const font = await getFont(family, bold, italic);
            const clean = safeText(font, text);

            const maxW = Math.max(line.w, pageW - line.x - 30);
            const natural = font.widthOfTextAtSize(clean, line.fs);
            const size = natural > maxW ? Math.max((line.fs * maxW) / natural, line.fs * 0.55) : line.fs;

            target.drawText(clean, { x: line.x, y: line.y, size, font, color: rgb(...fg) });
        }
    }

    // 3) brand-new lines go on an extra page at the end
    if (inserted.length) {
        const last = pdfPages[pdfPages.length - 1];
        const { width, height } = last.getSize();
        const margin = 50;
        const regular = await getFont('sans', false, false);
        const boldFont = await getFont('sans', true, false);

        let page = pdf.addPage([width, height]);
        let y = height - margin;
        const ensure = (need) => {
            if (y - need < margin) {
                page = pdf.addPage([width, height]);
                y = height - margin;
            }
        };

        for (const j of inserted) {
            const text = edited[j];
            const heading = text.length <= 40 && /[A-Za-z]/.test(text) && text === text.toUpperCase();
            const font = heading ? boldFont : regular;
            const size = heading ? 11.5 : 10.5;
            if (heading) y -= 8;
            for (const ln of wrap(font, safeText(font, text), size, width - margin * 2)) {
                ensure(size + 4);
                page.drawText(ln, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
                y -= size + 4;
            }
        }
    }

    return pdf.save();
}