'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '@/hooks/useStore';
import StoryNode from './nodes/StoryNode';

const StoryCanvasContent = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useStore();

  const nodeTypes = useMemo<NodeTypes>(() => ({
    storyNode: StoryNode,
  }), []);

  return (
    <div className="h-full w-full bg-[#F9FAFB]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-dot-pattern"
      >
        <Background gap={20} size={1} color="#E2E8F0" />
        <Controls className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm" />
        <MiniMap
            nodeColor={(n) => {
                const status = n.data?.status as string;
                if (status === 'final') return '#10B981';
                if (status === 'drafting') return '#6366F1';
                if (status === 'reviewing') return '#F59E0B';
                return '#94A3B8';
            }}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm"
        />
      </ReactFlow>
    </div>
  );
};

export default function StoryCanvas() {
  return (
    <ReactFlowProvider>
      <StoryCanvasContent />
    </ReactFlowProvider>
  );
}
