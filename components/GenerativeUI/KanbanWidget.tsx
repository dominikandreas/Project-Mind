
import React, { useState } from 'react';
import { KanbanColumn } from '../../types';
import { format, parseISO } from 'date-fns';

interface KanbanWidgetProps {
  title: string;
  columns: KanbanColumn[];
  isExpanded?: boolean;
  onTaskMove?: (taskId: string, newColumnId: string) => void;
}

export const KanbanWidget: React.FC<KanbanWidgetProps> = ({ title, columns, isExpanded = false, onTaskMove }) => {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getPriorityColor = (p?: string) => {
    switch(p) {
      case 'high': return 'bg-red-50 text-red-600 border-red-100';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'low': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const renderContent = (text: string) => {
    // Regex to split by URLs (http/https)
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.match(/^https?:\/\//)) {
             return (
               <a 
                 key={i} 
                 href={part} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-indigo-600 hover:text-indigo-800 hover:underline relative z-20 break-all"
                 onClick={e => e.stopPropagation()}
               >
                 {part}
               </a>
             );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
      // Make it semitransparent when dragging
      const target = e.target as HTMLElement;
      setTimeout(() => target.classList.add('opacity-50'), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
      const target = e.target as HTMLElement;
      target.classList.remove('opacity-50');
      setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverColumn !== colId) {
          setDragOverColumn(colId);
      }
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverColumn(null);
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId && onTaskMove) {
          onTaskMove(taskId, colId);
      }
  };

  return (
    <div className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-6 my-6 overflow-x-auto">
      <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2 px-1">
        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
        {title}
      </h3>
      <div className="flex gap-6 min-w-max">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className={`w-72 shrink-0 flex flex-col rounded-2xl p-4 border transition-colors duration-200
                ${dragOverColumn === col.id ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-slate-100/50 border-slate-200/50'}
            `}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex justify-between items-center mb-4 px-1">
                <h4 className="font-black text-[10px] text-slate-600 uppercase tracking-[0.15em]">{col.title}</h4>
                <span className="bg-white text-[10px] font-black text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">{col.tasks.length}</span>
            </div>
            <div className={`flex flex-col gap-3 overflow-y-auto pr-1 transition-all duration-300 min-h-[120px] ${isExpanded ? 'max-h-[750px]' : 'max-h-[500px]'}`}>
              {col.tasks.map((task) => (
                <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group select-none"
                >
                  <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-700 transition-colors pointer-events-none">
                    {renderContent(task.content)}
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-2 items-center pointer-events-none">
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    {task.tag && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-blue-100">
                        {task.tag}
                      </span>
                    )}
                    {task.dueDate && (
                      <div className="ml-auto flex items-center gap-1 text-[9px] font-bold text-slate-400">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         {(() => {
                            try { return format(parseISO(task.dueDate), 'MMM d'); }
                            catch (e) { return task.dueDate; }
                         })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-8 text-center text-[10px] font-bold text-slate-300 italic pointer-events-none border-2 border-dashed border-slate-200 rounded-xl">Empty Stage</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
