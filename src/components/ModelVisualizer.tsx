'use client';
import { MachineType, MachineDefinition } from '@/types/computation';

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';

interface ModelVisualizerProps {
  type: MachineType | string;
  definition: MachineDefinition;
  activeState?: string | null;
  activeStates?: string[];
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 25,
      },
    };
  });
};

export default function ModelVisualizer({ type, definition, activeState, activeStates }: ModelVisualizerProps) {
  const { nodes, edges } = useMemo(() => {
    if (!definition || !definition.states) return { nodes: [], edges: [] };

    const initialNodes: Node[] = definition.states.map((state: string) => {
      const isActive = state === activeState || activeStates?.includes(state);
      return {
        id: state,
        position: { x: 0, y: 0 },
        data: { label: state },
        style: {
          background: isActive ? '#0ea5e9' : state === definition.start_state ? '#1e293b' : '#0f172a',
          color: '#fff',
          border: `2px solid ${
            isActive ? '#38bdf8' : 
            definition.accept_states?.includes(state) || definition.accept_state === state 
              ? '#a855f7' 
              : state === definition.start_state ? '#22c55e' : '#334155'
          }`,
          borderRadius: '50%',
          width: 60,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          boxShadow: isActive ? '0 0 20px #0ea5e9' : 
            definition.accept_states?.includes(state) || definition.accept_state === state 
            ? '0 0 15px rgba(168, 85, 247, 0.4)' 
            : 'none',
          transition: 'all 0.3s ease-in-out',
          zIndex: isActive ? 1000 : 1
        },
      };
    });

    const initialEdges: Edge[] = [];
    
    // Handle FA/TM/PDA transitions
    if (type === 'DFA' || type === 'NFA') {
      const transitions = Array.isArray(definition.transitions) 
        ? definition.transitions 
        : Object.entries(definition.transitions || {}).flatMap(([from, transMap]: [string, any]) => 
            Object.entries(transMap).map(([symbol, target]) => ({ from, symbol, target }))
          );

      transitions.forEach((t: any, idx: number) => {
        const from = t.from;
        const symbol = t.symbol;
        const targetList = Array.isArray(t.target) ? t.target : [t.target];
        
        targetList.forEach((to: string, tIdx: number) => {
          initialEdges.push({
            id: `${from}-${to}-${symbol}-${idx}-${tIdx}`,
            source: from,
            target: to,
            label: symbol === "" ? 'ε' : symbol,
            animated: true,
            style: { stroke: '#6366f1' },
            labelStyle: { fill: '#fff', fontWeight: 700 },
            labelBgStyle: { fill: '#1e293b' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          });
        });
      });
    } else if (type === 'TM') {
      const transitionsList = Array.isArray(definition.transitions)
        ? definition.transitions
        : Object.entries(definition.transitions || {}).flatMap(([from, transMap]: [string, any]) =>
            Object.entries(transMap).map(([read, action]: [string, any]) => ({ from, read, ...action }))
          );

      transitionsList.forEach((t: any, idx: number) => {
        const from = t.from;
        const read = t.read;
        initialEdges.push({
          id: `${from}-${t.next}-${read}-${idx}`,
          source: from,
          target: t.next,
          label: `${read}→${t.write},${t.move}`,
          animated: true,
          style: { stroke: '#0ea5e9' },
          labelStyle: { fill: '#fff', fontSize: 10 },
          labelBgStyle: { fill: '#1e293b' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
        });
      });
    }

    const layoutedNodes = getLayoutedElements(initialNodes, initialEdges);
    return { nodes: layoutedNodes, edges: initialEdges };
  }, [type, definition, activeState, activeStates]);

  return (
    <div className="w-full h-[400px] glass overflow-hidden rounded-xl border border-slate-700/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={true}
        className="bg-slate-950/20"
      >
        <Background color="#334155" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
