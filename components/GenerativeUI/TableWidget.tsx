

import React, { useState } from 'react';
import { TableData, ColumnType } from '../../types';
import { format, parseISO } from 'date-fns';

interface TableWidgetProps {
  title: string;
  data: TableData;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ title, data }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  if (!data || !data.rows) return null;

  const { headers, rows, columnTypes = {} } = data;

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null; // Reset
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedRows = React.useMemo(() => {
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const type = columnTypes[sortConfig.key];
      
      let comparison = 0;
      if (type === 'number' || type === 'progress') {
        comparison = Number(aVal) - Number(bVal);
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortConfig, columnTypes]);

  const renderCell = (value: any, type?: ColumnType) => {
    if (value === null || value === undefined) return '-';

    const strVal = String(value);

    // Auto-detect link if type is 'link' OR it looks like a URL (starts with http/https and has no spaces)
    if (type === 'link' || (!type && (strVal.startsWith('http://') || strVal.startsWith('https://')) && !strVal.includes(' '))) {
        return (
          <a 
            href={strVal} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors group/link"
            onClick={(e) => e.stopPropagation()}
            title={strVal}
          >
            <span className="truncate max-w-[200px]">{strVal}</span>
            <svg className="w-3 h-3 opacity-50 group-hover/link:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        );
    }

    switch(type) {
      case 'progress':
        const num = parseFloat(value);
        return (
          <div className="flex items-center gap-2 w-32">
             <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, Math.max(0, num))}%` }}></div>
             </div>
             <span className="text-[10px] font-bold text-slate-500">{Math.round(num)}%</span>
          </div>
        );
      case 'status':
        return (
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
            String(value).toLowerCase().includes('done') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            String(value).toLowerCase().includes('progress') ? 'bg-blue-50 text-blue-600 border-blue-100' :
            String(value).toLowerCase().includes('blocked') ? 'bg-red-50 text-red-600 border-red-100' :
            'bg-slate-50 text-slate-500 border-slate-100'
          }`}>
            {value}
          </span>
        );
      case 'date':
        try {
          return <span className="text-slate-500 tabular-nums">{format(parseISO(value), 'MMM d, yyyy')}</span>;
        } catch(e) { return value; }
      case 'number':
        return <span className="font-bold tabular-nums text-slate-700">{value}</span>;
      default:
        return value;
    }
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 my-6">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500">{title}</h3>
            {rows.length > 0 && (
                <div className="text-[9px] font-bold text-slate-300">
                    {rows.length} Rows {sortConfig ? `• Sorted by ${sortConfig.key}` : ''}
                </div>
            )}
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/30 border-b border-slate-100 font-black tracking-[0.15em]">
                <tr>
                    {headers.map((h, i) => (
                      <th 
                        key={i} 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 hover:text-indigo-500 transition-colors group select-none"
                        onClick={() => handleSort(h)}
                      >
                        <div className="flex items-center gap-1">
                            {h}
                            <div className="flex flex-col opacity-30 group-hover:opacity-100 transition-opacity">
                                <svg className={`w-2 h-2 -mb-0.5 ${sortConfig?.key === h && sortConfig.direction === 'asc' ? 'text-indigo-600 opacity-100' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/></svg>
                                <svg className={`w-2 h-2 ${sortConfig?.key === h && sortConfig.direction === 'desc' ? 'text-indigo-600 opacity-100' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
                            </div>
                        </div>
                      </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {sortedRows.length > 0 ? (
                  sortedRows.map((row, i) => (
                    <tr key={i} className="bg-white hover:bg-slate-50/50 transition-colors">
                        {headers.map((h, j) => (
                            <td key={j} className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                {renderCell(row[h], columnTypes[h])}
                            </td>
                        ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400 italic">No records found.</td>
                  </tr>
                )}
            </tbody>
        </table>
        </div>
    </div>
  );
};