
import React from 'react';
import { MetricItem } from '../../types';

interface MetricsWidgetProps {
  title: string;
  items: MetricItem[];
}

export const MetricsWidget: React.FC<MetricsWidgetProps> = ({ title, items }) => {
  const getStatusBg = (status?: string) => {
    switch(status) {
      case 'good': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'warning': return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'critical': return 'bg-red-50 border-red-100 text-red-700';
      default: return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
    if (trend === 'down') return <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
    return <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14" /></svg>;
  };

  const displayItems = items || [];

  return (
    <div className="w-full my-6">
      <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-400 mb-4 px-1">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayItems.map((item, i) => (
          <div key={i} className={`p-5 rounded-2xl border transition-all shadow-sm hover:shadow-md ${getStatusBg(item.status)}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</span>
              {getTrendIcon(item.trend)}
            </div>
            <div className="text-3xl font-black tracking-tight">{item.value}</div>
            {item.description && <p className="mt-2 text-[10px] font-bold opacity-60 leading-tight">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
