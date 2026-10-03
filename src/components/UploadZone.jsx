import { useRef, useState } from 'react';

export default function UploadZone({ onFileSelected, fileName }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleFiles = (files) => {
        const file = files?.[0];
        if (!file) return;
        if (!/\.(pdf|docx?|txt)$/i.test(file.name)) {
            alert('Please upload a PDF, DOCX, or TXT file.');
            return;
        }
        onFileSelected(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`group cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${dragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
                }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 transition group-hover:bg-indigo-200">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                </svg>
            </div>

            {fileName ? (
                <>
                    <p className="truncate text-sm font-medium text-slate-800">{fileName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Click to replace</p>
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-slate-800">
                        Drop CV or <span className="text-indigo-600">browse</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">PDF, DOCX, TXT</p>
                </>
            )}
        </div>
    );
}