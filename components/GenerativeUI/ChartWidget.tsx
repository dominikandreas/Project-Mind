

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label
} from 'recharts';
import { ChartConfig, ChartDataPoint } from '../../types';

interface ChartWidgetProps {
  title: string;
  config: ChartConfig;
  data: ChartDataPoint[];
  isExpanded?: boolean;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ title, config, data, isExpanded = false }) => {
  // Guard clause against malformed config
  if (!config) return null;
  const safeData = Array.isArray(data) ? data : [];
  
  const isDataEmpty = safeData.length === 0;

  // Ensure dataKeys exists to prevent map errors
  const dataKeys = Array.isArray(config.dataKeys) ? config.dataKeys : [];
  
  // If no keys are found, check if we can infer them or show error
  if (dataKeys.length === 0 && !isDataEmpty) {
      // Logic handled in sanitization, but fallback here prevents crash
      return (
          <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-4 p-6">
              <h3 className="font-bold text-slate-500">{title}</h3>
              <p className="text-sm text-red-500 mt-2">Error: No data keys defined for chart.</p>
          </div>
      );
  }

  const renderChart = () => {
    if (isDataEmpty) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm font-bold opacity-60">No data available to visualize.</p>
            </div>
        );
    }

    const commonProps = { data: safeData, margin: { top: 20, right: 30, left: 20, bottom: 20 } };
    const colors = config.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const renderYAxis = () => (
      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}>
        {config.yAxisLabel && (
          <Label
            value={config.yAxisLabel}
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: 'middle', fill: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
          />
        )}
      </YAxis>
    );

    switch (config.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            {renderYAxis()}
            <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={3}
                dot={{ r: 4, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            {renderYAxis()}
            <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId={config.stacked ? "1" : undefined}
                fill={colors[index % colors.length]}
                stroke={colors[index % colors.length]}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      case 'bar':
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            {renderYAxis()}
            <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={config.stacked ? "1" : undefined}
                fill={colors[index % colors.length]}
                radius={config.stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className={`w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-4 transition-all duration-300`}>
       <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
        <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {title}
        </h3>
      </div>
      <div className={`w-full p-6 transition-all duration-300 ${isExpanded ? 'h-[600px]' : 'h-[350px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};