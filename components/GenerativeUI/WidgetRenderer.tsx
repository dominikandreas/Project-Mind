
import React, { useMemo } from 'react';
import { WidgetData, WidgetType, MindmapNode, DataStore } from '../../types';
import { GanttWidget } from './GanttWidget';
import { ChartWidget } from './ChartWidget';
import { KanbanWidget } from './KanbanWidget';
import { MindmapWidget } from './MindmapWidget';
import { MapWidget } from './MapWidget';
import { MetricsWidget } from './MetricsWidget';
import { RiskMatrixWidget } from './RiskMatrixWidget';
import { ReferencesWidget } from './ReferencesWidget';
import { ErrorWidget } from './ErrorWidget';
import { CodeWidget } from './CodeWidget';
import { TableWidget } from './TableWidget';

interface WidgetRendererProps {
  widget: WidgetData;
  onMindmapNodeClick?: (node: MindmapNode) => void;
  isExpanded?: boolean;
  projectData?: { stores: DataStore[] }; // Pass the full project data context
  onUpdateRecord?: (storeId: string, recordId: string, field: string, value: any) => void;
}

// --- HYDRATION HELPERS ---

const STATUS_PRIORITY = [
  'backlog', 'todo', 'to do', 'planned', 'open', 'new',
  'in-progress', 'in progress', 'active', 'doing', 'wip', 'developing',
  'review', 'qa', 'testing', 'verify', 'verification',
  'blocked', 'holding', 'on-hold',
  'done', 'completed', 'closed', 'released', 'shipped'
];

const getStatusIndex = (title: string) => {
  const normalized = title.toLowerCase().trim();
  const idx = STATUS_PRIORITY.indexOf(normalized);
  if (idx !== -1) return idx;
  // Try partial match
  return STATUS_PRIORITY.findIndex(s => normalized.includes(s));
};

