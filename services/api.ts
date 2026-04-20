
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  ProjectState, 
  WidgetType, 
  AIResponse, 
  ThinkingBudgetLevel, 
  ProjectNode,
  GroundingSource,
  DataStore,
  ProcessingStage,
  ChatMessage
} from "../types";
import { validateAndSanitizeWidget } from "./sanitizer";
import { 
    getDataSystemInstruction, 
    constructDataPrompt, 
    dataAgentSchema,
    getUISystemInstruction,
    constructUIPrompt,
    uiAgentSchema
} from "./prompts";

// Helper to parse loose JSON
const safeParse = (jsonText: string) => {
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        // Try to find the JSON block
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) {
            try { parsed = JSON.parse(match[0]); } catch(e2) {}
        }
    }
    
    if (!parsed) throw new Error("Response was not valid JSON");

    // UNWRAP LOGIC: Fix for models that output the schema definition populated with data
    // Pattern: { type: "OBJECT", properties: { ...data... } }
    if (parsed.properties && !parsed.thoughtProcess) {
        // Check if properties contains the fields we expect 
        // We use 'thoughtProcess' as the canary since it's in both Data and UI schemas
        if (parsed.properties.thoughtProcess) {
            return parsed.properties;
        }
    }

    return parsed;
};

// Helper to handle mixed string/object inputs from models
const parseOrRaw = (input: any): any => {
    if (input === null || input === undefined) return null;
    if (typeof input === 'object') return input;

    if (typeof input === 'string') {
        const tryParse = (s: string) => {
             try { return JSON.parse(s); } catch(e) { return undefined; }
        }

        // 1. Try direct parse
        let result = tryParse(input);
        
        // 2. If failed, try cleaning escaped quotes (common model error: "[{\"key\":...}]")
        if (result === undefined) {
             // Replace \" with " and \\ with \ to fix common over-escaping
             const cleaned = input
                .replace(/\\"/g, '"')  // Unescape quotes
                .replace(/\\\\/g, '\\'); // Unescape backslashes
             
             result = tryParse(cleaned);
        }

        // 3. If result is a string (double encoded), recurse
        if (typeof result === 'string') {
            const trimmed = result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                 return parseOrRaw(result);
            }
        }
        
        return result !== undefined ? result : null;
    }
    
    return input;
};

// Helper to validate structure against expectations
const validateResponse = (data: any, type: 'data' | 'ui') => {
    if (typeof data !== 'object' || data === null) throw new Error("Response must be an object");
    
    if (type === 'data') {
        // Data Agent Validation
        if (!data.thoughtProcess || typeof data.thoughtProcess !== 'string') {
            throw new Error("Missing or invalid 'thoughtProcess' (string)");
        }
        if (!data.chatReply || typeof data.chatReply !== 'string') {
            throw new Error("Missing or invalid 'chatReply' (string)");
        }
        if (!data.updatedData || typeof data.updatedData !== 'object') {
            throw new Error("Missing or invalid 'updatedData' (object)");
        }
        // Deep check updatedData
        if (!data.updatedData.summary || typeof data.updatedData.summary !== 'string') {
            throw new Error("Missing 'updatedData.summary'");
        }
        if (!Array.isArray(data.updatedData.keyPoints)) {
            throw new Error("Missing 'updatedData.keyPoints' (array)");
        }
        if (data.updatedData.projectDataUpdates && !Array.isArray(data.updatedData.projectDataUpdates)) {
             throw new Error("'projectDataUpdates' must be an array");
        }
    } else {
        // UI Agent Validation
         if (!data.thoughtProcess || typeof data.thoughtProcess !== 'string') {
             throw new Error("Missing 'thoughtProcess'");
         }
         if (!data.updatedVisualization || typeof data.updatedVisualization !== 'object') {
             throw new Error("Missing 'updatedVisualization' (object)");
         }
         if (!data.updatedVisualization.title || typeof data.updatedVisualization.title !== 'string') {
             throw new Error("Missing 'updatedVisualization.title'");
         }
         if (data.updatedVisualization.widgets && !Array.isArray(data.updatedVisualization.widgets)) {
             throw new Error("'updatedVisualization.widgets' must be an array");
         }
    }
};

// Helper to wrap promise with cancellation
const wrapWithAbort = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            const abortHandler = () => reject(new Error("Request cancelled by user."));
            if (signal.aborted) {
                abortHandler();
            } else {
                signal.addEventListener('abort', abortHandler);
            }
        })
    ]);
};

