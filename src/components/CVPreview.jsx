import EditableText from './EditableText';

// Always returns an array, whatever the input is (undefined, null, string, object)
const arr = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) return v.split(/[,\n•·]/).map((s) => s.trim()).filter(Boolean);
    return [];
};

// Always returns a string-safe value for rendering
const str = (v) => (v === undefined || v === null ? '' : String(v));

export default function CVPreview({ cv, issues: issuesProp, highlights: hlProp, onInlineEdit }) {
    const issues = Array.isArray(issuesProp) ? issuesProp : [];
    const highlights = Array.isArray(hlProp) ? hlProp : [];

    if (!cv) {
        return (
            <div className="mx-auto flex w-full max-w-[820px] min-h-[900px] items-center justify-center rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
                <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600">No CV loaded</p>
                    <p className="mt-1 text-xs text-slate-400">Upload a file to see the live preview</p>
                </div>
            </div>
        );
    }

    // ---- Normalize everything up front ----
    const p = cv.personalInfo || {};
    const contact = [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean);

    const skillsObj = Array.isArray(cv.skills)
        ? { technical: cv.skills, soft: [] }
        : cv.skills && typeof cv.skills === 'object'
            ? cv.skills
            : {};

    const experience = arr(cv.experience);
    const education = arr(cv.education);
    const projects = arr(cv.projects);
    const certifications = arr(cv.certifications);
    const languages = arr(cv.languages);
    const awards = arr(cv.awards);
    const technical = arr(skillsObj.technical);
    const soft = arr(skillsObj.soft);

    // NOTE: plain function (not a component) so React doesn't remount on each render
    const E = (text) => (
        <EditableText text={text} issues={issues} highlights={highlights} onEdit={onInlineEdit} />
    );

    return (
        <div id="cv-print" className="mx-auto w-full max-w-[820px] rounded-2xl bg-white p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
            <header className="mb-8 border-b border-slate-200 pb-5 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                    {E(str(p.name) || 'Your Name')}
                </h1>
                {contact.length > 0 && (
                    <p className="mt-2 flex flex-wrap justify-center gap-x-2 text-xs text-slate-600">
                        {contact.map((c, i) => (
                            <span key={i} className="flex items-center gap-2">
                                {i > 0 && <span className="text-slate-300">·</span>}
                                {E(c)}
                            </span>
                        ))}
                    </p>
                )}
            </header>

            {str(cv.summary) && (
                <Section title="Summary">
                    <p className="text-sm leading-relaxed text-slate-700">{E(str(cv.summary))}</p>
                </Section>
            )}

            {experience.length > 0 && (
                <Section title="Experience">
                    <div className="space-y-4">
                        {experience.map((e, i) => {
                            const bullets = arr(e?.bullets).filter(Boolean);
                            return (
                                <div key={e?.id || i}>
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                        <span className="text-sm font-semibold text-slate-900">{E(str(e?.role) || 'Role')}</span>
                                        {(e?.startDate || e?.endDate) && (
                                            <span className="text-xs text-slate-600">
                                                {E(str(e.startDate))}
                                                {e.endDate && <> – {E(str(e.endDate))}</>}
                                            </span>
                                        )}
                                    </div>
                                    {e?.company && <div className="text-xs italic text-slate-700">{E(str(e.company))}</div>}
                                    {bullets.length > 0 && (
                                        <ul className="ml-5 mt-1 list-disc space-y-0.5 text-sm text-slate-700">
                                            {bullets.map((b, j) => (
                                                <li key={j}>{E(str(b))}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {education.length > 0 && (
                <Section title="Education">
                    <div className="space-y-3">
                        {education.map((ed, i) => (
                            <div key={ed?.id || i} className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{E(str(ed?.degree) || 'Degree')}</div>
                                    {ed?.institution && <div className="text-xs italic text-slate-700">{E(str(ed.institution))}</div>}
                                </div>
                                <div className="text-right text-xs text-slate-600">
                                    {ed?.year && E(str(ed.year))}
                                    {ed?.gpa && <div>GPA: {E(str(ed.gpa))}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {(technical.length > 0 || soft.length > 0) && (
                <Section title="Skills">
                    {technical.length > 0 && (
                        <div className="mb-2">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Technical</div>
                            <div className="flex flex-wrap gap-1.5">
                                {technical.map((s, i) => (
                                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{E(str(s))}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {soft.length > 0 && (
                        <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Soft</div>
                            <div className="flex flex-wrap gap-1.5">
                                {soft.map((s, i) => (
                                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{E(str(s))}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>
            )}

            {projects.length > 0 && (
                <Section title="Projects">
                    <div className="space-y-3">
                        {projects.map((pr, i) => {
                            const tech = arr(pr?.tech);
                            return (
                                <div key={pr?.id || i}>
                                    <div className="flex flex-wrap items-baseline gap-x-2">
                                        <span className="text-sm font-semibold text-slate-900">{E(str(pr?.name) || 'Project')}</span>
                                        {pr?.link && <span className="text-xs text-indigo-600">{E(str(pr.link))}</span>}
                                    </div>
                                    {pr?.description && (
                                        <p className="mt-0.5 text-sm text-slate-700">{E(str(pr.description))}</p>
                                    )}
                                    {tech.length > 0 && (
                                        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-slate-500">
                                            {tech.map((t, k) => (
                                                <span key={k}>
                                                    {k > 0 && <span className="mr-1.5 text-slate-300">·</span>}
                                                    {E(str(t))}
                                                </span>
                                            ))}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {certifications.length > 0 && (
                <Section title="Certifications">
                    <ul className="ml-5 list-disc space-y-0.5 text-sm text-slate-700">
                        {certifications.map((c, i) => (
                            <li key={i}>{E(str(c))}</li>
                        ))}
                    </ul>
                </Section>
            )}

            {languages.length > 0 && (
                <Section title="Languages">
                    <p className="flex flex-wrap gap-x-1.5 text-sm text-slate-700">
                        {languages.map((l, i) => (
                            <span key={i}>
                                {i > 0 && <span className="mr-1.5 text-slate-300">·</span>}
                                {E(str(l))}
                            </span>
                        ))}
                    </p>
                </Section>
            )}

            {awards.length > 0 && (
                <Section title="Awards">
                    <ul className="ml-5 list-disc space-y-0.5 text-sm text-slate-700">
                        {awards.map((a, i) => (
                            <li key={i}>{E(str(a))}</li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="mb-7">
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-700">
                {title}
            </h2>
            {children}
        </section>
    );
}