import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Project } from '../types';
import { formatCurrency } from '../utils';

interface AnalyticsProps {
  projects: Project[];
}

export default function Analytics({ projects }: AnalyticsProps) {
  const data = projects.map(p => {
    const resourceTotal = p.resourceCosts?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const totalBudget = p.budget + resourceTotal;
    const ehr = p.actualHours > 0 ? totalBudget / p.actualHours : 0;
    
    // Determine color based on status and efficiency
    let barColor = '#6366f1'; // Default: Standard Efficiency (Indigo)
    if (p.status === 'completed') {
      barColor = '#10b981'; // Completed (Emerald)
    } else if (p.status === 'on-hold') {
      barColor = '#94a3b8'; // On Hold (Slate)
    } else {
      if (ehr > 15000) barColor = '#f59e0b'; // High Efficiency (Amber)
      else if (ehr < 5000) barColor = '#f43f5e'; // Low Efficiency (Rose)
    }

    return {
      name: p.name,
      ehr: Math.round(ehr),
      budget: totalBudget,
      hours: p.actualHours,
      color: barColor
    };
  }).sort((a, b) => b.ehr - a.ehr);

  const legendItems = [
    { label: 'High Efficiency (> 15k)', color: '#f59e0b' },
    { label: 'Standard (5k - 15k)', color: '#6366f1' },
    { label: 'Low Efficiency (< 5k)', color: '#f43f5e' },
    { label: 'Completed', color: '#10b981' },
    { label: 'On Hold', color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#141414]/40">Efficiency Analysis</h3>
          <p className="text-sm font-serif italic text-[#141414]">Effective Hourly Rate (EHR) distribution across projects.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="h-[300px] w-full border-t border-[#141414]/10 pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#141414" strokeOpacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={{ stroke: '#141414', strokeOpacity: 0.2 }} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#141414', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
              tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}..` : value}
            />
            <YAxis 
              axisLine={{ stroke: '#141414', strokeOpacity: 0.2 }} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#141414', fontWeight: 700, fontFamily: 'monospace' }}
              tickFormatter={(value) => `KSh ${value.toLocaleString()}`}
              width={80}
            />
            <Tooltip 
              cursor={{ fill: '#141414', fillOpacity: 0.05 }}
              contentStyle={{ 
                backgroundColor: '#fff',
                borderRadius: '0px', 
                border: '1px solid #141414',
                boxShadow: '4px 4px 0px 0px rgba(20,20,20,1)',
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}
              formatter={(value: number) => [`${value.toLocaleString()} / HR`, 'EHR']}
            />
            <Bar dataKey="ehr" radius={[0, 0, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
