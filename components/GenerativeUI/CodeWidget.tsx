
import React, { useState, useEffect } from 'react';
import { CodeData, DataStore } from '../../types';

interface CodeWidgetProps {
  title: string;
  code: CodeData;
  dataContext?: { stores: DataStore[] };
}

export const CodeWidget: React.FC<CodeWidgetProps> = ({ title, code, dataContext }) => {
  // Robust fallback to prevent crashes if 'code' is undefined/null
  const safeCode = code || { language: 'plaintext', content: '// Error: No code data provided' };
  
  const [output, setOutput] = useState<string | null>(safeCode.output || null);
  const [isRunning, setIsRunning] = useState(false);

  // Update local state if the prop changes (e.g. during streaming or corrections)
  useEffect(() => {
    if (code?.output) setOutput(code.output);
  }, [code]);

  const language = safeCode.language || 'plaintext';
  const isJs = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js';

  const handleRun = async () => {
      setIsRunning(true);
      setOutput(null);
      
      try {
          // Safe(r) eval for demo purposes
          const logs: string[] = [];
          const safeConsole = {
              log: (...args: any[]) => logs.push(args.map(a => 
                  typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              ).join(' ')),
              warn: (...args: any[]) => logs.push('WARN: ' + args.map(a => String(a)).join(' ')),
              error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => String(a)).join(' '))
          };

          // Prepare Database Context for the script
          const dbContext = dataContext ? {
              listStores: () => dataContext.stores.map(s => s.id),
              getStore: (id: string) => {
                  const s = dataContext.stores.find(store => store.id === id);
                  return s ? [...s.records] : []; // Return copy to prevent mutation
              },
              stores: [...dataContext.stores]
          } : { listStores: () => [], getStore: () => [], stores: [] };

          // Wait a bit to show loading state
          await new Promise(r => setTimeout(r, 600));

          const func = new Function('console', 'db', `
              try {
                  ${safeCode.content}
              } catch (e) {
                  console.error(e.toString());
              }
          `);
          
          func(safeConsole, dbContext);
          setOutput(logs.length > 0 ? logs.join('\n') : 'Code executed successfully (no output).');
      } catch (e: any) {
          setOutput(`Execution Failed: ${e.message}`);
      } finally {
          setIsRunning(false);
      }
  };

  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 my-4">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
           </div>
           <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title} • {language}</span>
        </div>
        {isJs && (
            <button 
                onClick={handleRun} 
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-50 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
                {isRunning ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                )}
                Run
            </button>
        )}
      </div>
      <div className="p-4 font-mono text-sm overflow-x-auto text-blue-100/90 leading-relaxed">
        <pre><code>{safeCode.content}</code></pre>
      </div>
      {(safeCode.explanation || output) && (
        <div className="bg-slate-800/50 p-4 border-t border-slate-700/50">
          {safeCode.explanation && <p className="text-xs text-slate-400 italic mb-2"># {safeCode.explanation}</p>}
          {output && (
            <div className="mt-2 bg-black/50 p-3 rounded-lg text-[11px] font-mono border border-white/5 overflow-x-auto">
              <div className="text-slate-500 text-[9px] uppercase tracking-widest mb-1">$ Console Output</div>
              <div className="text-emerald-400/90 whitespace-pre-wrap">{output}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
