import { NavLink } from 'react-router-dom';

const items = [
    {
        to: '/',
        label: 'Create CV',
        desc: 'Build from scratch',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
        ),
    },
    {
        to: '/update',
        label: 'Update CV',
        desc: 'Upload & improve',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
            {/* Brand */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                    AI
                </div>
                <div>
                    <h1 className="text-sm font-bold leading-tight text-slate-800">CV Builder</h1>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Hackathon Edition</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 p-3">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Workspace
                </p>
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${isActive
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                                        }`}
                                >
                                    {item.icon}
                                </span>
                                <span className="flex flex-col">
                                    <span className="font-medium leading-tight">{item.label}</span>
                                    <span className="text-[11px] leading-tight text-slate-400">{item.desc}</span>
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4">
                <p className="text-[10px] text-slate-400">
                    Tip: Upload an existing CV to see it in the live preview.
                </p>
            </div>
        </aside>
    );
}