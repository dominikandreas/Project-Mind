

import { WidgetData, WidgetType } from "../types";

export const validateAndSanitizeWidget = (w: any): WidgetData => {
  if (!w) {
     return { type: WidgetType.ERROR, title: 'Missing Widget Data', error: { message: "Widget object was null or undefined" } };
  }
  try {
    // Sanitize Metrics
    if (w.type === WidgetType.METRICS) {
       w.contentItems = Array.isArray(w.contentItems) ? w.contentItems.slice(0, 12).map((i: any) => {
         let status = i.status ? i.status.toLowerCase() : 'neutral';
         const validStatuses = ['good', 'warning', 'critical', 'neutral'];
         if (!validStatuses.includes(status)) status = 'neutral';
         if (status === 'error' || status === 'failure') status = 'critical';
         if (status === 'info') status = 'neutral';
         return { 
             label: i.label || 'Metric', 
             value: i.value || '-', 
             trend: ['up', 'down', 'stable'].includes(i.trend) ? i.trend : undefined, 
             status,
             description: i.description
         };
       }) : [];
       // Backward compat cleanup
       delete w.items;
    } 
    // Sanitize Risk Matrix
    else if (w.type === WidgetType.RISK_MATRIX) {
       w.risks = Array.isArray(w.risks) ? w.risks.slice(0, 25).map((r: any) => ({
        id: r.id || `R${Math.floor(Math.random() * 1000)}`,
        label: r.label || 'Unnamed Risk',
        impact: Math.min(5, Math.max(1, parseInt(r.impact) || 3)), 
        likelihood: Math.min(5, Math.max(1, parseInt(r.likelihood) || 3)),
        mitigation: r.mitigation
       })) : [];
    } 
    // Sanitize Map
    else if (w.type === WidgetType.MAP) {
      w.markers = Array.isArray(w.markers) ? w.markers.slice(0, 20).map((m: any) => ({
        id: m.id || `loc-${Math.random().toString(36).substr(2, 9)}`,
        label: m.label || 'Location',
        address: m.address,
        latitude: (typeof m.latitude === 'number' && !isNaN(m.latitude)) ? m.latitude : undefined,
        longitude: (typeof m.longitude === 'number' && !isNaN(m.longitude)) ? m.longitude : undefined,
        description: m.description,
        type: ['office', 'datacenter', 'client', 'event', 'default'].includes(m.type) ? m.type : 'default'
      })) : [];
    }
    // Sanitize References
    else if (w.type === WidgetType.REFERENCES) {
      w.contentItems = Array.isArray(w.contentItems) ? w.contentItems.map((i: any) => ({
          title: i.title || 'Untitled Source',
          uri: i.uri || '#'
      })) : [];
      // Backward compat cleanup
      delete w.items;
    }
    // Sanitize Gantt
    else if (w.type === WidgetType.GANTT) {
       w.tasks = Array.isArray(w.tasks) ? w.tasks.slice(0, 25).map((t: any) => {
         let status = t.status ? t.status.toLowerCase() : 'todo';
         if (status === 'active') status = 'in-progress';
         if (status === 'planned') status = 'todo';
         if (status === 'completed') status = 'done';
         if (status === 'milestone') status = 'todo'; // Map milestone to todo but ensure it renders

         // Fix dates: auto-populate end if missing, or start if missing
         let start = t.start;
         let end = t.end;
         
         if (!start && !end) {
             start = new Date().toISOString().split('T')[0]; // Default to today
             end = start;
         } else if (start && !end) {
             end = start; // Milestone/Single day task
         } else if (!start && end) {
             start = end;
         }
         // Strip time if present to ensure proper date string parsing if formatted weirdly
         if (start && start.includes('T')) start = start.split('T')[0];
         if (end && end.includes('T')) end = end.split('T')[0];

         return { ...t, status, start, end };
       }) : [];
    } 
    // Sanitize Kanban
    else if (w.type === WidgetType.KANBAN) {
       w.columns = Array.isArray(w.columns) ? w.columns.map((c: any) => {
         let tasks = Array.isArray(c.tasks) ? c.tasks : [];
         let title = c.title || "Untitled Column";
         if (tasks.length === 0 && (title.includes("Tasks: [") || title.includes("TASKS: ["))) {
            try {
                const match = title.match(/(?:-|:)?\s*Tasks:\s*(\[.*\])/i);
                if (match && match[1]) {
                    const extracted = JSON.parse(match[1]);
                    if (Array.isArray(extracted)) {
                        tasks = extracted;
                        title = title.replace(/(?:-|:)?\s*Tasks:\s*\[.*\]/i, '').trim();
                        if (title.endsWith('-')) title = title.slice(0, -1).trim();
                    }
                }
            } catch (e) {
                console.warn("Failed to recover tasks from title", e);
            }
         }
         return {
           ...c,
           title: title,
           tasks: tasks.map((t: any) => ({
             id: t.id || t.ID || String(Math.random()),
             content: t.content || t.CONTENT || t.Content || "No content",
             tag: t.tag || t.TAG || undefined,
             dueDate: t.dueDate || t.DUEDATE || undefined,
             priority: (t.priority || t.PRIORITY || "").toLowerCase() || undefined
           }))
         };
       }) : [];
    }
    // Sanitize Code
    else if (w.type === WidgetType.CODE) {
       if (!w.code) {
           w.code = { language: 'plaintext', content: '' };
       }
       if (!w.code.content) w.code.content = '// No content generated';
       if (!w.code.language) w.code.language = 'plaintext';
    }
    
    // Sanitize Chart & Table Data
    if (w.type === WidgetType.CHART || w.type === WidgetType.TABLE) {
      if (w.dataJson && !w.data) {
        try { 
          w.data = JSON.parse(w.dataJson); 
        } catch (e) {
          console.warn("Failed to parse dataJson for widget", w.title);
        }
      }
      if (!w.data) {
        if (w.type === WidgetType.TABLE) {
          w.data = { headers: [], rows: [] };
        } else {
          w.data = [];
        }
      }
    }

    if (w.type === WidgetType.CHART) {
        if (!w.config) {
            w.config = { type: 'bar', xAxisKey: 'name', dataKeys: [] };
        }
        if (!w.config.dataKeys || !Array.isArray(w.config.dataKeys) || w.config.dataKeys.length === 0) {
             if (Array.isArray(w.data) && w.data.length > 0 && w.data[0]) {
                 const sample = w.data[0];
                 const xKey = w.config.xAxisKey || 'name';
                 const potentialKeys = Object.keys(sample).filter(k => k !== xKey && k !== 'name' && k !== 'id');
                 if (potentialKeys.length > 0) {
                     w.config.dataKeys = potentialKeys;
                 } else {
                     const numKey = Object.keys(sample).find(k => typeof sample[k] === 'number');
                     w.config.dataKeys = numKey ? [numKey] : [];
                 }
             } else {
                 w.config.dataKeys = [];
             }
        }
    }
    
    return w;
  } catch (err: any) {
    return {
      type: WidgetType.ERROR,
      title: `Widget Error: ${w.title || 'Untitled'}`,
      error: { message: err.message, rawJson: JSON.stringify(w, null, 2) }
    };
  }
};