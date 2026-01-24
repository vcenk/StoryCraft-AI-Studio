import StoryCanvas from '@/components/StoryCanvas';

export default function Home() {
  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Header / Nav Placeholder */}
      <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-500"></div>
            <h1 className="font-bold text-slate-800 tracking-tight">StoryArchitect AI</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
             <span>Book DNA</span>
             <span className="text-indigo-600 font-medium">Canvas</span>
             <span>Preview</span>
        </div>
      </header>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <StoryCanvas />
      </div>
    </main>
  );
}
