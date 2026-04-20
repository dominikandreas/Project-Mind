
import React from 'react';
import { GroundingSource } from '../../types';

interface ReferencesWidgetProps {
  title: string;
  items: GroundingSource[];
}

export const ReferencesWidget: React.FC<ReferencesWidgetProps> = ({ title, items }) => {
  const displayItems = items || [];
  
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-6">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
         <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            {title}
         </h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
         {displayItems.map((item, i) => (
            <a key={i} href={item.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group">
               <div className="mt-1 p-1.5 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
               </div>
               <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-700 transition-colors">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.uri}</p>
               </div>
            </a>
         ))}
      </div>
    </div>
  );
};
