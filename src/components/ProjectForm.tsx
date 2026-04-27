import React, { useState } from 'react';
import { Plus, X, Trash2, Github, Edit2 } from 'lucide-react';
import { Project, ResourceCost } from '../types';

interface ProjectFormProps {
  onAdd: (project: Omit<Project, 'id' | 'actualHours' | 'createdAt'>) => void;
  onUpdate?: (projectId: string, project: Partial<Project>) => void;
  onClose: () => void;
  initialData?: Project;
}

export default function ProjectForm({ onAdd, onUpdate, onClose, initialData }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    client: initialData?.client || '',
    budget: initialData?.budget.toString() || '',
    estimatedHours: initialData?.estimatedHours.toString() || '',
    actualHours: initialData?.actualHours.toString() || '0',
    status: initialData?.status || 'active' as Project['status'],
    githubRepo: initialData?.githubRepo || '',
    deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
    achievements: initialData?.achievements || '',
    paymentStatus: initialData?.paymentStatus || 'unpaid' as Project['paymentStatus'],
  });

  const [resources, setResources] = useState<Omit<ResourceCost, 'id'>[]>(
    initialData?.resourceCosts?.map(({ id, ...rest }) => rest) || []
  );

  const addResource = () => {
    setResources([...resources, { name: '', amount: 0 }]);
  };

  const updateResource = (index: number, field: keyof Omit<ResourceCost, 'id'>, value: string | number) => {
    const newResources = [...resources];
    newResources[index] = { ...newResources[index], [field]: value };
    setResources(newResources);
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectData: any = {
      name: formData.name,
      client: formData.client,
      budget: Number(formData.budget),
      estimatedHours: Number(formData.estimatedHours),
      actualHours: Number(formData.actualHours),
      status: formData.status,
      githubRepo: formData.githubRepo || "",
      deadline: formData.deadline ? new Date(formData.deadline).getTime() : null,
      achievements: formData.achievements || "",
      paymentStatus: formData.paymentStatus,
      resourceCosts: resources.length > 0 ? resources.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9) })) : [],
    };

    // Remove undefined values just in case, though we used "" and null above
    Object.keys(projectData).forEach(key => {
      if (projectData[key] === undefined) {
        delete projectData[key];
      }
    });

    if (initialData && onUpdate) {
      onUpdate(initialData.id, projectData);
    } else {
      onAdd(projectData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">
              {initialData ? 'Edit Project' : 'New Project'}
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {initialData ? 'Refine your project parameters' : 'Define your next venture'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Project Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Website Redesign"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Client</label>
              <input
                required
                type="text"
                placeholder="e.g. Acme Corp"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.client}
                onChange={e => setFormData({ ...formData, client: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Budget (KES)</label>
              <input
                required
                type="number"
                placeholder="0.00"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Est. Hours</label>
              <input
                required
                type="number"
                placeholder="0"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.estimatedHours}
                onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
              />
            </div>
          </div>

          {initialData && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Logged Hours (Actual)</label>
              <input
                required
                type="number"
                placeholder="0"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.actualHours}
                onChange={e => setFormData({ ...formData, actualHours: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Deadline Date</label>
              <input
                type="date"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Days from Today</label>
              <input
                type="number"
                placeholder="e.g. 30"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                onChange={e => {
                  const days = parseInt(e.target.value);
                  if (!isNaN(days)) {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    setFormData({ ...formData, deadline: date.toISOString().split('T')[0] });
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Status</label>
              <select
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium appearance-none"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Project['status'] })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Payment Status</label>
              <select
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium appearance-none"
                value={formData.paymentStatus}
                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as Project['paymentStatus'] })}
              >
                <option value="unpaid">Unpaid</option>
                <option value="partially-paid">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
              <Github size={14} />
              GitHub Repository
            </label>
            <input
              type="text"
              placeholder="owner/repo"
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
              value={formData.githubRepo}
              onChange={e => setFormData({ ...formData, githubRepo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Achievements & Learnings</label>
            <textarea
              placeholder="What did you learn? What were the key achievements?"
              rows={4}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none"
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Resource Costs</label>
              <button
                type="button"
                onClick={addResource}
                className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center gap-2"
              >
                <Plus size={14} />
                Add Resource
              </button>
            </div>
            
            <div className="space-y-3">
              {resources.map((resource, index) => (
                <div key={index} className="flex gap-3 items-center animate-in slide-in-from-right-4 duration-300">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Resource name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white outline-none focus:border-brand-500 text-sm font-medium"
                      value={resource.name}
                      onChange={e => updateResource(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Cost"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white outline-none focus:border-brand-500 text-sm font-medium"
                      value={resource.amount || ''}
                      onChange={e => updateResource(index, 'amount', Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeResource(index)}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {resources.length === 0 && (
                <div className="py-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                  <Plus size={24} className="mb-2 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No extra resources</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold uppercase tracking-widest py-5 rounded-[2rem] transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center gap-3 mt-6 active:scale-[0.98]"
          >
            {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
            {initialData ? 'Update Project' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}
