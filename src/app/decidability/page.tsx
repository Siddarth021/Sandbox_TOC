'use client';

import { useState } from 'react';

const problems = [
  "Halting Problem",
  "Language Emptiness (DFA)",
  "Language Emptiness (TM)",
  "Membership (DFA)",
  "Membership (TM)"
];

export default function Decidability() {
  const [selected, setSelected] = useState(problems[0]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/decidability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_type: selected })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-[#e8e8e1] pb-8">
        <h2 className="text-4xl font-serif font-light text-[#1c1c1c] tracking-tight">Decidability Archive</h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mt-2 font-medium">Classify the boundaries of effective calculability</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Select Problem Case</label>
            <div className="grid grid-cols-1 border border-[#e8e8e1]">
              {problems.map(p => (
                <button 
                  key={p}
                  onClick={() => { setSelected(p); setResult(null); }}
                  className={`text-left px-6 py-4 border-b border-[#e8e8e1] last:border-b-0 transition-all font-serif text-sm ${selected === p ? 'bg-[#c5a028] text-white' : 'bg-white text-[#1c1c1c] hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCheck} className="btn-primary w-full">
            {loading ? "CONSULTING ARCHIVE..." : "GET THEORETICAL ANALYSIS"}
          </button>
        </div>

        <div>
          {result ? (
            <div className="bg-[#fdfdfc] border border-[#e8e8e1] p-10 space-y-8 animate-in fade-in duration-1000">
              <div className="flex items-center justify-between border-b border-[#e8e8e1] pb-6">
                <div>
                  <h4 className="text-2xl font-serif font-medium text-[#1c1c1c]">{selected}</h4>
                  <p className="text-[8px] uppercase tracking-[0.3em] text-gray-400 mt-1 font-bold">Formal Problem Classification</p>
                </div>
                <div className={`px-4 py-1 text-[10px] uppercase tracking-widest font-bold border ${
                  result.status === 'Decidable' ? 'border-green-200 text-green-700 bg-green-50' : 
                  result.status === 'Undecidable' ? 'border-red-200 text-red-800 bg-red-50' : 
                  'border-[#c5a028]/30 text-[#c5a028] bg-yellow-50'
                }`}>
                  {result.status}
                </div>
              </div>
              
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest text-[#c5a028] font-bold">Theoretical Foundation</span>
                <p className="text-sm text-gray-600 leading-relaxed italic font-serif">
                  "{result.explanation}"
                </p>
              </div>
              
              <div className="pt-4 flex justify-end">
                <div className="h-10 w-10 border-r border-b border-[#c5a028]/20"></div>
              </div>
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#e8e8e1] p-20 text-center opacity-40">
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Awaiting Selection</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