// Helper for Custom API Calls (OpenAI Compatible)
const callCustomAI = async (
    endpoint: string,
    modelName: string,
    apiKey: string | undefined,
    systemInstruction: string,
    history: ProjectNode[],
    promptParts: any[], // From constructDataPrompt/constructUIPrompt
    schema: any,
    signal?: AbortSignal
): Promise<any> => {
    
    const messages: { role: string; content: string }[] = [];
    
    const schemaString = JSON.stringify(schema, null, 2);
    const fullSystemInstruction = `${systemInstruction}\n\nIMPORTANT: You must output strictly valid JSON matching this schema:\n${schemaString}\n\nDo not include markdown formatting like \`\`\`json in your response. Just the raw JSON.`;
    messages.push({ role: 'system', content: fullSystemInstruction });

    let userContent = "";
    promptParts.forEach(p => {
        if (p.text) userContent += p.text + "\n";
    });

    messages.push({ role: 'user', content: userContent });

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const body = {
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Custom API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("Custom API returned empty content");
    
    return safeParse(content);
};

export const generateNodeResponse = async (
  targetNodeId: string,
  projectState: ProjectState,
  mode: 'branch' | 'chat' | 'synthesize' | 'refresh' | 'cleanup',
  modelName: string, 
  thinkingBudget: ThinkingBudgetLevel,
  isGroundingEnabled: boolean,
  onProgress?: (stage: ProcessingStage) => void,
  signal?: AbortSignal
): Promise<AIResponse> => {
  const node = projectState.nodes[targetNodeId];
  if (!node) throw new Error("Node not found");

  const checkAbort = () => {
    if (signal?.aborted) throw new Error("Request cancelled by user.");
  };

  checkAbort();

  // --- PREPARE HISTORY ---
  const history: ProjectNode[] = [];
  let curr: ProjectNode | undefined = node;
  while (curr) {
    history.unshift(curr);
    curr = curr.parentId ? projectState.nodes[curr.parentId] : undefined;
  }

  // --- DETERMINE BASELINE STATE ---
  let lastKnownKnowledge = {};
  let lastKnownData: { stores: DataStore[] } = { stores: [] };

  history.forEach((n) => {
    if (n.data?.projectKnowledge && Object.keys(n.data.projectKnowledge).length > 0) {
        lastKnownKnowledge = n.data.projectKnowledge;
    }
    if (n.data?.projectData) {
        lastKnownData = n.data.projectData;
    }
  });

  if (node.data?.projectKnowledge && Object.keys(node.data.projectKnowledge).length > 0) {
      lastKnownKnowledge = node.data.projectKnowledge;
  }
  if (node.data?.projectData) {
      lastKnownData = node.data.projectData;
  }

  // ==========================================
  // PHASE 1: DATA ARCHITECT (WITH RETRY)
  // ==========================================
  onProgress?.('analyzing');
  checkAbort();
  
  // Clone prompt parts so we can append errors without side-effects on the original construct
  let currentDataPrompt = [...constructDataPrompt(history, node, lastKnownKnowledge, lastKnownData, mode)];
  let dataResult: any;
  let groundingSources: GroundingSource[] = [];
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
      attempts++;
      try {
          checkAbort();
          
          if (projectState.modelProvider === 'gemini') {
              const budgetMap: Record<ThinkingBudgetLevel, number> = { low: 512, medium: 4096, high: 32768 };
              const isMapsModel = modelName.includes("2.5");
              const tools: any[] = [];
              if (isGroundingEnabled) {
                  tools.push({ googleSearch: {} });
                  if (isMapsModel) tools.push({ googleMaps: {} });
              }

              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const dataConfig: any = {
                  systemInstruction: getDataSystemInstruction(isGroundingEnabled),
                  tools: tools,
                  thinkingConfig: { thinkingBudget: budgetMap[thinkingBudget] },
                  responseMimeType: "application/json",
                  responseSchema: dataAgentSchema
              };

              const dataResponse = await wrapWithAbort(ai.models.generateContent({
                  model: modelName,
                  contents: { parts: currentDataPrompt },
                  config: dataConfig
              }), signal) as GenerateContentResponse;

              dataResult = safeParse(dataResponse.text || "{}");
              
              // Validate schema
              validateResponse(dataResult, 'data');

              // Extract Grounding (Only on success)
              const chunks = dataResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
              if (chunks) {
                  chunks.forEach((chunk: any) => {
                      if (chunk.web?.uri && chunk.web?.title) groundingSources.push({ title: chunk.web.title, uri: chunk.web.uri });
                      if (chunk.maps?.uri && chunk.maps?.title) groundingSources.push({ title: `📍 ${chunk.maps.title}`, uri: chunk.maps.uri });
                  });
              }

              // Break loop on success
              break; 

          } else {
              // CUSTOM PROVIDER
              const { endpoint, modelName: customModel, apiKey } = projectState.customModelConfig;
              if (!endpoint || !customModel) throw new Error("Missing Custom API Configuration");

              dataResult = await callCustomAI(
                  endpoint,
                  customModel,
                  apiKey,
                  getDataSystemInstruction(false),
                  history,
                  currentDataPrompt,
                  dataAgentSchema,
                  signal
              );
              
              validateResponse(dataResult, 'data');
              break;
          }
      } catch (err: any) {
          if (err.message === "Request cancelled by user.") throw err;
          console.warn(`Data Agent attempt ${attempts} failed:`, err.message);
          
          if (attempts >= maxAttempts) {
              throw new Error(`Data Agent failed after ${maxAttempts} attempts. Last Error: ${err.message}`);
          }
          
          // Append error to prompt for next attempt
          currentDataPrompt.push({ 
             text: `\n\nSYSTEM ERROR: The previous response was invalid. Error: "${err.message}". \nPlease fix the JSON structure and ensure all required fields (thoughtProcess, chatReply, updatedData) are present and match the schema.` 
          });
      }
  }

  // ==========================================
  // PHASE 1.5: APPLY DATA UPDATES (IN-MEMORY)
  // ==========================================
  onProgress?.('updating_data');
  checkAbort();

  if (!dataResult.updatedData) dataResult.updatedData = { summary: "No summary", keyPoints: [] };
  
  if (dataResult.updatedData.projectKnowledgeJson) {
      try { 
          dataResult.updatedData.projectKnowledge = parseOrRaw(dataResult.updatedData.projectKnowledgeJson) || dataResult.updatedData.projectKnowledge;
      } catch(e) {}
  } else {
      dataResult.updatedData.projectKnowledge = lastKnownKnowledge;
  }

  // Execute Store Operations
  let updatedStores = lastKnownData.stores ? [...lastKnownData.stores] : [];
  if (dataResult.updatedData.projectDataUpdates && Array.isArray(dataResult.updatedData.projectDataUpdates)) {
      dataResult.updatedData.projectDataUpdates.forEach((op: any) => {
          const existingIdx = updatedStores.findIndex(s => s.id === op.storeId);
          
          let schemaMap = parseOrRaw(op.schemaJson) || {};
          let recordsArr = parseOrRaw(op.recordsJson) || [];

          const upsertRecords = (currentRecords: any[], newRecords: any[], schema: any) => {
              const mergedRecords = [...currentRecords];
              const commonKeyFields = ['name', 'title', 'label', 'content', 'task', 'feature', 'ticket', 'item'];
              const schemaKeys = Object.keys(schema || {});
              const businessKey = commonKeyFields.find(k => schemaKeys.includes(k) || (currentRecords.length > 0 && k in currentRecords[0]));

              newRecords.forEach((newRec: any) => {
                  let recordId = newRec.id;

                  if (!recordId && businessKey && newRec[businessKey]) {
                      const candidates = mergedRecords.filter(r => r[businessKey] === newRec[businessKey]);
                      if (candidates.length === 1) {
                          recordId = candidates[0].id;
                      }
                  }

                  if (!recordId) {
                       recordId = `gen-${Math.random().toString(36).substr(2, 9)}`;
                       newRec.id = recordId;
                  } else {
                      newRec.id = recordId;
                  }
                  
                  const matchIdx = mergedRecords.findIndex(r => r.id === recordId);
                  if (matchIdx !== -1) {
                      mergedRecords[matchIdx] = { ...mergedRecords[matchIdx], ...newRec };
                  } else {
                      mergedRecords.push(newRec);
                  }
              });
              return mergedRecords;
          };

          if (op.operation === 'DELETE_STORE') {
              if (existingIdx !== -1) updatedStores.splice(existingIdx, 1);
          } 
          else if (op.operation === 'CREATE_OR_UPDATE_STORE') {
              if (existingIdx !== -1) {
                  const store = updatedStores[existingIdx];
                  const newSchema = (Object.keys(schemaMap).length > 0) ? schemaMap : store.schema;
                  const finalRecords = (recordsArr.length > 0) 
                      ? upsertRecords(store.records, recordsArr, newSchema)
                      : store.records;

                  updatedStores[existingIdx] = {
                      ...store,
                      name: op.name || store.name,
                      schema: newSchema,
                      records: finalRecords
                  };
              } else {
                  updatedStores.push({
                      id: op.storeId,
                      name: op.name || op.storeId,
                      schema: schemaMap,
                      records: recordsArr
                  });
              }
          } 
          else if (op.operation === 'UPSERT_RECORDS') {
              if (existingIdx !== -1) {
                  const store = updatedStores[existingIdx];
                  updatedStores[existingIdx] = { 
                      ...store, 
                      records: upsertRecords(store.records, recordsArr, store.schema) 
                  };
              } else {
                  updatedStores.push({
                      id: op.storeId,
                      name: op.name || op.storeId,
                      schema: schemaMap,
                      records: recordsArr
                  });
              }
          }
          else if (op.operation === 'DELETE_RECORDS') {
              if (existingIdx !== -1) {
                  const store = updatedStores[existingIdx];
                  const idsToDelete = op.recordIds || [];
                  const filteredRecords = store.records.filter(r => !idsToDelete.includes(r.id));
                  updatedStores[existingIdx] = { ...store, records: filteredRecords };
              }
          }
      });
  }

  const nextDataState = {
      stores: updatedStores
  };
  
  dataResult.updatedData.projectData = nextDataState;

  // ==========================================
  // PHASE 2: UI DESIGNER (WITH RETRY)
  // ==========================================
  onProgress?.('designing_ui');
  checkAbort();

  let currentUIPrompt = [...constructUIPrompt(node.userInput, nextDataState, dataResult.thoughtProcess)];
  let uiResult: any;
  attempts = 0; // Reset attempts for UI Agent

  while (attempts < maxAttempts) {
      attempts++;
      try {
          checkAbort();
          
          if (projectState.modelProvider === 'gemini') {
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const uiConfig: any = {
                  systemInstruction: getUISystemInstruction(),
                  thinkingConfig: { thinkingBudget: 1024 }, 
                  responseMimeType: "application/json",
                  responseSchema: uiAgentSchema
              };

              const uiResponse = await wrapWithAbort(ai.models.generateContent({
                  model: modelName, 
                  contents: { parts: currentUIPrompt },
                  config: uiConfig
              }), signal) as GenerateContentResponse;
              
              uiResult = safeParse(uiResponse.text || "{}");
              validateResponse(uiResult, 'ui');
              break;

          } else {
              // CUSTOM PROVIDER
              const { endpoint, modelName: customModel, apiKey } = projectState.customModelConfig;
              uiResult = await callCustomAI(
                  endpoint,
                  customModel,
                  apiKey,
                  getUISystemInstruction(),
                  [], 
                  currentUIPrompt,
                  uiAgentSchema,
                  signal
              );
              validateResponse(uiResult, 'ui');
              break;
          }
      } catch (err: any) {
          if (err.message === "Request cancelled by user.") throw err;
          console.warn(`UI Agent attempt ${attempts} failed:`, err.message);
          
          if (attempts >= maxAttempts) {
              // UI Failure fallback
              console.error("UI Agent failed completely. Returning Data Only fallback.");
              uiResult = { 
                  thoughtProcess: "UI Agent failed to generate valid response.",
                  updatedVisualization: { title: "Data Only (Visualization Error)", widgets: [] } 
              };
              break; 
          }
          
          currentUIPrompt.push({ 
             text: `\n\nSYSTEM ERROR: The previous response was invalid. Error: "${err.message}". \nPlease fix the JSON structure and ensure 'updatedVisualization' matches the schema.` 
          });
      }
  }

  // ==========================================
  // MERGE & SANITIZE
  // ==========================================
  onProgress?.('rendering');
  checkAbort();

  if (!uiResult.updatedVisualization) uiResult.updatedVisualization = { title: "Visualization Error", widgets: [] };

  if (groundingSources.length > 0) {
      const hasRefs = uiResult.updatedVisualization.widgets?.some((w: any) => w.type === WidgetType.REFERENCES);
      if (!hasRefs) {
          if (!uiResult.updatedVisualization.widgets) uiResult.updatedVisualization.widgets = [];
          uiResult.updatedVisualization.widgets.push({
              type: WidgetType.REFERENCES,
              title: "Research & Locations",
              contentItems: groundingSources
          });
      }
  }

  if (uiResult.updatedVisualization.widgets) {
      uiResult.updatedVisualization.widgets = uiResult.updatedVisualization.widgets.map(validateAndSanitizeWidget);
  }

  return {
      updatedData: dataResult.updatedData,
      updatedVisualization: uiResult.updatedVisualization,
      chatReply: dataResult.chatReply || "Processing complete.",
      thoughtProcess: `${dataResult.thoughtProcess}\n\n[UI Designer]: ${uiResult.thoughtProcess || 'Generated widgets based on data.'}`,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      consolidatedUserIntent: dataResult.consolidatedUserIntent,
      debugInfo: {
          timestamp: Date.now(),
          request: {
              model: projectState.modelProvider === 'gemini' ? modelName : projectState.customModelConfig.modelName,
              prompt: "Multi-step agent chain execution",
              budget: projectState.thinkingBudget === 'low' ? 512 : projectState.thinkingBudget === 'medium' ? 4096 : 32768,
              grounding: isGroundingEnabled
          },
          response: `DATA AGENT:\n${JSON.stringify(dataResult, null, 2)}\n\nUI AGENT:\n${JSON.stringify(uiResult, null, 2)}`
      }
  };
};
