'use client';
 
import { useState, useEffect } from 'react';
import { MachineType, MachineDefinition } from '@/types/computation';
import { StorageService, SavedModel } from '@/utils/storage';

export default function Complexity() {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [inputStr, setInputStr] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const localModels = StorageService.getModels();
    const tms = localModels.filter((m: SavedModel) => m.type === 'TM');
    setModels(tms);
    if (tms.length > 0) setSelectedModelId(tms[0].id);
  }, []);

  const handleAnalyze = async () => {
    const model = models.find(m => m.id === selectedModelId);
    if (!model) {
      alert("Please select a valid Turing Machine from your archive.");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition: model.definition,
          input_string: inputStr,
          type: 'TM'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data);
    } catch (e: any) {
      alert("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-[#e8e8e1] pb-8">
        <h2 className="text-4xl font-serif font-light text-[#1c1c1c] tracking-tight">Complexity Studio</h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mt-2 font-medium">Measure the efficiency of computational thought</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="bg-white border border-[#e8e8e1] p-12 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Select Turing Machine</label>
            <select 
              className="w-full input-field text-xs uppercase tracking-widest font-bold"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
            >
              <option value="">Choose from Archive...</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {models.length === 0 && (
              <p className="text-[9px] text-red-400 uppercase font-bold mt-2">No Turing Machines found in your local archive. Create one in the Laboratory first.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Input Sequence</label>
            <input 
              type="text" 
              className="w-full input-field"
              value={inputStr}
              placeholder="ENTER SEQUENCE..."
              onChange={(e) => setInputStr(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={loading || !selectedModelId}
            className="btn-primary w-full"
          >
            {loading ? "QUANTIFYING..." : "ANALYZE PERFORMANCE"}
          </button>
        </div>

        <div>
          {analysis ? (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="bg-[#fdfdfc] p-10 border border-[#e8e8e1]">
                <span className="text-[10px] text-[#c5a028] uppercase tracking-[0.3em] font-bold border-b border-[#c5a028]/20 pb-2 block mb-4">Time Complexity</span>
                <p className="text-5xl font-serif text-[#1c1c1c] mb-2">{analysis.time_complexity_estimate}</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-0.5 w-8 bg-[#c5a028]"></div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{analysis.steps} COMPUTATIONAL STEPS</p>
                </div>
              </div>
              
              <div className="bg-[#fdfdfc] p-10 border border-[#e8e8e1]">
                <span className="text-[10px] text-[#c5a028] uppercase tracking-[0.3em] font-bold border-b border-[#c5a028]/20 pb-2 block mb-4">Space Complexity</span>
                <p className="text-5xl font-serif text-[#1c1c1c] mb-2">{analysis.space_complexity_estimate}</p>
                 <div className="flex items-center gap-3 mt-4">
                  <div className="h-0.5 w-8 bg-[#c5a028]"></div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{analysis.tape_usage} TAPE CELLS UTILIZED</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#e8e8e1] p-20 text-center opacity-40">
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Awaiting Execution Data</p>
              <p className="text-[9px] text-gray-300 mt-2 uppercase">Big O analysis will be performed based on real-world trace</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
