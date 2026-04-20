
import React from 'react';
import { GanttTask } from '../../types';
import { format, parseISO, differenceInDays, addDays, isValid } from 'date-fns';

interface GanttWidgetProps {
  title: string;
  tasks: GanttTask[];
}

export const GanttWidget: React.FC<GanttWidgetProps> = ({ title, tasks }) => {
  // If null tasks, default to empty array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  if (safeTasks.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-6">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {title}
            </h3>
        </div>
        <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
             <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-sm font-bold opacity-60">No tasks scheduled yet.</p>
        </div>
      </div>
    );
  }

  // Filter tasks with valid dates to avoid crashes in parseISO and date logic
  // Also auto-fix missing end dates by defaulting to start date (milestone behavior)
  const validTasks = safeTasks.map(t => ({
    ...t,
    end: t.end || t.start
  })).filter(t => {
    if (!t.start || !t.end) return false;
    try {
        const s = parseISO(t.start);
        const e = parseISO(t.end);
        return isValid(s) && isValid(e);
    } catch (e) { return false; }
  });

  if (validTasks.length === 0) {
    return (
      <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-6 my-6 text-center">
        <p className="text-sm font-bold text-amber-700 italic">Timeline contains invalid date formats.</p>
      </div>
    );
  }

  const dates = validTasks.flatMap(t => [parseISO(t.start), parseISO(t.end!)]);
  const minDate = dates.reduce((a, b) => (a < b ? a : b), dates[0]);
  const maxDate = dates.reduce((a, b) => (a > b ? a : b), dates[0]);
  
  // Helper to replace missing date-fns startOfDay
  const startOfDay = (d: Date) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
  };

  const startDate = addDays(startOfDay(minDate), -1);
  const endDate = addDays(startOfDay(maxDate), 3);
  const totalDays = Math.max(7, differenceInDays(endDate, startDate) + 1);

  const getLeftPercent = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const diff = differenceInDays(date, startDate);
      return Math.max(0, (diff / totalDays) * 100);
    } catch (e) { return 0; }
  };

  const getWidthPercent = (startStr: string, endStr: string) => {
    try {
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      const duration = Math.max(1, differenceInDays(end, start) + 1);
      return (duration / totalDays) * 100;
    } catch (e) { return 1; }
  };

  const getStatusColor = (status: GanttTask['status']) => {
    switch(status) {
      case 'done': return 'bg-emerald-500';
      case 'in-progress': return 'bg-blue-600';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-6">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {title}
        </h3>
        <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmed
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 border border-dashed border-slate-600"></span> Estimated
            </div>
        </div>
      </div>
      
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-slate-100 pb-3 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-2/5 shrink-0">Tasks & Owners</div>
            <div className="w-3/5 relative h-4">
                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <div key={p} className="absolute transform -translate-x-1/2" style={{ left: `${p * 100}%` }}>
                        {format(addDays(startDate, Math.floor(totalDays * p)), 'MM/dd')}
                    </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            {validTasks.map((task) => {
              const left = getLeftPercent(task.start);
              const width = getWidthPercent(task.start, task.end!);
              return (
                <div key={task.id} className="flex items-center group min-h-[52px]">
                  <div className="w-2/5 shrink-0 pr-8">
                    <div className="font-bold text-sm text-slate-800 leading-tight flex items-center gap-2">
                        {task.name}
                        {task.isEstimated && <span className="px-1.5 py-0.5 bg-slate-100 text-[8px] rounded text-slate-500 border border-slate-200">EST</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-bold">
                        {task.owner?.toUpperCase() || 'SYSTEM'}
                    </div>
                  </div>
                  <div className="w-3/5 relative h-12 bg-slate-50/50 rounded-xl border border-slate-100/50">
                    <div
                      className={`absolute top-2 h-8 rounded-lg shadow-md flex items-center justify-center text-[10px] text-white font-black transition-all hover:scale-[1.01] ${getStatusColor(task.status)} ${task.isEstimated ? 'opacity-70 border-2 border-dashed border-white/50' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {width > 12 ? `${Math.round(task.progress)}%` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
