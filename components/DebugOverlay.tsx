

import React, { useState } from 'react';
import { DebugInfo } from '../types';

interface DebugOverlayProps {
  debugInfo?: DebugInfo;
  onClose: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ debugInfo, onClose }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'error'>('error');

  if (!debugInfo) return null;

  const hasError = !!debugInfo.error;

  // Auto-switch to error tab if there's an error and we haven't manually switched yet
  // (Handling this logic in render/state init is simpler)
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${hasError ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${hasError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
             </div>
             <div>
                <h2 className={`text-lg font-bold ${hasError ? 'text-red-900' : 'text-slate-800'}`}>Debug Inspector</h2>
                <div className="text-xs text-slate-500 font-mono">
                    {new Date(debugInfo.timestamp).toLocaleTimeString()} • {debugInfo.request.model} • {debugInfo.request.budget} budget
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
            <button 
                onClick={() => setActiveTab('request')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'request' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
                Request Context
            </button>
            <button 
                onClick={() => setActiveTab('response')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'response' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
                Raw Response
            </button>
            <button 
                onClick={() => setActiveTab('error')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'error' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
                Error Log
                {hasError && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 font-mono text-xs">
            {activeTab === 'request' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-slate-400 font-bold mb-2 uppercase">System Instruction</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm whitespace-pre-wrap text-slate-700">
                            {debugInfo.request.systemInstruction}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-slate-400 font-bold mb-2 uppercase">Full Prompt</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm whitespace-pre-wrap text-slate-700">
                            {debugInfo.request.prompt}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'response' && (
                <div className="h-full">
                    {debugInfo.response ? (
                        <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl shadow-inner min-h-full whitespace-pre-wrap">
                            {debugInfo.response}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 italic">No response captured.</div>
                    )}
                </div>
            )}

            {activeTab === 'error' && (
                <div className="h-full">
                    {hasError ? (
                        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 whitespace-pre-wrap">
                            {debugInfo.error}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                             <svg className="w-12 h-12 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             <span className="font-bold">No errors reported in this generation.</span>
                        </div>
                    )}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};