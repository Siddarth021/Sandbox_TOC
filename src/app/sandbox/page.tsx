'use client';
import { useState, useMemo, useEffect } from 'react';
import VisualMachineEditor from '@/components/VisualMachineEditor';
import FormalTupleEditor from '@/components/FormalTupleEditor';
import { useUser } from "@clerk/nextjs";
import { MachineType, MachineDefinition, SimulationResult } from '@/types/computation';

const BOILERPLATES: Record<string, any> = {
  DFA: {
    states: ["q0", "q1"],
    alphabet: ["0", "1"],
    start_state: "q0",
    accept_states: ["q1"],
    transitions: {
      q0: { "0": "q0", "1": "q1" },
      q1: { "0": "q1", "1": "q0" }
    }
  },
  NFA: {
    states: ["q0", "q1", "q2"],
    alphabet: ["0", "1"],
    start_state: "q0",
    accept_states: ["q2"],
    transitions: {
      q0: { "0": ["q0", "q1"], "1": ["q0"] },
      q1: { "1": ["q2"] },
      q2: {}
    }
  },
  PDA: {
    states: ["q0", "q1", "q2"],
    alphabet: ["a", "b"],
    stack_alphabet: ["Z", "A"],
    start_state: "q0",
    start_stack_symbol: "Z",
    accept_states: ["q2"],
    transitions: [
      { from_state: "q0", input_symbol: "a", stack_pop: "Z", to_state: "q0", stack_push: "AZ" },
      { from_state: "q0", input_symbol: "a", stack_pop: "A", to_state: "q0", stack_push: "AA" },
      { from_state: "q0", input_symbol: "b", stack_pop: "A", to_state: "q1", stack_push: "" },
      { from_state: "q1", input_symbol: "b", stack_pop: "A", to_state: "q1", stack_push: "" },
      { from_state: "q1", input_symbol: "", stack_pop: "Z", to_state: "q2", stack_push: "Z" }
    ]
  },
  TM: {
    states: ["q0", "q1", "q_acc", "q_rej"],
    alphabet: ["0", "1"],
    tape_symbols: ["0", "1", "_"],
    start_state: "q0",
    accept_state: "q_acc",
    transitions: {
      q0: {
        "0": { write: "1", move: "R", next: "q1" },
        "1": { write: "0", move: "R", next: "q1" },
        "_": { write: "_", move: "L", next: "q_acc" }
      },
      q1: {
        "0": { write: "0", move: "R", next: "q0" },
        "1": { write: "1", move: "R", next: "q0" },
        "_": { write: "_", move: "L", next: "q_acc" }
      }
    }
  },
  CFG: {
    non_terminals: ["S", "A"],
    terminals: ["a", "b"],
    start_symbol: "S",
    productions: {
      S: ["aSb", "A"],
      A: ["ε"]
    }
  }
};

