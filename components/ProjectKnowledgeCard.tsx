import React from 'react';

interface ProjectKnowledgeCardProps { 
    knowledge?: Record<string, any>; 
    onSync?: () => void 
}

export const ProjectKnowledgeCard: React.FC<ProjectKnowledgeCardProps> = ({ knowledge, onSync }) => {
    if (!knowledge || Object.keys(knowledge).length === 0) return null;

    const renderValue = (val: any): React.ReactNode => {
        if (val === null || val === undefined) {
             return <span className="text-slate-300 italic">null</span>;
        }
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            return <span className="text-slate-700 font-medium">{String(val)}</span>;
        }
        if (Array.isArray(val)) {
            return (
                <div className="flex flex-col gap-1 mt-1">
                    {val.map((v, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-slate-300 mt-0.5">•</span>
                            {renderValue(v)}
                        </div>
                    ))}
                </div>
            );
        }
        if (typeof val === 'object') {
             return (
                 <div className="pl-2 border-l-2 border-slate-100 mt-1 space-y-1">
                     {Object.entries(val).map(([k, v]) => (
                         <div key={k}>
                             <span className="text-[10px] uppercase text-slate-400 font-bold mr-2">{k}:</span>
                             {renderValue(v)}
                         </div>
                     ))}
                 </div>
             )
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all h-full overflow-hidden flex flex-col group/knowledge">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Project Knowledge</h2>
                </div>
                {onSync && (
                  <button 
                    onClick={onSync}
                    className="opacity-0 group-hover/knowledge:opacity-100 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    title="Re-scan context for knowledge updates"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {Object.entries(knowledge).map(([key, value]) => (
                    <div key={key} className="text-xs group">
                        <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-0.5">{key}</div>
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 group-hover:border-slate-200 transition-colors">
                            {renderValue(value)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};