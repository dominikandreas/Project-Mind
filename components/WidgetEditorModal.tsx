import React, { useState, useEffect } from 'react';
import { WidgetData, WidgetType, DataStore, DataSourceConfig } from '../types';

interface WidgetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: WidgetData) => void;
  initialWidget?: WidgetData;
  availableStores: DataStore[];
}

const WIDGET_TYPES = [
  { value: WidgetType.GANTT, label: 'Gantt Chart' },
  { value: WidgetType.CHART, label: 'Chart (Bar/Line/Area)' },
  { value: WidgetType.KANBAN, label: 'Kanban Board' },
  { value: WidgetType.TABLE, label: 'Data Table' },
  { value: WidgetType.METRICS, label: 'Metrics Cards' },
  { value: WidgetType.RISK_MATRIX, label: 'Risk Matrix' },
  { value: WidgetType.MAP, label: 'Map / Locations' },
];

const MAPPING_CONFIG: Record<string, { label: string; key: string; type?: string; required?: boolean }[]> = {
  [WidgetType.GANTT]: [
    { label: 'Task Name', key: 'name', required: true },
    { label: 'Start Date', key: 'start', required: true },
    { label: 'End Date', key: 'end', required: true },
    { label: 'Progress (0-100)', key: 'progress' },
    { label: 'Status', key: 'status' },
    { label: 'Owner', key: 'owner' },
  ],
  [WidgetType.KANBAN]: [
    { label: 'Card Content', key: 'content', required: true },
    { label: 'Group By Column', key: 'groupByField', required: true }, // Special case handling
    { label: 'Tag/Label', key: 'tag' },
    { label: 'Priority', key: 'priority' },
    { label: 'Due Date', key: 'dueDate' },
  ],
  [WidgetType.MAP]: [
    { label: 'Location Name', key: 'label', required: true },
    { label: 'Address', key: 'address' },
    { label: 'Latitude', key: 'latitude' },
    { label: 'Longitude', key: 'longitude' },
    { label: 'Description', key: 'description' },
    { label: 'Type (office/client)', key: 'type' },
  ],
  [WidgetType.RISK_MATRIX]: [
    { label: 'Risk Name', key: 'label', required: true },
    { label: 'Impact (1-5)', key: 'impact', required: true },
    { label: 'Likelihood (1-5)', key: 'likelihood', required: true },
    { label: 'Mitigation', key: 'mitigation' },
  ],
  [WidgetType.METRICS]: [
    { label: 'Label', key: 'label', required: true },
    { label: 'Value', key: 'value', required: true },
    { label: 'Trend (up/down)', key: 'trend' },
    { label: 'Status (good/bad)', key: 'status' },
  ],
  [WidgetType.CHART]: [
    // Special handling for charts
  ],
  [WidgetType.TABLE]: [
      // Table takes all or specific columns, handled separately
  ]
};

