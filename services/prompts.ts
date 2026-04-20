
import { Type, Schema } from "@google/genai";
import { ProjectNode, WidgetType, DataStore } from "../types";

// --- DATA AGENT (ARCHITECT) ---

export const getDataSystemInstruction = (isGroundingEnabled: boolean) => `
You are the **Data Architect** for "Project Mind". 
Your role is to strictly manage the project's **State** and **Database**.
You do NOT generate UI widgets directly. You generate the DATA that powers them.

CURRENT DATE: ${new Date().toISOString()}

**YOUR RESPONSIBILITIES:**
1. **Analyze Request**: Understand the user's intent within the project history context.
2. **Manage Knowledge**: Update the unstructured 'projectKnowledge' (facts, goals, decisions).
3. **Manage Data**: Execute SQL-like operations in 'projectDataUpdates' to modify the Structured Data Stores.
   - If the user implies a timeline, Create/Update a store with columns for start/end dates.
   - If the user implies metrics, Create/Update a store with number columns.
   - **SDLC Priority**: Ensure data structures support Software Development Life Cycle best practices (e.g., separating Backlog vs. Active, tracking Risks).
   - **DUPLICATE PREVENTION**: 
     - When adding items, check if a similar item already exists in the provided context.
     - When updating or correcting an item, you **MUST** find its 'id' from the context and use it in the record object. 
     - **NEVER** re-create an existing record with a missing ID, as this creates duplicates.
   - **RESPECT DELETIONS (CRITICAL)**:
     - The 'CURRENT DATABASE' provided in the prompt is the **Authoritative Live State**, including user manual deletions.
     - If a record appears in 'CHAT CONVERSATION' history but is missing from 'CURRENT DATABASE', **ASSUME THE USER INTENTIONALLY DELETED IT**.
     - **DO NOT** restore missing/deleted records unless the CURRENT User Input explicitly asks to "restore" or "undelete" them.

${isGroundingEnabled ? `**WEB TOOLS**: You have access to Google Search. Use it to validate technical stacks, look up documentation, or find real-world location data.` : ''}

**OUTPUT FORMAT**:
Return a raw JSON object matching the 'DataAgentSchema'. 
- 'chatReply': A concise response to the user explaining what data changes you made or answering their question.
- 'updatedData': The new state of the project.
`;

