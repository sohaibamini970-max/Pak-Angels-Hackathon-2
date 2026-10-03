import { useState, useRef } from 'react';
import UploadZone from '../components/UploadZone';
import PDFPreview from '../components/PDFPreview';
import CVPreview from '../components/CVPreview';
import DocumentView from '../components/DocumentView';
import ChatBot from '../components/ChatBot';
import { parseFile } from '../lib/parseFile';
import { structureCV } from '../lib/structureCV';
import { checkMistakes, improveCV } from '../api/client';

const WELCOME = {
    role: 'assistant',
    text: "Hi! Upload your CV and I'll show it live. Then ask me to fix mistakes, add projects, rewrite your summary, and more. You'll see every change in the preview.",
};

const diffLines = (oldText, newText) => {
    const old = new Set(oldText.split('\n').map((s) => s.trim()));
    return newText
        .split('\n')
        .map((s) => s.trim())
        .filter((l) => l && !old.has(l));
};

const VIEW_LABELS = { original: 'Original', editable: 'Editable', formatted: 'Formatted' };

export default function UpdateCV() {
    const [file, setFile] = useState(null);
    const [cv, setCv] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [log, setLog] = useState([]);
    const [extractedText, setExtractedText] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [issues, setIssues] = useState([]);
    const [checking, setChecking] = useState(false);
    const [prompting, setPrompting] = useState(false);
    const [viewMode, setViewMode] = useState('editable'); // 'original' | 'editable' | 'formatted'
    const [messages, setMessages] = useState([WELCOME]);
    const [highlights, setHighlights] = useState([]);
    const flashTimer = useRef(null);

    const pushLog = (entry) => setLog((l) => [entry, ...l].slice(0, 30));
    const pushMsg = (role, text) => setMessages((m) => [...m, { role, text }]);

    const isPDF = file?.name?.toLowerCase().endsWith('.pdf');
    const dirty = !!extractedText && extractedText !== originalText;
    const modes = isPDF ? ['original', 'editable', 'formatted'] : ['editable', 'formatted'];

    const flash = (lines) => {
        clearTimeout(flashTimer.current);
        setHighlights(lines);
        flashTimer.current = setTimeout(() => setHighlights([]), 8000);
    };

    // Single source of truth: every change goes through here
    const rebuild = (text) => {
        setExtractedText(text);
        setCv(structureCV(text));
        // drop issues whose text no longer exists in the CV
        setIssues((prev) => prev.filter((i) => i.original && text.includes(i.original)));
    };

    const handleFileSelected = async (f) => {
        const pdf = f.name.toLowerCase().endsWith('.pdf');
        setFile(f);
        setCv(null);
        setIssues([]);
        setHighlights([]);
        setExtractedText('');
        setOriginalText('');
        setViewMode(pdf ? 'original' : 'editable');
        setParsing(true);
        pushLog(`Loaded ${f.name}`);

        try {
            const raw = await parseFile(f);
            const text = String(raw ?? '').replace(/\r\n?/g, '\n');
            setOriginalText(text);
            rebuild(text);
            pushLog(`Extracted ${text.length} chars`);
            pushMsg('assistant', `Loaded ${f.name}. Click "Find issues" or tell me what to change.`);
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
            const found = (result?.issues || []).filter((i) => i && i.original);
            setIssues(found);
            pushLog(found.length ? `Found ${found.length} issue(s)` : '✅ No issues found');
            pushMsg(
                'assistant',
                found.length
                    ? `I found ${found.length} issue(s), highlighted in red. Click a highlight to fix it, or ask me to fix them all.`
                    : 'No issues found. Your CV looks clean!'
            );
            if (found.length > 0 && viewMode === 'formatted') setViewMode('editable');
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
        setViewMode((m) => (m === 'original' ? 'editable' : m));
        flash([issue.suggestion]);
        pushLog(`✅ Fixed: "${issue.original}" → "${issue.suggestion}"`);
    };

    const dismissIssue = (issue) => {
        setIssues((prev) => prev.filter((x) => x !== issue));
        pushLog(`Dismissed: "${issue.original}"`);
    };

    const applyAllFixes = () => {
        if (!extractedText || issues.length === 0) return;
        let updated = extractedText;
        let count = 0;
        const changed = [];
        for (const issue of issues) {
            if (updated.includes(issue.original)) {
                updated = updated.split(issue.original).join(issue.suggestion);
                changed.push(issue.suggestion);
                count++;
            }
        }
        rebuild(updated);
        setIssues([]);
        setViewMode((m) => (m === 'original' ? 'editable' : m));
        flash(changed);
        pushLog(`✅ Applied ${count} fix(es)`);
        pushMsg('assistant', `Applied ${count} fix(es). Changes are highlighted in green.`);
    };

    // Editable view: replace exactly one line by its position (no accidental matches elsewhere)
    const handleLineEdit = (index, newLine) => {
        const arr = extractedText.split('\n');
        if (index < 0 || index >= arr.length || arr[index] === newLine) return;
        const old = arr[index];
        arr[index] = newLine;
        rebuild(arr.join('\n'));
        if (newLine.trim()) flash([newLine.trim()]);
        pushLog(`✏️ Edited line: "${old.trim().slice(0, 40)}"`);
    };

    // Formatted view: replace the first matching occurrence only
    const handleInlineEdit = (oldValue, newValue) => {
        if (!oldValue || oldValue === newValue) return;
        if (!extractedText.includes(oldValue)) {
            pushLog(`⚠️ Couldn't locate "${oldValue}" in source text`);
            return;
        }
        rebuild(extractedText.replace(oldValue, () => newValue));
        flash([newValue]);
        pushLog(`✏️ Edited: "${oldValue}" → "${newValue}"`);
    };

    const handlePrompt = async (instruction) => {
        if (!extractedText) {
            alert('Upload a CV first.');
            return;
        }
        setPrompting(true);
        pushMsg('user', instruction);
        pushLog(`💬 ${instruction}`);
        try {
            const result = await improveCV(extractedText, instruction);
            const newText = typeof result?.updatedText === 'string' ? result.updatedText.replace(/\r\n?/g, '\n') : '';
            if (newText && newText !== extractedText) {
                const changed = diffLines(extractedText, newText);
                rebuild(newText);
                setIssues([]);
                setViewMode((m) => (m === 'original' ? 'editable' : m));
                flash(changed);
                pushLog('✅ AI updated the CV');
                pushMsg(
                    'assistant',
                    result.reply ||
                    `Done! I updated ${changed.length} line(s). They're highlighted in green in the preview.`
                );
            } else {
                pushLog('⚠️ AI returned no changes');
                pushMsg('assistant', result?.reply || "I didn't find anything to change for that. Could you be more specific?");
            }
        } catch (e) {
            pushLog(`❌ Prompt failed: ${e.message}`);
            pushMsg('assistant', `Sorry, something went wrong: ${e.message}`);
        } finally {
            setPrompting(false);
        }
    };

    const handleDownload = () => {
        // the original PDF can't contain your edits, so print the edited version instead
        if (viewMode === 'original' && dirty) {
            setViewMode('editable');
            pushLog('Downloading edited version…');
            setTimeout(() => window.print(), 400);
            return;
        }
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
                        <h2 className="text-sm font-semibold text-slate-700">Live Preview</h2>

                        {file && (
                            <div className="ml-1 flex rounded-md border border-slate-300 bg-white p-0.5 text-[10px] font-medium">
                                {modes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setViewMode(m)}
                                        className={`rounded px-2 py-0.5 ${viewMode === m ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {VIEW_LABELS[m]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {viewMode === 'editable' && file && (
                            <span className="text-[10px] text-slate-400">click a line to edit · click red text to fix</span>
                        )}

                        {highlights.length > 0 && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                ✨ Updated
                            </span>
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

                {isPDF && viewMode === 'original' && dirty && (
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-[11px] text-amber-800">
                        <span>The original PDF can't change. Your edits are in the Editable view.</span>
                        <button
                            onClick={() => setViewMode('editable')}
                            className="rounded bg-amber-600 px-2 py-0.5 font-medium text-white hover:bg-amber-700"
                        >
                            View edited
                        </button>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    {isPDF && viewMode === 'original' ? (
                        <PDFPreview file={file} issues={issues} />
                    ) : viewMode === 'formatted' ? (
                        <CVPreview cv={cv} issues={issues} highlights={highlights} onInlineEdit={handleInlineEdit} />
                    ) : (
                        <DocumentView
                            text={extractedText}
                            issues={issues}
                            highlights={highlights}
                            onLineEdit={handleLineEdit}
                            onApplyIssue={applyFix}
                            onDismissIssue={dismissIssue}
                        />
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
                                    <div className="mt-1.5 flex gap-1.5">
                                        <button
                                            onClick={() => applyFix(issue)}
                                            className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-green-700"
                                        >
                                            Apply
                                        </button>
                                        <button
                                            onClick={() => dismissIssue(issue)}
                                            className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-red-100"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
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
                        <h3 className="text-sm font-semibold text-slate-800">CV Assistant</h3>
                    </div>
                    <ChatBot
                        messages={messages}
                        busy={prompting}
                        disabled={!cv || parsing}
                        onSend={handlePrompt}
                    />
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