const hydrateWidget = (widget: WidgetData, stores: DataStore[]): any => {
    // If no data source or invalid data source, return widget as is (Legacy mode)
    if (!widget.dataSource || !widget.dataSource.storeId) return widget;

    const store = stores.find(s => s.id === widget.dataSource!.storeId);
    if (!store) {
        console.warn(`Widget ${widget.title} referenced missing store: ${widget.dataSource!.storeId}`);
        return widget;
    }

    // Convert array-based mapping to Record<widgetKey, storeColumn>
    const mappingArray = widget.dataSource!.fieldMapping || [];
    const mapping: Record<string, string> = {};
    if (Array.isArray(mappingArray)) {
        mappingArray.forEach(m => {
            if (m.widgetKey && m.storeColumn) {
                mapping[m.widgetKey] = m.storeColumn;
            }
        });
    } else {
        // Fallback for single object or legacy map
        const asObj = mappingArray as any;
        if (asObj.widgetKey && asObj.storeColumn) {
             mapping[asObj.widgetKey] = asObj.storeColumn;
        } else {
             Object.assign(mapping, mappingArray);
        }
    }

    const records = store.records || [];

    // Helper to map a record using the field mapping
    const mapRecord = (record: any) => {
        const result: any = { ...record }; // Keep original fields for flexibility
        Object.entries(mapping).forEach(([widgetKey, storeColumn]) => {
            if (storeColumn && record[storeColumn] !== undefined) {
                result[widgetKey] = record[storeColumn];
            }
        });
        return result;
    };

    switch (widget.type) {
        case WidgetType.GANTT:
            return {
                ...widget,
                tasks: records.map(r => {
                    const mapped = mapRecord(r);

                    // Robust fallback logic for common fields if mapping misses them
                    // This handles cases where models use keys like 'start_date' but don't map them to 'start'
                    const findVal = (keys: string[]) => {
                        for (const k of keys) {
                            if (mapped[k] !== undefined && mapped[k] !== null) return mapped[k];
                        }
                        // Case-insensitive fallback
                        const lowerKeys = keys.map(k => k.toLowerCase());
                        for (const k of Object.keys(mapped)) {
                             if (lowerKeys.includes(k.toLowerCase()) && mapped[k] !== undefined && mapped[k] !== null) return mapped[k];
                        }
                        return undefined;
                    };

                    const name = mapped.name || findVal(['task', 'title', 'label', 'content', 'item', 'feature']) || "Untitled Task";
                    const start = mapped.start || findVal(['start_date', 'startDate', 'begin', 'init', 'created_at']);
                    const end = mapped.end || findVal(['end_date', 'endDate', 'finish', 'due', 'dueDate', 'deadline', 'target_date']);
                    const progress = mapped.progress !== undefined ? mapped.progress : findVal(['percent', 'percentage', 'completion', 'done']);
                    const status = mapped.status || findVal(['state', 'stage']);
                    const owner = mapped.owner || findVal(['assignee', 'user', 'who', 'lead']);

                    return {
                        id: mapped.id || r.id || String(Math.random()),
                        name: String(name),
                        start: start,
                        end: end,
                        progress: progress ? Number(progress) : 0,
                        owner: owner,
                        status: status,
                        isEstimated: mapped.isEstimated,
                        dependencies: mapped.dependencies
                    };
                })
            };

        case WidgetType.METRICS:
            return {
                ...widget,
                contentItems: records.map(r => {
                    const mapped = mapRecord(r);
                    return {
                        label: mapped.label || "Metric",
                        value: mapped.value,
                        trend: mapped.trend,
                        status: mapped.status,
                        description: mapped.description
                    };
                })
            };

        case WidgetType.REFERENCES:
            return {
                ...widget,
                contentItems: records.map(r => {
                    const mapped = mapRecord(r);
                    return {
                        title: mapped.title || "Reference",
                        uri: mapped.uri || "#",
                    };
                })
            };

        case WidgetType.RISK_MATRIX:
            return {
                ...widget,
                risks: records.map(r => {
                    const mapped = mapRecord(r);
                    return {
                        id: mapped.id || r.id,
                        label: mapped.label || "Risk",
                        impact: Number(mapped.impact),
                        likelihood: Number(mapped.likelihood),
                        mitigation: mapped.mitigation
                    };
                })
            };

        case WidgetType.MAP:
            return {
                ...widget,
                markers: records.map(r => {
                    const mapped = mapRecord(r);
                    return {
                        id: mapped.id || r.id,
                        label: mapped.label || "Location",
                        address: mapped.address,
                        latitude: Number(mapped.latitude),
                        longitude: Number(mapped.longitude),
                        description: mapped.description,
                        type: mapped.type
                    };
                })
            };

        case WidgetType.TABLE:
            // For tables, if mapping exists, we use it to construct the view
            const hasMapping = Object.keys(mapping).length > 0;
            // If mapping exists, the headers are the widgetKeys. Otherwise use store schema.
            const headers = hasMapping ? Object.keys(mapping) : Object.keys(store.schema || records[0] || {});
            
            const tableRows = records.map(r => {
                if (!hasMapping) return r;
                const row: any = {};
                headers.forEach(h => {
                     // For table, keys in mapping are the headers we want to show
                     const col = mapping[h]; 
                     row[h] = r[col];
                });
                return row;
            });

            return {
                ...widget,
                data: {
                    headers: headers,
                    rows: tableRows,
                    columnTypes: {} 
                }
            };
        
        case WidgetType.CHART:
            const chartData = records;
            const chartConfig = { ...widget.config };

            // Auto-detect dataKeys if missing to prevent "No data keys defined" error
            if (!chartConfig.dataKeys || chartConfig.dataKeys.length === 0) {
                 const potentialKeys = new Set<string>();

                 // Strategy 1: Look at Field Mapping
                 // The UI Agent often maps 'value', 'y', or 'data' to the metric column
                 if (Object.keys(mapping).length > 0) {
                     ['value', 'y', 'data', 'count', 'score', 'metric', 'amount'].forEach(key => {
                         if (mapping[key]) potentialKeys.add(mapping[key]);
                     });
                 }

                 // Strategy 2: Scan Data (Fallback or Supplement)
                 // Scan up to 10 rows to find keys that hold numeric values
                 if (potentialKeys.size === 0) {
                     const xKey = chartConfig.xAxisKey;
                     for (let i = 0; i < Math.min(chartData.length, 10); i++) {
                         const row = chartData[i];
                         if (!row) continue;
                         Object.keys(row).forEach(k => {
                             if (k === 'id' || k === xKey) return;
                             const val = row[k];
                             // Check if number or parsable string (handling potential nulls safely)
                             if (val !== null && val !== undefined && (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))))) {
                                 potentialKeys.add(k);
                             }
                         });
                     }
                 }
                 
                 if (potentialKeys.size > 0) {
                     chartConfig.dataKeys = Array.from(potentialKeys);
                 }
            }

            return {
                ...widget,
                config: chartConfig,
                data: chartData
            };

        case WidgetType.KANBAN:
            // Group By Logic
            const groupBy = (widget.dataSource as any).groupByField || 'status';
            const mappedRecords = records.map(r => mapRecord(r));
            
            // Initialize groups set
            const groupsSet = new Set<string>();

            // 1. Respect existing columns defined in the widget (visual structure)
            if (widget.columns && Array.isArray(widget.columns)) {
                widget.columns.forEach(c => {
                    if (c.title) groupsSet.add(c.title);
                });
            }

            // 2. Add groups found in data
            mappedRecords.forEach((r: any) => {
                 const val = r[groupBy];
                 groupsSet.add(val !== undefined && val !== null ? String(val) : 'Uncategorized');
            });

            // 3. Fallback Heuristics: Ensure standard columns exist if grouping by status or priority
            const lowerGroupField = groupBy.toLowerCase();
            const hasGroup = (g: string) => {
                for (let existing of groupsSet) {
                    if (existing.toLowerCase() === g.toLowerCase()) return true;
                }
                return false;
            };

            if (lowerGroupField.includes('status') || lowerGroupField.includes('state') || lowerGroupField.includes('stage')) {
                if (!hasGroup('Todo') && !hasGroup('To Do') && !hasGroup('Backlog')) groupsSet.add('Todo');
                if (!hasGroup('In Progress') && !hasGroup('In-Progress') && !hasGroup('Doing') && !hasGroup('Active')) groupsSet.add('In Progress');
                if (!hasGroup('Done') && !hasGroup('Completed')) groupsSet.add('Done');
            }
            
            if (lowerGroupField.includes('priority')) {
                 if (!hasGroup('High') && !hasGroup('Critical')) groupsSet.add('High');
                 if (!hasGroup('Medium')) groupsSet.add('Medium');
                 if (!hasGroup('Low')) groupsSet.add('Low');
            }

            const groups = Array.from(groupsSet);
            
            const columns = groups.map(group => {
                // Try to find existing column config to preserve ID/Title casing preference
                const existingCol = widget.columns?.find(c => c.title.toLowerCase() === group.toLowerCase() || c.id === group);
                
                const title = existingCol?.title || group;
                const id = existingCol?.id || group;

                return {
                    id: id,
                    title: title.toUpperCase(),
                    tasks: mappedRecords
                        .filter((r: any) => {
                             const val = r[groupBy];
                             const rGroup = val !== undefined && val !== null ? String(val) : 'Uncategorized';
                             return rGroup.toLowerCase() === group.toLowerCase(); 
                        })
                        .map((r: any) => ({
                            id: r.id || String(Math.random()),
                            content: r.content || r.title || r.name || r.task || "No Content",
                            tag: r.tag,
                            priority: r.priority,
                            dueDate: r.dueDate
                        }))
                };
            });
            
            // Sort Columns by Workflow Status Priority
            columns.sort((a, b) => {
                const idxA = getStatusIndex(a.title);
                const idxB = getStatusIndex(b.title);
                
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0; // Maintain default/insertion order if not found
            });

            return {
                ...widget,
                dataSource: {
                    ...widget.dataSource,
                    groupByField: groupBy // Persist the inferred or explicit group by field
                },
                columns
            };

        default:
            return widget;
    }
};


