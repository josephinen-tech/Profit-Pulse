import React, { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { Project } from '../types';

interface CsvImportProps {
  onImport: (projects: Project[]) => void;
  onClose: () => void;
}

export default function CsvImport({ onImport, onClose }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setLoading(false);
        const data = results.data as any[];
        
        try {
          const importedProjects: Project[] = data.map((row, index) => {
            // Basic validation
            const name = row['Project Name'] || row['name'];
            const client = row['Client'] || row['client'];
            const budget = Number(row['Budget'] || row['budget']);
            const estimatedHours = Number(row['Estimated Hours'] || row['estimatedHours']);
            const actualHours = Number(row['Actual Hours'] || row['actualHours'] || 0);

            if (!name || !client || isNaN(budget) || isNaN(estimatedHours)) {
              throw new Error(`Invalid data at row ${index + 1}. Ensure Project Name, Client, Budget, and Estimated Hours are present.`);
            }

            return {
              id: Math.random().toString(36).substr(2, 9),
              name,
              client,
              budget,
              estimatedHours,
              actualHours,
              status: 'active',
              paymentStatus: 'unpaid',
              createdAt: Date.now(),
            };
          });

          if (importedProjects.length === 0) {
            setError('The CSV file is empty or has no valid project data.');
          } else {
            onImport(importedProjects);
            onClose();
          }
        } catch (err: any) {
          setError(err.message);
        }
      },
      error: (err) => {
        setLoading(false);
        setError('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">Import Data</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Bulk upload your projects</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300
              ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-brand-400 hover:bg-slate-50/50'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            
            {loading ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 size={48} className="text-brand-600 animate-spin mb-4" />
                <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Parsing your file...</p>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Click or drag CSV here</h3>
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed uppercase tracking-wider">
                  Upload a CSV file with columns: <br />
                  <span className="text-brand-600 font-bold">Project Name, Client, Budget, Estimated Hours</span>
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-6 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold uppercase tracking-widest rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle size={20} className="shrink-0" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">CSV Format Example</h4>
              <code className="text-[10px] block whitespace-pre font-mono text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                Project Name,Client,Budget,Estimated Hours{"\n"}
                Website,Acme,50000,40{"\n"}
                App,Globex,120000,80
              </code>
            </div>
            <div className="p-5 bg-brand-50/30 rounded-2xl border border-brand-50 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-brand-600 mb-2">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">You can also include an <span className="text-brand-600 font-bold">"Actual Hours"</span> column to import historical data.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
