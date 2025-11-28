import { create } from 'zustand';
import {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

// Define the Node Data interface based on requirements
export interface StoryNodeData extends Record<string, unknown> {
  label?: string;
  type: 'chapter' | 'scene' | 'character';
  status: 'planned' | 'drafting' | 'reviewing' | 'final';
  content?: string;
  prompt?: string;
}

export type StoryNode = Node<StoryNodeData>;

interface StoryState {
  nodes: StoryNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<StoryNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: StoryNode) => void;
  updateNodeStatus: (id: string, status: StoryNodeData['status']) => void;
}

// Initial mock data
const initialNodes: StoryNode[] = [
  {
    id: '1',
    type: 'storyNode', // We will register this type
    position: { x: 100, y: 100 },
    data: {
      label: 'Chapter 1: The Beginning',
      type: 'chapter',
      status: 'planned',
      prompt: 'A dark and stormy night...'
    },
  },
  {
    id: '2',
    type: 'storyNode',
    position: { x: 400, y: 200 },
    data: {
      label: 'Scene 1: The Arrival',
      type: 'scene',
      status: 'drafting',
      prompt: 'Hero enters the tavern.'
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'Next Morning' },
];

export const useStore = create<StoryState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },
  updateNodeStatus: (id, status) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, status },
          };
        }
        return node;
      }),
    });
  },
}));
