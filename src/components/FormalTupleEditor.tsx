'use client';
import { MachineType, MachineDefinition } from '@/types/computation';

import React, { useState, useEffect } from 'react';

interface FormalTupleEditorProps {
  type: MachineType | string;
  definition: MachineDefinition;
  onChange: (definition: MachineDefinition) => void;
  onValidationError?: (errors: string[]) => void;
}

export default function FormalTupleEditor({ type, definition, onChange, onValidationError }: FormalTupleEditorProps) {
  const [localDef, setLocalDef] = useState<MachineDefinition>(definition);

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setLocalDef(definition);
    validate(definition);
  }, [definition]);

  const validate = (def: MachineDefinition) => {
    const errs: string[] = [];
    if (type === 'DFA') {
      const seen = new Set<string>();
      const transitions = Array.isArray(def.transitions) ? def.transitions : 
                          Object.entries(def.transitions || {}).flatMap(([from, transMap]: [string, any]) => 
                            Object.entries(transMap).map(([symbol, target]) => ({ from, symbol, target }))
                          );

      transitions.forEach((t: any) => {
        const key = `${t.from}-${t.symbol}`;
        if (seen.has(key)) {
          errs.push(`Determinism Violation: Multiple transitions for (${t.from}, ${t.symbol})`);
        }
        seen.add(key);
      });
    }
    setErrors(Array.from(new Set(errs)));
  };

  useEffect(() => {
    if (onValidationError) onValidationError(errors);
  }, [errors]);

  const updateField = (field: string, value: any) => {
    let finalValue = value;
    
    // Convert editing list back to canonical object for Sandbox/Backend if needed
    if (field === 'transitions' && Array.isArray(value)) {
      if (type === 'DFA' || type === 'TM') {
        const obj: any = {};
        value.forEach((t: any) => {
          if (!obj[t.from]) obj[t.from] = {};
          if (type === 'TM') {
            obj[t.from][t.symbol] = { write: t.write, move: t.move, next: t.target };
          } else {
            obj[t.from][t.symbol] = t.target;
          }
        });
        finalValue = obj;
      }
    }

    const updated = { ...localDef, [field]: finalValue };
    setLocalDef(updated);
    onChange(updated);
  };

  const handleListChange = (field: string, value: string) => {
    const list = value.split(/[,\s]+/).map(s => s.trim()).filter(s => s !== "");
    updateField(field, list);
  };

  const getTransitionList = () => {
    if (Array.isArray(localDef.transitions)) return localDef.transitions;
    // Convert object format to edit-friendly list
    const transitions = localDef.transitions as Record<string, Record<string, string | string[]>>;
    return Object.entries(transitions || {}).flatMap(([from, transMap]) => 
      Object.entries(transMap).map(([symbol, target]) => ({ from, symbol, target }))
    );
  };

  const addTransition = () => {
    const current = getTransitionList();
    const q = localDef.states[0] || 'q0';
    const newList = [...current, { from: q, symbol: '0', target: q }];
    updateField('transitions', newList);
  };

  const updateTransitionRow = (index: number, updates: any) => {
    const current = getTransitionList();
    const newList = [...current];
    newList[index] = { ...newList[index], ...updates };
    
    // Auto-sync alphabet
    if (updates.symbol && !localDef.alphabet.includes(updates.symbol)) {
       updateField('alphabet', [...localDef.alphabet, updates.symbol]);
    }
    
    updateField('transitions', newList);
  };

  const removeTransitionRow = (index: number) => {
    const current = getTransitionList();
    const newList = current.filter((_: any, i: number) => i !== index);
    updateField('transitions', newList);
  };

  const updateTMTransition = (from: string, read: string, field: string, value: string) => {
    const transitions = { ...localDef.transitions } as any;
    if (!transitions[from]) transitions[from] = {};
    if (!transitions[from][read]) transitions[from][read] = { next: from, write: read, move: 'R' };
    
    transitions[from][read][field] = value;
    updateField('transitions', transitions);
  };

  const renderFSMTransitions = () => {
    const list = getTransitionList();
    const seen = new Set<string>();

    return (
      <div className="space-y-4">
        {list.map((t: any, idx: number) => {
          const key = `${t.from}-${t.symbol}`;
          const isInvalid = type === 'DFA' && seen.has(key);
          seen.add(key);

          return (
            <div key={idx} className={`grid grid-cols-4 gap-4 items-center bg-[#fdfdfc] border p-4 transition-all ${isInvalid ? 'border-red-200 bg-red-50/30' : 'border-[#e8e8e1]'}`}>
              <select 
                value={t.from} 
                onChange={(e) => updateTransitionRow(idx, { from: e.target.value })}
                className="input-field text-xs"
              >
                {localDef.states.map((s: string) => <option key={s}>{s}</option>)}
              </select>
              <input 
                value={t.symbol} 
                onChange={(e) => updateTransitionRow(idx, { symbol: e.target.value })}
                className="input-field text-xs text-center"
                placeholder="Symbol"
              />
              <select 
                value={Array.isArray(t.target) ? t.target[0] : t.target}
                onChange={(e) => updateTransitionRow(idx, { target: type === 'NFA' ? [e.target.value] : e.target.value })}
                className="input-field text-xs"
              >
                {localDef.states.map((s: string) => <option key={s}>{s}</option>)}
              </select>
              <button 
                onClick={() => removeTransitionRow(idx)} 
                className="text-red-400 text-[10px] uppercase font-bold text-right hover:text-red-600"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    );
  };


  const renderTMTransitions = () => (
    <div className="space-y-4">
       {Object.entries(localDef.transitions || {}).map(([from, transMap]: [string, any]) => (
        Object.entries(transMap).map(([read, action]: [string, any]) => (
          <div key={`${from}-${read}`} className="grid grid-cols-6 gap-2 items-center bg-[#fdfdfc] border border-[#e8e8e1] p-4">
            <select value={from} onChange={(e) => {/* Swap keys logic */}} className="input-field text-[10px]">
              {localDef.states.map((s: string) => <option key={s}>{s}</option>)}
            </select>
            <input value={read} className="input-field text-[10px] text-center" />
            <span className="text-gray-300 text-center">→</span>
            <select value={action.next} onChange={(e) => updateTMTransition(from, read, 'next', e.target.value)} className="input-field text-[10px]">
              {localDef.states.map((s: string) => <option key={s}>{s}</option>)}
            </select>
            <input value={action.write} onChange={(e) => updateTMTransition(from, read, 'write', e.target.value)} className="input-field text-[10px] text-center" />
            <select value={action.move} onChange={(e) => updateTMTransition(from, read, 'move', e.target.value)} className="input-field text-[10px]">
              <option>R</option>
              <option>L</option>
            </select>
          </div>
        ))
      ))}
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 animate-bounce-subtle">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-red-800">
                Machine Architecture Error: {errors[0]}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="border-b border-[#e8e8e1] pb-2">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a028]">State Set (Q)</h4>
          </div>
          <input 
            className="input-field w-full font-serif text-sm tracking-widest"
            value={localDef.states?.join(', ')}
            onChange={(e) => handleListChange('states', e.target.value)}
            placeholder="e.g. q0, q1, q2"
          />
          <p className="text-[8px] uppercase tracking-widest text-gray-400 italic">Common-separated list of all possible conditions</p>
        </div>

        <div className="space-y-6">
          <div className="border-b border-[#e8e8e1] pb-2">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a028]">Input Alphabet (Σ)</h4>
          </div>
          <input 
            className="input-field w-full font-serif text-sm tracking-widest"
            value={(localDef.alphabet || localDef.terminals || [])?.join(', ')}
            onChange={(e) => handleListChange(type === 'CFG' ? 'terminals' : 'alphabet', e.target.value)}
            placeholder="e.g. 0, 1, a, b"
          />
           <p className="text-[8px] uppercase tracking-widest text-gray-400 italic">Symbols valid for processing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="border-b border-[#e8e8e1] pb-2">
             <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a028]">Designation</h4>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Start State (q₀)</label>
              <select 
                value={localDef.start_state || localDef.start_symbol} 
                onChange={(e) => updateField(type === 'CFG' ? 'start_symbol' : 'start_state', e.target.value)}
                className="input-field w-full text-xs"
              >
                 {(localDef.states || localDef.non_terminals || []).map((s: string) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Acceptance (F)</label>
               {type === 'TM' ? (
                  <select 
                    value={localDef.accept_state} 
                    onChange={(e) => updateField('accept_state', e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    {localDef.states.map((s: string) => <option key={s}>{s}</option>)}
                  </select>
               ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                     {(localDef.states || []).map((s: string) => (
                       <label key={s} className="flex items-center gap-1 text-[10px] font-bold text-[#1c1c1c] cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="accent-[#c5a028]" 
                            checked={localDef.accept_states?.includes(s)} 
                            onChange={(e) => {
                              const list = [...(localDef.accept_states || [])];
                              if (e.target.checked) list.push(s);
                              else list.splice(list.indexOf(s), 1);
                              updateField('accept_states', list);
                            }}
                          /> {s}
                       </label>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </div>

        {type === 'PDA' || type === 'TM' ? (
          <div className="space-y-6">
            <div className="border-b border-[#e8e8e1] pb-2">
               <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a028]">{type === 'PDA' ? 'Stack Alphabet (Γ)' : 'Tape Symbols (Γ)'}</h4>
            </div>
            <input 
              className="input-field w-full font-serif text-sm tracking-widest"
              value={(localDef.stack_alphabet || localDef.tape_symbols || [])?.join(', ')}
              onChange={(e) => handleListChange(type === 'PDA' ? 'stack_alphabet' : 'tape_symbols', e.target.value)}
              placeholder="e.g. Z, A, B or _, 0, 1"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-center border-b border-[#e8e8e1] pb-4">
           <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#c5a028]">Transition Function (δ)</h4>
           <button onClick={addTransition} className="text-[10px] uppercase tracking-widest font-bold border border-[#c5a028] text-[#c5a028] px-4 py-1 hover:bg-[#c5a028] hover:text-white transition-all">+ Add Entry</button>
        </div>
        
        <div className="bg-gray-50/50 p-8 border border-[#e8e8e1]">
          {type === 'DFA' || type === 'NFA' ? renderFSMTransitions() : 
           type === 'TM' ? renderTMTransitions() : 
           <p className="text-[10px] italic text-gray-400">Advanced tuple editing for {type} coming soon...</p>}
        </div>
      </div>
    </div>
  );
}