export const WidgetEditorModal: React.FC<WidgetEditorModalProps> = ({ isOpen, onClose, onSave, initialWidget, availableStores }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<WidgetType>(WidgetType.GANTT);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Chart Specific
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [xAxis, setXAxis] = useState('');
  const [dataKeys, setDataKeys] = useState<string[]>([]);
  const [chartMultiSelectOpen, setChartMultiSelectOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialWidget) {
        setTitle(initialWidget.title);
        setType(initialWidget.type);
        // Cast to any to handle legacy data structures safely without type errors
        const ds = initialWidget.dataSource as any;
        if (ds) {
          setSelectedStoreId(ds.storeId || '');
          const initialMap: Record<string, string> = {};
          if (Array.isArray(ds.fieldMapping)) {
            ds.fieldMapping.forEach((m: any) => {
                if (m.widgetKey && m.storeColumn) {
                    initialMap[String(m.widgetKey)] = String(m.storeColumn);
                }
            });
          } else if (typeof ds.fieldMapping === 'object' && ds.fieldMapping) {
             // Legacy support: Safely iterate object
             const rawMap = ds.fieldMapping as Record<string, unknown>;
             Object.keys(rawMap).forEach(key => {
                 const val = rawMap[key];
                 if (typeof val === 'string') {
                     initialMap[key] = val;
                 }
             });
          }
          
          // Kanban group by special case
          if (ds.groupByField) initialMap['groupByField'] = String(ds.groupByField);
          
          setMappings(initialMap);
        } else {
            setSelectedStoreId('');
            setMappings({});
        }

        // Chart Config
        if (initialWidget.type === WidgetType.CHART) {
            const chartConfig = (initialWidget as any).config || {};
            setChartType((chartConfig.type as 'bar' | 'line' | 'area') || 'bar');
            setXAxis(String(chartConfig.xAxisKey || ''));
            const dKeys = chartConfig.dataKeys;
            setDataKeys(Array.isArray(dKeys) ? (dKeys as string[]) : []);
        }
      } else {
        // Reset for new widget
        setTitle('New Widget');
        setType(WidgetType.GANTT);
        setSelectedStoreId(availableStores[0]?.id || '');
        setMappings({});
        setChartType('bar');
        setXAxis('');
        setDataKeys([]);
      }
    }
  }, [isOpen, initialWidget, availableStores]);

  if (!isOpen) return null;

  const selectedStore = availableStores.find(s => s.id === selectedStoreId);
  const schemaKeys = selectedStore ? Object.keys(selectedStore.schema) : [];

  const handleSave = () => {
    // Construct DataSourceConfig
    const fieldMapping: { widgetKey: string, storeColumn: string }[] = [];
    let groupByField: string | undefined = undefined;

    Object.entries(mappings).forEach(([wKey, sCol]) => {
        if (!sCol) return;
        if (wKey === 'groupByField') {
            groupByField = sCol;
        } else {
            fieldMapping.push({ widgetKey: wKey, storeColumn: sCol });
        }
    });

    const dataSource: any = selectedStoreId ? {
        storeId: selectedStoreId,
        fieldMapping,
        groupByField
    } : undefined;

    const widget: any = {
        // Preserve other data if editing
        ...(initialWidget ? { ...initialWidget } : {}),
        type,
        title,
        dataSource,
    };

    // Clean up hardcoded data if switching to data source
    if (dataSource) {
        if (type === WidgetType.GANTT) widget.tasks = undefined;
        if (type === WidgetType.KANBAN) widget.columns = undefined;
        if (type === WidgetType.TABLE) widget.data = undefined;
        if (type === WidgetType.CHART) widget.data = undefined;
        if (type === WidgetType.METRICS) widget.contentItems = undefined;
        if (type === WidgetType.RISK_MATRIX) widget.risks = undefined;
        if (type === WidgetType.MAP) widget.markers = undefined;
    }

    // Add Chart Config
    if (type === WidgetType.CHART) {
        widget.config = {
            type: chartType,
            xAxisKey: xAxis,
            dataKeys: dataKeys,
            title,
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        };
    }

    onSave(widget);
    onClose();
  };

  const renderMappingInputs = () => {
      const config = MAPPING_CONFIG[type];
      if (!config) return null;

      return (
          <div className="space-y-3 mt-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Map Data Fields</div>
              {config.map(field => (
                  <div key={field.key} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700 w-1/3">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select 
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        value={mappings[field.key] || ''}
                        onChange={e => setMappings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      >
                          <option value="">-- Select Field --</option>
                          {schemaKeys.map(k => (
                              <option key={k} value={k}>{k}</option>
                          ))}
                      </select>
                  </div>
              ))}
          </div>
      );
  };

  const renderChartConfig = () => {
      if (type !== WidgetType.CHART) return null;
      return (
        <div className="space-y-3 mt-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chart Configuration</div>
            
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 w-1/3">Chart Type</label>
                <div className="flex-1 flex gap-2">
                    {['bar', 'line', 'area'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setChartType(t as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${chartType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 w-1/3">X-Axis Field</label>
                <select 
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={xAxis}
                    onChange={e => setXAxis(e.target.value)}
                >
                    <option value="">-- Select Field --</option>
                    {schemaKeys.map(k => (
                        <option key={k} value={k}>{k}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-start justify-between relative">
                <label className="text-sm font-medium text-slate-700 w-1/3 mt-2">Data Keys (Y-Axis)</label>
                <div className="flex-1">
                    <div 
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[38px] cursor-pointer flex flex-wrap gap-1"
                        onClick={() => setChartMultiSelectOpen(!chartMultiSelectOpen)}
                    >
                        {dataKeys.length === 0 && <span className="text-slate-400">Select columns...</span>}
                        {dataKeys.map(k => (
                            <span key={k} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex items-center gap-1">
                                {k}
                                <span className="hover:text-red-500" onClick={(e) => {
                                    e.stopPropagation();
                                    setDataKeys(prev => prev.filter(p => p !== k));
                                }}>×</span>
                            </span>
                        ))}
                    </div>
                    {chartMultiSelectOpen && (
                        <div className="absolute top-full left-[33.33%] right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto p-1">
                            {schemaKeys.map(k => (
                                <div 
                                    key={k} 
                                    className={`px-3 py-2 text-sm rounded cursor-pointer hover:bg-slate-50 flex items-center gap-2 ${dataKeys.includes(k) ? 'font-bold text-indigo-600' : 'text-slate-700'}`}
                                    onClick={() => {
                                        if (dataKeys.includes(k)) setDataKeys(prev => prev.filter(p => p !== k));
                                        else setDataKeys(prev => [...prev, k]);
                                    }}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${dataKeys.includes(k) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                        {dataKeys.includes(k) && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    {k}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
                {initialWidget ? 'Edit Widget' : 'Add New Widget'}
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Widget Title</label>
                <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g., Project Timeline"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Widget Type</label>
                    <select 
                        value={type}
                        onChange={e => setType(e.target.value as WidgetType)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        {WIDGET_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data Source</label>
                    <select 
                        value={selectedStoreId}
                        onChange={e => {
                            setSelectedStoreId(e.target.value);
                            setMappings({}); // Reset mappings on store change
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        <option value="">No Source (Static)</option>
                        {availableStores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedStoreId && (
                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                    {renderMappingInputs()}
                    {renderChartConfig()}
                </div>
            )}
            
            {!selectedStoreId && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    <b>Note:</b> Without a data source, this widget will display static data or be empty. Connect a Data Store to make it dynamic.
                </div>
            )}

            <div className="pt-4 flex gap-3">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                    Save Widget
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};