export default function Sandbox() {
  const { user } = useUser();
  const [modelType, setModelType] = useState<MachineType | string>('DFA');
  const [modelName, setModelName] = useState('My New DFA');
  const [definition, setDefinition] = useState<MachineDefinition>(BOILERPLATES.DFA);
  const [inputStr, setInputStr] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  
  // Playback state
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleModelTypeChange = (type: string) => {
    setModelType(type);
    setDefinition(BOILERPLATES[type]);
    setModelName(`My New ${type}`);
    setResult(null);
  };

  // Handle auto-playback
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && result?.path && stepIndex < result.path.length - 1) {
      timer = setTimeout(() => {
        setStepIndex(prev => prev + 1);
      }, 800);
    } else if (stepIndex >= (result?.path?.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, result]);

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    setStepIndex(0);
    setIsPlaying(false);
    
    try {
      // First, create a temporary model for simulation
      const createRes = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Simulation ${modelType}`,
          type: modelType,
          definition: definition,
          user_id: user?.id
        })
      });
      const model = await createRes.json();
      
      const simRes = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: model.id,
          input_string: inputStr,
          user_id: user?.id
        })
      });
      const simData = await simRes.json();
      setResult(simData);
    } catch (err) {
      alert("Simulation failed: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modelName,
          type: modelType,
          definition: definition,
          user_id: user?.id
        })
      });
      alert("Model saved successfully!");
    } catch (err) {
      alert("Failed to save: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentActiveStates = useMemo(() => {
    if (!result?.path || stepIndex >= result.path.length) return [];
    const step = result.path[stepIndex];
    return Array.isArray(step) ? step : [step];
  }, [result, stepIndex]);

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end border-b border-[#e8e8e1] pb-8">
        <div>
          <h2 className="text-4xl font-serif font-light text-[#1c1c1c] tracking-tight">The Laboratory</h2>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mt-2 font-medium">Experiment with computational models</p>
        </div>
        <div className="flex items-center gap-6">
          <input 
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="input-field w-64 text-sm"
            placeholder="COLLECTION NAME"
          />
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? "Saving..." : "Save Model"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12">
        {/* Editor & Visualizer Combined */}
        <div className="space-y-6">
           <div className="flex items-center justify-between border-b border-[#e8e8e1] pb-4">
              <div className="flex items-center gap-8">
                <h3 className="text-lg font-serif font-semibold text-[#1c1c1c]">Machine Definition</h3>
                <div className="flex bg-gray-50 border border-[#e8e8e1] p-1">
                  <button 
                    onClick={() => setViewMode('visual')}
                    className={`px-4 py-1 text-[10px] uppercase tracking-widest font-semibold transition-all ${viewMode === 'visual' ? 'bg-[#c5a028] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Formal Tuple
                  </button>
                  <button 
                    onClick={() => setViewMode('code')}
                    className={`px-4 py-1 text-[10px] uppercase tracking-widest font-semibold transition-all ${viewMode === 'code' ? 'bg-[#c5a028] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    JSON Source
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Architecture:</span>
                <select 
                  value={modelType} 
                  onChange={(e) => handleModelTypeChange(e.target.value)}
                  className="bg-white border-0 text-[10px] uppercase tracking-widest font-bold text-[#c5a028] outline-none cursor-pointer"
                >
                  <option>DFA</option>
                  <option>NFA</option>
                  <option>PDA</option>
                  <option>TM</option>
                  <option>CFG</option>
                </select>
              </div>
           </div>

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="bg-white border border-[#e8e8e1] p-10 min-h-[600px]">
                {viewMode === 'visual' ? (
                  <FormalTupleEditor 
                    type={modelType}
                    definition={definition}
                    onChange={setDefinition}
                    onValidationError={setValidationErrors}
                  />
                ) : (
                  <textarea
                    value={JSON.stringify(definition, null, 2)}
                    onChange={(e) => {
                      try {
                        setDefinition(JSON.parse(e.target.value));
                      } catch (err) {}
                    }}
                    className="w-full h-full bg-[#fdfdfc] p-8 font-mono text-xs text-gray-700 outline-none resize-none"
                  />
                )}
              </div>

              <div className="relative">
                <VisualMachineEditor 
                  type={modelType}
                  initialDefinition={definition}
                  onChange={setDefinition}
                  activeStates={currentActiveStates}
                  readOnly={true}
                />
                
                {result?.path && (
                  <div className="absolute top-6 left-6 flex items-center gap-4 bg-white/90 backdrop-blur-md p-3 border border-[#e8e8e1] shadow-sm z-10">
                    <button onClick={() => setStepIndex(0)} className="text-gray-400 hover:text-[#c5a028] transition-colors">⏮</button>
                    <button 
                      onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
                      className="text-gray-400 hover:text-[#c5a028] transition-colors"
                    >◀</button>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-[#c5a028] font-bold text-lg"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button 
                      onClick={() => setStepIndex(Math.min((result.path.length-1), stepIndex + 1))}
                      className="text-gray-400 hover:text-[#c5a028] transition-colors"
                    >▶</button>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 min-w-20 text-center">
                      Step {stepIndex + 1} / {result.path.length}
                    </span>
                  </div>
                )}
              </div>
           </div>

        </div>

        {/* Simulation Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-lg font-serif font-semibold text-[#1c1c1c] border-b border-[#e8e8e1] pb-4">Simulation</h3>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Input Sequence</label>
                  <input 
                    type="text" 
                    value={inputStr}
                    onChange={(e) => setInputStr(e.target.value)}
                    placeholder="ENTER SEQUENCE..."
                    className="input-field"
                  />
                </div>
                <button 
                  onClick={handleSimulate}
                  disabled={loading || !inputStr || validationErrors.length > 0}
                  className={`btn-primary w-full py-4 tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${validationErrors.length > 0 ? 'opacity-50 cursor-not-allowed bg-gray-300' : ''}`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : validationErrors.length > 0 ? (
                    'INVALID ARCHITECTURE'
                  ) : (
                    'RUN TEST'
                  )}
                </button>
                
                {validationErrors.length > 0 && (
                   <div className="p-3 bg-red-50 border border-red-100 rounded flex gap-2 items-start">
                     <span className="text-red-400">⚠️</span>
                     <p className="text-[9px] text-red-700 uppercase leading-tight font-bold">
                       Simulation locked: Resolve formal errors in the tuple editor to enable processing.
                     </p>
                   </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
               {result ? (
                <div className="bg-white border border-[#e8e8e1] p-8 space-y-6 animate-in fade-in duration-700">
                  <div className="flex justify-between items-center border-b border-[#e8e8e1] pb-4">
                    <h3 className="text-xl font-serif font-medium uppercase tracking-widest">
                      Status: <span className={result.accepted ? 'text-[#c5a028]' : 'text-red-800'}>
                        {result.accepted ? 'ACCEPTED' : 'REJECTED'}
                      </span>
                    </h3>
                    <div className="h-2 w-2 rounded-full bg-[#c5a028] animate-pulse"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 text-[11px] uppercase tracking-widest font-medium text-gray-500">
                    <div className="space-y-4">
                      <p>Sequence: <span className="text-[#1c1c1c] block mt-1 font-bold">{inputStr || "ε"}</span></p>
                      <p>Final State: <span className="text-[#1c1c1c] block mt-1 font-bold">{Array.isArray(result.final_states) ? result.final_states.join(', ') : result.final_state || "Unknown"}</span></p>
                    </div>
                    <div className="space-y-4">
                      <p>Computational Steps: <span className="text-[#1c1c1c] block mt-1 font-bold">{result.steps}</span></p>
                      {result.tape && <p>Tape Final State: <span className="text-[#1c1c1c] block mt-1 font-bold truncate">{result.tape}</span></p>}
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="p-4 bg-red-50 text-red-800 text-[10px] uppercase tracking-widest border border-red-100">
                      Exception: {result.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-[#e8e8e1] p-12 text-center">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-gray-300 font-medium">Awaiting Sequence Input</p>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}

