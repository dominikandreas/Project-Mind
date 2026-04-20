import React, { useMemo } from 'react';
import { MindmapNode } from '../../types';

interface MindmapWidgetProps {
  title: string;
  nodes: MindmapNode[];
  onNodeClick?: (node: MindmapNode) => void;
}

interface TreeNode extends MindmapNode {
  children: TreeNode[];
}

export const MindmapWidget: React.FC<MindmapWidgetProps> = ({ title, nodes, onNodeClick }) => {
  const tree = useMemo(() => {
    const nodeMap: Record<string, TreeNode> = {};
    const rootNodes: TreeNode[] = [];

    // First pass: create all nodes
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    // Second pass: link nodes to parents
    nodes.forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children.push(nodeMap[node.id]);
      } else {
        rootNodes.push(nodeMap[node.id]);
      }
    });

    return rootNodes;
  }, [nodes]);

  if (nodes.length === 0) return null;

  const renderRecursive = (node: TreeNode, depth: number) => {
    const colors = [
      'bg-indigo-600 border-indigo-700 text-white',
      'bg-blue-50 border-blue-200 text-blue-700',
      'bg-slate-50 border-slate-200 text-slate-700',
      'bg-white border-slate-100 text-slate-500',
    ];

    const currentStyle = colors[Math.min(depth, colors.length - 1)];
    const isRoot = depth === 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div 
          onClick={() => onNodeClick?.(node)}
          className={`
            px-4 py-2 rounded-xl border shadow-sm transition-all hover:shadow-md cursor-pointer group relative
            ${currentStyle}
            ${isRoot ? 'text-lg font-black scale-110 mb-8' : 'text-sm font-bold mb-4'}
            hover:ring-4 hover:ring-indigo-500/20 active:scale-95
          `}
          title={node.description || "Click to explore details"}
        >
          {node.label}
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-indigo-500 text-white p-0.5 rounded-full shadow-lg">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </div>
          </div>
          {node.description && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl border border-white/10">
              {node.description}
            </div>
          )}
        </div>
        
        {node.children.length > 0 && (
          <div className="relative flex gap-4">
            {node.children.map(child => renderRecursive(child, depth + 1))}
            {node.children.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 -translate-y-4 mx-[20%]"></div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-6">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            Mind Map: {title}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Click a node to branch into details</p>
        </div>
        <div className="text-[10px] font-bold text-slate-400">
          {nodes.length} Elements
        </div>
      </div>
      
      <div className="p-8 overflow-x-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="min-w-max flex justify-center py-4">
          {tree.map(root => renderRecursive(root, 0))}
        </div>
      </div>
    </div>
  );
};