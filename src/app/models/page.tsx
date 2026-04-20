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
          <h3 className="text-lg font-serif font-semibold text-[#1c1c1c] border-b border-[#e8e8e1] pb-4">Conversion Output</h3>
          {conversionResult ? (
            <div className="bg-[#fdfdfc] border border-[#e8e8e1] p-10 overflow-auto max-h-[600px] animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e8e8e1]">
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#c5a028] uppercase">Derived Definition</span>
                <button onClick={() => setConversionResult(null)} className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors">Dismiss</button>
              </div>
              <pre className="text-[11px] text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(conversionResult, null, 2)}
              </pre>
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
