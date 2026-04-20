
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MindmapNode } from '../types';

interface ChatTurnProps { 
  message: ChatMessage; 
  onMindmapNodeClick?: (node: MindmapNode) => void;
  onDelete?: () => void;
  isDeletable?: boolean;
  onImageClick?: (image: {data: string, name: string}) => void;
  onViewSnapshot?: () => void;
  isViewingSnapshot?: boolean;
}

export const ChatTurn: React.FC<ChatTurnProps> = ({ 
  message, 
  onMindmapNodeClick, 
  onDelete, 
  isDeletable, 
  onImageClick,
  onViewSnapshot,
  isViewingSnapshot
}) => {
  const isUser = message.role === 'user';
  const hasSnapshot = !!message.visualizationSnapshot;

  const MarkdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-black" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-600 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-500 my-2" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      return inline ? (
        <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800 border border-slate-200" {...props}>{children}</code>
      ) : (
        <div className="bg-slate-900 rounded-lg p-3 my-2 overflow-x-auto border border-slate-700">
          <code className="text-xs font-mono text-emerald-400 block whitespace-pre" {...props}>{children}</code>
        </div>
      );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 group">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 relative`}>
        <div className={`max-w-[90%] px-4 py-3 rounded-2xl shadow-sm border relative transition-all duration-300 ${
          isUser 
            ? 'bg-white border-blue-100 text-blue-900 rounded-br-none' 
            : isViewingSnapshot 
                ? 'bg-indigo-50 border-indigo-200 text-slate-700 rounded-bl-none ring-2 ring-indigo-400 ring-offset-2' 
                : 'bg-white border-slate-200 text-slate-700 rounded-bl-none'
        }`}>
          <div className="flex justify-between items-center mb-1">
            <div className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
               {isUser ? 'YOU' : 'GEMINI'}
               {!isUser && isViewingSnapshot && <span className="text-indigo-600 animate-pulse">• VIEWING HISTORY</span>}
            </div>
            <div className="flex gap-1">
               {hasSnapshot && onViewSnapshot && (
                   <button 
                     onClick={onViewSnapshot}
                     className={`p-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                        isViewingSnapshot 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                     }`}
                     title="Jump back to the visualization state at this point in history"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     {isViewingSnapshot ? 'Active' : 'Jump to State'}
                   </button>
               )}
               {isDeletable && onDelete && (
                <button 
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all rounded-full hover:bg-red-50"
                    title="Delete message"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
               )}
            </div>
          </div>
          
          <div className="text-sm font-medium">
            <ReactMarkdown components={MarkdownComponents}>
              {message.text || ''}
            </ReactMarkdown>
          </div>

          {message.attachments && message.attachments.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-2">
                 {message.attachments.map((att, idx) => (
                     <div key={idx} className="cursor-pointer group/img relative" onClick={() => onImageClick?.(att)}>
                         <div className="h-16 w-16 rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-slate-50">
                             {att.type.startsWith('image/') ? (
                                 <img src={att.data} className="h-full w-full object-cover group-hover/img:scale-105 transition-transform" />
                             ) : (
                                 <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-slate-400">FILE</div>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
          )}

          {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grounding Sources</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.groundingSources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all group/link"
                  >
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px] group-hover/link:text-emerald-700">{source.title}</span>
                    <svg className="w-2.5 h-2.5 text-slate-300 group-hover/link:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