export const constructDataPrompt = (
    history: ProjectNode[], 
    node: ProjectNode, 
    lastKnownKnowledge: any, 
    lastKnownData: { stores: DataStore[] },
    mode?: string // Added mode parameter
): any[] => {
  // Build context for the Data Architect
  let promptText = `**PROJECT HISTORY CONTEXT**:\n`;

  history.forEach((n, i) => {
    if (i === history.length - 1) return;
    promptText += `[Step ${i}] User: "${n.userInput}" | Summary: ${n.data?.summary || 'N/A'}\n`;
  });

  promptText += `\n**CURRENT KNOWLEDGE STATE** (Unstructured):\n${JSON.stringify(lastKnownKnowledge, null, 2)}\n`;

  // Schemas Only (Data Architect needs to know structure, but maybe not all 1000 rows)
  const dataSchemas = lastKnownData.stores?.length 
    ? lastKnownData.stores.map(s => {
        const limit = 200;
        const previewRows = s.records.length > limit ? s.records.slice(0, limit) : s.records; 
        const truncatedMsg = s.records.length > limit ? `\n...(Truncated: Showing first ${limit} of ${s.records.length} records. If you need to update a record not listed here, try to infer it or ask for a specific search)` : '';
        return `- Store "${s.id}" (${s.name}):\n  Schema: ${JSON.stringify(s.schema)}\n  Content: ${JSON.stringify(previewRows)}${truncatedMsg}`;
      }).join('\n\n')
    : "No structured data stores defined.";
  
  promptText += `\n**CURRENT DATABASE (Live State)**:\n${dataSchemas}\n(Note: Records missing here but present in history have been deleted. Do not restore them.)\n`;

  promptText += `\n**ACTIVE REQUEST**:\nUser Input: "${node.userInput}"\n`;
  
  if (mode === 'cleanup') {
      promptText += `\n**TASK: CLEANUP & CONSOLIDATE**\nThe user wants to compress this entire history into a single clean state.
      
      ${node.userInput ? `**USER FOCUS INSTRUCTION**: "${node.userInput}"\n(Prioritize this aspect in the summary and data retention. Discard irrelevant details if asked.)\n` : ''}

1. Review the entire context.
2. In 'consolidatedUserIntent', write a SINGLE clear user prompt that would have led to this current state. 
   - **FORMAT**: Use Markdown (bullet points, bold text) to make this prompt structured and readable. 
   - It should act as a "Master Prompt" that could regenerate this state.
3. Ensure 'chatReply' is a comprehensive executive summary of the entire project status.
   - **FORMAT**: Use Markdown.
4. Ensure 'updatedData' reflects the most current, accurate state of all data.`;
  } else {
      promptText += `\n**INSTRUCTION**: Analyze the request. If new data is provided, generate 'projectDataUpdates' to UPSERT it into the stores. Update 'projectKnowledge' with any new facts. Remember to use existing IDs for updates to avoid duplicates. Respect manual deletions in the DB.`;
  }

  const parts: any[] = [{ text: promptText }];
  
  // Attachments
  if (node.userAttachments) {
    node.userAttachments.forEach(att => {
        if (att.type.startsWith('image/')) {
            parts.push({ inlineData: { mimeType: att.type, data: att.data.split(',')[1] } });
        } else {
            parts.push({ text: `[Attachment: ${att.name}]` });
        }
    });
  }
  
  // Chat History
  if (node.chat && node.chat.length > 0) {
      parts.push({ text: `\n**CHAT CONVERSATION**:\n` });
      node.chat.forEach(c => {
          parts.push({ text: `${c.role.toUpperCase()}: ${c.text}` });
          if (c.attachments) {
            c.attachments.forEach(att => {
                 if (att.type.startsWith('image/')) {
                    parts.push({ inlineData: { mimeType: att.type, data: att.data.split(',')[1] } });
                 }
            });
          }
      });
  }

  return parts;
};

export const dataAgentSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        thoughtProcess: { type: Type.STRING, description: "Reasoning about data needs." },
        chatReply: { type: Type.STRING, description: "Conversational response to the user." },
        consolidatedUserIntent: { type: Type.STRING, description: "For 'cleanup' mode: A single summary prompt representing the user's cumulative intent." },
        updatedData: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                projectKnowledgeJson: { type: Type.STRING, description: "Stringified JSON of unstructured knowledge." },
                projectDataUpdates: {
                    type: Type.ARRAY,
                    description: "Array of DB operations.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            operation: { type: Type.STRING, enum: ['CREATE_OR_UPDATE_STORE', 'UPSERT_RECORDS', 'DELETE_STORE', 'DELETE_RECORDS'] },
                            storeId: { type: Type.STRING },
                            name: { type: Type.STRING },
                            schemaJson: { type: Type.STRING, description: "JSON string of schema (key: type)" },
                            recordsJson: { type: Type.STRING, description: "JSON string of array of records. IMPORTANT: Each record MUST have a unique 'id' field." },
                            recordIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['operation', 'storeId']
                    }
                }
            },
            required: ["summary", "keyPoints"]
        }
    },
    required: ["thoughtProcess", "chatReply", "updatedData"]
};


// --- UI AGENT (DESIGNER) ---

