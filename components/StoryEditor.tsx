import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Settings2, Share2, FileText, Image as ImageIcon, 
  Sparkles, BookOpen, Download, Loader2, ShieldCheck, 
  AlertTriangle, CheckCircle, X, Move, GripVertical, Trash2,
  Book, LayoutTemplate
} from 'lucide-react';
import { generateStoryContent, generateImage, generateAuditReport, generateCoverIdeas } from '../services/geminiService';
import { StoryNode, NodeType, NodeData } from '../types';

// --- Initial State for Demo ---
const INITIAL_NODES: StoryNode[] = [
  { id: '1', type: 'chapter', x: 100, y: 50, data: { label: 'Chapter 1: The Awakening', prompt: 'A robot wakes up in a scrapyard', content: '', status: 'idle' } },
  { id: '2', type: 'story', x: 100, y: 200, data: { label: 'Scene 1', prompt: 'Describe Rusty opening his eyes for the first time.', content: 'Rusty blinked. His optical sensors adjusted to the harsh sunlight filtering through the piles of scrap metal. "System online," he chirped, his voice raspy with static.', status: 'success' } },
  { id: '3', type: 'story', x: 100, y: 450, data: { label: 'Scene 2', prompt: 'Rusty tries to move his rusted joints.', content: 'He tried to lift his arm, but it was jammed. With a loud CREAK, the gears finally turned. He was old, but he was alive.', status: 'success' } },
  { id: '4', type: 'audit', x: 100, y: 700, data: { label: 'Chapter Audit', status: 'idle' } },
];