export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, onMindmapNodeClick, isExpanded, projectData, onUpdateRecord }) => {
  // Hydrate the widget data from the store if a dataSource is present
  const hydratedWidget = useMemo(() => {
     if (projectData && projectData.stores && widget.dataSource) {
         return hydrateWidget(widget, projectData.stores);
     }
     return widget;
  }, [widget, projectData]);
  
  if (!hydratedWidget) return null;
  
  switch (hydratedWidget.type) {
    case WidgetType.GANTT:
      return <GanttWidget title={hydratedWidget.title} tasks={hydratedWidget.tasks || []} />;
    case WidgetType.CHART:
      return <ChartWidget title={hydratedWidget.title} config={hydratedWidget.config} data={hydratedWidget.data || []} isExpanded={isExpanded} />;
    case WidgetType.KANBAN:
        return (
            <KanbanWidget 
                title={hydratedWidget.title} 
                columns={hydratedWidget.columns || []} 
                isExpanded={isExpanded}
                onTaskMove={(taskId, newStatus) => {
                    const ds = hydratedWidget.dataSource;
                    // Ensure we have a valid group field, defaulting to 'status' if not specified
                    const groupBy = (ds as any).groupByField || 'status';
                    
                    if (onUpdateRecord && ds && ds.storeId) {
                         onUpdateRecord(ds.storeId, taskId, groupBy, newStatus);
                    }
                }}
            />
        );
    case WidgetType.TABLE:
        return <TableWidget title={hydratedWidget.title} data={hydratedWidget.data} />;
    case WidgetType.CODE:
        return <CodeWidget title={hydratedWidget.title} code={hydratedWidget.code} dataContext={projectData} />;
    case WidgetType.MINDMAP:
        return <MindmapWidget title={hydratedWidget.title} nodes={hydratedWidget.nodes} onNodeClick={onMindmapNodeClick} />;
    case WidgetType.METRICS:
        return <MetricsWidget title={hydratedWidget.title} items={hydratedWidget.contentItems || []} />;
    case WidgetType.RISK_MATRIX:
        return <RiskMatrixWidget title={hydratedWidget.title} risks={hydratedWidget.risks || []} />;
    case WidgetType.REFERENCES:
        return <ReferencesWidget title={hydratedWidget.title} items={hydratedWidget.contentItems || []} />;
    case WidgetType.MAP:
        return <MapWidget title={hydratedWidget.title} markers={hydratedWidget.markers || []} />;
    case WidgetType.ERROR:
        return <ErrorWidget title={hydratedWidget.title} error={hydratedWidget.error} />;
    default:
      return null;
  }
};