export const getUISystemInstruction = () => `
You are the **UI Designer** for "Project Mind".
Your goal is to visualize the provided **DATA** using the Bento Widget System.
You do NOT manage data. You only Render it.

**AVAILABLE WIDGETS**:
- **GANTT**: For timelines (needs start/end dates).
- **KANBAN**: For workflows/status (needs groupable field).
- **METRICS**: For key numbers (KPIs, health scores).
- **RISK_MATRIX**: For Impact vs Likelihood (1-5).
- **CHART**: Bar/Line/Area for numerical trends.
- **MAP**: For locations.
- **TABLE**: For raw data views.
- **CODE**: For scripts.

**CRITICAL INSTRUCTION**:
- Look at the **DATA STORES** provided in the context.
- Choose widgets that best represent this data.
- **BINDING**: Use the 'dataSource' property to bind a widget to a 'storeId'. Use 'fieldMapping' to tell the renderer which DB columns map to the widget's expected keys.
- **MANDATORY**: You **MUST** use 'dataSource' for GANTT, KANBAN, TABLE, and CHART widgets. 
- **FORBIDDEN**: Do NOT hardcode data into 'tasks', 'columns', 'rows', or 'data' arrays for these widgets. If you hardcode it, the widget will not update when the database changes. 
- You can leave the hardcoded data arrays empty if 'dataSource' is provided. The app will hydrate them.
- If the user asks for a specific view (e.g., "Show me a roadmap"), prioritize that widget.

**OUTPUT FORMAT**:
Return a raw JSON object matching the 'UIAgentSchema'.
`;

export const constructUIPrompt = (
    userRequest: string,
    updatedData: { stores: DataStore[] },
    dataAgentThought: string
): any[] => {
    let promptText = `**CONTEXT FROM DATA ARCHITECT**:\n`;
    promptText += `Thought Process: "${dataAgentThought}"\n`;
    promptText += `User Request: "${userRequest}"\n`;

    promptText += `\n**AVAILABLE DATA STORES (The Source of Truth)**:\n`;
    
    if (updatedData.stores.length === 0) {
        promptText += "No structured data available. (You may generate a message widget or empty state).\n";
    } else {
        updatedData.stores.forEach(s => {
            const preview = s.records.slice(0, 50); 
            promptText += `\n[Store ID: "${s.id}"] Name: "${s.name}"\nSchema: ${JSON.stringify(s.schema)}\nRows Preview:\n${JSON.stringify(preview, null, 2)}\n`;
        });
    }

    promptText += `\n**INSTRUCTION**: Generate a 'updatedVisualization' object. Select the best widgets to display this data. \n**IMPORTANT**: Map store columns to widget fields using 'dataSource'. Do not hardcode data arrays.\n`;

    return [{ text: promptText }];
};

export const uiAgentSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        thoughtProcess: { type: Type.STRING, description: "Why I chose these widgets." },
        updatedVisualization: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                widgets: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: Object.values(WidgetType) },
                            title: { type: Type.STRING },
                            dataSource: {
                                type: Type.OBJECT,
                                properties: {
                                    storeId: { type: Type.STRING },
                                    fieldMapping: { 
                                        type: Type.ARRAY, 
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                widgetKey: { type: Type.STRING },
                                                storeColumn: { type: Type.STRING }
                                            },
                                            required: ["widgetKey", "storeColumn"]
                                        },
                                        nullable: true
                                    },
                                    groupByField: { type: Type.STRING }
                                },
                                required: ["storeId"]
                            },
                            // Legacy/Direct config (fallback)
                            config: { 
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    xAxisKey: { type: Type.STRING },
                                    dataKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    title: { type: Type.STRING },
                                    yAxisLabel: { type: Type.STRING },
                                    stacked: { type: Type.BOOLEAN }
                                },
                            },
                            code: { 
                                type: Type.OBJECT,
                                properties: {
                                    language: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    output: { type: Type.STRING }
                                }
                            }
                        },
                        required: ["type", "title"]
                    }
                }
            },
            required: ["title", "widgets"]
        }
    },
    required: ["thoughtProcess", "updatedVisualization"]
};
