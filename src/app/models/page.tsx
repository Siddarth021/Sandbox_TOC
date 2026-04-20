'use client';
 
import { useState, useEffect } from 'react';
import { MachineType, MachineDefinition, TransformationResult } from '@/types/computation';
import { StorageService, SavedModel } from '@/utils/storage';
import Link from 'next/link';

export default function Models() {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [targetType, setTargetType] = useState<string>('');
  const [conversionResult, setConversionResult] = useState<TransformationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'analysis' | 'json'>('analysis');

  // Load from LocalStorage
  useEffect(() => {
    setModels(StorageService.getModels());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this model from your local archive?")) {
      StorageService.deleteModel(id);
      setModels(StorageService.getModels());
    }
  };

  const handleConvert = async (model: SavedModel) => {
    if (!targetType) {
      alert("Please select a target formalism for conversion.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: model.type,
          definition: model.definition,
          target_type: targetType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Conversion Failed");
      setConversionResult(data);
    } catch (err) {
      alert("Conversion Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-[#e8e8e1] pb-8">
        <h2 className="text-4xl font-serif font-light text-[#1c1c1c] tracking-tight">Theory Archive</h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mt-2 font-medium">Manage collections and perform formal conversions</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
        <div className="space-y-8">
          <h3 className="text-lg font-serif font-semibold text-[#1c1c1c] border-b border-[#e8e8e1] pb-4">Saved Collections</h3>
          <div className="grid grid-cols-1 border border-[#e8e8e1]">
            {models.length === 0 && (
              <div className="p-12 text-center">
                 <p className="text-[10px] uppercase tracking-widest text-gray-300 font-bold italic">The archive is currently empty</p>
              </div>
            )}
            {models.map(m => (
              <div key={m.id} className="p-6 border-b border-[#e8e8e1] last:border-b-0 flex items-center justify-between group bg-white hover:bg-gray-50 transition-colors">
                <div>
                  <h4 className="font-serif text-lg text-[#1c1c1c]">{m.name}</h4>
                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#c5a028]">{m.type}</span>
                </div>
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <select 
                    className="bg-white text-[10px] uppercase tracking-widest font-bold border border-[#e8e8e1] px-3 py-1 outline-none text-gray-500 focus:border-[#c5a028]"
                    onChange={(e) => setTargetType(e.target.value)}
                  >
                    <option value="">FORMALISM</option>
                    {m.type === 'NFA' && <option value="DFA">To DFA</option>}
                    {m.type === 'DFA' && <option value="REGEX">To RegEx</option>}
                    {m.type === 'CFG' && <option value="PDA">To PDA</option>}
                    {m.type === 'PDA' && <option value="CFG">To CFG</option>}
                  </select>
                  <button 
                    onClick={() => handleConvert(m)}
                    className="btn-primary py-1 px-4"
                  >
                    {loading ? "..." : "Convert"}
                  </button>
                  <Link 
                    href={`/sandbox?id=${m.id}`}
                    className="text-[10px] uppercase tracking-widest font-bold text-[#c5a028] hover:underline"
                  >
                    Load
                  </Link>
                  <button 
                    onClick={() => handleDelete(m.id)}
                    className="text-red-300 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-[#e8e8e1] pb-4">
            <h3 className="text-lg font-serif font-semibold text-[#1c1c1c]">Derivation Insight</h3>
            {conversionResult && (
              <div className="flex bg-gray-50 border border-[#e8e8e1] p-0.5">
                <button 
                  onClick={() => setViewMode('analysis')}
                  className={`px-3 py-0.5 text-[9px] uppercase tracking-widest font-bold transition-all ${viewMode === 'analysis' ? 'bg-[#c5a028] text-white' : 'text-gray-400'}`}
                >
                  Analysis
                </button>
                <button 
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-0.5 text-[9px] uppercase tracking-widest font-bold transition-all ${viewMode === 'json' ? 'bg-[#c5a028] text-white' : 'text-gray-400'}`}
                >
                  Raw JSON
                </button>
              </div>
            )}
          </div>

          {conversionResult ? (
            <div className="bg-[#fdfdfc] border border-[#e8e8e1] p-10 min-h-[400px] animate-in slide-in-from-bottom-4 duration-500 overflow-auto">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e8e8e1]">
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#c5a028] uppercase">Formal Result</span>
                <button onClick={() => setConversionResult(null)} className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors">Dismiss</button>
              </div>

              {viewMode === 'json' ? (
                <pre className="text-[11px] text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(conversionResult, null, 2)}
                </pre>
              ) : (
                <div className="space-y-8 font-serif">
                   {/* Targeted Formatting for Written Analysis */}
                   {conversionResult.regex ? (
                     <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 block">Identified Regular Expression</label>
                        <div className="text-3xl text-[#1c1c1c] break-all border-y border-[#f0f0eb] py-8 my-4 bg-[#fdfdfc] text-center font-serif italic tracking-wider">
                           {conversionResult.regex}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed text-center max-w-md mx-auto">
                           Optimized formal expression derived via state elimination. Redundant transitions and identity elements have been algebraically pruned for clarity.
                        </p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        {conversionResult.states && (
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 block mb-2">Automaton Tuple (K, Σ, δ, q₀, F)</label>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                               <div className="p-3 bg-white border border-[#f0f0eb]">
                                 <span className="text-gray-400 block mb-1">States (K)</span>
                                 <span className="font-bold">{conversionResult.states.join(', ')}</span>
                               </div>
                               <div className="p-3 bg-white border border-[#f0f0eb]">
                                 <span className="text-gray-400 block mb-1">Accept (F)</span>
                                 <span className="font-bold text-[#c5a028]">
                                   {Array.isArray(conversionResult.accept_states) 
                                     ? conversionResult.accept_states.join(', ') 
                                     : conversionResult.accept_state || 'None'}
                                 </span>
                               </div>
                            </div>
                          </div>
                        )}
                        
                        {conversionResult.non_terminals && (
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 block mb-2">Grammar Tuple (V, Σ, R, S)</label>
                            <div className="space-y-4">
                               {Object.entries(conversionResult.productions || {}).map(([nt, rules]: [string, string[]]) => (
                                 <div key={nt} className="flex gap-4 items-baseline text-sm border-b border-[#f8f8f2] pb-1">
                                    <span className="font-bold text-[#c5a028] min-w-8">{nt}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-medium text-gray-800 italic">{(rules as string[]).join(' | ')}</span>
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}

                        <p className="text-[10px] uppercase tracking-widest text-gray-400 text-center pt-8 italic">
                          See RAW JSON for full transition delta mapping
                        </p>
                     </div>
                   )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#e8e8e1] p-12 text-center opacity-40">
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Select a model to initialize derivation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
