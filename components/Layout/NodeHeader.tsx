
import React from 'react';
import { format } from 'date-fns';
import { ProjectNode } from '../../types';

interface NodeHeaderProps {
  node: ProjectNode;
  parentNode?: ProjectNode;
  allNodes: ProjectNode[];
  currentIndex: number;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSelectNode: (id: string) => void;
  onShowDebug: () => void;
  onShowDataExplorer: () => void;
  onRegenerate: () => void;
  onRefresh: () => void;
  onShowSynthesisModal: () => void;
  onShowCleanupModal: () => void;
  onUndoCleanup?: () => void;
  hasDebugError: boolean;
  activeProjectDataLength: number;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({
  node,
  parentNode,
  allNodes,
  currentIndex,
  isSidebarOpen,
  onToggleSidebar,
  onSelectNode,
  onShowDebug,
  onShowDataExplorer,
  onRegenerate,
  onRefresh,
  onShowSynthesisModal,
  onShowCleanupModal,
  onUndoCleanup,
  hasDebugError,
  activeProjectDataLength,
}) => {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allNodes.length - 1;

  return (
    <div className="shrink-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-4 min-w-0">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors border border-transparent hover:border-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            disabled={!hasPrev}
            onClick={() => onSelectNode(allNodes[currentIndex - 1].id)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            disabled={!hasNext}
            onClick={() => onSelectNode(allNodes[currentIndex + 1].id)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="min-w-0 border-l border-slate-200 pl-4 ml-2">
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {parentNode ? (
              <span
                className="cursor-pointer hover:text-indigo-600 truncate max-w-[120px]"
                onClick={() => onSelectNode(parentNode.id)}
              >
                {parentNode.visualization?.title || 'Parent'}
              </span>
            ) : (
              <span>Root</span>
            )}
            <span>/</span>
            <span className="shrink-0">{format(new Date(node.timestamp), 'MMM d, HH:mm')}</span>
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 leading-none mt-1 truncate max-w-md">
              {node.visualization?.title || 'Untitled Node'}
            </h1>

            {node.debugInfo && (
              <button
                onClick={onShowDebug}
                className={`ml-1 p-1 rounded-full transition-all shrink-0 ${
                  hasDebugError
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                }`}
                title="Debug Inspector"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {activeProjectDataLength > 0 && (
          <button
            onClick={onShowDataExplorer}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
            title="Open Data Store Explorer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            Data
            <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[9px] text-slate-500">
              {activeProjectDataLength}
            </span>
          </button>
        )}

        <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>

        <button
          onClick={onRegenerate}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          title="Regenerate from input"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          title="Re-analyze context & update project data"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {node.restorePoint && onUndoCleanup ? (
          <button
            onClick={onUndoCleanup}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5"
            title="Undo Cleanup (Restore previous state)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onShowCleanupModal(); }}
            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
            title="Consolidate chat history into a single turn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </button>
        )}

        <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
        <button
          onClick={onShowSynthesisModal}
          className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm"
        >
          Synthesize Child
        </button>
      </div>
    </div>
  );
};
