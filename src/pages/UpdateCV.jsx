import { useState } from 'react';
import UploadZone from '../components/UploadZone';
import PDFPreview from '../components/PDFPreview';
import CVPreview from '../components/CVPreview';
import PromptBar from '../components/PromptBar';
import { parseFile } from '../lib/parseFile';
import { structureCV } from '../lib/structureCV';

export default function UpdateCV() {
  const [file, setFile] = useState(null);
  const [cv, setCv] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = (entry) => setLog((l) => [entry, ...l].slice(0, 20));

  const handleFileSelected = async (f) => {
    setFile(f);
    setCv(null);
    setParsing(true);
    pushLog(`Loaded ${f.name}`);

    try {
      const text = await parseFile(f);
      const structured = structureCV(text);
      setCv(structured);
      pushLog(`Extracted ${text.length} chars for AI processing`);
    } catch (e) {
      pushLog(`Note: text extraction failed (${e.message}). Preview still works.`);
    } finally {
      setParsing(false);
    }
  };

  const handlePrompt = (text) => pushLog(`Prompt: ${text}`);

  const isPDF = file?.name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="grid h-full grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* LEFT: Preview */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-slate-100">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/60 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                parsing ? 'animate-pulse bg-amber-500' : file ? 'bg-green-500' : 'bg-slate-300'
              }`}
            />
            <h2 className="text-sm font-semibold text-slate-700">Live Preview</h2>
          </div>
          <span className="truncate text-[11px] text-slate-500">
            {file ? file.name : 'No CV loaded'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isPDF ? <PDFPreview file={file} /> : <CVPreview cv={cv} />}
        </div>
      </div>

      {/* RIGHT: Upload + Activity + Prompt */}
      <div className="flex flex-col gap-5 overflow-hidden">
        {/* ① Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Upload your CV</h3>
          </div>
          <UploadZone onFileSelected={handleFileSelected} fileName={file?.name} />
        </div>

        {/* ② Activity */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              2
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
          </div>
          <div className="h-full overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-slate-400">No actions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {log.map((entry, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ③ Prompt */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              3
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Ask AI to improve it</h3>
          </div>
          <PromptBar onSubmit={handlePrompt} disabled={!file || parsing} />
        </div>
      </div>
    </div>
  );
}