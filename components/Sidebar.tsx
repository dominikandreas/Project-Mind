
import React, { useRef } from 'react';
import { ProjectNode, ProjectState, ThinkingBudgetLevel, ModelProvider, CustomModelConfig } from '../types';
import { format } from 'date-fns';
import { TreeNode } from './TreeNode';
import { EngineSettings } from './Layout/EngineSettings';

interface SidebarProps {
  nodes: Record<string, ProjectNode>;
  rootId: string;
  currentNodeId: string;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onRenameNode: (id: string, newTitle: string) => void;
  onInsertParent: (id: string) => void;
  onImport: (state: ProjectState) => void;
  onModelChange: (model: string) => void;
  onBudgetChange: (level: ThinkingBudgetLevel) => void;
  onGroundingToggle: (enabled: boolean) => void;
  onProviderChange: (provider: ModelProvider) => void;
  onCustomConfigChange: (config: Partial<CustomModelConfig>) => void;
  onOpenSettings: () => void;
  projectState: ProjectState;
  onToggleSidebar: () => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  nodes, 
  rootId, 
  currentNodeId, 
  onSelectNode, 
  onDeleteNode, 
  onRenameNode,
  onInsertParent,
  onImport, 
  onModelChange, 
  onBudgetChange,
  onGroundingToggle,
  onProviderChange,
  onCustomConfigChange,
  onOpenSettings,
  projectState,
  onToggleSidebar,
  isOpen
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(projectState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `project-mind-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.nodes && json.rootId && json.currentNodeId) onImport(json);
        else alert('Invalid project file structure.');
      } catch (err) { alert('Error parsing project file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const currentBudget = projectState?.thinkingBudget || 'low';
  const isGroundingEnabled = projectState?.isGroundingEnabled ?? false;
  const provider = projectState?.modelProvider || 'gemini';

  return (
    <aside className="w-64 h-full bg-white flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Project Mind</h1>
          <p className="text-xs text-slate-500 mt-1">Generative Project Intelligence</p>
        </div>
        <div className="flex items-center gap-1">
             <button 
                onClick={onOpenSettings} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                title="Application Settings"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
             <button onClick={onToggleSidebar} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
             </button>
        </div>
      </div>

      <EngineSettings 
        projectState={projectState} onModelChange={onModelChange} onBudgetChange={onBudgetChange}
        onGroundingToggle={onGroundingToggle} onProviderChange={onProviderChange} 
        onCustomConfigChange={onCustomConfigChange}
      />
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 pt-2">Timeline Tree</div>
        <TreeNode nodeId={rootId} nodes={nodes} selectedId={currentNodeId} onSelect={onSelectNode} onDelete={onDeleteNode} onRename={onRenameNode} onInsertParent={onInsertParent} level={0} rootId={rootId} />
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-2">
        <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleImportClick} className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-lg transition-all shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0l-4-4m4 4H4" /></svg>
            Import
          </button>
          <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-lg transition-all shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
        </div>
        <div className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-tighter">
            {provider === 'gemini' ? (<>Research: {isGroundingEnabled ? 'ON' : 'OFF'} • Budget: {currentBudget}</>) : (<>Custom Provider Active</>)}
        </div>
      </div>
    </aside>
  );
};
