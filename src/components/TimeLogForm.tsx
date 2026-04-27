import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Project } from '../types';

interface TimeLogFormProps {
  projects: Project[];
  onLog: (projectId: string, hours: number, description: string) => void;
  onClose: () => void;
}

export default function TimeLogForm({ projects, onLog, onClose }: TimeLogFormProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !hours) return;
    onLog(projectId, Number(hours), description);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">Log Time</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Record your progress</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Project</label>
            <select
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium appearance-none"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Hours Worked</label>
            <div className="relative">
              <input
                required
                type="number"
                step="0.1"
                placeholder="0.0"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={hours}
                onChange={e => setHours(e.target.value)}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                <Clock size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Description (Optional)</label>
            <textarea
              placeholder="What did you work on?"
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all min-h-[120px] resize-none font-medium"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold uppercase tracking-widest py-5 rounded-[2rem] transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center gap-3 mt-2 active:scale-[0.98]"
          >
            <Clock size={20} />
            Log Hours
          </button>
        </form>
      </div>
    </div>
  );
}
