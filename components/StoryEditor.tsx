
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Settings2, Share2, FileText, Image as ImageIcon, 
  Sparkles, BookOpen, Download, Loader2, ShieldCheck, 
  AlertTriangle, CheckCircle, X, Move, GripVertical, Trash2,
  Book, LayoutTemplate, FileOutput, Wand2, Printer, MousePointer2,
  Link as LinkIcon, ZoomIn, ZoomOut, RotateCcw, RefreshCw, Palette,
  Maximize, Minimize, Square, RectangleHorizontal, RectangleVertical,
  Check, StickyNote, Save, Trash
} from 'lucide-react';
import { generateStoryContent, generateImage, generateAuditReport, generateCoverIdeas, generateBookOutline } from '../services/geminiService';
import { StoryNode, NodeType, NodeData, NodeConnection, BookLayout } from '../types';

// --- Constants ---

const GRID_SIZE = 10;
const LOCAL_STORAGE_KEY = 'storycraft_project_v1';

const BOOK_PRESETS: BookLayout[] = [
  { presetId: 'kids_square_small', label: 'Small Square', description: '8" × 8" • Standard kids book', width: 8, height: 8, pageType: 'kids_picture_book' },
  { presetId: 'kids_square_standard', label: 'Large Square', description: '8.5" × 8.5" • Premium picture book', width: 8.5, height: 8.5, pageType: 'kids_picture_book' },
  { presetId: 'kids_large_portrait', label: 'Portrait XL', description: '8.5" × 11" • Educational / Activity', width: 8.5, height: 11, pageType: 'kids_picture_book' },
  { presetId: 'novel_small', label: 'Pocket Novel', description: '5" × 8" • Compact fiction', width: 5, height: 8, pageType: 'novel' },
  { presetId: 'novel_standard', label: 'Trade Novel', description: '6" × 9" • Industry standard', width: 6, height: 9, pageType: 'novel' },
  { presetId: 'guide_letter', label: 'Guidebook', description: '8.5" × 11" • Workbooks & Guides', width: 8.5, height: 11, pageType: 'guide' },
];

// --- Initial State for Demo ---
const INITIAL_NODES: StoryNode[] = [
  { id: '1', type: 'chapter', x: 100, y: 50, data: { label: 'Start Here', prompt: 'A new adventure begins...', content: '', status: 'idle', chapterTone: 'Whimsical' } },
];