export const StoryEditor: React.FC = () => {
  const [nodes, setNodes] = useState<StoryNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Drag & Drop Logic ---
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent canvas click
    setSelectedNodeId(id);
    setDraggingId(id);
    
    const node = nodes.find(n => n.id === id);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - offset.x;
      const newY = e.clientY - rect.top - offset.y;

      setNodes(prev => prev.map(n => 
        n.id === draggingId ? { ...n, x: Math.round(newX / 10) * 10, y: Math.round(newY / 10) * 10 } : n
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // --- Node Operations ---
  const addNode = (type: NodeType) => {
    const id = crypto.randomUUID();
    const yPos = nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + 200 : 100;
    
    const newNode: StoryNode = {
      id,
      type,
      x: 100,
      y: yPos,
      data: {
        label: type === 'audit' ? 'Quality Check' : type === 'cover' ? 'Book Cover' : 'New Node',
        status: 'idle',
        prompt: '',
        content: ''
      }
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  // --- AI Actions ---
  const handleGenerate = async (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    updateNodeData(id, { status: 'loading' });

    try {
      if (node.type === 'story' || node.type === 'chapter') {
        // Gather context from previous nodes for better continuity
        const prevNodes = nodes.filter(n => n.y < node.y && n.type === 'story');
        const context = prevNodes.map(n => n.data.content).join('\n');
        const text = await generateStoryContent(node.data.prompt || '', context);
        updateNodeData(id, { content: text, status: 'success' });
      } 
      else if (node.type === 'image') {
        const base64 = await generateImage(node.data.prompt || '');
        updateNodeData(id, { imageBase64: base64, status: 'success' });
      }
      else if (node.type === 'audit') {
        // Gather all text from story nodes above this audit node
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
        // Generate concepts first
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
    
    // Styles based on type
    const baseStyles = "absolute w-[280px] rounded-xl shadow-sm border-2 transition-all duration-200 flex flex-col overflow-hidden bg-white";
    let typeStyles = "";
    let icon = null;

    switch (node.type) {
      case 'chapter':
        typeStyles = "border-slate-800 shadow-md";
        icon = <BookOpen size={14} className="text-slate-100" />;
        break;
      case 'story':
        typeStyles = isSelected ? "border-brand-500 ring-4 ring-brand-100" : "border-brand-200 hover:border-brand-400";
        icon = <FileText size={14} className="text-brand-600" />;
        break;
      case 'image':
        typeStyles = isSelected ? "border-purple-500 ring-4 ring-purple-100" : "border-purple-200 hover:border-purple-400";
        icon = <ImageIcon size={14} className="text-purple-600" />;
        break;
      case 'audit':
        const scoreColor = !node.data.auditResult ? 'border-slate-300' : 
           node.data.auditResult.score > 80 ? 'border-emerald-500 bg-emerald-50' : 
           node.data.auditResult.score > 50 ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50';
        typeStyles = `${scoreColor} ${isSelected ? 'ring-4 ring-slate-200' : ''}`;
        icon = <ShieldCheck size={14} className="text-slate-600" />;
        break;
      case 'cover':
        typeStyles = isSelected ? "border-indigo-500 ring-4 ring-indigo-100 shadow-lg" : "border-indigo-200 bg-indigo-50 hover:border-indigo-400";
        icon = <Book size={14} className="text-indigo-600" />;
        break;
      default:
        typeStyles = "border-slate-200";
    }

    return (
      <div 
        key={node.id}
        style={{ left: node.x, top: node.y }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        className={`${baseStyles} ${typeStyles} z-10`}
      >
        {/* Node Header */}
        <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center cursor-move ${node.type === 'chapter' ? 'bg-slate-800 text-white' : 'bg-slate-50 border-b border-slate-100'}`}>
          <span className="flex items-center gap-2">{icon} {node.data.label}</span>
          <GripVertical size={12} className="opacity-20" />
        </div>

        {/* Node Body Preview */}
        <div className="p-3 text-xs text-slate-600 max-h-[120px] overflow-hidden relative">
           {node.type === 'image' && node.data.imageBase64 ? (
               <img src={`data:image/png;base64,${node.data.imageBase64}`} className="w-full h-24 object-cover rounded" />
           ) : node.type === 'audit' && node.data.auditResult ? (
               <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                      <span>Score: {node.data.auditResult.score}/100</span>
                      <span className={node.data.auditResult.status === 'pass' ? 'text-emerald-600' : 'text-amber-600'}>{node.data.auditResult.status.toUpperCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{node.data.auditResult.suggestions[0]}</div>
               </div>
           ) : node.type === 'cover' && node.data.coverData ? (
               <div className="space-y-1">
                   <div className="font-serif font-bold text-indigo-900">{node.data.coverData.titles[0]}</div>
                   {node.data.coverData.frontCoverImageBase64 ? (
                       <img src={`data:image/png;base64,${node.data.coverData.frontCoverImageBase64}`} className="w-full h-16 object-cover rounded mt-1" />
                   ) : (
                       <div className="p-2 bg-indigo-100 rounded text-indigo-500 italic text-[10px]">Front cover draft ready</div>
                   )}
               </div>
           ) : (
               <p className="line-clamp-4">{node.data.content || node.data.prompt || "Empty node..."}</p>
           )}
           
           {/* Gradient Overlay for overflow */}
           {!node.data.imageBase64 && !node.data.coverData?.frontCoverImageBase64 && <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent"></div>}
        </div>

        {/* Status Footer */}
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${node.data.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {node.data.status || 'idle'}
            </span>
            {node.data.status === 'loading' && <Loader2 size={12} className="animate-spin text-brand-600" />}
        </div>
      </div>
    );
  };

  // --- Component: Inspector Panel ---
  const renderInspector = () => {
    if (!selectedNodeId) return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <Move size={48} className="mb-4 opacity-20" />
        <p>Select a node to edit its properties</p>
      </div>
    );

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return null;

    return (
      <div className="h-full flex flex-col overflow-y-auto bg-white">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-20">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
             {node.type === 'story' && <FileText size={16} />}
             {node.type === 'audit' && <ShieldCheck size={16} />}
             {node.type === 'image' && <ImageIcon size={16} />}
             {node.type === 'cover' && <Book size={16} />}
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
                             <button className="text-xs text-purple-600 font-medium hover:underline">Download</button>
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
        </div>
      </div>
    );
  };

  // --- Rendering Lines ---
  // Simple SVG lines connecting nodes in order of Y position for demo purposes
  // In a full graph lib, this would be based on actual adjacency lists
  const sortedNodes = [...nodes].sort((a, b) => a.y - b.y);
  
  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden bg-slate-50">
        
        {/* LEFT: Node Toolbar (Palette) */}
        <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-20 shadow-sm">
            <button onClick={() => addNode('chapter')} title="Add Chapter" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors"><BookOpen size={20} /></button>
            <button onClick={() => addNode('story')} title="Add Story Scene" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand-600 hover:text-white transition-colors"><FileText size={20} /></button>
            <button onClick={() => addNode('image')} title="Add Image" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-purple-600 hover:text-white transition-colors"><ImageIcon size={20} /></button>
            <div className="h-px w-8 bg-slate-200 my-2"></div>
            <button onClick={() => addNode('audit')} title="Add Audit Node" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-colors"><ShieldCheck size={20} /></button>
            <button onClick={() => addNode('cover')} title="Add Book Cover" className="p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white transition-colors"><Book size={20} /></button>
        </div>

        {/* CENTER: Canvas */}
        <div 
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            ref={canvasRef}
        >
             {/* Connections Layer */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                </defs>
                {sortedNodes.map((node, i) => {
                    if (i === sortedNodes.length - 1) return null;
                    const nextNode = sortedNodes[i + 1];
                    return (
                        <path 
                            key={`link-${i}`}
                            d={`M ${node.x + 140} ${node.y + 100} C ${node.x + 140} ${node.y + 150}, ${nextNode.x + 140} ${nextNode.y - 50}, ${nextNode.x + 140} ${nextNode.y}`}
                            stroke="#cbd5e1"
                            strokeWidth="3"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}
             </svg>

             {/* Nodes Layer */}
             {nodes.map(renderNode)}
             
             <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-mono text-slate-400 shadow-sm border border-slate-200 pointer-events-none">
                 {nodes.length} Nodes • Project: The Lost Robot
             </div>
        </div>

        {/* RIGHT: Inspector Panel */}
        <div className={`w-96 bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 transform ${selectedNodeId ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 bottom-0 z-30`}>
            {renderInspector()}
        </div>
    </div>
  );
};