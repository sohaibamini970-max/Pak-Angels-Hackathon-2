import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function PDFPreview({ file, issues = [] }) {
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const update = () => setContainerWidth(el.clientWidth - 8);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Highlights mistakes directly on the original PDF via the text layer
    const textRenderer = useCallback(
        ({ str }) => {
            const originals = issues
                .map((i) => i.original)
                .filter(Boolean)
                .sort((a, b) => b.length - a.length);
            if (originals.length === 0) return escapeHtml(str);
            const re = new RegExp(`(${originals.map(escapeRegex).join('|')})`, 'g');
            return str
                .split(re)
                .map((part, i) =>
                    i % 2 === 1
                        ? `<mark data-issue style="background:rgba(239,68,68,0.28);border-bottom:2px wavy #ef4444;color:transparent;border-radius:2px">${escapeHtml(part)}</mark>`
                        : escapeHtml(part)
                )
                .join('');
        },
        [issues]
    );

    if (!file) {
        return (
            <div className="mx-auto flex w-full max-w-[900px] min-h-[900px] items-center justify-center rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
                <p className="text-sm text-slate-400">No file loaded</p>
            </div>
        );
    }

    const pageWidth = Math.min(containerWidth || 800, 1000);

    return (
        <div id="pdf-print" ref={containerRef} className="mx-auto w-full max-w-[1020px]">
            <Document
                file={file}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                    <div className="flex h-96 items-center justify-center">
                        <p className="text-sm text-slate-500">Loading PDF…</p>
                    </div>
                }
                error={
                    <div className="flex h-96 items-center justify-center">
                        <p className="text-sm text-red-500">Failed to load PDF.</p>
                    </div>
                }
            >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                    <div
                        key={i}
                        className="mb-5 overflow-hidden rounded-lg bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]"
                    >
                        <Page
                            pageNumber={i + 1}
                            width={pageWidth}
                            devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
                            renderAnnotationLayer={false}
                            renderTextLayer={true}
                            customTextRenderer={textRenderer}
                        />
                    </div>
                ))}
            </Document>

            {numPages > 1 && (
                <p className="mt-4 text-center text-xs text-slate-400">{numPages} pages</p>
            )}
        </div>
    );
}