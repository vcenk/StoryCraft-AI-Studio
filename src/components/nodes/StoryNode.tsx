import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StoryNodeData } from '@/hooks/useStore';

// Status colors mapping
const statusColors: Record<string, string> = {
  planned: 'bg-slate-400',
  drafting: 'bg-indigo-500',
  reviewing: 'bg-amber-500',
  final: 'bg-emerald-500',
};

// Status label mapping
const statusLabels: Record<string, string> = {
  planned: 'Planned',
  drafting: 'Drafting',
  reviewing: 'Reviewing',
  final: 'Final',
};

// Define the type for the props received by the component
// NodeProps is generic: NodeProps<NodeData>
type StoryNodeProps = NodeProps<Node<StoryNodeData>>;

const StoryNode = ({ data, selected }: StoryNodeProps) => {
  const statusColor = statusColors[data.status] || 'bg-slate-400';
  const isGenerating = data.status === 'drafting';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative min-w-[200px] rounded-xl border border-white/20 bg-white/40 backdrop-blur-md shadow-xl transition-all',
        selected ? 'ring-2 ring-indigo-500' : 'hover:border-indigo-300'
      )}
    >
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between border-b border-white/10 p-3 bg-white/30 rounded-t-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {data.type}
        </span>
        <div className="flex items-center gap-2">
           {/* Pulsing Status Dot */}
          <div className="relative flex h-3 w-3">
             {isGenerating && (
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusColor)}></span>
             )}
            <span className={cn("relative inline-flex rounded-full h-3 w-3", statusColor)}></span>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-slate-800 mb-1">{data.label}</h3>
        {data.prompt && (
             <p className="text-xs text-slate-500 line-clamp-2 italic">
               &quot;{data.prompt}&quot;
             </p>
        )}
      </div>

      {/* Footer / Meta */}
      <div className="px-4 pb-3 pt-0">
         <span className={cn("text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200")}>
            {statusLabels[data.status] || data.status}
         </span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white"
      />
    </motion.div>
  );
};

export default memo(StoryNode);
