import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BookOpen, PenTool, Image as ImageIcon, TrendingUp } from 'lucide-react';

const data = [
  { name: 'Mon', words: 4000, images: 24 },
  { name: 'Tue', words: 3000, images: 18 },
  { name: 'Wed', words: 2000, images: 35 },
  { name: 'Thu', words: 2780, images: 15 },
  { name: 'Fri', words: 1890, images: 40 },
  { name: 'Sat', words: 2390, images: 30 },
  { name: 'Sun', words: 3490, images: 20 },
];

const StatCard = ({ icon: Icon, title, value, trend }: { icon: any, title: string, value: string, trend: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center">
        <TrendingUp size={12} className="mr-1" /> {trend}
      </p>
    </div>
    <div className="p-3 bg-brand-50 text-brand-600 rounded-lg">
      <Icon size={20} />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} title="Active Projects" value="12" trend="+2 this week" />
        <StatCard icon={PenTool} title="Words Written" value="124k" trend="+12% vs last month" />
        <StatCard icon={ImageIcon} title="Images Generated" value="843" trend="+5% today" />
        <StatCard icon={TrendingUp} title="Story Nodes" value="2.4k" trend="All systems operational" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Creative Output</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="words" fill="#0d9488" radius={[4, 4, 0, 0]} name="Words" />
                <Bar dataKey="images" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Images" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center group">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <BookOpen size={16} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-slate-700">New Storybook</span>
                <span className="block text-xs text-slate-500">Start from a template</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center group">
               <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <ImageIcon size={16} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Image Studio</span>
                <span className="block text-xs text-slate-500">Create or edit assets</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center group">
               <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <PenTool size={16} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Blog Post</span>
                <span className="block text-xs text-slate-500">SEO optimized draft</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};