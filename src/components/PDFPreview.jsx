import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function PDFPreview({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  // Track the container width so pages scale to fit
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const update = () => {
      // Subtract padding so the page never overflows
      const w = el.clientWidth - 8;
      setContainerWidth(w);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!file) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] min-h-[900px] items-center justify-center rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
        <p className="text-sm text-slate-400">No file loaded</p>
      </div>
    );
  }

  // Cap at 1000px so it doesn't get enormous on ultrawide monitors
  const pageWidth = Math.min(containerWidth || 800, 1000);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[1020px]">
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
              // KEY: render at 2x the CSS size for crisp text on retina displays
              devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={
                <div
                  style={{ width: pageWidth, height: pageWidth * 1.414 }}
                  className="animate-pulse bg-slate-100"
                />
              }
            />
          </div>
        ))}
      </Document>

      {numPages > 1 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          {numPages} pages
        </p>
      )}
    </div>
  );
}