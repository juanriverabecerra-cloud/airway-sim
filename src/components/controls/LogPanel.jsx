import React from 'react';
import { Zap } from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';

export const LogPanel = ({ logs = [], onActionClick }) => {
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="col-span-1 glass-panel glass-amber p-4 flex flex-col min-h-[500px] max-h-[800px] shadow-2xl">
      <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
        <h3 className="text-amber-450 font-black flex items-center gap-2 uppercase tracking-widest text-xs font-mono"><Zap size={14}/> Clinical Log</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {safeLogs.map((rawLog, index) => {
          const log = typeof rawLog === 'string' ? rawLog : String(rawLog || '');
          
          // Detect and format the predictive Attending Consults
          if (log.includes('[STATUS]') && log.includes('[FORECAST]')) {
             const parts = log.split('\n');
             const timeStr = parts[0] ? (parts[0].split('-')[0] || '').trim() : '';
             const statusStr = parts[1] ? parts[1].replace('[STATUS]', '').trim() : '';
             const forecastStr = parts[2] ? parts[2].replace('[FORECAST]', '').trim() : '';
             
             return (
                <div key={index} className="flex flex-col gap-1.5 bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 my-2">
                   <div className="text-[10px] text-amber-400 font-bold border-b border-amber-900/30 pb-1 mb-1 font-mono">{timeStr} - ATTENDING CONSULT</div>
                   <div className="text-[11px] text-slate-200"><span className="font-black text-white bg-slate-800 px-1 rounded mr-1">STATUS</span> {parseAndRenderText(statusStr, onActionClick)}</div>
                   <div className="text-[11px] text-amber-200"><span className="font-black text-white bg-amber-900 px-1 rounded mr-1">FORECAST</span> {parseAndRenderText(forecastStr, onActionClick)}</div>
                </div>
             );
          }

          // Standard log formatting
          return (
            <div key={index} className={`${index === 0 ? "text-[12px] text-white font-extrabold border-l-2 border-amber-400 pl-2 py-1 bg-white/[0.02]" : "text-[11px] text-slate-400 pl-2"}`}>
              {parseAndRenderText(log, onActionClick)}
            </div>
          );
        })}
      </div>
    </div>
  );
};