
// ... existing imports
import React, { useState, useEffect, useRef } from 'react';
import { ProjectNode, ProjectState, MindmapNode, NodeVisualization, NodeData, WidgetData } from '../types';
import { WidgetRenderer } from './GenerativeUI/WidgetRenderer';
import { DebugOverlay } from './DebugOverlay';
import { ChatTurn } from './ChatTurn';
import { ProjectKnowledgeCard } from './ProjectKnowledgeCard';
import { DataStoreExplorer } from './DataStoreExplorer';
import { SynthesisModal } from './SynthesisModal';
import { ConfirmationModal } from './ConfirmationModal';
import { NodeHeader } from './Layout/NodeHeader';
import { SnapshotBanner } from './Layout/SnapshotBanner';
import { WidgetEditorModal } from './WidgetEditorModal';

interface NodeViewProps {
  node: ProjectNode;
  parentNode?: ProjectNode;
  projectState: ProjectState;
  onSelectNode: (id: string) => void;
  onRegenerate: (input: string) => void;
  onSynthesize: (topic?: string) => void;
  onRefresh: () => void;
  onMindmapNodeClick?: (node: MindmapNode) => void;
  onDeleteChatMessage?: (index: number) => void;
  onDeleteWidget: (nodeId: string, index: number) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onUpdateNodeData: (nodeId: string, data: any) => void;
  onUpdateNodeViz?: (nodeId: string, viz: any) => void;
  onRevertState: (index: number) => void;
  onShowCleanupModal: () => void;
  onUndoCleanup?: () => void;
}

