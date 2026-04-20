'use client';

import { useState, useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import { MachineType, MachineDefinition } from '@/types/computation';

export default function Complexity() {
  const { user } = useUser();
  const [models, setModels] = useState<({ id: number, name: string, type: MachineType, definition: MachineDefinition })[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [inputStr, setInputStr] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = user?.id ? `/api/models?user_id=${user.id}` : '/api/models';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const tms = data.filter((m: any) => m.type === 'TM');
        setModels(tms);
        if (tms.length > 0) setSelectedModel(tms[0].id);
      });
  }, [user]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: selectedModel,
          input_string: inputStr,
          user_id: user?.id
        })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      alert("Analysis failed.");
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
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
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
            disabled={loading}
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
                <p className="text-5xl font-serif text-[#1c1c1c] mb-2">{analysis.time_complexity_est}</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-0.5 w-8 bg-[#c5a028]"></div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{analysis.steps} COMPUTATIONAL STEPS</p>
                </div>
              </div>
              
              <div className="bg-[#fdfdfc] p-10 border border-[#e8e8e1]">
                <span className="text-[10px] text-[#c5a028] uppercase tracking-[0.3em] font-bold border-b border-[#c5a028]/20 pb-2 block mb-4">Space Complexity</span>
                <p className="text-5xl font-serif text-[#1c1c1c] mb-2">{analysis.space_complexity_est}</p>
                 <div className="flex items-center gap-3 mt-4">
                  <div className="h-0.5 w-8 bg-[#c5a028]"></div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{analysis.space_usage} TAPE CELLS UTILIZED</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#e8e8e1] p-20 text-center opacity-40">
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Awaiting Execution Data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