export const StoryEditor: React.FC = () => {
  const [nodes, setNodes] = useState<StoryNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Project Settings
  const [currentBookLayout, setCurrentBookLayout] = useState<BookLayout>(BOOK_PRESETS[1]); // Default to 8.5x8.5
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

  // Viewport & Panning State
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Dragging Nodes State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // Offset of mouse inside the node
  
  // Connecting Nodes State
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [tempConnectionEnd, setTempConnectionEnd] = useState<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Magic Start Modal State
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [magicStep, setMagicStep] = useState<1 | 2>(1);
  const [magicTopic, setMagicTopic] = useState('');
  const [magicAudience, setMagicAudience] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  // --- Persistence: Auto-Load on Mount ---
  useEffect(() => {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
          try {
              const parsed = JSON.parse(savedData);
              if (parsed.nodes && Array.isArray(parsed.nodes)) setNodes(parsed.nodes);
              if (parsed.connections && Array.isArray(parsed.connections)) setConnections(parsed.connections);
              if (parsed.layout) setCurrentBookLayout(parsed.layout);
          } catch (e) {
              console.error("Failed to load project", e);
          }
      }
  }, []);

  // --- Persistence: Auto-Save on Change ---
  useEffect(() => {
      const saveData = {
          nodes,
          connections,
          layout: currentBookLayout,
          lastModified: Date.now()
      };
      const timer = setTimeout(() => {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveData));
      }, 1000); // Debounce save 1s

      return () => clearTimeout(timer);
  }, [nodes, connections, currentBookLayout]);

  // --- Helper to get mouse pos in world coordinates ---
  const getWorldMousePosition = (e: MouseEvent | React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Adjust for viewport translation AND zoom scale
    return {
        x: (e.clientX - rect.left - viewport.x) / zoom,
        y: (e.clientY - rect.top - viewport.y) / zoom
    };
  };

  // --- Unified Window Mouse Handlers (Drag, Pan, Connect) ---
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Handle Node Dragging
      if (draggingId && canvasRef.current) {
        const worldPos = getWorldMousePosition(e);
        const newX = worldPos.x - offset.x;
        const newY = worldPos.y - offset.y;

        // Snap to grid
        const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        setNodes(prev => prev.map(n => 
          n.id === draggingId ? { ...n, x: snappedX, y: snappedY } : n
        ));
      }
      
      // 2. Handle Canvas Panning
      if (isPanning) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        setViewport(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      // 3. Handle Connection Dragging
      if (connectingSourceId) {
          const worldPos = getWorldMousePosition(e);
          setTempConnectionEnd(worldPos);
      }
    };

    const handleWindowMouseUp = () => {
      setDraggingId(null);
      setIsPanning(false);
      // If we released mouse while connecting but not on a valid target (handled in onMouseUp of handle), cancel it
      if (connectingSourceId) {
        setConnectingSourceId(null);
        setTempConnectionEnd(null);
      }
    };

    // Attach listeners
    if (draggingId || isPanning || connectingSourceId) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingId, isPanning, offset, viewport, connectingSourceId, zoom]);

  // --- Mouse Down Handlers ---

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setSelectedNodeId(null);
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setSelectedNodeId(id);
    setDraggingId(id);
    
    const node = nodes.find(n => n.id === id);
    if (node && canvasRef.current) {
      const worldPos = getWorldMousePosition(e);
      setOffset({
        x: worldPos.x - node.x,
        y: worldPos.y - node.y
      });
    }
  };

  // --- Wheel Handler (Zoom & Pan) ---
  const handleWheel = (e: React.WheelEvent) => {
    // If Ctrl/Cmd key pressed, or purely zooming intent
    if (e.ctrlKey || e.metaKey) {
       e.preventDefault();
       const zoomSensitivity = -0.001;
       const delta = e.deltaY * zoomSensitivity;
       const newZoom = Math.min(Math.max(0.2, zoom + delta), 3); // Limit 0.2x to 3x
       
       if (canvasRef.current) {
           const rect = canvasRef.current.getBoundingClientRect();
           const mouseX = e.clientX - rect.left;
           const mouseY = e.clientY - rect.top;

           // Calculate world pos before zoom
           const wx = (mouseX - viewport.x) / zoom;
           const wy = (mouseY - viewport.y) / zoom;

           // Calculate new viewport to keep mouse over same world point
           // mouseX = newViewportX + wx * newZoom
           const newVx = mouseX - wx * newZoom;
           const newVy = mouseY - wy * newZoom;

           setZoom(newZoom);
           setViewport({ x: newVx, y: newVy });
       }
    } else {
        // Regular Pan
        setViewport(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // --- Connection Handlers ---
  const handleOutputMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Start line from bottom center of node
      const startX = node.x + 140; 
      const startY = node.y + 100; // Approx height of base node

      setConnectingSourceId(nodeId);
      setTempConnectionEnd({ x: startX, y: startY + 20 }); // Initial little nub
  };

  const handleInputMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
      e.stopPropagation();
      if (connectingSourceId && connectingSourceId !== targetNodeId) {
          // Check if connection already exists
          const exists = connections.some(c => c.source === connectingSourceId && c.target === targetNodeId);
          if (!exists) {
            setConnections(prev => [...prev, {
                id: crypto.randomUUID(),
                source: connectingSourceId,
                target: targetNodeId
            }]);
          }
      }
      setConnectingSourceId(null);
      setTempConnectionEnd(null);
  };

  const deleteConnection = (connectionId: string) => {
      setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  // --- Node Operations ---
  const addNode = (type: NodeType) => {
    const id = crypto.randomUUID();
    let xPos = 100;
    let yPos = 100;

    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        // Spawn in center of view, accounting for zoom
        xPos = (rect.width / 2 - viewport.x) / zoom - 140; 
        yPos = (rect.height / 2 - viewport.y) / zoom - 50;
        // Add slight jitter
        xPos += (Math.random() * 40 - 20);
        yPos += (Math.random() * 40 - 20);
        
        // Snap initial position
        xPos = Math.round(xPos / GRID_SIZE) * GRID_SIZE;
        yPos = Math.round(yPos / GRID_SIZE) * GRID_SIZE;
    }
    
    const labelMap: Record<string, string> = {
        audit: 'Quality Check',
        cover: 'Book Cover',
        export: 'Export Book',
        chapter: 'New Chapter',
        note: 'Sticky Note',
    };

    const newNode: StoryNode = {
      id,
      type,
      x: xPos,
      y: yPos,
      data: {
        label: labelMap[type] || 'New Node',
        status: 'idle',
        prompt: '',
        content: '',
        aspectRatio: '1:1',
        imageStyle: 'Digital Art',
        chapterTone: 'Adventurous'
      }
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.source !== id && c.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const clearProject = () => {
      if (confirm("Are you sure you want to delete everything? This cannot be undone.")) {
          setNodes(INITIAL_NODES);
          setConnections([]);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
  }

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  // --- Magic Start Logic ---
  const handleMagicStart = async () => {
    if (!magicTopic || !magicAudience) return;
    setIsMagicLoading(true);
    try {
      // Pass the current book layout to the generator
      const outline = await generateBookOutline(magicTopic, magicAudience, currentBookLayout);
      
      let startX = 100;
      let startY = 50;
      if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          startX = (rect.width / 2 - viewport.x) / zoom - 140;
          startY = (100 - viewport.y) / zoom; // Near top
          // Snap
          startX = Math.round(startX / GRID_SIZE) * GRID_SIZE;
          startY = Math.round(startY / GRID_SIZE) * GRID_SIZE;
      }

      const newNodes: StoryNode[] = [];
      const newConnections: NodeConnection[] = [];
      let currentY = startY;
      let previousNodeId: string | null = null;

      outline.forEach((chapter) => {
        // 1. Chapter Node
        const chapId = crypto.randomUUID();
        newNodes.push({
          id: chapId,
          type: 'chapter',
          x: startX,
          y: currentY,
          data: { label: chapter.title, prompt: `Write the beginning of ${chapter.title}`, status: 'idle', chapterTone: 'Adventurous' }
        });
        if (previousNodeId) {
            newConnections.push({ id: crypto.randomUUID(), source: previousNodeId, target: chapId });
        }
        previousNodeId = chapId;
        currentY += 200;

        // 2. Scene Nodes
        chapter.scenes.forEach((scene) => {
          const sceneId = crypto.randomUUID();
          newNodes.push({
            id: sceneId,
            type: 'story',
            x: startX,
            y: currentY,
            data: { label: scene.label, prompt: scene.prompt, status: 'idle' }
          });
          if (previousNodeId) {
            newConnections.push({ id: crypto.randomUUID(), source: previousNodeId, target: sceneId });
          }
          previousNodeId = sceneId;
          currentY += 250;
        });

        // 3. Audit Node
        const auditId = crypto.randomUUID();
        newNodes.push({
            id: auditId,
            type: 'audit',
            x: startX,
            y: currentY,
            data: { label: `Audit: ${chapter.title}`, status: 'idle' }
        });
        if (previousNodeId) {
            newConnections.push({ id: crypto.randomUUID(), source: previousNodeId, target: auditId });
        }
        previousNodeId = auditId;
        currentY += 200;
      });

      // 4. Export Node
      const exportId = crypto.randomUUID();
      newNodes.push({
          id: exportId,
          type: 'export',
          x: startX,
          y: currentY,
          data: { label: 'Final Export', status: 'idle' }
      });
      if (previousNodeId) {
        newConnections.push({ id: crypto.randomUUID(), source: previousNodeId, target: exportId });
      }

      setNodes(prev => [...prev, ...newNodes]);
      setConnections(prev => [...prev, ...newConnections]);
      setIsMagicModalOpen(false);
      // Reset for next time
      setMagicStep(1);
      setMagicTopic('');
      setMagicAudience('');
    } catch (error) {
      console.error(error);
      alert("Failed to generate outline. Please try again.");
    } finally {
      setIsMagicLoading(false);
    }
  };

  // --- Compilation Logic ---
  const getSortedNodesForExport = () => {
     return [...nodes].sort((a, b) => a.y - b.y);
  };

  const compileBook = () => {
    // Use the Global Project Layout
    const layout = currentBookLayout;
    
    // CSS Generation based on Layout
    const pageCSS = `@page { size: ${layout.width}in ${layout.height}in; margin: 0.5in; } 
                     body { width: ${layout.width}in; margin: 0 auto; padding: 0.5in; box-sizing: border-box; font-family: 'Georgia', serif; line-height: 1.6; }`;

    let htmlContent = `
      <html>
      <head>
        <title>My StoryCraft Book</title>
        <style>
          ${pageCSS}
          body { background: white; }
          h1 { text-align: center; color: #2c3e50; page-break-after: avoid; }
          .scene { margin-bottom: 30px; text-align: justify; }
          .img-container { text-align: center; margin: 40px 0; page-break-inside: avoid; }
          img { max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .chapter-break { page-break-before: always; margin-top: 60px; border-top: 2px solid #eee; padding-top: 40px; }
          @media screen {
             html { background: #f1f5f9; padding: 20px; }
             body { box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          }
        </style>
      </head>
      <body>
    `;

    const sortedNodes = getSortedNodesForExport();

    sortedNodes.forEach(node => {
      if (node.type === 'chapter') {
        htmlContent += `<div class="chapter-break"><h1>${node.data.label || 'Chapter'}</h1></div>`;
        if (node.data.content) htmlContent += `<p>${node.data.content}</p>`;
      } else if (node.type === 'story' && node.data.content) {
        htmlContent += `<div class="scene"><p>${node.data.content.replace(/\n/g, '<br/>')}</p></div>`;
      } else if (node.type === 'image' && node.data.imageBase64) {
        htmlContent += `<div class="img-container"><img src="data:image/png;base64,${node.data.imageBase64}" /></div>`;
      } else if (node.type === 'cover' && node.data.coverData) {
          if (node.data.coverData.frontCoverImageBase64) {
               htmlContent += `<div class="img-container"><img src="data:image/png;base64,${node.data.coverData.frontCoverImageBase64}" style="max-height: 800px;" /></div>`;
               htmlContent += `<h1 style="font-size: 3em;">${node.data.coverData.titles[0]}</h1>`;
          }
      }
    });

    htmlContent += `</body></html>`;
    return htmlContent;
  };

  const handleDownloadExport = () => {
      const html = compileBook();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-storycraft-book.html';
      a.click();
      URL.revokeObjectURL(url);
  };

  // --- AI Actions ---
  const handleGenerate = async (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    updateNodeData(id, { status: 'loading' });

    try {
      if (node.type === 'story' || node.type === 'chapter') {
        const incomingConnection = connections.find(c => c.target === id);
        let context = '';
        if (incomingConnection) {
             const sourceNode = nodes.find(n => n.id === incomingConnection.source);
             if (sourceNode && sourceNode.data.content) {
                 context = sourceNode.data.content;
             }
        }
        
        if (!context) {
            const prevNodes = nodes.filter(n => n.y < node.y && n.type === 'story');
            if (prevNodes.length > 0) context = prevNodes[prevNodes.length-1].data.content || '';
        }

        // Append tone if available from chapter
        let prompt = node.data.prompt || '';
        if (node.type === 'chapter' && node.data.chapterTone) {
            prompt += ` (Tone: ${node.data.chapterTone})`;
        }

        const text = await generateStoryContent(prompt, context);
        updateNodeData(id, { content: text, status: 'success' });
      } 
      else if (node.type === 'image') {
        let imagePrompt = node.data.prompt || '';
        if (node.data.imageStyle) imagePrompt += `, ${node.data.imageStyle} style`;
        
        const base64 = await generateImage(imagePrompt);
        updateNodeData(id, { imageBase64: base64, status: 'success' });
      }
      else if (node.type === 'audit') {
        const storyText = nodes
          .filter(n => n.y < node.y && n.type === 'story')
          .map(n => n.data.content)
          .join('\n\n');
        
        if (!storyText) {
            alert("No story text found above this Audit Node.");
            updateNodeData(id, { status: 'error' });
            return;
        }

        const report = await generateAuditReport(storyText, { age: '5-8', tone: 'Adventurous' });
        updateNodeData(id, { auditResult: report, status: 'success' });
      }
      else if (node.type === 'cover') {
        const storyText = nodes
          .filter(n => n.type === 'story')
          .map(n => n.data.content)
          .join('\n\n');
        
        if (!storyText) {
           alert("Need story content to generate cover ideas.");
           updateNodeData(id, { status: 'error' });
           return;
        }

        const ideas = await generateCoverIdeas(storyText.substring(0, 3000), { genre: 'Childrens Book', audience: 'Kids 5-8' });
        updateNodeData(id, { coverData: ideas, status: 'success' });
      }
    } catch (e) {
      console.error(e);
      updateNodeData(id, { status: 'error' });
    }
  };

  const handleGenerateCoverArt = async (id: string, side: 'front' | 'back') => {
      const node = nodes.find(n => n.id === id);
      if(!node || !node.data.coverData) return;

      updateNodeData(id, { status: 'loading' });
      try {
          const prompt = side === 'front' ? node.data.coverData.frontCoverImagePrompt : node.data.coverData.backCoverImagePrompt;
          const base64 = await generateImage(prompt);
          
          const newCoverData = { ...node.data.coverData };
          if(side === 'front') newCoverData.frontCoverImageBase64 = base64;
          else newCoverData.backCoverImageBase64 = base64;

          updateNodeData(id, { coverData: newCoverData, status: 'success' });
      } catch(e) {
          console.error(e);
          updateNodeData(id, { status: 'error' });
      }
  };

  // --- Component: Node Renderer ---
  const renderNode = (node: StoryNode) => {
    const isSelected = selectedNodeId === node.id;
    const isConnectionSource = connectingSourceId === node.id;
    
    // Calculate dynamic height for the connection lines to attach correctly
    const nodeWidth = 280;
    const nodeHeight = node.type === 'story' && node.data.content ? 300 : 
                       node.type === 'image' && node.data.imageBase64 ? 320 :
                       node.type === 'audit' && node.data.auditResult ? 300 : 180;

    // --- 1. CHAPTER NODE (Header Style) ---
    if (node.type === 'chapter') {
        return (
            <div 
                key={node.id}
                style={{ left: node.x, top: node.y, width: nodeWidth, height: 'auto' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-100 group z-10
                    ${isSelected ? 'ring-4 ring-slate-300 scale-105' : 'hover:shadow-xl'}
                    bg-slate-900 text-white border border-slate-700
                `}
            >
                 <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-700 rounded-full border-2 border-slate-500 cursor-crosshair hover:bg-brand-500 z-20"
                    onMouseUp={(e) => handleInputMouseUp(e, node.id)}
                />

                <div className="p-4 flex flex-col gap-2">
                     <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen size={12} /> Chapter
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                     </div>
                     <div className="font-serif text-xl font-bold leading-tight">{node.data.label}</div>
                     
                     <div className="mt-2 bg-slate-800 rounded p-1 flex gap-1 overflow-x-auto no-scrollbar" onMouseDown={e => e.stopPropagation()}>
                         {['Adventurous', 'Funny', 'Scary'].map(tone => (
                             <button 
                                key={tone} 
                                onClick={() => updateNodeData(node.id, { chapterTone: tone as any })}
                                className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${node.data.chapterTone === tone ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                             >
                                 {tone}
                             </button>
                         ))}
                     </div>
                </div>

                <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex justify-between items-center">
                     <span className="text-[10px] text-slate-400">{node.data.status === 'loading' ? 'Generating...' : node.data.status === 'idle' ? 'Ready' : 'Complete'}</span>
                     <button onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }} className="p-1.5 bg-slate-700 hover:bg-brand-600 rounded-md transition-colors text-white">
                        {node.data.status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                     </button>
                </div>

                <div 
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-20 bg-slate-800 border-slate-600 hover:bg-brand-500 hover:border-brand-300`}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
                />
            </div>
        );
    }

    // --- 2. STORY NODE (Clean Card) ---
    if (node.type === 'story') {
        const wordCount = node.data.content ? node.data.content.split(' ').length : 0;
        return (
             <div 
                key={node.id}
                style={{ left: node.x, top: node.y, width: nodeWidth, height: 'auto' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute rounded-xl shadow-sm overflow-visible flex flex-col transition-all duration-100 group z-10 border-2
                    ${isSelected ? 'border-brand-500 ring-4 ring-brand-100 scale-105 shadow-xl' : 'border-brand-100 hover:border-brand-300 hover:shadow-md'}
                    bg-white
                `}
            >
                 <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-brand-200 cursor-crosshair hover:bg-brand-500 z-20"
                    onMouseUp={(e) => handleInputMouseUp(e, node.id)}
                />

                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg flex justify-between items-center">
                     <span className="text-xs font-bold text-brand-700 flex items-center gap-1.5">
                        <FileText size={12} /> {node.data.label || 'Scene'}
                     </span>
                     <div className="flex gap-1">
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">{wordCount}w</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                     </div>
                </div>

                <div className="p-4 min-h-[100px] max-h-[240px] overflow-hidden relative">
                    <p className="text-xs text-slate-600 leading-relaxed font-serif">
                        {node.data.content || <span className="text-slate-400 italic">{node.data.prompt || "Enter a prompt to generate text..."}</span>}
                    </p>
                    {!node.data.content && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }}
                            className="mt-4 w-full py-2 border border-dashed border-brand-300 text-brand-600 rounded-lg text-xs font-medium hover:bg-brand-50 flex items-center justify-center gap-2"
                        >
                            <Sparkles size={12} /> Generate Text
                        </button>
                    )}
                     {node.data.content && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>}
                </div>
                
                {node.data.content && (
                    <div className="p-2 border-t border-slate-100 flex justify-end">
                         <button onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }} className="text-[10px] text-brand-600 font-medium hover:underline flex items-center gap-1">
                            <RefreshCw size={10} /> Regenerate
                         </button>
                    </div>
                )}

                <div 
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-20 bg-white border-brand-300 hover:bg-brand-500 hover:border-white`}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
                />
            </div>
        );
    }

    // --- 3. IMAGE NODE (Visual Card) ---
    if (node.type === 'image') {
        return (
             <div 
                key={node.id}
                style={{ left: node.x, top: node.y, width: nodeWidth, height: 'auto' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute rounded-xl shadow-sm overflow-visible flex flex-col transition-all duration-100 group z-10 border-2
                    ${isSelected ? 'border-purple-500 ring-4 ring-purple-100 scale-105 shadow-xl' : 'border-purple-200 hover:border-purple-400 hover:shadow-md'}
                    bg-white
                `}
            >
                 <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-purple-200 cursor-crosshair hover:bg-purple-500 z-20"
                    onMouseUp={(e) => handleInputMouseUp(e, node.id)}
                />

                <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50 rounded-t-lg flex justify-between items-center">
                     <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                        <ImageIcon size={12} /> {node.data.label || 'Illustration'}
                     </span>
                     {/* Feature: Aspect Ratio Toggle */}
                     <div className="flex bg-white rounded border border-purple-100 p-0.5" onMouseDown={e => e.stopPropagation()}>
                        {[ {r:'1:1', i:Square}, {r:'16:9', i:RectangleHorizontal}, {r:'9:16', i:RectangleVertical}].map(opt => (
                            <button 
                                key={opt.r}
                                onClick={() => updateNodeData(node.id, { aspectRatio: opt.r as any })}
                                className={`p-1 rounded hover:bg-purple-100 ${node.data.aspectRatio === opt.r ? 'text-purple-600 bg-purple-50' : 'text-slate-400'}`}
                                title={opt.r}
                            >
                                <opt.i size={10} />
                            </button>
                        ))}
                     </div>
                </div>

                <div className="p-3 flex flex-col items-center justify-center min-h-[140px] bg-slate-50 relative group/img">
                    {node.data.imageBase64 ? (
                        <>
                            <img src={`data:image/png;base64,${node.data.imageBase64}`} className="w-full h-auto rounded shadow-sm object-cover" />
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </>
                    ) : (
                         <div className="text-center p-4">
                            <ImageIcon size={32} className="text-purple-200 mx-auto mb-2" />
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs shadow hover:bg-purple-700"
                            >
                                Generate
                            </button>
                         </div>
                    )}
                </div>
                
                {node.data.prompt && (
                    <div className="px-3 py-2 bg-white text-[10px] text-slate-500 border-t border-slate-100 line-clamp-2 rounded-b-lg">
                        {node.data.prompt}
                    </div>
                )}

                <div 
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-20 bg-white border-purple-300 hover:bg-purple-500 hover:border-white`}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
                />
            </div>
        );
    }

    // --- 4. AUDIT NODE (Status Card) ---
    if (node.type === 'audit') {
        const score = node.data.auditResult?.score || 0;
        let borderColor = 'border-slate-300';
        if (node.data.auditResult) {
            borderColor = score > 80 ? 'border-emerald-500' : score > 50 ? 'border-amber-500' : 'border-red-500';
        }

        return (
             <div 
                key={node.id}
                style={{ left: node.x, top: node.y, width: nodeWidth, height: 'auto' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute rounded-full shadow-sm overflow-visible flex flex-col transition-all duration-100 group z-10 border-4
                    ${isSelected ? `${borderColor} ring-4 ring-slate-100 scale-105 shadow-xl` : `${borderColor} hover:shadow-md`}
                    bg-white aspect-square flex items-center justify-center text-center
                `}
            >
                 <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-400 cursor-crosshair hover:bg-slate-600 z-20"
                    onMouseUp={(e) => handleInputMouseUp(e, node.id)}
                />

                <div className="flex flex-col items-center gap-1 p-6">
                     <ShieldCheck size={24} className={score > 80 ? 'text-emerald-500' : 'text-slate-400'} />
                     {node.data.auditResult ? (
                         <>
                            <span className="text-3xl font-bold text-slate-800">{score}</span>
                            <span className={`text-[10px] font-bold uppercase ${score > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{node.data.auditResult.status}</span>
                         </>
                     ) : (
                         <button onClick={(e) => { e.stopPropagation(); handleGenerate(node.id); }} className="text-xs font-bold text-slate-500 hover:text-slate-800">RUN CHECK</button>
                     )}
                </div>

                <div 
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-20 bg-white border-slate-400 hover:bg-slate-600 hover:border-white`}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
                />
            </div>
        );
    }

     // --- 5. NOTE NODE (Sticky Note) ---
     if (node.type === 'note') {
        return (
             <div 
                key={node.id}
                style={{ left: node.x, top: node.y, width: 200, height: 'auto' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute rounded shadow-sm overflow-visible flex flex-col transition-all duration-100 group z-10 
                    ${isSelected ? 'ring-4 ring-yellow-200 scale-105 shadow-xl' : 'hover:shadow-md rotate-1'}
                    bg-yellow-100 text-yellow-900 border border-yellow-200
                `}
            >
                 <div className="p-2 border-b border-yellow-200/50 flex justify-between items-center handle cursor-move">
                     <span className="text-[10px] font-bold text-yellow-700 uppercase flex items-center gap-1"><StickyNote size={10} /> Note</span>
                     <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-yellow-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                </div>
                <textarea 
                    value={node.data.content || ''}
                    onChange={(e) => updateNodeData(node.id, { content: e.target.value })}
                    className="w-full p-3 bg-transparent border-none resize-y min-h-[100px] text-sm font-handwriting outline-none placeholder-yellow-700/50"
                    placeholder="Write a note..."
                    onMouseDown={(e) => e.stopPropagation()} 
                />
            </div>
        );
    }

    // Fallback for other nodes (Export/Cover)
    return (
      <div 
        key={node.id}
        style={{ left: node.x, top: node.y, width: nodeWidth, height: 'auto' }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        className={`absolute w-[280px] rounded-xl shadow-sm border-2 transition-all duration-75 flex flex-col overflow-visible bg-white hover:shadow-md z-10
            ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-100' : 'border-indigo-200'}
        `}
      >
        <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-200 rounded-full border border-slate-400 cursor-crosshair z-20"
            onMouseUp={(e) => handleInputMouseUp(e, node.id)}
        />
        
        <div className="p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                {node.type === 'cover' ? <Book size={20} /> : <FileOutput size={20} />}
            </div>
            <div>
                <div className="font-bold text-sm text-slate-800">{node.data.label}</div>
                <div className="text-[10px] text-slate-500">{node.type === 'cover' ? 'Marketing Assets' : 'Format & Download'}</div>
            </div>
        </div>

        {node.type === 'export' && (
            <div className="px-4 pb-4">
                 <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Project Settings</p>
                    <p className="text-xs font-medium text-slate-700">{currentBookLayout.label}</p>
                    <p className="text-[10px] text-slate-500">{currentBookLayout.description}</p>
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadExport(); }}
                    className="w-full py-2 bg-slate-800 text-white text-xs rounded flex items-center justify-center gap-2 hover:bg-slate-900"
                >
                    <Download size={12} /> Download
                </button>
            </div>
        )}

         <div 
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border cursor-crosshair z-20 bg-white border-indigo-500 hover:bg-indigo-600`}
            onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
        />
      </div>
    );
  };

  // --- Component: Inspector Panel ---
  const renderInspector = () => {
    if (!selectedNodeId) return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <MousePointer2 size={48} className="mb-4 opacity-20" />
        <p className="font-medium text-slate-600">Select a node</p>
        <p className="text-xs">Click a node on the canvas to edit its properties.</p>
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100 w-full text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Project</p>
            <p className="text-xs text-slate-600 mb-1 flex justify-between">
                <span>Format</span>
                <span className="font-medium">{currentBookLayout.label}</span>
            </p>
            <p className="text-xs text-slate-600 mb-4 flex justify-between">
                <span>Nodes</span>
                <span className="font-medium">{nodes.length}</span>
            </p>
            <button 
                onClick={() => setIsProjectSettingsOpen(true)} 
                className="w-full py-2 border border-slate-200 text-slate-600 rounded text-xs hover:bg-white"
            >
                Settings
            </button>
        </div>
      </div>
    );

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return null;

    if (node.type === 'note') {
        return (
            <div className="h-full flex flex-col bg-white">
                 <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><StickyNote size={16} /> Note</h3>
                    <button onClick={() => deleteNode(node.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                <div className="p-4">
                     <textarea 
                        value={node.data.content || ''}
                        onChange={(e) => updateNodeData(node.id, { content: e.target.value })}
                        className="w-full h-64 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm font-sans outline-none"
                        placeholder="Write a longer note here..."
                    />
                </div>
            </div>
        )
    }

    return (
      <div className="h-full flex flex-col overflow-y-auto bg-white">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-20">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
             {node.type === 'story' && <FileText size={16} />}
             {node.type === 'audit' && <ShieldCheck size={16} />}
             {node.type === 'image' && <ImageIcon size={16} />}
             {node.type === 'cover' && <Book size={16} />}
             {node.type === 'export' && <FileOutput size={16} />}
             {node.data.label}
          </h3>
          <button onClick={() => deleteNode(node.id)} className="text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1">
           {/* Common: Label Edit */}
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Node Name</label>
              <input 
                value={node.data.label} 
                onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
                className="w-full p-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
              />
           </div>

           {/* Type: Story & Chapter Input */}
           {(node.type === 'story' || node.type === 'chapter') && (
             <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        Prompt
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Gemini 3</span>
                    </label>
                    <textarea 
                        value={node.data.prompt}
                        onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                        className="w-full p-3 text-sm border border-slate-200 rounded h-24 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                        placeholder="What should happen in this scene?"
                    />
                    <button 
                        onClick={() => handleGenerate(node.id)}
                        disabled={node.data.status === 'loading' || !node.data.prompt}
                        className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {node.data.status === 'loading' ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        Generate Text
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content Output</label>
                    <textarea 
                        value={node.data.content}
                        onChange={(e) => updateNodeData(node.id, { content: e.target.value })}
                        className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded h-64 focus:ring-2 focus:ring-brand-500 outline-none font-serif leading-relaxed"
                        placeholder="Generated story will appear here..."
                    />
                </div>
             </>
           )}

           {/* Type: Image Input */}
           {node.type === 'image' && (
             <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Description</label>
                    <textarea 
                        value={node.data.prompt}
                        onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                        className="w-full p-3 text-sm border border-slate-200 rounded h-24 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        placeholder="Describe the illustration..."
                    />
                     
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Style</label>
                            <select 
                                value={node.data.imageStyle || 'Digital Art'}
                                onChange={(e) => updateNodeData(node.id, { imageStyle: e.target.value as any })}
                                className="w-full text-xs p-2 border border-slate-200 rounded"
                            >
                                <option>Digital Art</option>
                                <option>Watercolor</option>
                                <option>Cartoon</option>
                                <option>Sketch</option>
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ratio</label>
                            <select 
                                value={node.data.aspectRatio || '1:1'}
                                onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value as any })}
                                className="w-full text-xs p-2 border border-slate-200 rounded"
                            >
                                <option value="1:1">Square (1:1)</option>
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="9:16">Portrait (9:16)</option>
                                <option value="4:3">Classic (4:3)</option>
                            </select>
                         </div>
                    </div>

                    <button 
                        onClick={() => handleGenerate(node.id)}
                        disabled={node.data.status === 'loading' || !node.data.prompt}
                        className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {node.data.status === 'loading' ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />}
                        Generate Illustration
                    </button>
                </div>
                {node.data.imageBase64 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <img src={`data:image/png;base64,${node.data.imageBase64}`} alt="Generated" className="w-full" />
                        <div className="p-2 bg-slate-50 flex justify-between items-center">
                             <span className="text-xs text-slate-500">Gemini 2.5 Flash Image</span>
                        </div>
                    </div>
                )}
             </>
           )}

           {/* Type: Audit Results */}
           {node.type === 'audit' && (
               <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                       <p className="text-xs text-slate-500 mb-2">Checks previous story nodes for:</p>
                       <div className="flex gap-2 justify-center text-[10px] font-bold uppercase text-slate-400">
                           <span>Repetition</span> • <span>Tone</span> • <span>Logic</span>
                       </div>
                   </div>

                   <button 
                        onClick={() => handleGenerate(node.id)}
                        disabled={node.data.status === 'loading'}
                        className="w-full py-3 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {node.data.status === 'loading' ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                        Run Audit
                    </button>

                   {node.data.auditResult && (
                       <div className="space-y-4 animate-fade-in">
                            <div className={`p-4 rounded-lg border-2 ${node.data.auditResult.score > 80 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-700">Quality Score</span>
                                    <span className="text-2xl font-bold">{node.data.auditResult.score}</span>
                                </div>
                                <div className="h-2 bg-white rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${node.data.auditResult.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${node.data.auditResult.score}%` }}
                                    ></div>
                                </div>
                            </div>

                            {node.data.auditResult.repetitions.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Repetitions Detected</h4>
                                    <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 bg-red-50 p-3 rounded border border-red-100">
                                        {node.data.auditResult.repetitions.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            )}

                            {node.data.auditResult.suggestions.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-brand-600 uppercase mb-2 flex items-center gap-1"><CheckCircle size={12} /> Suggestions</h4>
                                    <ul className="text-xs text-slate-600 space-y-2">
                                        {node.data.auditResult.suggestions.map((s, i) => (
                                            <li key={i} className="bg-slate-50 p-2 rounded border border-slate-100">{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                       </div>
                   )}
               </div>
           )}

            {/* Type: Book Cover */}
            {node.type === 'cover' && (
               <div className="space-y-4">
                   <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
                       <p className="text-xs text-indigo-700 mb-2 font-medium">Creates final assets for publishing</p>
                       <div className="flex gap-2 justify-center text-[10px] font-bold uppercase text-indigo-400">
                           <span>Titles</span> • <span>Blurbs</span> • <span>Art</span>
                       </div>
                   </div>

                   <button 
                        onClick={() => handleGenerate(node.id)}
                        disabled={node.data.status === 'loading'}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        {node.data.status === 'loading' ? <Loader2 className="animate-spin" size={14} /> : <LayoutTemplate size={14} />}
                        Generate Concepts
                    </button>

                   {node.data.coverData && (
                       <div className="space-y-6 animate-fade-in mt-4">
                            {/* Title Selection */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Title Options</h4>
                                {node.data.coverData.titles.map((t, i) => (
                                    <div key={i} className="p-2 border border-slate-200 rounded bg-white hover:border-indigo-300 cursor-pointer text-sm font-serif text-slate-800">
                                        {t}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Front Cover Generation */}
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                                    Front Cover
                                    <span className="text-[10px] text-slate-400">NanoBanana</span>
                                </h4>
                                <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                    {node.data.coverData.frontCoverImagePrompt.substring(0, 100)}...
                                </p>
                                <button 
                                    onClick={() => handleGenerateCoverArt(node.id, 'front')}
                                    className="w-full py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-medium"
                                >
                                    Generate Front Art
                                </button>
                                {node.data.coverData.frontCoverImageBase64 && (
                                    <img src={`data:image/png;base64,${node.data.coverData.frontCoverImageBase64}`} className="w-full rounded shadow-md mt-2" />
                                )}
                            </div>

                             {/* Back Cover Generation */}
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Back Cover Blurb</h4>
                                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
                                    {node.data.coverData.backCoverBlurb}
                                </p>
                                <button 
                                    onClick={() => handleGenerateCoverArt(node.id, 'back')}
                                    className="w-full py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-medium"
                                >
                                    Generate Back Art
                                </button>
                                {node.data.coverData.backCoverImageBase64 && (
                                    <img src={`data:image/png;base64,${node.data.coverData.backCoverImageBase64}`} className="w-full rounded shadow-md mt-2" />
                                )}
                            </div>
                       </div>
                   )}
               </div>
           )}

           {/* Type: Export Node */}
           {node.type === 'export' && (
               <div className="space-y-6 text-center">
                   <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                       <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                       <h3 className="text-lg font-serif font-bold text-slate-800 mb-1">Ready to Publish?</h3>
                       <p className="text-xs text-slate-500">Compile your story nodes into a single file.</p>
                   </div>

                   <div className="text-left p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                        <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">Current Format</p>
                        <p className="text-sm font-bold text-slate-800">{currentBookLayout.label}</p>
                        <p className="text-xs text-slate-600">{currentBookLayout.description}</p>
                        <button onClick={() => setIsProjectSettingsOpen(true)} className="text-[10px] text-brand-600 underline mt-2">Change Format</button>
                   </div>
                   
                   <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadExport(); }}
                        className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                        <Download size={18} />
                        Download HTML Book
                    </button>
               </div>
           )}
        </div>
      </div>
    );
  };

  // --- Component: Book Layout Selector (Visual Cards) ---
  const renderBookLayoutSelector = () => {
      return (
          <div className="grid grid-cols-3 gap-4">
              {BOOK_PRESETS.map((preset) => (
                  <button
                    key={preset.presetId}
                    onClick={() => setCurrentBookLayout(preset)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left group relative
                        ${currentBookLayout.presetId === preset.presetId ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300 bg-white'}
                    `}
                  >
                      {currentBookLayout.presetId === preset.presetId && (
                          <div className="absolute top-2 right-2 text-brand-500"><Check size={16} /></div>
                      )}
                      {/* Visual Mockup */}
                      <div className="w-full aspect-[4/3] bg-slate-100 rounded mb-3 flex items-center justify-center overflow-hidden">
                          <div 
                            style={{ 
                                aspectRatio: `${preset.width}/${preset.height}`, 
                                width: preset.width > preset.height ? '60%' : 'auto', 
                                height: preset.height >= preset.width ? '70%' : 'auto' 
                            }}
                            className="bg-white shadow-md border border-slate-200"
                          ></div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 w-full">{preset.label}</h3>
                      <p className="text-[10px] text-slate-500 w-full">{preset.description}</p>
                  </button>
              ))}
          </div>
      );
  };

  // --- Render ---
  const sortedNodes = [...nodes].sort((a, b) => a.y - b.y);
  
  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden bg-slate-50 relative">
        
        {/* Magic Start Modal */}
        {isMagicModalOpen && (
            <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="text-brand-500" /> Magic Start
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Step {magicStep} of 2</p>
                        </div>
                        <button onClick={() => setIsMagicModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    {magicStep === 1 && (
                        <div className="space-y-6">
                             <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Book Topic</label>
                                    <input 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="e.g. A shy dragon who learns to be brave"
                                        value={magicTopic}
                                        onChange={e => setMagicTopic(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Target Audience</label>
                                    <input 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="e.g. Kids aged 5-7"
                                        value={magicAudience}
                                        onChange={e => setMagicAudience(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setMagicStep(2)}
                                disabled={!magicTopic || !magicAudience}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Next: Choose Layout
                            </button>
                        </div>
                    )}

                    {magicStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Select Book Format</h3>
                                {renderBookLayoutSelector()}
                            </div>

                             <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setMagicStep(1)}
                                    className="px-6 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleMagicStart}
                                    disabled={isMagicLoading}
                                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isMagicLoading ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                                    {isMagicLoading ? 'Designing Story...' : 'Generate Outline'}
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Project Settings Modal */}
        {isProjectSettingsOpen && (
             <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Settings2 className="text-slate-500" /> Project Settings
                        </h2>
                        <button onClick={() => setIsProjectSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div>
                         <h3 className="text-sm font-bold text-slate-700 mb-3">Book Format</h3>
                         {renderBookLayoutSelector()}
                    </div>
                    <div className="flex justify-end">
                         <button 
                            onClick={() => setIsProjectSettingsOpen(false)}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* LEFT: Node Toolbar (Palette) */}
        <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-20 shadow-sm">
            <button onClick={() => setIsMagicModalOpen(true)} title="Magic Start" className="p-3 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors ring-2 ring-brand-200"><Sparkles size={20} /></button>
            <div className="h-px w-8 bg-slate-200 my-2"></div>
            <button onClick={() => addNode('chapter')} title="Add Chapter" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors"><BookOpen size={20} /></button>
            <button onClick={() => addNode('story')} title="Add Story Scene" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand-600 hover:text-white transition-colors"><FileText size={20} /></button>
            <button onClick={() => addNode('image')} title="Add Image" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-purple-600 hover:text-white transition-colors"><ImageIcon size={20} /></button>
            <button onClick={() => addNode('note')} title="Add Note" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-yellow-400 hover:text-yellow-900 transition-colors"><StickyNote size={20} /></button>
            <div className="h-px w-8 bg-slate-200 my-2"></div>
            <button onClick={() => addNode('audit')} title="Add Audit Node" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-colors"><ShieldCheck size={20} /></button>
            <button onClick={() => addNode('cover')} title="Add Book Cover" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white transition-colors"><Book size={20} /></button>
             <button onClick={() => addNode('export')} title="Add Export Node" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-600 hover:text-white transition-colors"><FileOutput size={20} /></button>
             
             <div className="mt-auto space-y-2">
                 <button onClick={clearProject} title="Clear Project" className="p-3 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash size={20} /></button>
                 <button onClick={() => setIsProjectSettingsOpen(true)} title="Project Settings" className="p-3 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><Settings2 size={20} /></button>
             </div>
        </div>

        {/* CENTER: Canvas */}
        <div 
            className={`flex-1 relative overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]`}
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onWheel={handleWheel}
            style={{
                backgroundPosition: `${viewport.x}px ${viewport.y}px`,
                backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`
            }}
        >
            {/* Container for all pannable content with Transform */}
            <div 
                style={{ 
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`, 
                    transformOrigin: '0 0',
                    width: '100%', 
                    height: '100%', 
                    position: 'absolute', 
                    top: 0, 
                    left: 0 
                }}
            >
                 {/* Connections Layer */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                    </defs>
                    
                    {/* Render Established Connections */}
                    {connections.map((conn) => {
                        const source = nodes.find(n => n.id === conn.source);
                        const target = nodes.find(n => n.id === conn.target);
                        if (!source || !target) return null;

                        // Calculate dynamic heights for connection start/end points
                        const sourceHeight = source.type === 'story' && source.data.content ? 300 : 
                                            source.type === 'image' && source.data.imageBase64 ? 320 : 180;

                        // Start at bottom center of source, End at top center of target
                        const startX = source.x + 140; 
                        const startY = source.y + sourceHeight + 5; // Little padding
                        const endX = target.type === 'note' ? target.x + 100 : target.x + 140;
                        const endY = target.y - 15;

                        const pathD = `M ${startX} ${startY} C ${startX} ${startY + 50}, ${endX} ${endY - 50}, ${endX} ${endY}`;

                        return (
                            <g 
                                key={conn.id} 
                                onDoubleClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                                className="group cursor-pointer"
                                style={{ pointerEvents: 'all' }}
                            >
                                {/* Invisible Hit Path (Thicker) */}
                                <path 
                                    d={pathD}
                                    stroke="transparent"
                                    strokeWidth="20"
                                    fill="none"
                                />
                                {/* Visible Path */}
                                <path 
                                    d={pathD}
                                    stroke="#cbd5e1"
                                    strokeWidth="3"
                                    fill="none"
                                    markerEnd="url(#arrowhead)"
                                    className="group-hover:stroke-red-400 transition-colors"
                                />
                            </g>
                        );
                    })}

                    {/* Render Temp Connection Line while Dragging */}
                    {connectingSourceId && tempConnectionEnd && (() => {
                        const source = nodes.find(n => n.id === connectingSourceId);
                        if (!source) return null;
                        
                        const sourceHeight = source.type === 'story' && source.data.content ? 300 : 
                                            source.type === 'image' && source.data.imageBase64 ? 320 : 180;

                        return (
                             <path 
                                d={`M ${source.x + 140} ${source.y + sourceHeight} C ${source.x + 140} ${source.y + sourceHeight + 50}, ${tempConnectionEnd.x} ${tempConnectionEnd.y - 50}, ${tempConnectionEnd.x} ${tempConnectionEnd.y}`}
                                stroke="#94a3b8"
                                strokeWidth="3"
                                strokeDasharray="5,5"
                                fill="none"
                            />
                        );
                    })()}
                 </svg>

                 {/* Nodes Layer */}
                 {nodes.map(renderNode)}
            </div>
             
            {/* Viewport Controls Overlay */}
             <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 z-20">
                 <button 
                    onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} 
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600" 
                    title="Zoom Out"
                >
                     <ZoomOut size={16} />
                 </button>
                 <span 
                    className="text-xs font-mono w-12 text-center cursor-pointer select-none text-slate-700"
                    onClick={() => { setZoom(1); setViewport({x: 0, y: 0}); }}
                    title="Reset View"
                >
                     {Math.round(zoom * 100)}%
                 </span>
                 <button 
                    onClick={() => setZoom(z => Math.min(3, z + 0.1))} 
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                    title="Zoom In"
                >
                     <ZoomIn size={16} />
                 </button>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <button 
                    onClick={() => { setZoom(1); setViewport({x: 0, y: 0}); }}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                    title="Reset to Center"
                 >
                     <RotateCcw size={16} />
                 </button>
             </div>

            {/* Stats Overlay */}
             <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-mono text-slate-400 shadow-sm border border-slate-200 pointer-events-none select-none flex items-center gap-2">
                 {nodes.length} Nodes • {connections.length} Links
                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Auto-saved"></span>
             </div>
        </div>

        {/* RIGHT: Inspector Panel */}
        <div className={`w-96 bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 transform ${selectedNodeId ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 bottom-0 z-30`}>
            {renderInspector()}
        </div>
    </div>
  );
};