export const NodeView: React.FC<NodeViewProps> = ({ 
  node, 
  parentNode, 
  projectState, 
  onSelectNode, 
  onRegenerate, 
  onSynthesize, 
  onRefresh,
  onMindmapNodeClick,
  onDeleteChatMessage,
  onDeleteWidget,
  onToggleSidebar,
  isSidebarOpen,
  onUpdateNodeData,
  onUpdateNodeViz,
  onRevertState,
  onShowCleanupModal,
  onUndoCleanup
}) => {
  const [selectedImage, setSelectedImage] = useState<{data: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showDataExplorer, setShowDataExplorer] = useState(false);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [vizMode, setVizMode] = useState<'minimized' | 'normal' | 'large' | 'maximized'>('normal');
  const [showVizDetails, setShowVizDetails] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const [viewingSnapshot, setViewingSnapshot] = useState<{data: NodeData, viz: NodeVisualization, index: number} | null>(null);
  const [confirmRevertIndex, setConfirmRevertIndex] = useState<number | null>(null);

  // Widget Editor State
  const [widgetEditorOpen, setWidgetEditorOpen] = useState(false);
  const [editingWidgetIndex, setEditingWidgetIndex] = useState<number | null>(null);

  useEffect(() => {
    setViewingSnapshot(null);
    setConfirmRevertIndex(null);
  }, [node.id]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [node.chat, node.isLoading, node.id, node.processingStage, viewingSnapshot]);

  const allNodes = (Object.values(projectState.nodes) as ProjectNode[]).sort((a, b) => a.timestamp - b.timestamp);
  const currentIndex = allNodes.findIndex(n => n.id === node.id);

  const handleDownload = (data: string, filename: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    link.click();
  };

  const handleSaveWidget = (updatedWidget: WidgetData) => {
    if (!onUpdateNodeViz) return;
    
    const currentWidgets = node.visualization.widgets || [];
    let newWidgets;

    if (editingWidgetIndex !== null) {
        // Edit existing
        newWidgets = [...currentWidgets];
        newWidgets[editingWidgetIndex] = updatedWidget;
    } else {
        // Add new
        newWidgets = [...currentWidgets, updatedWidget];
    }

    onUpdateNodeViz(node.id, { widgets: newWidgets });
    setEditingWidgetIndex(null);
  };

  const handleUpdateRecord = (storeId: string, recordId: string, field: string, value: any) => {
    const stores = activeData?.projectData?.stores || [];
    if (stores.length === 0) return;

    const newStores = stores.map(store => {
        if (store.id === storeId) {
            return {
                ...store,
                records: store.records.map(r => {
                    if (r.id === recordId) {
                        return { ...r, [field]: value };
                    }
                    return r;
                })
            };
        }
        return store;
    });
    
    // Only allow updating current state, not historical snapshots
    if (!viewingSnapshot) {
        onUpdateNodeData(node.id, { projectData: { stores: newStores } });
    }
  };

  const hasDebugError = !!node.debugInfo?.error;

  const getVizHeight = () => {
     switch(vizMode) {
         case 'minimized': return '48px';
         case 'normal': return '45%';
         case 'large': return '75%';
         case 'maximized': return '100%';
     }
  };

  const VizControl: React.FC<{ 
    mode: typeof vizMode, 
    label: string, 
    icon: React.ReactNode, 
    isActive: boolean 
  }> = ({ mode, label, icon, isActive }) => (
    <button
        onClick={(e) => { e.stopPropagation(); setVizMode(mode); }}
        className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
        title={label}
    >
        {icon}
    </button>
  );
  
  const isMaximized = vizMode === 'maximized' || vizMode === 'large';
  const isFullscreen = vizMode === 'maximized';

  const activeData = viewingSnapshot ? viewingSnapshot.data : node.data;
  const activeViz = viewingSnapshot ? viewingSnapshot.viz : node.visualization;
  const activeProjectData = activeData?.projectData;

  const snapshotIndices = node.chat
    .map((m, i) => (m.visualizationSnapshot && m.dataSnapshot ? i : -1))
    .filter(i => i !== -1);
  
  const currentSnapshotIndexInList = viewingSnapshot ? snapshotIndices.indexOf(viewingSnapshot.index) : -1;
  const hasPrevSnapshot = viewingSnapshot ? currentSnapshotIndexInList > 0 : snapshotIndices.length > 0;
  const hasNextSnapshot = viewingSnapshot ? true : false;

  const loadSnapshot = (index: number) => {
      const msg = node.chat[index];
      if (msg && msg.visualizationSnapshot && msg.dataSnapshot) {
          setViewingSnapshot({
              viz: msg.visualizationSnapshot,
              data: msg.dataSnapshot,
              index: index
          });
      }
  };

  const handlePrevSnapshot = () => {
    if (!viewingSnapshot) {
        const last = snapshotIndices[snapshotIndices.length - 1];
        if (last !== undefined) loadSnapshot(last);
        return;
    }
    if (currentSnapshotIndexInList > 0) {
        loadSnapshot(snapshotIndices[currentSnapshotIndexInList - 1]);
    }
  };

  const handleNextSnapshot = () => {
     if (!viewingSnapshot) return;
     if (currentSnapshotIndexInList < snapshotIndices.length - 1) {
         loadSnapshot(snapshotIndices[currentSnapshotIndexInList + 1]);
     } else {
         setViewingSnapshot(null);
     }
  };

  const getLoadingText = () => {
      switch(node.processingStage) {
          case 'analyzing': return 'Analyzing project requirements...';
          case 'updating_data': return 'Updating database & schemas...';
          case 'designing_ui': return 'Designing interface components...';
          case 'rendering': return 'Rendering visualizations...';
          default: return 'Gemini is thinking...';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-[110px]">
      <ConfirmationModal 
        isOpen={confirmRevertIndex !== null}
        onConfirm={() => {
            const idx = confirmRevertIndex!;
            setViewingSnapshot(null);
            setTimeout(() => onRevertState(idx), 0);
            setConfirmRevertIndex(null);
        }}
        onCancel={() => setConfirmRevertIndex(null)}
        title="Restore History State"
        message="Are you sure you want to revert to this state? All chat history, data, and visualizations created after this point will be permanently lost."
      />
      
      {widgetEditorOpen && (
        <WidgetEditorModal 
          isOpen={widgetEditorOpen}
          onClose={() => { setWidgetEditorOpen(false); setEditingWidgetIndex(null); }}
          onSave={handleSaveWidget}
          availableStores={activeProjectData?.stores || []}
          initialWidget={editingWidgetIndex !== null ? activeViz.widgets[editingWidgetIndex] : undefined}
        />
      )}

      <NodeHeader 
        node={node} parentNode={parentNode} allNodes={allNodes} currentIndex={currentIndex}
        isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} onSelectNode={onSelectNode}
        onShowDebug={() => setShowDebug(true)} onShowDataExplorer={() => setShowDataExplorer(true)}
        onRegenerate={() => onRegenerate(node.userInput)} onRefresh={onRefresh}
        onShowSynthesisModal={() => setShowSynthesisModal(true)} onShowCleanupModal={onShowCleanupModal}
        onUndoCleanup={onUndoCleanup} hasDebugError={hasDebugError}
        activeProjectDataLength={activeProjectData?.stores?.length || 0}
      />
      
      {viewingSnapshot && (
        <SnapshotBanner 
          currentIndex={viewingSnapshot.index} totalSteps={node.chat.length}
          hasPrevSnapshot={hasPrevSnapshot} hasNextSnapshot={hasNextSnapshot}
          onPrevSnapshot={handlePrevSnapshot} onNextSnapshot={handleNextSnapshot}
          onRevert={() => setConfirmRevertIndex(viewingSnapshot.index)}
          onExit={() => setViewingSnapshot(null)}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        <div 
            className="absolute top-0 left-0 right-0 overflow-y-auto bg-slate-50/50 px-4 pt-6 transition-all duration-300 ease-in-out"
            style={{ bottom: getVizHeight() }}
        >
            <div className="max-w-4xl mx-auto space-y-4 min-h-full pb-10">
                <ChatTurn 
                    message={{ 
                      role: 'user', 
                      text: node.userInput, 
                      timestamp: node.timestamp, 
                      attachments: node.userAttachments
                    }} 
                    onMindmapNodeClick={onMindmapNodeClick} 
                    isDeletable={false}
                    onImageClick={setSelectedImage}
                />
                
                {(viewingSnapshot ? node.chat.slice(0, viewingSnapshot.index + 1) : node.chat).map((msg, i) => (
                    <ChatTurn 
                        key={`${node.id}-msg-${i}`} 
                        message={msg} 
                        onMindmapNodeClick={onMindmapNodeClick}
                        isDeletable={true}
                        onDelete={() => onDeleteChatMessage?.(i)}
                        onImageClick={setSelectedImage}
                        onViewSnapshot={() => {
                            if (viewingSnapshot?.index === i) setViewingSnapshot(null);
                            else if (msg.visualizationSnapshot && msg.dataSnapshot) {
                                setViewingSnapshot({ viz: msg.visualizationSnapshot, data: msg.dataSnapshot, index: i });
                            }
                        }}
                        isViewingSnapshot={viewingSnapshot?.index === i}
                    />
                ))}

                {!viewingSnapshot && node.isLoading && (
                    <div className="flex justify-start pl-4 py-4">
                        <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="relative w-4 h-4">
                                <div className="absolute top-0 left-0 w-full h-full border-2 border-indigo-200 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 animate-pulse uppercase tracking-widest ml-1">{getLoadingText()}</span>
                        </div>
                    </div>
                )}
                <div ref={scrollEndRef} className="h-4"></div>
            </div>
        </div>

        <div 
            className={`absolute bottom-0 left-0 right-0 bg-white shadow-[0_-4px_30px_-10px_rgba(0,0,0,0.15)] border-t border-slate-200 transition-all duration-300 ease-in-out flex flex-col z-20 ${viewingSnapshot ? 'border-t-4 border-indigo-500' : ''}`}
            style={{ height: getVizHeight() }}
        >
            <div 
                className="h-12 shrink-0 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setVizMode(m => m === 'minimized' ? 'normal' : 'minimized')}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${viewingSnapshot ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                        <div className="font-black text-[10px] uppercase tracking-widest text-slate-500">
                             {viewingSnapshot ? `History Mode (Step ${viewingSnapshot.index + 1})` : 'Visualization Deck'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 leading-none truncate max-w-[200px]">
                            {activeViz?.title || 'Generative Output'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowVizDetails(!showVizDetails)}
                        className={`p-1.5 rounded-lg border transition-all ${showVizDetails ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <VizControl mode="minimized" label="Minimize" isActive={vizMode === 'minimized'} icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>} />
                        <VizControl mode="normal" label="Normal View" isActive={vizMode === 'normal'} icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={3} /></svg>} />
                        <VizControl mode="large" label="Expanded View" isActive={vizMode === 'large'} icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>} />
                        <VizControl mode="maximized" label="Fullscreen" isActive={vizMode === 'maximized'} icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8 space-y-8 relative">
                 <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${!showVizDetails ? 'grid-cols-1' : (isFullscreen ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}`}>
                    {showVizDetails && (
                        <div className={`space-y-6 ${isFullscreen ? 'lg:col-span-1' : 'lg:col-span-1'}`}>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Summary</h2>
                                </div>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed">{activeData?.summary || "No summary available."}</p>
                            </div>
                            
                            {activeData?.projectKnowledge && Object.keys(activeData.projectKnowledge).length > 0 && <ProjectKnowledgeCard knowledge={activeData.projectKnowledge} onSync={onRefresh} />}
                            
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div>
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Key Facts</h2>
                                </div>
                                <ul className="space-y-2">
                                    {activeData?.keyPoints?.map((kp, i) => (<li key={i} className="flex gap-2.5 text-xs text-slate-600"><span className="text-blue-400 font-bold mt-0.5">•</span><span className="leading-snug">{kp}</span></li>))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className={`space-y-6 transition-all duration-300 ${!showVizDetails ? 'col-span-1' : (isFullscreen ? 'lg:col-span-3' : 'lg:col-span-2')}`}>
                        {activeViz?.widgets && activeViz.widgets.length > 0 ? (
                            activeViz.widgets.map((widget, idx) => (
                                <div key={`viz-${node.id}-${idx}`} className="relative group/widget">
                                    <WidgetRenderer 
                                        widget={widget} 
                                        onMindmapNodeClick={onMindmapNodeClick} 
                                        isExpanded={isMaximized} 
                                        projectData={activeProjectData}
                                        onUpdateRecord={handleUpdateRecord} 
                                    />
                                    <div className="absolute top-4 right-4 z-40 flex gap-2 opacity-0 group-hover/widget:opacity-100 transition-all transform scale-90 group-hover/widget:scale-100">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingWidgetIndex(idx); setWidgetEditorOpen(true); }}
                                            className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-md border border-slate-200"
                                            title="Edit Widget"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteWidget(node.id, idx); }} 
                                            className="p-2 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-md border border-slate-200"
                                            title="Delete Widget"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400">
                                <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Visual Elements</span>
                            </div>
                        )}
                        {!viewingSnapshot && (
                            <div className="flex justify-center mt-6 mb-12 gap-3">
                                <button 
                                    onClick={() => { setEditingWidgetIndex(null); setWidgetEditorOpen(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Visualization
                                </button>
                                <button 
                                    onClick={onRefresh}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Agent Update
                                </button>
                            </div>
                        )}
                    </div>
                 </div>
                 <div className="h-20"></div>
            </div>
        </div>
      </div>

      {selectedImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/90 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
              <div className="relative max-w-6xl max-h-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                  <img src={selectedImage.data} className="rounded-3xl shadow-2xl max-h-[80vh] object-contain border border-white/20" />
                  <div className="flex gap-4">
                      <button onClick={() => handleDownload(selectedImage.data, selectedImage.name)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20">Download</button>
                      <button onClick={() => setSelectedImage(null)} className="px-8 py-3 bg-white/10 text-white rounded-2xl font-black border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md">Close</button>
                  </div>
              </div>
          </div>
      )}
      
      {showDebug && <DebugOverlay debugInfo={node.debugInfo} onClose={() => setShowDebug(false)} />}
      
      {showDataExplorer && activeProjectData && (
        <DataStoreExplorer stores={activeProjectData.stores} onClose={() => setShowDataExplorer(false)} onUpdateStores={(newStores) => onUpdateNodeData(node.id, { projectData: { stores: newStores } })} />
      )}

      <SynthesisModal isOpen={showSynthesisModal} onConfirm={(topic) => { setShowSynthesisModal(false); onSynthesize(topic); }} onCancel={() => setShowSynthesisModal(false)} />
    </div>
  );
};
