import React from 'react';
import { Zap } from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';

export const LogPanel = ({ logs, onActionClick }) => {
  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full max-h-[800px] shadow-2xl">
      <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-yellow-400 font-bold flex items-center gap-2 uppercase tracking-widest text-sm"><Zap size={16}/> Clinical Log</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {logs.map((log, index) => {
          // Detect and beautifully format the new 2-part predictive Attending Consults
          if (log.includes('[STATUS]') && log.includes('[FORECAST]')) {
             const parts = log.split('\n');
             const timeStr = parts[0].split('-')[0].trim();
             const statusStr = parts[1].replace('[STATUS]', '').trim();
             const forecastStr = parts[2].replace('[FORECAST]', '').trim();
             
             return (
                <div key={index} className="flex flex-col gap-1.5 bg-purple-950/30 border border-purple-900/50 rounded-lg p-2.5 my-2">
                   <div className="text-[10px] text-purple-400 font-bold border-b border-purple-900/50 pb-1 mb-1">{timeStr} - ATTENDING CONSULT</div>
                   <div className="text-[11px] text-slate-200"><span className="font-black text-white bg-slate-800 px-1 rounded mr-1">STATUS</span> {parseAndRenderText(statusStr, onActionClick)}</div>
                   <div className="text-[11px] text-purple-200"><span className="font-black text-white bg-purple-900 px-1 rounded mr-1">FORECAST</span> {parseAndRenderText(forecastStr, onActionClick)}</div>
                </div>
             );
          }

          // Standard log formatting
          return (
            <div key={index} className={`${index === 0 ? "text-[12px] text-white font-bold border-l-2 border-cyan-500 pl-2 py-1 bg-slate-800/30" : "text-[11px] text-slate-400 pl-2"}`}>
              {parseAndRenderText(log, onActionClick)}
            </div>
          );
        })}
      </div>
    </div>
  );
};