'use client';
import { MachineType, MachineDefinition } from '@/types/computation';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Panel,
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Self-Loop Edge Component
const SelfLoopEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const loopWidth = 25;
  const loopHeight = 35;
  
  // High-fidelity cubic bezier for a professional mathematical loop sitting ON the node
  const edgePath = `M ${sourceX} ${sourceY} 
                    C ${sourceX - loopWidth} ${sourceY - loopHeight}, 
                      ${sourceX + loopWidth} ${sourceY - loopHeight}, 
                      ${sourceX} ${sourceY}`;

  // apex of the loop for the label
  const labelX = sourceX;
  const labelY = sourceY - loopHeight + 5;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2.5 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 10,
              fontWeight: 800,
              pointerEvents: 'all',
              backgroundColor: 'white',
              border: '1.5px solid #c5a028',
              color: '#1c1c1c',
              padding: '2px 6px',
              borderRadius: '4px',
              boxShadow: '0 3px 8px rgba(197, 160, 40, 0.25)',
              zIndex: 1001,
              whiteSpace: 'nowrap'
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Custom State Node Component
interface StateNodeData {
  isActive: boolean;
  isAccept: boolean;
  isStart: boolean;
  label: string;
}

const StateNode = ({ data, id }: { data: StateNodeData, id: string }) => {
  return (
    <div 
      className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300
        ${data.isActive ? 'bg-[#fefce8] border-[#c5a028] shadow-[0_0_15px_rgba(197,160,40,0.3)] text-[#c5a028] scale-110' : 
          data.isAccept ? 'bg-white border-[#c5a028] border-double border-[4px] text-[#1c1c1c]' : 
          'bg-white border-[#e8e8e1] text-[#1c1c1c]'}`}
    >
      {data.isStart && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-[#c5a028] animate-pulse">
           ➜
        </div>
      )}
      
      <span className="z-10">{id}</span>

      {/* Luxury Gold Handles */}
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#c5a028', border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#c5a028', border: 'none', width: 6, height: 6 }} />
      
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#e8e8e1', border: 'none', width: 4, height: 4 }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: '#e8e8e1', border: 'none', width: 4, height: 4 }} />
      
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#e8e8e1', border: 'none' }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#e8e8e1', border: 'none' }} />
      
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#e8e8e1', border: 'none' }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#e8e8e1', border: 'none' }} />
    </div>
  );
};


const edgeTypes = {
  selfloop: SelfLoopEdge,
};

const nodeTypes = {
  state: StateNode,
};

type EditorElement = 
  | { type: 'node'; id: string; data: StateNodeData }
  | { type: 'edge'; id: string; label?: string; data?: any };

interface VisualMachineEditorProps {
  type: MachineType | string;
  initialDefinition: MachineDefinition;
  onChange: (definition: MachineDefinition) => void;
  activeStates?: string[];
  readOnly?: boolean;
}

export default function VisualMachineEditor({ 
  type, 
  initialDefinition, 
  onChange, 
  activeStates,
  readOnly = false
}: VisualMachineEditorProps) {

  const [nodes, setNodes, onNodesChange] = useNodesState<StateNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedElement, setSelectedElement] = useState<EditorElement | null>(null);

  // Initialize from JSON
  useEffect(() => {
    if (!initialDefinition || !initialDefinition.states) return;

    const initialNodes: Node[] = initialDefinition.states.map((id: string, idx: number) => ({
      id,
      type: 'state',
      position: { x: 100 + (idx * 150), y: 200 },
      data: { 
        isStart: initialDefinition.start_state === id, 
        isAccept: Array.isArray(initialDefinition.accept_states) 
          ? initialDefinition.accept_states.includes(id) 
          : initialDefinition.accept_states === id,
        isActive: !!activeStates?.includes(id)
      }
    }));

    const edgeMap = new Map<string, { source: string, target: string, labels: string[], data: any[] }>();

    if (type === 'DFA' || type === 'NFA') {
      const transitions = initialDefinition.transitions as Record<string, Record<string, string | string[]>>;
      for (const [from, transMap] of Object.entries(transitions || {})) {
        for (const [symbol, targets] of Object.entries(transMap)) {
          const targetList = Array.isArray(targets) ? targets : [targets];
          targetList.forEach((to: string) => {
            const key = `${from}-${to}`;
            if (!edgeMap.has(key)) {
              edgeMap.set(key, { source: from, target: to, labels: [], data: [] });
            }
            edgeMap.get(key)!.labels.push(symbol === "" ? 'ε' : symbol);
            edgeMap.get(key)!.data.push({ symbol });
          });
        }
      }
    } else if (type === 'TM') {
      for (const [from, transMap] of Object.entries(initialDefinition.transitions || {})) {
        for (const [read, action] of Object.entries(transMap as any)) {
           const a = action as any;
           const key = `${from}-${a.next}`;
           if (!edgeMap.has(key)) {
             edgeMap.set(key, { source: from, target: a.next, labels: [], data: [] });
           }
           edgeMap.get(key)!.labels.push(`${read}→${a.write},${a.move}`);
           edgeMap.get(key)!.data.push({ read, write: a.write, move: a.move });
        }
      }
    }

    const initialEdges: Edge[] = Array.from(edgeMap.values()).map((e, idx) => ({
      id: `${e.source}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.source === e.target ? 'source-top' : undefined,
      targetHandle: e.source === e.target ? 'target-top' : undefined,
      label: e.labels.join(', '),
      markerEnd: { type: MarkerType.ArrowClosed, color: '#c5a028' },
      style: { stroke: '#c5a028', strokeWidth: 2, zIndex: 10 },
      labelStyle: { fill: '#1c1c1c', fontWeight: 600, fontSize: type === 'TM' ? 10 : 12 },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9, rx: 4, ry: 4 },
      type: e.source === e.target ? 'selfloop' : 'default',
      data: { originalTransitions: e.data }
    }));


    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [type, initialDefinition]); // Sync when type or definition changes

  // Sync back to JSON (ONLY if not Read-Only)
  useEffect(() => {
    if (readOnly) return;

    const definition: any = {
      states: nodes.map(n => n.id),
      alphabet: [], 
      start_state: nodes.find(n => n.data.isStart)?.id || "",
      accept_states: nodes.filter(n => n.data.isAccept).map(n => n.id),
      transitions: {}
    };

    if (type === 'DFA' || type === 'NFA') {
      const trans: any = {};
      nodes.forEach(n => { trans[n.id] = {}; });
      edges.forEach(e => {
        const labels = e.label?.toString().split(', ') || [];
        labels.forEach(label => {
          const symbol = label === 'ε' ? "" : label;
          if (!trans[e.source][symbol]) {
            trans[e.source][symbol] = type === 'NFA' ? [] : "";
          }
          if (type === 'NFA') {
            if (!trans[e.source][symbol].includes(e.target)) {
              trans[e.source][symbol].push(e.target);
            }
          } else {
            trans[e.source][symbol] = e.target;
          }
        });
      });
      definition.transitions = trans;
      
      const alphabet = new Set<string>();
      edges.forEach(e => { 
        const labels = e.label?.toString().split(', ') || [];
        labels.forEach(l => { if (l !== 'ε') alphabet.add(l); });
      });
      definition.alphabet = Array.from(alphabet);

    } else if (type === 'TM') {
        const trans: any = {};
        nodes.forEach(n => { trans[n.id] = {}; });
        edges.forEach(e => {
           // TM grouping is trickier, we rely on the data object if available
           const transitions = e.data?.originalTransitions || [];
           transitions.forEach((t: any) => {
             if (t.read) {
               trans[e.source][t.read] = { write: t.write, move: t.move, next: e.target };
             }
           });
        });
        definition.transitions = trans;
        definition.tape_symbols = ["_"];
        definition.accept_state = nodes.find(n => n.data.isAccept)?.id || "";
    }

    onChange(definition);
  }, [nodes, edges, type, onChange, readOnly]);


  const onConnect = useCallback((params: Connection) => {
    // DFA Validation: Prevent non-deterministic connections
    if (type === 'DFA') {
       const outgoing = edges.filter(e => e.source === params.source);
       // Check if source already has '0' (the default symbol for new connections)
       const hasZero = outgoing.some(e => {
          const s = e.data?.symbol ?? e.label ?? "";
          return s === '0';
       });
       if (hasZero) {
          alert(`DFA Architecture Error: State ${params.source} already has a transition for '0'. Multi-transitions for the same symbol are not permitted in Deterministic mode.`);
          return;
       }
    }

    const newEdge = {
      ...params,
      id: `${params.source}-${params.target}-${Date.now()}`,
      label: type === 'TM' ? '0→0,R' : '0',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#c5a028' },
      style: { stroke: '#c5a028', strokeWidth: 2 },
      data: type === 'TM' ? { read: '0', write: '0', move: 'R' } : { symbol: '0' }
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [type, edges, setEdges]);

  const addState = () => {
    const id = `q${nodes.length}`;
    const newNode: Node = {
      id,
      data: { label: id, isStart: nodes.length === 0, isAccept: false },
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      style: {
        width: 60,
        height: 60,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #e8e8e1',
        background: '#fff',
        color: '#1c1c1c',
        fontWeight: 'bold',
        fontSize: '12px'
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateNode = (id: string, data: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        if (data.isStart) {
          nds.forEach(other => { if (other.id !== id) other.data.isStart = false; });
        }
        return { ...n, data: { ...n.data, ...data } };
      }
      return n;
    }));
  };

  const updateEdge = (id: string, label: string, data: any) => {
    if (type === 'DFA') {
       const edgeToChange = edges.find(e => e.id === id);
       if (edgeToChange) {
          const sourceId = edgeToChange.source;
          const otherEdges = edges.filter(e => e.source === sourceId && e.id !== id);
          
          if (!label || label.trim() === '' || label === 'ε') {
             alert("DFA Constraint: Deterministic machines cannot use empty (ε) transitions.");
             return false;
          }

          const alreadyUsed = otherEdges.some(e => {
             const s = e.data?.symbol ?? e.label ?? "";
             return s === label;
          });

          if (alreadyUsed) {
             alert(`DFA Constraint: State ${sourceId} already has a transition for symbol '${label}'.`);
             return false;
          }
       }
    }

    setEdges((eds) => eds.map((e) => e.id === id ? { ...e, label, data: { ...e.data, ...data } } : e));
    return true;
  };



  // Node styling logic for active states (Simplified for custom nodes)
  useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const newNodes = nds.map(n => {
        const isActive = !!activeStates?.includes(n.id);
        if (n.data.isActive !== isActive) {
          changed = true;
          return { ...n, data: { ...n.data, isActive } };
        }
        return n;
      });
      return changed ? newNodes : nds;
    });
  }, [activeStates, setNodes]);

  return (
    <div className="w-full h-[600px] bg-white border border-[#e8e8e1] relative group overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onSelectionChange={useCallback((params: { nodes: Node<StateNodeData>[], edges: Edge[] }) => {
          if (params.nodes.length > 0) {
            const node = params.nodes[0];
            setSelectedElement((prev) => 
               prev?.id === node.id && prev?.type === 'node' ? prev : { type: 'node', id: node.id, data: node.data }
            );
          } else if (params.edges.length > 0) {
            const edge = params.edges[0];
            setSelectedElement((prev) => 
               prev?.id === edge.id && prev?.type === 'edge' ? prev : { type: 'edge', id: edge.id, label: edge.label?.toString(), data: edge.data }
            );
          } else {
            setSelectedElement(null);
          }
        }, [])}
        fitView
      >
        <Background color="#f8f8f2" gap={20} />
        <Controls />
        <Panel position="top-right" className="flex flex-col gap-2">
          {!readOnly && <button onClick={addState} className="btn-primary">+ Add State</button>}
          
          {selectedElement && (
            <div className="glass p-4 w-64 space-y-4 shadow-xl border-[#c5a028]/20 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-serif font-bold text-sm uppercase tracking-widest border-b border-[#e8e8e1] pb-2">
                Edit {selectedElement.type}
              </h4>
              
              {selectedElement.type === 'node' ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">State Name</label>
                    <input 
                      className="input-field text-xs py-1" 
                      value={selectedElement.id} 
                      disabled
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedElement.data.isStart}
                        onChange={(e) => updateNode(selectedElement.id, { isStart: e.target.checked })}
                        className="accent-[#c5a028]"
                      /> Start
                    </label>
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedElement.data.isAccept}
                        onChange={(e) => updateNode(selectedElement.id, { isAccept: e.target.checked })}
                        className="accent-[#c5a028]"
                      /> Accept
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {type === 'TM' ? (
                    <div className="grid grid-cols-3 gap-2">
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest text-gray-400">Read</label>
                          <input 
                            className="input-field text-[10px] py-1 px-1 text-center" 
                            defaultValue={selectedElement.data?.read || "0"}
                            onBlur={(e) => {
                              const val = e.target.value;
                              const write = selectedElement.data?.write || "0";
                              const move = selectedElement.data?.move || "R";
                              updateEdge(selectedElement.id, `${val}→${write},${move}`, { read: val, write, move });
                            }}
                          />
                       </div>
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest text-gray-400">Write</label>
                          <input 
                            className="input-field text-[10px] py-1 px-1 text-center" 
                            defaultValue={selectedElement.data?.write || "0"}
                            onBlur={(e) => {
                              const val = e.target.value;
                              const read = selectedElement.data?.read || "0";
                              const move = selectedElement.data?.move || "R";
                              updateEdge(selectedElement.id, `${read}→${val},${move}`, { read, write: val, move });
                            }}
                          />
                       </div>
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest text-gray-400">Move</label>
                          <select 
                            className="input-field text-[8px] py-1 px-0"
                            defaultValue={selectedElement.data?.move || "R"}
                            onChange={(e) => {
                               const move = e.target.value;
                               const read = selectedElement.data?.read || "0";
                               const write = selectedElement.data?.write || "0";
                               updateEdge(selectedElement.id, `${read}→${write},${move}`, { read, write, move });
                            }}
                          >
                            <option>R</option>
                            <option>L</option>
                          </select>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">Input Symbol</label>
                      <input 
                         className="input-field text-xs py-1" 
                         defaultValue={selectedElement.data?.symbol || selectedElement.label}
                         onBlur={(e) => {
                            const success = updateEdge(selectedElement.id, e.target.value, { symbol: e.target.value });
                            if (!success) {
                               e.target.value = selectedElement.data?.symbol || selectedElement.label;
                            }
                         }}
                         placeholder="e.g. 0, 1, or empty for ε"
                      />
                    </div>
                  )}

                  <button 
                    onClick={() => setEdges(eds => eds.filter(e => e.id !== selectedElement.id))}
                    className="w-full py-1 border border-red-100 text-red-400 text-[10px] uppercase hover:bg-red-50 transition-colors"
                  >
                    Delete Transition
                  </button>
                </div>
              )}
              
              {selectedElement.type === 'node' && (
                <button 
                  onClick={() => {
                    setNodes(nds => nds.filter(n => n.id !== selectedElement.id));
                    setEdges(eds => eds.filter(e => e.source !== selectedElement.id && e.target !== selectedElement.id));
                    setSelectedElement(null);
                  }}
                  className="w-full py-1 border border-red-100 text-red-400 text-[10px] uppercase hover:bg-red-50 transition-colors mt-2"
                >
                  Delete State
                </button>
              )}
            </div>
          )}
        </Panel>
      </ReactFlow>
      
      {!selectedElement && (
        <div className="absolute bottom-6 right-6 pointer-events-none opacity-40 text-[10px] uppercase tracking-[0.3em] font-medium text-gray-400">
          {readOnly ? "Visual Insight • Formal Mode Active" : "Drag nodes to explore • Connect to define logic"}
        </div>
      )}
    </div>
  );
}

