'use client';
 
import { useState } from 'react';

export default function UTM() {
  const [machineDef, setMachineDef] = useState('{\n  "states": ["q0", "q_accept"],\n  "alphabet": ["1"],\n  "tape_symbols": ["1", "_"],\n  "start_state": "q0",\n  "accept_state": "q_accept",\n  "transitions": {\n    "q0": {"1": {"write": "1", "move": "R", "next": "q_accept"}}\n  }\n}');
  const [inputStr, setInputStr] = useState('1');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleRunUTM = async () => {
    setLoading(true);
    setResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(machineDef);
      } catch (e) {
        throw new Error("Invalid JSON in machine specification.");
      }

      const res = await fetch('/api/utm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_definition: parsed,
          input_string: inputStr
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Emulation failed");
      setResult(data);
    } catch (err: any) {
      alert("UTM Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-[#e8e8e1] pb-8">
        <h2 className="text-4xl font-serif font-light text-[#1c1c1c] tracking-tight">The Universal Machine</h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mt-2 font-medium">A simulator for the Church-Turing Thesis</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <label className="text-[10px] tracking-[0.3em] text-[#c5a028] font-bold uppercase">Machine Specification ⟨M⟩</label>
            <span className="text-[9px] text-gray-300 font-bold uppercase">JSON Formalism</span>
          </div>
          <textarea
            value={machineDef}
            onChange={(e) => setMachineDef(e.target.value)}
            className="w-full h-[550px] bg-[#fdfdfc] border border-[#e8e8e1] p-8 font-mono text-[11px] text-gray-600 outline-none focus:border-[#c5a028] transition-all shadow-inner resize-none leading-relaxed"
          />
        </div>

        <div className="space-y-12">
          <div className="bg-white border border-[#e8e8e1] p-10 space-y-8 shadow-sm">
            <div className="space-y-4">
               <label className="text-[10px] tracking-[0.3em] text-[#c5a028] font-bold uppercase font-serif">Input Sequence ⟨w⟩</label>
               <input 
                  type="text" 
                  value={inputStr}
                  onChange={(e) => setInputStr(e.target.value)}
                  className="w-full input-field"
                  placeholder="Tape contents..."
               />
            </div>
            <button 
              onClick={handleRunUTM}
              className="btn-primary w-full py-4 tracking-[0.2em]"
              disabled={loading}
            >
              {loading ? "EMULATING..." : "GENERATE COMPUTATION ⟨M, w⟩"}
            </button>
          </div>

          {result && (
            <div className="bg-[#fdfdfc] border border-[#e8e8e1] p-10 space-y-10 animate-in slide-in-from-right-4 duration-700">
              <div className="border-b border-[#e8e8e1] pb-4">
                 <h3 className="text-2xl font-serif text-[#1c1c1c]">Emulation Result</h3>
                 <p className="text-[8px] uppercase tracking-widest text-[#c5a028] font-bold mt-1">Universal Engine Diagnostic</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest border-b border-[#e8e8e1] pb-3">
                  <span className="text-gray-400 font-bold">Status</span>
                  <span className={`font-bold ${result.accepted ? 'text-[#c5a028]' : 'text-red-800'}`}>
                    {result.accepted ? 'ACCEPTED' : (result.halted ? 'HALTED' : 'REJECTED')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest border-b border-[#e8e8e1] pb-3">
                  <span className="text-gray-400 font-bold">Clock Cycles</span>
                  <span className="text-[#1c1c1c] font-mono font-bold">{result.steps}</span>
                </div>
                
                <div className="space-y-4 pt-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a028] font-bold">Final Tape State</span>
                  <div className="bg-white border border-[#e8e8e1] p-6 text-[#1c1c1c] font-mono text-sm tracking-[0.4em] text-center shadow-inner overflow-x-auto whitespace-nowrap">
                    {result.tape || 'Empty'}
                  </div>
                </div>
                
                {result.error && (
                  <div className="p-4 bg-red-50 text-red-800 text-[10px] uppercase font-bold tracking-widest">
                    Halt Error: {result.error}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!result && (
            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-[#e8e8e1] p-10 text-center opacity-30">
               <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Awaiting Universal Parameters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
