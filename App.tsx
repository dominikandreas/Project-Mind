
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sidebar } from './components/Sidebar';
import { NodeView } from './components/NodeView';
import { ChatInput } from './components/Layout/ChatInput';
import { ProjectNode, ProjectState, ThinkingBudgetLevel, NodeData, ModelProvider, CustomModelConfig, RestorePoint } from './types';
import { generateNodeResponse } from './services/api';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CleanupModal } from './components/CleanupModal';
import { SettingsModal } from './components/SettingsModal';
import { deepMerge } from './utils/helpers';

const INITIAL_ROOT_ID = 'root-1';

const DEFAULT_STATE: ProjectState = {
  rootId: INITIAL_ROOT_ID,
  currentNodeId: INITIAL_ROOT_ID,
  selectedModel: 'gemini-3-pro-preview',
  thinkingBudget: 'low',
  isGroundingEnabled: false,
  modelProvider: 'gemini',
  isGeminiEnabled: true,
  customModelConfig: { endpoint: 'http://localhost:11434/v1/chat/completions', modelName: 'llama3', apiKey: '' },
  nodes: {
    [INITIAL_ROOT_ID]: {
      id: INITIAL_ROOT_ID, parentId: null, timestamp: Date.now(), userInput: "Project Start: Initialize environment.", userAttachments: [], children: [], isLoading: false, processingStage: 'idle',
      data: { summary: "Project workspace initialized. Ready for planning.", keyPoints: ["Workspace created"], projectKnowledge: {}, projectData: { stores: [] } },
      visualization: { title: "Workspace Root", widgets: [] }, chat: [] 
    }
  }
};

