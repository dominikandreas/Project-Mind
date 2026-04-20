import React from 'react';
import { ErrorData } from '../../types';

interface ErrorWidgetProps {
  title: string;
  error: ErrorData;
}

export const ErrorWidget: React.FC<ErrorWidgetProps> = ({ title, error }) => {
  return (
    <div className="w-full bg-red-50 rounded-2xl border border-red-200 overflow-hidden my-6">
      <div className="bg-red-100/50 px-6 py-4 border-b border-red-200 flex items-center justify-between">
        <h3 className="font-black text-[11px] uppercase tracking-widest text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {title}
        </h3>
      </div>
      <div className="p-6">
        <p className="text-sm font-bold text-red-800 mb-4">{error.message}</p>
        {error.rawJson && (
          <div className="bg-white/50 rounded-xl p-4 border border-red-100 font-mono text-[10px] text-red-600 overflow-x-auto max-h-64">
            <pre className="whitespace-pre-wrap"><code>{error.rawJson}</code></pre>
          </div>
        )}
      </div>
    </div>
  );
};