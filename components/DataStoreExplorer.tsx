import React, { useState, useEffect, useRef } from 'react';
import { DataStore } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface DataStoreExplorerProps {
  stores: DataStore[];
  onClose: () => void;
  onUpdateStores: (stores: DataStore[]) => void;
}

export const DataStoreExplorer: React.FC<DataStoreExplorerProps> = ({ stores, onClose, onUpdateStores }) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(stores[0]?.id || null);
  const [confirmStoreDelete, setConfirmStoreDelete] = useState<string | null>(null);
  const [confirmRowDelete, setConfirmRowDelete] = useState<{ storeId: string; rowId: string } | null>(null);
  
  // Editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
        inputRef.current.focus();
    }
  }, [editingCell]);

  const handleDeleteStore = () => {
    if (!confirmStoreDelete) return;
    const newStores = stores.filter(s => s.id !== confirmStoreDelete);
    onUpdateStores(newStores);
    if (selectedStoreId === confirmStoreDelete) {
        setSelectedStoreId(newStores[0]?.id || null);
    }
    setConfirmStoreDelete(null);
  };

  const handleDeleteRow = () => {
    if (!confirmRowDelete) return;
    const { storeId, rowId } = confirmRowDelete;
    const newStores = stores.map(s => {
        if (s.id === storeId) {
            return {
                ...s,
                records: s.records.filter(r => r.id !== rowId)
            };
        }
        return s;
    });
    onUpdateStores(newStores);
    setConfirmRowDelete(null);
  };

  const handleSaveEdit = () => {
    if (!editingCell || !selectedStore) return;

    const newStores = stores.map(s => {
        if (s.id === selectedStore.id) {
            return {
                ...s,
                records: s.records.map(r => {
                    if (r.id === editingCell.rowId) {
                        // Preserve number type if original was number
                        const prev = r[editingCell.colKey];
                        let newValue: any = editingCell.value;
                        if (typeof prev === 'number' && !isNaN(Number(newValue)) && newValue.trim() !== '') {
                             newValue = Number(newValue);
                        }
                        return { ...r, [editingCell.colKey]: newValue };
                    }
                    return r;
                })
            };
        }
        return s;
    });
    onUpdateStores(newStores);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSaveEdit();
    } else if (e.key === 'Escape') {
        setEditingCell(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      
      <ConfirmationModal 
        isOpen={!!confirmStoreDelete}
        onConfirm={handleDeleteStore}
        onCancel={() => setConfirmStoreDelete(null)}
        title="Delete Table"
        message="Are you sure you want to delete this entire table? This action cannot be undone."
      />

      <ConfirmationModal 
        isOpen={!!confirmRowDelete}
        onConfirm={handleDeleteRow}
        onCancel={() => setConfirmRowDelete(null)}
        title="Delete Entry"
        message="Are you sure you want to remove this record from the database?"
      />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Sidebar List */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
             <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Data Stores</h2>
             <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{stores.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all truncate flex justify-between group ${
                  selectedStoreId === store.id 
                  ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <span className="truncate">{store.name}</span>
                <span className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ${selectedStoreId === store.id ? 'opacity-100 text-indigo-400' : 'text-slate-400'}`}>
                    {store.records.length}
                </span>
              </button>
            ))}
            {stores.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 italic">No structured data found.</div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
           <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
              <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    {selectedStore?.name || 'Select a Store'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedStore?.id}</p>
              </div>
              <div className="flex items-center gap-2">
                  {selectedStore && (
                    <button 
                        onClick={() => setConfirmStoreDelete(selectedStore.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Delete this entire table"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete Table
                    </button>
                  )}
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
           </div>
           
           <div className="flex-1 overflow-auto bg-slate-50/30">
              {selectedStore ? (
                  <div className="min-w-max p-6">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {Object.keys(selectedStore.schema).map(key => (
                                        <th key={key} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 border-r border-slate-100 last:border-0">
                                            <div className="flex items-center gap-2">
                                                {key}
                                                <span className="text-[8px] font-mono font-normal normal-case text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                                    {selectedStore.schema[key]}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 w-12 text-center">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedStore.records.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                        {Object.keys(selectedStore.schema).map(key => {
                                            const isEditing = editingCell?.rowId === record.id && editingCell?.colKey === key;
                                            const val = record[key];
                                            return (
                                                <td 
                                                    key={key} 
                                                    className={`px-4 py-2.5 text-xs text-slate-700 border-r border-slate-50 last:border-0 font-mono ${!isEditing ? 'cursor-pointer hover:bg-indigo-100/50' : ''}`}
                                                    onClick={() => {
                                                        if (!isEditing) {
                                                            setEditingCell({
                                                                rowId: record.id,
                                                                colKey: key,
                                                                value: String(val ?? '')
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {isEditing ? (
                                                        <input 
                                                            ref={inputRef}
                                                            className="w-full bg-white border border-indigo-500 rounded px-2 py-1 outline-none shadow-sm text-xs"
                                                            value={editingCell!.value}
                                                            onChange={(e) => setEditingCell({ ...editingCell!, value: e.target.value })}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={handleKeyDown}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div className="truncate max-w-[200px]" title={String(val ?? '')}>
                                                            {String(val ?? '-')}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2.5 text-center">
                                            <button 
                                                onClick={() => setConfirmRowDelete({ storeId: selectedStore.id, rowId: record.id })}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete this row"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {selectedStore.records.length === 0 && (
                            <div className="p-12 text-center text-slate-400 text-xs italic">
                                This table is currently empty.
                            </div>
                        )}
                    </div>
                  </div>
              ) : (
                  <div className="flex items-center justify-center h-full text-slate-300">
                      <div className="text-center max-w-xs">
                          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                          <p className="font-medium text-slate-400">No Data Store Selected</p>
                          <p className="text-xs mt-1">Select a table from the sidebar to inspect the structured data backing your project.</p>
                      </div>
                  </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};