import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Github, Loader2, FileText, DollarSign, Calculator, AlertCircle } from 'lucide-react';
import { Project, ResourceCost } from '../types';
import { formatCurrency, formatHours } from '../utils';
import { generateMockCommits } from '../services/mockGithubService';

interface InvoiceModalProps {
  project: Project;
  onClose: () => void;
}

interface Commit {
  sha?: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export default function InvoiceModal({ project, onClose }: InvoiceModalProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommits();
  }, [project.githubRepo, project.name]);

  const fetchCommits = async () => {
    setLoading(true);
    setError(null);
    try {
      if (project.githubRepo) {
        const response = await fetch(`https://api.github.com/repos/${project.githubRepo}/commits?per_page=10`);
        if (!response.ok) throw new Error('Failed to fetch real commits. Falling back to mock data.');
        const data = await response.json();
        setCommits(data);
      } else {
        const mockMessages = await generateMockCommits(project.name);
        const mockCommits: Commit[] = mockMessages.map((msg, i) => ({
          commit: {
            message: msg,
            author: {
              name: 'AI Developer',
              date: new Date(Date.now() - i * 86400000).toISOString(),
            }
          }
        }));
        setCommits(mockCommits);
      }
    } catch (err: any) {
      const mockMessages = await generateMockCommits(project.name);
      const mockCommits: Commit[] = mockMessages.map((msg, i) => ({
        commit: {
          message: msg,
          author: {
            name: 'AI Developer',
            date: new Date(Date.now() - i * 86400000).toISOString(),
          }
        }
      }));
      setCommits(mockCommits);
      if (project.githubRepo) {
        setError("Could not fetch real commits. Showing generated technical summary.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resourceTotal = project.resourceCosts?.reduce((acc, r) => acc + r.amount, 0) || 0;
  const totalInvoiceAmount = project.budget + resourceTotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white print:backdrop-blur-none">
      <div className="bg-white border border-[#141414] w-full max-w-4xl shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none">
        {/* Header - Hidden on Print */}
        <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#f5f5f5] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-[#141414] bg-white">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest">Project Invoice</h2>
              <p className="text-[10px] font-mono text-[#141414]/50">{project.client}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 border border-[#141414] bg-white hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Printer size={16} />
              Print
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all border border-transparent hover:border-[#141414]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 print:overflow-visible">
          {/* Top Info */}
          <div className="flex justify-between items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-bold text-sm">P</div>
                <span className="text-lg font-bold tracking-tighter text-[#141414]">PROFITPULSE</span>
              </div>
              <div className="text-[10px] font-mono text-[#141414]/60 uppercase tracking-widest leading-relaxed">
                <p className="font-bold text-[#141414]">Freelance Services</p>
                <p>Nairobi, Kenya</p>
                <p>billing@profitpulse.io</p>
              </div>
            </div>
            <div className="text-right space-y-4">
              <h1 className="text-5xl font-serif italic tracking-tighter text-[#141414]">Invoice</h1>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#141414]/40">
                <p>REF: INV-{Math.floor(Math.random() * 1000000)}</p>
                <p>DATE: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-10 border-t border-[#141414]">
            <div>
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40 mb-4">Bill To</h4>
              <div className="space-y-1">
                <h3 className="text-xl font-serif italic text-[#141414]">{project.client}</h3>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#141414]/60">Project: {project.name}</p>
              </div>
            </div>
            <div className="text-right">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40 mb-4">Project Status</h4>
              <div className="inline-block px-3 py-1 border border-[#141414] text-[10px] font-bold uppercase tracking-widest">
                {project.status}
              </div>
            </div>
          </div>

          {/* Technical Summary Section */}
          <div className="border border-[#141414] p-8 space-y-8 bg-[#fcfcfc]">
            <div className="flex items-center justify-between border-b border-[#141414]/10 pb-4">
              <div className="flex items-center gap-3 text-[#141414]">
                <Github size={18} />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Technical Summary</h3>
              </div>
              {project.githubRepo && (
                <span className="text-[9px] font-mono font-bold text-[#141414]/40 uppercase tracking-widest">
                  REPO: {project.githubRepo}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-[#141414]/40">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Analyzing repository activity...</span>
              </div>
            ) : error ? (
              <div className="p-4 border border-rose-200 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            ) : commits.length > 0 ? (
              <div className="space-y-6">
                <p className="text-[11px] font-serif italic text-[#141414]/70 leading-relaxed">
                  The following technical milestones were achieved based on the latest development activity:
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {commits.map((commit, i) => (
                    <div key={i} className="flex gap-4 p-4 border border-[#141414]/5 bg-white hover:bg-[#f5f5f5] transition-colors">
                      <div className="text-[10px] font-mono font-bold text-[#141414]/20">0{i + 1}</div>
                      <span className="text-[10px] font-mono font-bold text-[#141414] uppercase tracking-wider leading-relaxed">
                        {commit.commit.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-mono font-bold text-[#141414]/40 uppercase tracking-widest italic text-center py-8">
                No GitHub repository linked to this project for technical summary generation.
              </p>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Calculator size={18} className="text-[#141414]/40" />
              Financial Breakdown
            </h3>
            <div className="border border-[#141414] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f5] border-b border-[#141414]">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">Description</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/10">
                  <tr>
                    <td className="px-6 py-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Base Project Fee</p>
                      <p className="text-[9px] font-mono text-[#141414]/40 uppercase tracking-widest">Hours Logged: {formatHours(project.actualHours)}</p>
                    </td>
                    <td className="px-6 py-5 text-right font-mono font-bold text-[#141414] text-sm">
                      {formatCurrency(project.budget)}
                    </td>
                  </tr>
                  {project.resourceCosts?.map(resource => (
                    <tr key={resource.id}>
                      <td className="px-6 py-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">{resource.name}</p>
                        <p className="text-[9px] font-mono text-[#141414]/40 uppercase tracking-widest">Project Resource / Requirement</p>
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-[#141414] text-sm">
                        {formatCurrency(resource.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#141414] text-[#E4E3E0]">
                    <td className="px-6 py-8 text-xs font-bold uppercase tracking-[0.2em]">Total Amount Due</td>
                    <td className="px-6 py-8 text-right font-mono font-bold text-3xl">
                      {formatCurrency(totalInvoiceAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-12 border-t border-[#141414] grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">Payment Terms</h4>
              <p className="text-[10px] font-serif italic text-[#141414]/60 leading-relaxed">
                Please remit payment within 14 days of invoice date. 
                Bank transfers preferred. Late payments may incur a 2.5% monthly fee.
              </p>
            </div>
            <div className="text-right space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">Thank You</h4>
              <p className="text-[10px] font-serif italic text-[#141414]/60">We appreciate your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
