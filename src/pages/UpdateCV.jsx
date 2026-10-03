import { useState } from 'react';
import UploadZone from '../components/UploadZone';
import PDFPreview from '../components/PDFPreview';
import CVPreview from '../components/CVPreview';
import PromptBar from '../components/PromptBar';
import { parseFile } from '../lib/parseFile';
import { structureCV } from '../lib/structureCV';
import { checkMistakes, improveCV } from '../api/client';

export default function UpdateCV() {
    const [file, setFile] = useState(null);
    const [cv, setCv] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [log, setLog] = useState([]);
    const [extractedText, setExtractedText] = useState('');
    const [issues, setIssues] = useState([]);
    const [checking, setChecking] = useState(false);
    const [prompting, setPrompting] = useState(false);
    const [viewMode, setViewMode] = useState('original'); // 'original' | 'editable'

    const pushLog = (entry) => setLog((l) => [entry, ...l].slice(0, 30));

    const isPDF = file?.name?.toLowerCase().endsWith('.pdf');
    const rebuild = (text) => {
        setExtractedText(text);
        setCv(structureCV(text));
    };

    const handleFileSelected = async (f) => {
        setFile(f);
        setCv(null);
        setIssues([]);
        setExtractedText('');
        setViewMode('original');
        setParsing(true);
        pushLog(`Loaded ${f.name}`);

        try {
            const text = await parseFile(f);
            rebuild(text);
            pushLog(`Extracted ${text.length} chars`);
        } catch (e) {
            pushLog(`❌ Parse failed: ${e.message}`);
            alert('Parse failed: ' + e.message);
        } finally {
            setParsing(false);
        }
    };

    const runCheck = async () => {
        if (!extractedText) {
            alert('Upload a CV first.');
            return;
        }
        setChecking(true);
        setIssues([]);
        pushLog('Running AI proofread…');
        try {
            const result = await checkMistakes(extractedText);
            setIssues(result.issues || []);
            pushLog(
                result.issues?.length
                    ? `Found ${result.issues.length} issue(s)`
                    : '✅ No issues found'
            );
            if (result.issues?.length > 0) setViewMode('editable');
        } catch (e) {
            pushLog(`❌ Check failed: ${e.message}`);
            alert('Check failed: ' + e.message);
        } finally {
            setChecking(false);
        }
    };

    const applyFix = (issue) => {
        if (!extractedText.includes(issue.original)) {
            setIssues((prev) => prev.filter((x) => x !== issue));
            return;
        }
        const updated = extractedText.split(issue.original).join(issue.suggestion);
        rebuild(updated);
        setIssues((prev) => prev.filter((x) => x !== issue));
        setViewMode('editable');
        pushLog(`✅ Fixed: "${issue.original}" → "${issue.suggestion}"`);
    };

    const applyAllFixes = () => {
        if (!extractedText || issues.length === 0) return;
        let updated = extractedText;
        let count = 0;
        for (const issue of issues) {
            if (updated.includes(issue.original)) {
                updated = updated.split(issue.original).join(issue.suggestion);
                count++;
            }
        }
        rebuild(updated);
        setIssues([]);
        setViewMode('editable');
        pushLog(`✅ Applied ${count} fix(es)`);
    };

    const handleInlineEdit = (oldValue, newValue) => {
        if (!oldValue || oldValue === newValue) return;
        const updated = extractedText.split(oldValue).join(newValue);
        rebuild(updated);
        setIssues((prev) => prev.filter((x) => x.original !== oldValue));
        pushLog(`✏️ Edited: "${oldValue}" → "${newValue}"`);
    };

    const handlePrompt = async (instruction) => {
        if (!extractedText) {
            alert('Upload a CV first.');
            return;
        }
        setPrompting(true);
        pushLog(`💬 ${instruction}`);
        try {
            const result = await improveCV(extractedText, instruction);
            if (result.updatedText) {
                rebuild(result.updatedText);
                setIssues([]);
                setViewMode('editable');
                pushLog(`✅ AI updated the CV`);
            } else {
                pushLog(`⚠️ AI returned no changes`);
            }
        } catch (e) {
            pushLog(`❌ Prompt failed: ${e.message}`);
            alert('Prompt failed: ' + e.message);
        } finally {
            setPrompting(false);
        }
    };

    const handleDownload = () => {
        pushLog(`Downloading ${viewMode} view…`);
        setTimeout(() => window.print(), 100);
    };

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* LEFT: Preview */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/60 px-5 py-3 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`h-2 w-2 rounded-full ${parsing ? 'animate-pulse bg-amber-500' : file ? 'bg-green-500' : 'bg-slate-300'
                                }`}
                        />
                        <h2 className="text-sm font-semibold text-slate-700">Preview</h2>

                        {isPDF && (
                            <div className="ml-1 flex rounded-md border border-slate-300 bg-white p-0.5 text-[10px] font-medium">
                                <button
                                    onClick={() => setViewMode('original')}
                                    className={`rounded px-2 py-0.5 ${viewMode === 'original' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    Original
                                </button>
                                <button
                                    onClick={() => setViewMode('editable')}
                                    className={`rounded px-2 py-0.5 ${viewMode === 'editable' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    Editable
                                </button>
                            </div>
                        )}

                        {viewMode === 'editable' && (
                            <span className="text-[10px] text-slate-400">click any text to edit</span>
                        )}

                        {issues.length > 0 && (
                            <>
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                                    {issues.length} issue{issues.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={applyAllFixes}
                                    className="rounded-md bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-green-700"
                                >
                                    Fix all
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {file && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-900"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                                </svg>
                                Download
                            </button>
                        )}
                        <span className="max-w-[140px] truncate text-[11px] text-slate-500">
                            {file ? file.name : 'No CV'}
                        </span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    {isPDF && viewMode === 'original' ? (
                        <PDFPreview file={file} />
                    ) : (
                        <CVPreview cv={cv} issues={issues} onInlineEdit={handleInlineEdit} />
                    )}
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
                        <h3 className="text-sm font-semibold text-slate-800">Upload your CV</h3>
                    </div>
                    <UploadZone onFileSelected={handleFileSelected} fileName={file?.name} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">2</span>
                        <h3 className="text-sm font-semibold text-slate-800">Check for mistakes</h3>
                    </div>
                    <button
                        onClick={runCheck}
                        disabled={!extractedText || checking}
                        className="w-full rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:bg-slate-300"
                    >
                        {checking ? 'Checking…' : 'Find issues'}
                    </button>

                    {issues.length > 0 && (
                        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                            {issues.map((issue, i) => (
                                <li key={i} className="rounded-md border border-red-100 bg-red-50 p-2.5 text-xs">
                                    <span className="rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-800">
                                        {issue.type}
                                    </span>
                                    <p className="mt-1.5 text-slate-700">
                                        <span className="text-red-500 line-through">{issue.original}</span>
                                        <span className="mx-1 text-slate-400">→</span>
                                        <span className="font-semibold text-green-700">{issue.suggestion}</span>
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">{issue.explanation}</p>
                                    <button
                                        onClick={() => applyFix(issue)}
                                        className="mt-1.5 rounded bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-green-700"
                                    >
                                        Apply
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!checking && issues.length === 0 && extractedText && (
                        <p className="mt-2 text-[11px] text-slate-400">Click above to scan.</p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">3</span>
                        <h3 className="text-sm font-semibold text-slate-800">Ask AI to change it</h3>
                    </div>
                    <PromptBar onSubmit={handlePrompt} disabled={!cv || parsing || prompting} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">4</span>
                        <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto pr-1">
                        {log.length === 0 ? (
                            <p className="text-xs text-slate-400">No actions yet.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {log.map((entry, i) => (
                                    <li key={i} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                                        {entry}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}