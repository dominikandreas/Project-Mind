
import React, { useState, useEffect, useRef } from 'react';
import { ProjectNode } from '../types';

interface TreeNodeProps {
  nodeId: string;
  nodes: Record<string, ProjectNode>;
  selectedId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onInsertParent: (id: string) => void;
  level: number;
  rootId: string;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ 
  nodeId, 
  nodes, 
  selectedId, 
  onSelect, 
  onDelete, 
  onRename,
  onInsertParent,
  level,
  rootId 
}) => {
  const node = nodes[nodeId];
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditing]);

  if (!node) return null;

  const isSelected = selectedId === nodeId;
  const hasChildren = node.children && node.children.length > 0;
  
  const label = node.visualization?.title || 
                (node.userInput ? (node.userInput.slice(0, 30) + (node.userInput.length > 30 ? '...' : '')) : "New Item");

  const sortedChildren = node.children ? [...node.children].sort((a, b) => {
    const nodeA = nodes[a];
    const nodeB = nodes[b];
    return (nodeB?.timestamp || 0) - (nodeA?.timestamp || 0);
  }) : [];

  const handleStartEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(label);
      setIsEditing(true);
  };

  const handleSave = () => {
      if (editValue.trim()) {
          onRename(nodeId, editValue.trim());
      }
      setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') setIsEditing(false);
      e.stopPropagation(); 
  };

  return (
    <div className="select-none relative">
      <div
        className={`
          group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 text-sm relative
          ${isSelected ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-slate-600 hover:bg-slate-100'}
        `}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={() => !isEditing && onSelect(nodeId)}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200 ${isSelected ? 'bg-blue-500 scale-125' : 'bg-slate-300 group-hover:bg-slate-400'}`}></span>
        
        {isEditing ? (
            <input 
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 py-0 px-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-0"
            />
        ) : (
            <span className="truncate flex-1 py-0.5">{label}</span>
        )}
        
        {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {nodeId !== rootId && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onInsertParent(nodeId);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-all shrink-0 z-10"
                        title="Insert Parent Node"
                    >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>
                    </button>
                )}
                <button
                    onClick={handleStartEdit}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-all shrink-0 z-10"
                    title="Rename"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                {nodeId !== rootId && (
                <button
                    onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(nodeId);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-all shrink-0 z-10"
                    title="Delete this branch"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
                )}
            </div>
        )}
      </div>
      {hasChildren && (
        <div className="border-l border-slate-200 ml-[11px] mt-0.5 mb-1">
          {sortedChildren.map(childId => (
            <TreeNode
              key={childId}
              nodeId={childId}
              nodes={nodes}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onInsertParent={onInsertParent}
              level={level + 1}
              rootId={rootId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