const STORAGE_KEY = 'gemini_project_mind_db_v10';

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_STATE;
      const parsed = JSON.parse(saved);
      if (parsed.nodes) {
        Object.keys(parsed.nodes).forEach(key => {
            const node = parsed.nodes[key];
            if (node.isLoading) {
                node.isLoading = false;
                node.processingStage = 'idle';
                if (!node.chat) node.chat = [];
                node.chat.push({ role: 'assistant', text: '⚠️ Generation was interrupted.', timestamp: Date.now() });
            }
            if (!node.data.projectData) node.data.projectData = { stores: [] };
        });
      }
      // Ensure compatibility with older state
      if (parsed.isGeminiEnabled === undefined) parsed.isGeminiEnabled = true;
      return parsed;
    } catch (e) { return DEFAULT_STATE; }
  });

  const [input, setInput] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<{name: string, type: string, data: string}[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null);
  const [widgetToDelete, setWidgetToDelete] = useState<{nodeId: string, idx: number} | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }, [project]);

  const currentNode = project.nodes[project.currentNodeId] || project.nodes[project.rootId];
  const parentNode = currentNode?.parentId ? project.nodes[currentNode.parentId] : undefined;

  const handleSubmit = async (overrideInput?: string, subMode: 'branch' | 'chat' | 'synthesize' | 'refresh' | 'cleanup' = 'branch') => {
    const finalInput = overrideInput ?? input;
    if (isProcessing) return;
    // Allow empty input for cleanup and refresh/synthesize modes
    if (subMode !== 'synthesize' && subMode !== 'refresh' && subMode !== 'cleanup' && !finalInput.trim() && attachments.length === 0) return;

    setIsProcessing(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentAttachments = [...attachments];
    // Cleanup is now a branching operation (new node) to preserve history
    const targetNodeId = (subMode === 'chat' || subMode === 'refresh' || (!!editingNodeId && subMode !== 'cleanup')) ? project.currentNodeId : uuidv4();

    if (!overrideInput) setInput('');
    setAttachments([]);
    setEditingNodeId(null);

    let updatedProject: ProjectState;
    const timestamp = Date.now();

    if (subMode === 'chat' || subMode === 'refresh' || project.currentNodeId === targetNodeId) {
      const node = project.nodes[targetNodeId];
      const newChat = [...(node.chat || [])];
      if (subMode === 'chat') newChat.push({ role: 'user', text: finalInput, timestamp, attachments: currentAttachments.length > 0 ? currentAttachments : undefined });
      updatedProject = { ...project, nodes: { ...project.nodes, [targetNodeId]: { ...node, chat: newChat, isLoading: true, processingStage: 'analyzing' } } };
    } else {
      const parent = project.nodes[project.currentNodeId];
      if (!parent) {
          console.error("Parent node not found during branching");
          setIsProcessing(false);
          return;
      }
      
      const newNode: ProjectNode = {
        id: targetNodeId, parentId: project.currentNodeId, timestamp, userInput: finalInput, userAttachments: currentAttachments, chat: [],
        data: { 
          summary: subMode === 'cleanup' ? "Consolidating history..." : "Initializing...", 
          keyPoints: [], 
          projectKnowledge: parent.data?.projectKnowledge || {}, 
          projectData: parent.data?.projectData || { stores: [] } 
        },
        visualization: { title: subMode === 'cleanup' ? "Consolidated State" : "New Branch", widgets: [] }, 
        children: [], 
        isLoading: true, 
        processingStage: 'analyzing'
      };
      
      const safeChildren = parent.children || [];
      
      updatedProject = { 
          ...project, 
          nodes: { 
              ...project.nodes, 
              [project.currentNodeId]: { ...parent, children: [...safeChildren, targetNodeId] }, 
              [targetNodeId]: newNode 
          }, 
          currentNodeId: targetNodeId 
      };
    }
    setProject(updatedProject);

    try {
      const apiCall = generateNodeResponse(targetNodeId, updatedProject, subMode, updatedProject.selectedModel, updatedProject.thinkingBudget, updatedProject.isGroundingEnabled, (stage) => {
              setProject(curr => ({ ...curr, nodes: { ...curr.nodes, [targetNodeId]: { ...curr.nodes[targetNodeId], processingStage: stage } } }));
      }, controller.signal);
      const response = await Promise.race([apiCall, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timeout")), 180000))]);

      setProject(current => {
          const node = current.nodes[targetNodeId];
          let chat = [...(node.chat || [])];
          let updatedUserInput = node.userInput;
          if (subMode === 'cleanup') { 
              if (response.consolidatedUserIntent) updatedUserInput = response.consolidatedUserIntent; 
              chat = [{ role: 'assistant', text: response.chatReply, timestamp: Date.now(), groundingSources: response.groundingSources, visualizationSnapshot: response.updatedVisualization, dataSnapshot: response.updatedData }]; 
          }
          else chat.push({ role: 'assistant', text: response.chatReply, timestamp: Date.now(), groundingSources: response.groundingSources, visualizationSnapshot: response.updatedVisualization, dataSnapshot: response.updatedData });
          return { ...current, nodes: { ...current.nodes, [targetNodeId]: { ...node, userInput: updatedUserInput, isLoading: false, processingStage: 'idle', chat, data: response.updatedData, visualization: response.updatedVisualization, restorePoint: undefined, debugInfo: { ...response.debugInfo, response: `Thought Process: ${response.thoughtProcess}\n\n${response.debugInfo?.response || ''}` } } } };
      });
    } catch (err: any) {
      const isAbort = err.message === "Request cancelled by user.";
      setProject(current => { const node = current.nodes[targetNodeId]; const chat = [...(node.chat || [])]; chat.push({ role: 'assistant', text: isAbort ? '⛔ Request cancelled.' : `⚠️ Error: ${err.message}`, timestamp: Date.now() }); return { ...current, nodes: { ...current.nodes, [targetNodeId]: { ...node, chat, isLoading: false, processingStage: 'idle' } } }; });
    } finally { abortControllerRef.current = null; setIsProcessing(false); }
  };

  const handleRenameNode = (id: string, newTitle: string) => {
    setProject(prev => {
      const node = prev.nodes[id];
      if (!node) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: {
            ...node,
            visualization: {
              ...(node.visualization || { title: newTitle, widgets: [] }),
              title: newTitle
            }
          }
        }
      };
    });
  };

  const handleInsertParent = (nodeId: string) => {
      setProject(prev => {
        const targetNode = prev.nodes[nodeId];
        if (!targetNode || !targetNode.parentId) return prev; // Cannot insert parent for root

        const oldParentId = targetNode.parentId;
        const oldParent = prev.nodes[oldParentId];
        if (!oldParent) return prev;

        const newParentId = uuidv4();
        const timestamp = Date.now();

        const newParent: ProjectNode = {
          id: newParentId,
          parentId: oldParentId,
          timestamp: timestamp,
          userInput: "Inserted Parent Node",
          chat: [],
          children: [nodeId],
          isLoading: false,
          processingStage: 'idle',
          data: { 
            summary: "New planning branch created.", 
            keyPoints: [], 
            projectKnowledge: oldParent.data?.projectKnowledge || {}, 
            projectData: oldParent.data?.projectData 
          },
          visualization: { title: "New Branch Parent", widgets: [] }
        };

        const updatedOldParentChildren = (oldParent.children || []).map(cid => cid === nodeId ? newParentId : cid);

        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [oldParentId]: { ...oldParent, children: updatedOldParentChildren },
            [newParentId]: newParent,
            [nodeId]: { ...targetNode, parentId: newParentId }
          },
          currentNodeId: newParentId
        };
      });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newAtts: {name: string, type: string, data: string}[] = [];
    for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { const file = items[i].getAsFile(); if (file) { const dataUrl = await new Promise<string>((res) => { const reader = new FileReader(); reader.onload = () => res(reader.result as string); reader.readAsDataURL(file); }); newAtts.push({ name: `pasted-${Date.now()}-${i}`, type: file.type, data: dataUrl }); } } }
    if (newAtts.length > 0) setAttachments(prev => [...prev, ...newAtts]);
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden">
      <ConfirmationModal isOpen={!!confirmDelete} onConfirm={() => confirmDelete && setProject(prev => { const newNodes = { ...prev.nodes }; const nodeToDelete = newNodes[confirmDelete.id]; if (!nodeToDelete) return prev; if (nodeToDelete.parentId && newNodes[nodeToDelete.parentId]) { const parent = newNodes[nodeToDelete.parentId]; newNodes[nodeToDelete.parentId] = { ...parent, children: (parent.children || []).filter(cid => cid !== confirmDelete.id) }; } const collect = (tid: string): string[] => { const n = newNodes[tid]; if (!n) return []; let desc = [tid]; (n.children || []).forEach(cid => { desc = [...desc, ...collect(cid)]; }); return desc; }; const ids = collect(confirmDelete.id); ids.forEach(tid => { delete newNodes[tid]; }); let nextId = prev.currentNodeId; if (ids.includes(prev.currentNodeId)) nextId = nodeToDelete.parentId && newNodes[nodeToDelete.parentId] ? nodeToDelete.parentId : prev.rootId; return { ...prev, nodes: newNodes, currentNodeId: nextId }; })} onCancel={() => setConfirmDelete(null)} title="Delete Branch" message="This action cannot be undone." />
      <ConfirmationModal isOpen={!!widgetToDelete} onConfirm={() => setProject(prev => { const node = prev.nodes[widgetToDelete!.nodeId]; if (!node || !node.visualization?.widgets) return prev; const newWidgets = [...node.visualization.widgets]; newWidgets.splice(widgetToDelete!.idx, 1); return { ...prev, nodes: { ...prev.nodes, [widgetToDelete!.nodeId]: { ...node, visualization: { ...node.visualization, widgets: newWidgets } } } }; })} onCancel={() => setWidgetToDelete(null)} title="Delete Widget" message="Remove from history?" />
      
      <div className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex shrink-0 ${isSidebarOpen ? 'w-64' : 'w-0'}`} style={{ overflow: isSidebarOpen ? 'visible' : 'hidden' }}>
        <Sidebar 
          nodes={project.nodes} rootId={project.rootId} currentNodeId={project.currentNodeId} 
          onSelectNode={(id) => { setProject(prev => ({ ...prev, currentNodeId: id })); setEditingNodeId(null); }} 
          onDeleteNode={(id) => { if (id !== project.rootId) setConfirmDelete({ id }); }}
          onRenameNode={handleRenameNode} 
          onInsertParent={handleInsertParent}
          onImport={setProject} 
          onModelChange={(m) => setProject(prev => ({ ...prev, selectedModel: m }))} 
          onBudgetChange={(l) => setProject(prev => ({ ...prev, thinkingBudget: l }))} 
          onGroundingToggle={(e) => setProject(prev => ({ ...prev, isGroundingEnabled: e }))} 
          onProviderChange={(p) => setProject(prev => ({ ...prev, modelProvider: p }))} 
          onCustomConfigChange={(c) => setProject(prev => ({ ...prev, customModelConfig: { ...prev.customModelConfig, ...c } }))} 
          onOpenSettings={() => setShowSettingsModal(true)}
          projectState={project} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isOpen={isSidebarOpen} 
        />
      </div>
      
      <main className="flex-1 flex flex-col relative min-w-0 bg-white">
        <NodeView 
          node={currentNode} 
          parentNode={parentNode} 
          projectState={project} 
          onSelectNode={(id) => { setProject(prev => ({ ...prev, currentNodeId: id })); setEditingNodeId(null); }} 
          onRegenerate={(txt) => { setInput(txt); setEditingNodeId(currentNode.id); }} 
          onSynthesize={(topic) => handleSubmit(topic, 'synthesize')} 
          onRefresh={() => handleSubmit(undefined, 'refresh')} 
          onMindmapNodeClick={(n) => handleSubmit(`Expand: ${n.label}`, 'branch')} 
          onDeleteChatMessage={(i) => setProject(prev => { 
            const node = prev.nodes[prev.currentNodeId]; 
            if (!node?.chat) return prev; 
            const newChat = [...node.chat]; 
            newChat.splice(i, 1); 
            return { ...prev, nodes: { ...prev.nodes, [prev.currentNodeId]: { ...node, chat: newChat } } }; 
          })} 
          onDeleteWidget={(nodeId, idx) => setWidgetToDelete({ nodeId, idx })} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isSidebarOpen={isSidebarOpen} 
          onUpdateNodeData={(nid, data) => setProject(prev => { 
            const node = prev.nodes[nid]; 
            if (!node) return prev; 
            return { ...prev, nodes: { ...prev.nodes, [nid]: { ...node, data: { ...node.data, ...data } } } }; 
          })} 
          onUpdateNodeViz={(nid, viz) => setProject(prev => { 
            const node = prev.nodes[nid]; 
            if (!node) return prev; 
            return { ...prev, nodes: { ...prev.nodes, [nid]: { ...node, visualization: { ...node.visualization, ...viz } } } }; 
          })}
          onRevertState={(i) => setProject(prev => { 
            const node = prev.nodes[prev.currentNodeId]; 
            if (!node?.chat[i]?.dataSnapshot) return prev; 
            const target = node.chat[i]; 
            return { ...prev, nodes: { ...prev.nodes, [prev.currentNodeId]: { ...node, chat: node.chat.slice(0, i + 1), data: JSON.parse(JSON.stringify(target.dataSnapshot)), visualization: JSON.parse(JSON.stringify(target.visualizationSnapshot)), isLoading: false, processingStage: 'idle' } } }; 
          })} 
          onShowCleanupModal={() => setShowCleanupModal(true)} 
          onUndoCleanup={() => setProject(prev => { 
            const node = prev.nodes[prev.currentNodeId]; 
            if (!node?.restorePoint) return prev; 
            return { ...prev, nodes: { ...prev.nodes, [node.id]: { ...node, chat: node.restorePoint.chat, data: node.restorePoint.data, visualization: node.restorePoint.visualization, userInput: node.restorePoint.userInput, restorePoint: undefined } } }; 
          })} 
        />
        <ChatInput input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} isProcessing={isProcessing} onSubmit={handleSubmit} onStop={() => abortControllerRef.current?.abort()} editingNodeId={editingNodeId} onPaste={handlePaste} />
      </main>

      <CleanupModal 
        isOpen={showCleanupModal}
        onConfirm={(focus) => { setShowCleanupModal(false); handleSubmit(focus, 'cleanup'); }}
        onCancel={() => setShowCleanupModal(false)}
      />

      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        projectState={project}
        onToggleGemini={(enabled) => setProject(prev => ({ ...prev, isGeminiEnabled: enabled, modelProvider: enabled ? prev.modelProvider : 'custom' }))}
      />
    </div>
  );
};

export default App;
