
import React, { useState } from 'react';

interface SynthesisModalProps {
  isOpen: boolean;
  onConfirm: (topic: string) => void;
  onCancel: () => void;
}

export const SynthesisModal: React.FC<SynthesisModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const [topic, setTopic] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900">Synthesize Child Node</h3>
                <p className="text-xs text-slate-500 font-medium">Create a new planning branch based on context.</p>
            </div>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Topic or Instruction</label>
                <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="E.g., Breakdown the Q3 Marketing Budget..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && topic.trim()) {
                            onConfirm(topic);
                        }
                    }}
                />
            </div>
            
            <div className="pt-2 flex flex-col gap-2.5">
                <button 
                    onClick={() => onConfirm(topic)}
                    disabled={!topic.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    Synthesize Topic
                </button>
                <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>
                <button 
                    onClick={() => onConfirm("Analyze the current state and synthesize the most relevant next step or breakdown.")}
                    className="w-full py-3 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group"
                >
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Auto-Generate (AI Decision)
                </button>
            </div>
            
            <div className="text-center">
                 <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            </div>
        </div>
      </div>
    </div>
  );
};
