import React, { useState, useCallback } from 'react';
import { generateImage, editImage } from '../services/geminiService';
import { GeneratedImage } from '../types';
import { Loader2, Wand2, Eraser, Download, History, RefreshCw, ImagePlus } from 'lucide-react';

export const ImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      let base64 = '';
      let newImage: GeneratedImage;

      if (mode === 'generate' || !currentImage) {
        // Fresh generation
        base64 = await generateImage(prompt);
        newImage = {
          id: crypto.randomUUID(),
          base64,
          prompt: prompt,
          timestamp: Date.now(),
          isEdited: false
        };
      } else {
        // Editing existing image
        base64 = await editImage(currentImage.base64, prompt);
        newImage = {
          id: crypto.randomUUID(),
          base64,
          prompt: `Edited: ${prompt}`,
          timestamp: Date.now(),
          isEdited: true
        };
      }

      setCurrentImage(newImage);
      setHistory(prev => [newImage, ...prev]);
      // Don't clear prompt on edit so user can refine
      if (mode === 'generate') setPrompt(''); 
    } catch (error) {
      alert('Failed to generate/edit image. See console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, mode, currentImage]);

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${img.base64}`;
    link.download = `storycraft-${img.id}.png`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar Controls */}
      <div className="lg:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Wand2 className="text-brand-600" size={20} />
                NanoBanana Studio
            </h2>
            <p className="text-xs text-slate-500 mt-1">Powered by Gemini 2.5 Flash Image</p>
        </div>

        <div className="p-5 flex-1 flex flex-col gap-6 overflow-y-auto">
            {/* Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setMode('generate')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'generate' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ImagePlus size={16} /> Generate
                </button>
                <button 
                    onClick={() => setMode('edit')}
                    disabled={!currentImage}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'edit' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} ${!currentImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Eraser size={16} /> Edit
                </button>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                    {mode === 'generate' ? 'Describe your scene' : 'How should we change this image?'}
                </label>
                <textarea 
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none h-32 transition-shadow"
                    placeholder={mode === 'generate' ? "A brave robot standing on a mars rover..." : "Add a vintage filter, remove the background..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGenerate();
                        }
                    }}
                />
                <p className="text-xs text-slate-400 flex justify-between">
                    <span>{mode === 'edit' ? 'Natural language editing enabled' : 'Be descriptive for best results'}</span>
                    <span>Cmd+Enter to run</span>
                </p>
            </div>

            {/* Action Button */}
            <button 
                onClick={handleGenerate}
                disabled={isLoading || !prompt}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        {mode === 'generate' ? 'Dreaming...' : 'Refining...'}
                    </>
                ) : (
                    <>
                        {mode === 'generate' ? <Wand2 size={18} /> : <RefreshCw size={18} />}
                        {mode === 'generate' ? 'Generate Image' : 'Update Image'}
                    </>
                )}
            </button>

            {/* History Strip */}
            {history.length > 0 && (
                <div className="mt-auto pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <History size={12} /> Session History
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {history.slice(0, 6).map((img) => (
                            <button 
                                key={img.id}
                                onClick={() => {
                                    setCurrentImage(img);
                                    setMode('edit');
                                    setPrompt('');
                                }}
                                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative group ${currentImage?.id === img.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent hover:border-slate-300'}`}
                            >
                                <img 
                                    src={`data:image/png;base64,${img.base64}`} 
                                    alt="Thumbnail" 
                                    className="w-full h-full object-cover" 
                                />
                                {img.isEdited && (
                                    <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white" title="Edited"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="lg:col-span-8 bg-slate-900 rounded-xl overflow-hidden flex flex-col shadow-inner relative group">
        {/* Canvas Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {currentImage && (
                <button 
                    onClick={() => handleDownload(currentImage)}
                    className="p-2 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm rounded-lg transition-colors"
                    title="Download PNG"
                >
                    <Download size={20} />
                </button>
            )}
        </div>

        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            {currentImage ? (
                <div className="relative shadow-2xl rounded-lg overflow-hidden max-h-full">
                    <img 
                        src={`data:image/png;base64,${currentImage.base64}`} 
                        alt="Generated Content" 
                        className="max-w-full max-h-[600px] object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <p className="text-white text-sm font-medium line-clamp-2">{currentImage.prompt}</p>
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-600">
                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Wand2 size={40} className="text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-400">Ready to create</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Describe a scene to generate an image, then use text to refine it.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};