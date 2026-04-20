
import React, { useRef } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  attachments: { name: string; type: string; data: string }[];
  setAttachments: React.Dispatch<React.SetStateAction<{ name: string; type: string; data: string }[]>>;
  isProcessing: boolean;
  onSubmit: (overrideInput?: string, subMode?: 'branch' | 'chat') => void;
  onStop: () => void;
  editingNodeId: string | null;
  onPaste: (e: React.ClipboardEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  attachments,
  setAttachments,
  isProcessing,
  onSubmit,
  onStop,
  editingNodeId,
  onPaste,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setAttachments((prev) => [
              ...prev,
              { name: file.name, type: file.type, data: ev.target!.result as string },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-30 shadow-2xl">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto py-1">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                <div className="h-14 w-14 rounded-xl border-2 border-slate-100 overflow-hidden shadow-sm">
                  {att.type.startsWith('image/') ? (
                    <img src={att.data} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-slate-50 flex items-center justify-center text-[10px] font-bold">
                      FILE
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-slate-400 hover:text-red-500 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
            title="Attach images"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(undefined, e.ctrlKey || e.metaKey ? 'branch' : 'chat');
              }
            }}
            onPaste={onPaste}
            placeholder={editingNodeId ? 'Refine this node...' : 'Type a message to Gemini...'}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-sm max-h-32 min-h-[44px]"
            rows={1}
            style={{ height: 'auto', minHeight: '44px' }}
          />

          <div className="flex flex-col gap-1 pb-1">
            <button
              onClick={isProcessing ? onStop : () => onSubmit(undefined, 'chat')}
              disabled={!isProcessing && !input.trim() && attachments.length === 0}
              className={`p-2 rounded-xl transition-all shadow-md ${
                isProcessing
                  ? 'bg-white text-red-500 border-2 border-red-100 hover:border-red-200 hover:bg-red-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-200'
              }`}
              title={isProcessing ? 'Stop Generation' : 'Send (Continue Chat)'}
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 text-center mt-2 font-medium">
          <b>Enter</b> to chat • <b>Ctrl+Enter</b> to branch history
        </div>
      </div>
    </div>
  );
};
