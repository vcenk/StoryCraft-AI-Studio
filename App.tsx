import React, { useState } from 'react';
import { AppView } from './types';
import { Dashboard } from './components/Dashboard';
import { StoryEditor } from './components/StoryEditor';
import { ImageStudio } from './components/ImageStudio';
import { 
  LayoutDashboard, 
  BookOpen, 
  Image as ImageIcon, 
  PenTool, 
  Settings, 
  CreditCard, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${
        currentView === view 
          ? 'bg-brand-50 text-brand-700 font-medium shadow-sm ring-1 ring-brand-200' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} className={`mr-3 ${currentView === view ? 'text-brand-600' : 'text-slate-400'}`} />
      <span className="text-sm">{label}</span>
      {currentView === view && <ChevronRight size={14} className="ml-auto text-brand-500" />}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-brand-700 font-bold text-xl tracking-tight">
            <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
                <Sparkles size={18} />
            </div>
            StoryCraft
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Workspace</p>
          <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={AppView.STORY_EDITOR} icon={BookOpen} label="Story Creator" />
          <NavItem view={AppView.IMAGE_STUDIO} icon={ImageIcon} label="Image Studio" />
          <NavItem view={AppView.BLOG_CREATOR} icon={PenTool} label="Blog Creator" />

          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">Account</p>
          <button className="w-full flex items-center px-3 py-2.5 rounded-lg mb-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
            <Settings size={18} className="mr-3 text-slate-400" />
            <span className="text-sm">Settings</span>
          </button>
          <button className="w-full flex items-center px-3 py-2.5 rounded-lg mb-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
            <CreditCard size={18} className="mr-3 text-slate-400" />
            <span className="text-sm">Billing</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
              JD
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-700 truncate">John Doe</p>
              <p className="text-xs text-slate-500 truncate">Pro Plan</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 text-center bg-white p-2 rounded border border-slate-200">
             <span className="font-mono text-brand-600">245</span> credits remaining
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h1 className="text-lg font-semibold text-slate-800">
            {currentView === AppView.DASHBOARD && 'Overview'}
            {currentView === AppView.STORY_EDITOR && 'Story Editor'}
            {currentView === AppView.IMAGE_STUDIO && 'NanoBanana Image Studio'}
            {currentView === AppView.BLOG_CREATOR && 'Blog Post Wizard'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">v1.2.0 Beta</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === AppView.DASHBOARD && <Dashboard />}
            {currentView === AppView.STORY_EDITOR && <StoryEditor />}
            {currentView === AppView.IMAGE_STUDIO && <ImageStudio />}
            {currentView === AppView.BLOG_CREATOR && (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                    <PenTool size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Blog Creator Module</p>
                    <p className="text-sm">Coming in Phase 3</p>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;