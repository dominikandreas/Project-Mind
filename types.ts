

export enum WidgetType {
  GANTT = 'GANTT',
  CHART = 'CHART',
  KANBAN = 'KANBAN',
  TABLE = 'TABLE',
  CODE = 'CODE',
  MINDMAP = 'MINDMAP',
  METRICS = 'METRICS',
  RISK_MATRIX = 'RISK_MATRIX',
  REFERENCES = 'REFERENCES',
  MAP = 'MAP',
  ERROR = 'ERROR',
}

export interface MetricItem {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  description?: string;
}

export interface RiskItem {
  id: string;
  label: string;
  impact: number; // 1-5
  likelihood: number; // 1-5
  mitigation?: string;
}

export interface MapMarker {
  id: string;
  label: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  type?: 'office' | 'datacenter' | 'client' | 'event' | 'default';
}

export interface GanttTask {
  id: string;
  name: string;
  start: string; // ISO Date
  end: string; // ISO Date
  progress: number; // 0-100
  owner?: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  isEstimated?: boolean;
  dependencies?: string[]; // Array of task IDs
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area';
  xAxisKey: string;
  dataKeys: string[];
  colors?: string[];
  title?: string;
  yAxisLabel?: string;
  stacked?: boolean;
}

export interface KanbanTask {
  id: string;
  content: string;
  tag?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  sourceId?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

export type ColumnType = 'text' | 'number' | 'date' | 'progress' | 'status' | 'impact' | 'link';

export interface TableData {
  headers: string[];
  rows: Record<string, any>[];
  columnTypes?: Record<string, ColumnType>;
}

export interface CodeData {
  language: string;
  content: string;
  explanation?: string;
  output?: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  parentId?: string;
  color?: string;
  description?: string;
}

export interface ErrorData {
  message: string;
  rawJson?: string;
}

// --- DATA DRIVEN ARCHITECTURE ---

export interface DataSourceConfig {
  storeId: string;
  // Array of mappings: widgetKey is the prop name the widget expects, storeColumn is the DB column
  fieldMapping: { widgetKey: string; storeColumn: string }[]; 
  filter?: string; // Optional natural language description of filter
}

export type WidgetData = 
  | { type: WidgetType.GANTT; title: string; tasks?: GanttTask[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.CHART; title: string; config: ChartConfig; data?: ChartDataPoint[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.KANBAN; title: string; columns?: KanbanColumn[]; dataSource?: DataSourceConfig & { groupByField?: string } }
  | { type: WidgetType.TABLE; title: string; data?: TableData; dataSource?: DataSourceConfig }
  | { type: WidgetType.CODE; title: string; code: CodeData; dataSource?: DataSourceConfig }
  | { type: WidgetType.MINDMAP; title: string; nodes: MindmapNode[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.METRICS; title: string; contentItems?: MetricItem[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.RISK_MATRIX; title: string; risks?: RiskItem[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.REFERENCES; title: string; contentItems: GroundingSource[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.MAP; title: string; markers?: MapMarker[]; dataSource?: DataSourceConfig }
  | { type: WidgetType.ERROR; title: string; error: ErrorData; dataSource?: DataSourceConfig };

export interface DataStore {
  id: string;
  name: string;
  schema: Record<string, string>;
  records: Record<string, any>[];
}

export interface NodeData {
  summary: string;
  keyPoints: string[];
  projectKnowledge?: Record<string, any>;
  projectData?: {
    stores: DataStore[];
  };
}

export interface NodeVisualization {
  title: string;
  widgets: WidgetData[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  groundingSources?: GroundingSource[];
  attachments?: { name: string; type: string; data: string }[];
  visualizationSnapshot?: NodeVisualization;
  dataSnapshot?: NodeData;
}

export interface DebugInfo {
  timestamp: number;
  request: {
    model: string;
    systemInstruction?: string;
    prompt?: string;
    budget?: number;
    grounding?: boolean;
  };
  response?: string;
  error?: string;
}

export interface AIResponse {
  updatedData: NodeData;
  updatedVisualization: NodeVisualization;
  chatReply: string;
  thoughtProcess?: string;
  debugInfo?: DebugInfo;
  groundingSources?: GroundingSource[];
  consolidatedUserIntent?: string; // New field for cleanup mode
}

export type ProcessingStage = 'idle' | 'analyzing' | 'updating_data' | 'designing_ui' | 'rendering';

export interface RestorePoint {
  chat: ChatMessage[];
  data: NodeData;
  visualization: NodeVisualization;
  userInput: string;
  timestamp: number;
}

export interface ProjectNode {
  id: string;
  parentId: string | null;
  timestamp: number;
  userInput: string;
  userAttachments?: { name: string; type: string; data: string }[];
  data: NodeData;
  visualization: NodeVisualization;
  chat: ChatMessage[];
  debugInfo?: DebugInfo;
  children: string[];
  isLoading: boolean;
  processingStage?: ProcessingStage; 
  restorePoint?: RestorePoint; // Backup for undoing cleanup/destructive actions
}

export type ThinkingBudgetLevel = 'low' | 'medium' | 'high';

export type ModelProvider = 'gemini' | 'custom';

export interface CustomModelConfig {
  endpoint: string;
  modelName: string;
  apiKey?: string;
}

export interface ProjectState {
  nodes: Record<string, ProjectNode>;
  rootId: string;
  currentNodeId: string;
  selectedModel: string;
  thinkingBudget: ThinkingBudgetLevel;
  isGroundingEnabled: boolean;
  modelProvider: ModelProvider;
  isGeminiEnabled: boolean; // New Flag
  customModelConfig: CustomModelConfig;
}