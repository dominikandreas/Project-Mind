
import React from 'react';
import { ModelProvider, ThinkingBudgetLevel, CustomModelConfig, ProjectState } from '../../types';

interface EngineSettingsProps {
  projectState: ProjectState;
  onModelChange: (model: string) => void;
  onBudgetChange: (level: ThinkingBudgetLevel) => void;
  onGroundingToggle: (enabled: boolean) => void;
  onProviderChange: (provider: ModelProvider) => void;
  onCustomConfigChange: (config: Partial<CustomModelConfig>) => void;
}

export const EngineSettings: React.FC<EngineSettingsProps> = ({
  projectState,
  onModelChange,
  onBudgetChange,
  onGroundingToggle,
  onProviderChange,
  onCustomConfigChange
}) => {
  const provider = projectState?.modelProvider || 'gemini';
  const currentModel = projectState?.selectedModel || 'gemini-3-flash-preview';
  const currentBudget = projectState?.thinkingBudget || 'low';
  const isGroundingEnabled = projectState?.isGroundingEnabled ?? false;
  const isGeminiEnabled = projectState?.isGeminiEnabled ?? true;
  const customConfig = projectState?.customModelConfig || { endpoint: '', modelName: '', apiKey: '' };

  return (
    <div className="p-3 bg-slate-50/50 border-b border-slate-100 space-y-3">
      {isGeminiEnabled ? (
        <div className="bg-white p-1 rounded-xl border border-slate-200 flex">
          <button
            onClick={() => onProviderChange('gemini')}
            className={`flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              provider === 'gemini' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Gemini
          </button>
          <button
            onClick={() => onProviderChange('custom')}
            className={`flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              provider === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Custom
          </button>
        </div>
      ) : (
        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Custom Provider Active</span>
        </div>
      )}

      {provider === 'gemini' && isGeminiEnabled ? (
        <>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Engine Model</label>
            <div className="flex flex-col gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
              <div className="flex gap-1">
                <button
                  onClick={() => onModelChange('gemini-3-pro-preview')}
                  className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                    currentModel === 'gemini-3-pro-preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  PRO (G3)
                </button>
                <button
                  onClick={() => onModelChange('gemini-3-flash-preview')}
                  className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                    currentModel === 'gemini-3-flash-preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  FLASH (G3)
                </button>
              </div>
              <button
                onClick={() => onModelChange('gemini-2.5-flash')}
                className={`w-full py-1 text-[10px] font-black rounded-lg transition-all ${
                  currentModel === 'gemini-2.5-flash'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600 border border-slate-100'
                }`}
              >
                MAPS READY (G2.5)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Thinking Budget</label>
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
              {(['low', 'medium', 'high'] as ThinkingBudgetLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onBudgetChange(level)}
                  className={`flex-1 py-1 text-[9px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                    currentBudget === level ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Web Research</label>
            <button
              onClick={() => onGroundingToggle(!isGroundingEnabled)}
              className={`w-full flex items-center justify-between p-2 bg-white border rounded-xl transition-all ${
                isGroundingEnabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1 rounded-md ${
                    isGroundingEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-tight ${
                    isGroundingEnabled ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  Grounding
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  isGroundingEnabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all`}
                  style={{ left: isGroundingEnabled ? '18px' : '2px' }}
                ></div>
              </div>
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">API Endpoint</label>
            <input
              type="text"
              value={customConfig.endpoint}
              onChange={(e) => onCustomConfigChange({ endpoint: e.target.value })}
              placeholder="http://localhost:11434/v1/chat/completions"
              className="w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Model Name</label>
            <input
              type="text"
              value={customConfig.modelName}
              onChange={(e) => onCustomConfigChange({ modelName: e.target.value })}
              placeholder="llama3"
              className="w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">API Key (Optional)</label>
            <input
              type="password"
              value={customConfig.apiKey}
              onChange={(e) => onCustomConfigChange({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-600"
            />
          </div>
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
            <p className="text-[9px] text-amber-700 leading-tight">
              <b>Note:</b> Custom models may not follow strict JSON schemas. Results may vary compared to Gemini.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
