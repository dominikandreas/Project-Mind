import React from 'react';
import { RiskItem } from '../../types';

interface RiskMatrixWidgetProps {
  title: string;
  risks: RiskItem[];
}

export const RiskMatrixWidget: React.FC<RiskMatrixWidgetProps> = ({ title, risks }) => {
  const grid = [5, 4, 3, 2, 1]; // Likelihood (Y)
  const impacts = [1, 2, 3, 4, 5]; // Impact (X)

  const getCellColor = (i: number, l: number) => {
    const score = i * l;
    if (score >= 15) return 'bg-red-500/10 border-red-200/50';
    if (score >= 8) return 'bg-amber-500/10 border-amber-200/50';
    return 'bg-emerald-500/10 border-emerald-200/50';
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-6">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
        <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <div className="p-8 flex flex-col md:flex-row gap-8">
        <div className="relative w-64 h-64 shrink-0">
          {/* Axis Labels */}
          <div className="absolute -left-10 top-1/2 -rotate-90 text-[10px] font-black text-slate-400 uppercase tracking-widest">Likelihood</div>
          <div className="absolute bottom--8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact</div>
          
          <div className="grid grid-cols-5 grid-rows-5 w-full h-full border-2 border-slate-100 rounded-lg overflow-hidden relative">
            {grid.map(l => (
              impacts.map(i => (
                <div key={`${l}-${i}`} className={`border-[0.5px] ${getCellColor(i, l)} relative`}>
                  {risks.filter(r => r.impact === i && r.likelihood === l).map((r, idx) => (
                    <div 
                      key={r.id} 
                      className="absolute inset-0 flex items-center justify-center"
                      title={`${r.label}: Impact ${r.impact}, Likelihood ${r.likelihood}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shadow-lg animate-bounce" style={{ animationDelay: `${idx * 0.2}s` }}>
                        {r.id.slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ))}
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Risk Catalog</div>
          <div className="grid grid-cols-1 gap-3">
            {risks.map(r => (
              <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-4 items-start">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{r.id.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{r.label}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">I:{r.impact} | L:{r.likelihood} — {r.mitigation || 'No mitigation strategy defined.'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};